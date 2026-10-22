import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LB } from '../types';
import { summarizeRequest, type RequestSummary } from './dashboard';
import {
  defaults,
  evaluateApi,
  learnEndpoint,
  parseSpec,
  runSuite,
  type ApiSettings,
  type Endpoint,
  type Probe,
  type Spec,
  type Suite,
  type ApiResult,
} from './model';
export type FileResource = {
  id: string;
  name: string;
  namespace: string;
  description: string;
  text: string;
  updatedAt: number;
};
export type Definition = {
  id: string;
  name: string;
  namespace: string;
  description: string;
  fileIds: string[];
};
export type Integration = {
  id: string;
  name: string;
  namespace: string;
  description: string;
  provider: string;
  username: string;
  secret: string;
  hostname: string;
};
export type ApiLog = ApiResult & {
  domain?: string;
  summary?: RequestSummary;
  id: string;
  lbId: string;
  at: number;
  path: string;
  method: string;
  settings: string;
};
interface State {
  files: FileResource[];
  definitions: Definition[];
  integrations: Integration[];
  endpoints: Endpoint[];
  logs: ApiLog[];
  runs: (Suite & { lbId: string })[];
  selectedLbId: string;
  guide: number;
  clock: number;
  saveFile: (x: Omit<FileResource, 'id' | 'updatedAt'> & { id?: string }) => FileResource;
  saveDefinition: (x: Omit<Definition, 'id'> & { id?: string }) => Definition;
  saveIntegration: (x: Omit<Integration, 'id'> & { id?: string }) => Integration;
  deleteResource: (kind: 'file' | 'definition' | 'integration', id: string, lbs: LB[]) => void;
  specFor: (id: string) => Spec | undefined;
  probe: (lb: LB, q: Probe) => ApiLog;
  discover: (lb: LB, source: 'Code' | 'API Crawling') => void;
  purge: (lb: LB) => void;
  run: (lb: LB) => Suite;
  advance: (lbs: LB[], days: number) => void;
}
const validateName = (
  x: { name: string; namespace: string },
  items: { id: string; name: string; namespace: string }[],
  id?: string,
) => {
  if (!/^[a-z][a-z0-9-]{1,62}$/.test(x.name))
    throw Error('Name: use 2–63 lowercase letters, numbers or hyphens.');
  if (items.some((i) => i.id !== id && i.name === x.name && i.namespace === x.namespace))
    throw Error('Name already exists in this Namespace.');
};
export const settingsFor = (lb?: LB): ApiSettings => ({
  ...defaults(),
  ...lb?.config?.apiSecurity,
});
export const useApiSecurity = create<State>()(
  persist(
    (set, get) => ({
      files: [],
      definitions: [],
      integrations: [],
      endpoints: [],
      logs: [],
      runs: [],
      selectedLbId: '',
      guide: 0,
      clock: Date.now(),
      saveFile: (x) => {
        parseSpec(x.text);
        validateName(x, get().files, x.id);
        const file = { ...x, id: x.id ?? crypto.randomUUID(), updatedAt: Date.now() };
        set((s) => ({ files: [...s.files.filter((f) => f.id !== file.id), file] }));
        return file;
      },
      saveDefinition: (x) => {
        validateName(x, get().definitions, x.id);
        if (
          !x.fileIds.length ||
          x.fileIds.some(
            (id) =>
              !get().files.some(
                (f) => f.id === id && (f.namespace === x.namespace || f.namespace === 'shared'),
              ),
          )
        )
          throw Error(
            'OpenAPI Specification Files: referenced file is missing or outside Namespace.',
          );
        const d = { ...x, id: x.id ?? crypto.randomUUID() };
        set((s) => ({ definitions: [...s.definitions.filter((i) => i.id !== d.id), d] }));
        return d;
      },
      saveIntegration: (x) => {
        validateName(x, get().integrations, x.id);
        if (!x.secret || !x.username)
          throw Error('Integration Data requires username and a dummy secret.');
        const i = { ...x, id: x.id ?? crypto.randomUUID() };
        set((s) => ({ integrations: [...s.integrations.filter((v) => v.id !== i.id), i] }));
        return i;
      },
      deleteResource: (kind, id, lbs) => {
        if (kind === 'file' && get().definitions.some((d) => d.fileIds.includes(id)))
          throw Error('Referenced by an API Definition; remove that reference first.');
        if (kind === 'definition' && lbs.some((l) => l.config?.apiSecurity?.definitionId === id))
          throw Error('Referenced by an HTTP Load Balancer.');
        if (kind === 'integration' && lbs.some((l) => l.config?.apiSecurity?.integrationId === id))
          throw Error('Referenced by API Repositories on an HTTP Load Balancer.');
        set((s) =>
          kind === 'file'
            ? { files: s.files.filter((f) => f.id !== id) }
            : kind === 'definition'
              ? { definitions: s.definitions.filter((f) => f.id !== id) }
              : { integrations: s.integrations.filter((f) => f.id !== id) },
        );
      },
      specFor: (id) => {
        const d = get().definitions.find((d) => d.id === id);
        if (!d) return;
        const specs = d.fileIds
          .map((id) => get().files.find((f) => f.id === id))
          .filter((f): f is FileResource => !!f)
          .map((f) => parseSpec(f.text));
        if (specs.length !== d.fileIds.length) return;
        return {
          openapi: '3.0.3',
          info: { title: d.name, version: '1' },
          paths: Object.assign({}, ...specs.map((s) => s.paths)),
        };
      },
      probe: (lb, q) => {
        const c = settingsFor(lb),
          result = evaluateApi(c, get().specFor(c.definitionId), q);
        const log = {
          ...result,
          id: crypto.randomUUID(),
          lbId: lb.id,
          at: get().clock,
          path: q.path,
          method: q.method,
          summary: {
            ...summarizeRequest(q.headers ?? {}, q.body, q.responseBody),
            ...(c.sensitiveDataDiscovery === 'Disable' ? { sensitive: [] } : {}),
          },
          domain: q.domain ?? lb.domains[0],
          settings: JSON.stringify(c),
        };
        set((s) => ({
          logs: [log, ...s.logs].slice(0, 1000),
          endpoints: learnEndpoint(s.endpoints, c, lb.id, { ...q, code: result.code }, s.clock),
        }));
        return log;
      },
      discover: (lb, source) => {
        const c = settingsFor(lb);
        if (!c.discovery) throw Error('Enable API Discovery and save the LB first.');
        if (
          source === 'Code' &&
          (!get().integrations.some(
            (i) => i.id === c.integrationId && i.namespace === lb.namespace,
          ) ||
            !c.repositories.length)
        )
          throw Error('Configure Code Base Integration and API Repositories first.');
        if (
          source === 'API Crawling' &&
          (!c.crawling ||
            !c.crawlDomains.length ||
            c.crawlDomains.some((d) => !lb.domains.includes(d.domain) || !d.user || !d.secret))
        )
          throw Error('Configure API Crawling domains and dummy credentials.');
        set((s) => ({
          endpoints: [
            { path: source === 'Code' ? '/api/code-products' : '/api/crawl-cart', method: 'GET' },
          ].reduce(
            (rows, q) => learnEndpoint(rows, c, lb.id, { ...q, code: 200, source }, s.clock),
            s.endpoints,
          ),
        }));
      },
      purge: (lb) =>
        set((s) => ({
          endpoints: s.endpoints.filter(
            (e) => e.lbId !== lb.id || s.clock - e.lastSeen <= settingsFor(lb).purgeDays * 86400000,
          ),
        })),
      run: (lb) => {
        const run = runSuite(
          settingsFor(lb),
          get().specFor(settingsFor(lb).definitionId),
          lb.domains,
          get().clock,
        );
        set((s) => ({ runs: [{ ...run, lbId: lb.id }, ...s.runs].slice(0, 100) }));
        return run;
      },
      advance: (lbs, days) => {
        if (!Number.isInteger(days) || days < 1 || days > 365)
          throw Error('Simulated days: 1–365.');
        set((s) => ({ clock: s.clock + days * 86400000 }));
        for (const lb of lbs) {
          const c = settingsFor(lb),
            last = get().runs.find((r) => r.lbId === lb.id),
            period = c.frequency === 'Every Day' ? 1 : c.frequency === 'Every Week' ? 7 : 30;
          if (c.testing && (!last || get().clock - last.at >= period * 86400000)) get().run(lb);
        }
      },
    }),
    { name: 'f5-xc-api-security-v1' },
  ),
);
export function configurationError(c: ApiSettings, lb: LB): string {
  const s = useApiSecurity.getState();
  if (c.purgeDays < 1 || c.purgeDays > 365 || !Number.isInteger(c.purgeDays))
    return 'Purge Duration: choose 1–365 days.';
  if (c.crawling && !c.discovery) return 'API Crawling requires API Discovery.';
  if (
    c.definitionId &&
    !s.definitions.some(
      (d) => d.id === c.definitionId && (d.namespace === lb.namespace || d.namespace === 'shared'),
    )
  )
    return 'Referenced API Definition is missing or outside Namespace.';
  if (c.validation !== 'Disabled' && !c.definitionId)
    return 'Validation requires an API Definition.';
  if (
    c.integrationId &&
    !s.integrations.some((i) => i.id === c.integrationId && i.namespace === lb.namespace)
  )
    return 'Code Base Integration reference is invalid.';
  if (
    c.crawling &&
    (!c.crawlDomains.length ||
      c.crawlDomains.some((d) => !lb.domains.includes(d.domain) || !d.user || !d.secret))
  )
    return 'API Crawling requires an LB domain and dummy user/password.';
  for (const r of [...c.rules, ...c.fallRules])
    if (
      !r.name ||
      !r.path.startsWith('/') ||
      !['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(r.method)
    )
      return 'Validation rule requires name, local path and method.';
  if (c.validation === 'Custom List' && !c.rules.length)
    return 'Custom List requires at least one validation rule.';
  return '';
}
