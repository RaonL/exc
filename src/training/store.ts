import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useConsole } from '../store';
import { labById, trainingLabs } from './catalog';
import {
  createEnvironment,
  baselineRequests,
  emptyRuntime,
  explain,
  fingerprint,
  pipeline,
  referenceConfiguration,
  request,
  runScan,
  sendRequest,
  verifyLab,
} from './engine';
import type { Environment, RequestInput, Session } from './types';
import type { SecurityEvent } from '../types';

function publish(
  e: Environment,
  priorLogs: Set<string> = new Set(e.runtime.logs.map((l) => l.id)),
) {
  const core = useConsole.getState(),
    ns = e.lb.namespace;
  const upsert = <T extends { id: string }>(items: T[], additions: T[]) => [
    ...items.filter((i) => !additions.some((a) => a.id === i.id)),
    ...additions,
  ];
  const events: SecurityEvent[] = e.runtime.logs
    .filter((l) => !priorLogs.has(l.id))
    .map((l) => ({
      id: l.id,
      namespace: ns,
      timestamp: new Date(l.at).toISOString(),
      lbId: e.lb.id,
      source: l.request.source,
      country: l.request.country,
      path: l.request.path,
      method: l.request.method,
      scenario:
        l.request.attack === 'SQL Injection'
          ? 'SQL Injection'
          : l.request.attack === 'XSS'
            ? 'Cross-site Scripting'
            : l.request.attack.includes('bot') || l.request.attack === 'Bot'
              ? 'Bot Detection'
              : 'Normal HTTP traffic',
      severity: l.action === 'Blocked' ? 'High' : 'Info',
      action: l.action,
      count: 1,
      responseCode: l.code,
      responseBody: l.body,
      reason: l.reason,
      evaluationTrace: l.trace,
      generatedBy: 'console-request',
    }));
  useConsole.setState({
    namespaces: [...new Set([...core.namespaces, ns])],
    lbs: upsert(core.lbs, [e.lb]),
    origins: upsert(core.origins, e.origins),
    wafs: upsert(core.wafs, [e.waf]),
    sites: upsert(core.sites, [e.ce]),
    events: [...events, ...core.events.filter((old) => !events.some((n) => n.id === old.id))].slice(
      0,
      1000,
    ),
    endpoints: [
      ...core.endpoints.filter(
        (old) => !(old.lbId === e.lb.id && old.id.startsWith(`${e.lb.id}-discovered-`)),
      ),
      ...e.runtime.discovered.map((path, i) => ({
        id: `${e.lb.id}-discovered-${i}`,
        namespace: ns,
        lbId: e.lb.id,
        method: 'GET',
        path,
        shadow: true,
        calls: e.runtime.logs.filter((l) => l.request.path === path).length,
      })),
    ],
  });
}
export function effectiveEnvironment(session: Session): Environment {
  const e = structuredClone(session.environment),
    core = useConsole.getState();
  const lb = core.lbs.find((l) => l.id === e.lb.id);
  if (lb) e.lb = structuredClone(lb);
  else e.lb.originId = 'missing-console-lb';
  const waf = core.wafs.find((w) => w.id === e.waf.id);
  if (waf) e.waf = structuredClone(waf);
  else {
    e.lb.wafId = '';
    e.waf.mode = 'Monitoring';
  }
  e.origins = e.origins.map((o) =>
    structuredClone(core.origins.find((item) => item.id === o.id) ?? { ...o, healthy: false }),
  );
  e.ce = structuredClone(core.sites.find((s) => s.id === e.ce.id) ?? { ...e.ce, online: false });
  return e;
}
export function isComplete(session: Session) {
  return (
    !!session.baseline &&
    !!session.verification &&
    session.verification.checks.every((c) => c.pass) &&
    session.verification.fingerprint === fingerprint(effectiveEnvironment(session))
  );
}
interface TrainingState {
  guideTab: string;
  setGuideTab: (tab: string) => void;
  selectedClass: number;
  selectedLab: string;
  sessions: Record<string, Session>;
  select: (classId: number, labId?: string) => void;
  start: (id: string) => void;
  resetLab: (id: string) => void;
  update: (id: string, change: (e: Environment) => Environment) => void;
  probe: (id: string, input: RequestInput) => void;
  baseline: (id: string) => void;
  verify: (id: string) => void;
  solution: (id: string) => void;
  scan: (id: string) => void;
  explain: (id: string) => void;
  pipeline: (id: string, action: 'Build' | 'Test' | 'Deploy') => void;
}
const safeStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      queueMicrotask(() => useConsole.setState({ storageError: true }));
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      queueMicrotask(() => useConsole.setState({ storageError: true }));
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      queueMicrotask(() => useConsole.setState({ storageError: true }));
    }
  },
};
export const useTraining = create<TrainingState>()(
  persist(
    (set, get) => ({
      selectedClass: 1,
      selectedLab: trainingLabs[0].id,
      guideTab: 'Guide',
      setGuideTab: (guideTab) => set({ guideTab }),
      sessions: {},
      select: (selectedClass, labId) =>
        set({
          selectedClass,
          guideTab: 'Guide',
          selectedLab: labId ?? trainingLabs.find((l) => l.classId === selectedClass)!.id,
        }),
      start: (id) => {
        const prior = get().sessions[id];
        const session = prior
          ? { ...prior, environment: effectiveEnvironment(prior) }
          : { environment: createEnvironment(labById(id)) };
        publish(session.environment);
        set((s) => ({ sessions: { ...s.sessions, [id]: session } }));
        useConsole.getState().setNamespace(session.environment.lb.namespace);
      },
      resetLab: (id) => {
        const prior = get().sessions[id]?.environment;
        if (prior)
          useConsole.setState((s) => ({
            events: s.events.filter((ev) => ev.lbId !== prior.lb.id),
            endpoints: s.endpoints.filter((ep) => ep.lbId !== prior.lb.id),
          }));
        const environment = createEnvironment(labById(id));
        publish(environment);
        set((s) => ({ sessions: { ...s.sessions, [id]: { environment } } }));
        useConsole.getState().setNamespace(environment.lb.namespace);
      },
      update: (id, change) => {
        const session = get().sessions[id];
        if (!session) throw new Error('실습 환경을 먼저 시작하세요.');
        const before = effectiveEnvironment(session);
        const environment = change(before);
        publish(environment, new Set(before.runtime.logs.map((l) => l.id)));
        set((s) => ({ sessions: { ...s.sessions, [id]: { ...session, environment } } }));
      },
      probe: (id, input) =>
        get().update(id, (e) => {
          e.runtime.now = Math.max(e.runtime.now, Date.now());
          return sendRequest(e, input, labById(id)).environment;
        }),
      baseline: (id) => {
        const session = get().sessions[id];
        if (!session) return;
        let environment = effectiveEnvironment(session);
        const before = new Set(environment.runtime.logs.map((l) => l.id));
        const lab = labById(id);
        const codes: number[] = [];
        for (const input of baselineRequests(lab)) {
          const sent = sendRequest(environment, input, lab);
          environment = sent.environment;
          codes.push(sent.result.code);
        }
        publish(environment, before);
        set((s) => ({
          sessions: {
            ...s.sessions,
            [id]: { ...session, environment, baseline: { at: Date.now(), codes } },
          },
        }));
      },
      verify: (id) => {
        const session = get().sessions[id];
        if (!session) return;
        const before = effectiveEnvironment(session);
        const result = verifyLab(before, labById(id));
        result.verification.checks.unshift({
          name: '보호 전 기준 요청 기록',
          pass: !!session.baseline,
          expected: '기준 요청 실행',
          actual: session.baseline?.codes.join(' / ') ?? '미실행',
        });
        publish(result.environment, new Set(before.runtime.logs.map((l) => l.id)));
        set((s) => ({ sessions: { ...s.sessions, [id]: { ...session, ...result } } }));
      },
      solution: (id) => get().update(id, (e) => referenceConfiguration(e, labById(id))),
      scan: (id) => get().update(id, runScan),
      explain: (id) => get().update(id, explain),
      pipeline: (id, action) => get().update(id, (e) => pipeline(e, action)),
    }),
    { name: 'f5-xc-training-v1', version: 1, storage: createJSONStorage(() => safeStorage) },
  ),
);

export function selfTestAll() {
  return trainingLabs.map((lab) => {
    let e = referenceConfiguration(createEnvironment(lab), lab);
    e = sendRequest(e, request({ attack: 'SQL Injection' }), lab).environment;
    e = explain(e);
    const result = verifyLab(e, lab);
    return {
      id: lab.id,
      title: lab.title,
      pass: result.verification.checks.every((c) => c.pass),
      checks: result.verification.checks,
    };
  });
}
export function clearRuntime(e: Environment): Environment {
  return { ...e, runtime: emptyRuntime() };
}
