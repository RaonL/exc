import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createDemoData } from './data/seed';
import { evaluateRequest, lbConfig } from './lib/config';
import {
  classifyLocalPath,
  localRequestPath,
  sharedBaseWaf,
  type ConsoleLab1,
} from './lib/console-lab';
import type {
  DemoData,
  LB,
  Origin,
  Waf,
  Scenario,
  SecurityEvent,
  Workspace,
  Page,
  Settings,
  User,
  Policy,
  SimulatedRequest,
} from './types';
const uid = () => crypto.randomUUID();
const timestamp = () => new Date().toISOString();
const wafAttack = (scenario: Scenario) =>
  ['SQL Injection', 'Cross-site Scripting', 'Command Injection'].includes(scenario);
const reportStorageError = () =>
  queueMicrotask(() => {
    if (!useConsole.getState().storageError) useConsole.setState({ storageError: true });
  });
interface Store extends DemoData {
  namespace: string;
  workspace: Workspace;
  page: Page;
  selectedLbId: string;
  storageError: boolean;
  applicationLbId: string;
  consoleLab1: ConsoleLab1 | null;
  startConsoleLab1: () => void;
  openApplication: (id: string) => void;
  requestApplication: (id: string, url: string, method: string) => SecurityEvent;
  inspectRequest: (id: string) => void;
  navigate: (workspace: Workspace, page: Page) => void;
  setNamespace: (namespace: string) => void;
  selectLb: (id: string, page?: 'Overview' | 'Security') => void;
  saveLb: (lb: LB) => void;
  deleteLb: (id: string) => void;
  saveOrigin: (origin: Origin) => void;
  setOriginHealth: (id: string, healthy: boolean) => void;
  saveWaf: (waf: Waf) => void;
  setSiteStatus: (id: string, online: boolean) => void;
  simulate: (scenario: Scenario, lbId: string, request?: SimulatedRequest) => string;
  adoptEndpoint: (id: string) => void;
  addNamespace: (name: string) => void;
  saveUser: (user: User) => void;
  savePolicy: (policy: Policy) => void;
  saveSettings: (settings: Settings) => void;
  reset: () => void;
}
const activity = (namespace: string, message: string) => ({
  id: uid(),
  namespace,
  timestamp: timestamp(),
  message,
  actor: 'admin@example.com',
});
export const useConsole = create<Store>()(
  persist(
    (set, get) => ({
      ...createDemoData(),
      namespace: 'social-hawk',
      workspace: 'Web App & API Protection',
      page: 'Overview',
      selectedLbId: '',
      storageError: false,
      applicationLbId: '',
      consoleLab1: null,
      startConsoleLab1: () =>
        set((s) => ({
          consoleLab1: s.consoleLab1 ?? {
            namespace: 'class1-lab1',
            startedAt: timestamp(),
            reviewedIds: [],
            guideOpen: true,
          },
          namespace: s.consoleLab1?.namespace ?? 'class1-lab1',
          namespaces: [...new Set([...s.namespaces, s.consoleLab1?.namespace ?? 'class1-lab1'])],
          wafs: s.wafs.some((w) => w.id === sharedBaseWaf.id) ? s.wafs : [...s.wafs, sharedBaseWaf],
          workspace: 'Web App & API Protection',
          page: 'Origin Pools',
          selectedLbId: '',
        })),
      openApplication: (applicationLbId) => set({ applicationLbId }),
      requestApplication: (id, url, method) => {
        const s = get(),
          lb = s.lbs.find((l) => l.id === id && l.namespace === s.namespace);
        if (!lb) throw new Error('현재 Namespace에서 LB를 선택하세요.');
        const path = localRequestPath(lb, url),
          authority = url.startsWith('/') ? lb.domains[0] : new URL(url).hostname,
          scenario = classifyLocalPath(path);
        const evaluation = evaluateRequest(lb, s.wafs, s.origins, scenario, {
          path,
          method,
          signatureState: 'Existing',
          authority,
        });
        if (lbConfig(lb).vip === 'Do Not Advertise') {
          evaluation.responseCode = 503;
          evaluation.reason = 'VIP is not advertised';
          evaluation.action = 'Detected';
        }
        const event: SecurityEvent = {
          id: uid(),
          namespace: lb.namespace,
          timestamp: timestamp(),
          authority,
          scenario,
          lbId: id,
          source: '198.51.100.42',
          country: 'South Korea',
          path,
          method,
          signatureState: 'Existing',
          severity: scenario === 'Normal HTTP traffic' ? 'Info' : 'High',
          count: 1,
          ...evaluation,
          evaluatedWafId:
            evaluation.evaluatedWafId ||
            (s.wafs.some(
              (w) =>
                w.id === lb.wafId && (w.namespace === lb.namespace || w.namespace === 'shared'),
            )
              ? lb.wafId
              : undefined),
          generatedBy: 'console-request',
          durationMs: 4 + (path.length % 7),
        };
        if (event.action === 'Blocked')
          event.responseBody = `${event.responseBody ?? 'The requested URL was rejected.'}\nSupport ID: ${event.id}`;
        set({
          events: [event, ...s.events].slice(0, 1000),
          lbs: s.lbs.map((l) => (l.id === id ? { ...l, requests: l.requests + 1 } : l)),
          activity: [
            activity(
              lb.namespace,
              `${method} ${path} · HTTP ${event.responseCode} · req_id ${event.id}`,
            ),
            ...s.activity,
          ].slice(0, 500),
        });
        return event;
      },
      inspectRequest: (id) =>
        set((s) => ({
          consoleLab1: s.consoleLab1
            ? { ...s.consoleLab1, reviewedIds: [...new Set([...s.consoleLab1.reviewedIds, id])] }
            : null,
        })),
      navigate: (workspace, page) => set({ workspace, page, selectedLbId: '' }),
      setNamespace: (namespace) => set({ namespace, selectedLbId: '' }),
      selectLb: (selectedLbId, page = 'Overview') =>
        set({ selectedLbId, page, workspace: 'Web App & API Protection' }),
      saveLb: (lb) =>
        set((s) => ({
          lbs: s.lbs.some((l) => l.id === lb.id)
            ? s.lbs.map((l) => (l.id === lb.id ? lb : l))
            : [...s.lbs, lb],
          activity: [activity(lb.namespace, `HTTP Load Balancer ${lb.name} saved`), ...s.activity],
        })),
      deleteLb: (id) =>
        set((s) => ({
          lbs: s.lbs.filter((l) => l.id !== id),
          events: s.events.filter((e) => e.lbId !== id),
          endpoints: s.endpoints.filter((e) => e.lbId !== id),
          selectedLbId: s.selectedLbId === id ? '' : s.selectedLbId,
          activity: [
            activity(
              s.namespace,
              `HTTP Load Balancer ${s.lbs.find((l) => l.id === id)?.name} deleted`,
            ),
            ...s.activity,
          ],
        })),
      saveOrigin: (origin) =>
        set((s) => ({
          origins: s.origins.some((o) => o.id === origin.id)
            ? s.origins.map((o) => (o.id === origin.id ? origin : o))
            : [...s.origins, origin],
          activity: [activity(origin.namespace, `Origin pool ${origin.name} saved`), ...s.activity],
        })),
      setOriginHealth: (id, healthy) =>
        set((s) => ({
          origins: s.origins.map((o) => (o.id === id ? { ...o, healthy } : o)),
          activity: [
            activity(
              s.namespace,
              `Origin ${s.origins.find((o) => o.id === id)?.name}: ${healthy ? 'healthy' : 'unhealthy'}`,
            ),
            ...s.activity,
          ],
        })),
      saveWaf: (waf) =>
        set((s) => ({
          wafs: s.wafs.some((w) => w.id === waf.id)
            ? s.wafs.map((w) => (w.id === waf.id ? waf : w))
            : [...s.wafs, waf],
          events: s.events.map((e) => {
            const lb = s.lbs.find((l) => l.id === e.lbId);
            if (
              !lb ||
              e.generatedBy === 'console-request' ||
              !wafAttack(e.scenario) ||
              !(lb.wafId === waf.id || lb.config?.routes.some((r) => r.wafId === waf.id))
            )
              return e;
            const wafs = [...s.wafs.filter((w) => w.id !== waf.id), waf];
            return {
              ...e,
              responseBody: undefined,
              ...evaluateRequest(lb, wafs, s.origins, e.scenario, {
                path: e.path,
                method: e.method ?? 'GET',
                signatureState: e.signatureState ?? 'Existing',
              }),
            };
          }),
          activity: [
            activity(waf.namespace, `App Firewall ${waf.name} set to ${waf.mode}`),
            ...s.activity,
          ],
        })),
      setSiteStatus: (id, online) =>
        set((s) => ({
          sites: s.sites.map((site) => (site.id === id ? { ...site, online } : site)),
          activity: [
            activity(
              s.namespace,
              `${s.sites.find((site) => site.id === id)?.name} is ${online ? 'online' : 'offline'}`,
            ),
            ...s.activity,
          ],
        })),
      simulate: (scenario, lbId, input) => {
        const s = get();
        const lb = s.lbs.find((l) => l.id === lbId && l.namespace === s.namespace);
        if (!lb) return 'Create or select a load balancer in this namespace first.';
        const request: SimulatedRequest = input ?? {
          path: scenario === 'Normal HTTP traffic' ? '/' : '/api/v1/products',
          method: 'GET',
          signatureState: 'Existing',
        };
        if (!request.path.startsWith('/')) return 'Request path must start with /.';
        if (scenario === 'Origin Server Failure') {
          if (!lb.originId) return 'Attach an origin pool first.';
          get().setOriginHealth(lb.originId, false);
          return 'Origin marked unhealthy. Check Overview and Origin Pools.';
        }
        if (scenario === 'CE Offline' || scenario === 'CE Online') {
          const ce = s.sites.find((site) => site.kind === 'CE' && site.namespace === s.namespace);
          if (!ce) return 'No customer edge exists in this namespace.';
          get().setSiteStatus(ce.id, scenario === 'CE Online');
          return `${ce.name} is ${scenario === 'CE Online' ? 'online' : 'offline'}. Connectivity updated.`;
        }
        if (scenario === 'Shadow API Discovery') {
          if (!lbConfig(lb).apiDiscovery)
            return 'API Discovery is disabled on this load balancer. Enable it in the LB configuration first.';
          const endpoint = {
            id: uid(),
            namespace: s.namespace,
            lbId,
            method: 'GET',
            path: `/api/internal/discovered-${s.endpoints.length + 1}`,
            shadow: true,
            calls: 12,
          };
          set({
            endpoints: [...s.endpoints, endpoint],
            activity: [
              activity(s.namespace, `Shadow API discovered: ${endpoint.path}`),
              ...s.activity,
            ],
          });
          return 'New shadow endpoint discovered. Open API Discovery to review.';
        }
        const count =
          scenario === 'Normal HTTP traffic' ? 1200 : scenario === 'L7 DDoS' ? 8400 : 48;
        const evaluation = evaluateRequest(lb, s.wafs, s.origins, scenario, request);
        const event: SecurityEvent = {
          id: uid(),
          namespace: s.namespace,
          timestamp: timestamp(),
          scenario,
          lbId,
          source: '198.51.100.42',
          country: 'South Korea',
          path: request.path,
          method: request.method,
          signatureState: request.signatureState,
          severity:
            scenario === 'Normal HTTP traffic'
              ? 'Info'
              : scenario === 'L7 DDoS'
                ? 'Critical'
                : 'High',
          ...evaluation,
          count,
        };
        const cutoff = Date.now() - s.settings.retention * 86400000;
        set({
          events: [event, ...s.events]
            .filter((e) => Date.parse(e.timestamp) >= cutoff)
            .slice(0, 1000),
          lbs: s.lbs.map((l) => (l.id === lbId ? { ...l, requests: l.requests + count } : l)),
          activity: [
            activity(
              s.namespace,
              `${scenario} · ${count.toLocaleString()} requests ${event.action.toLowerCase()}`,
            ),
            ...s.activity,
          ].slice(0, 500),
        });
        return `${scenario}: ${count.toLocaleString()} requests ${event.action.toLowerCase()} · HTTP ${event.responseCode}. ${event.reason}`;
      },
      adoptEndpoint: (id) =>
        set((s) => ({
          endpoints: s.endpoints.map((e) => (e.id === id ? { ...e, shadow: false } : e)),
          activity: [
            activity(s.namespace, 'Shadow endpoint added to API inventory'),
            ...s.activity,
          ],
        })),
      addNamespace: (name) =>
        set((s) => ({
          namespaces: [...s.namespaces, name],
          activity: [activity(name, `Namespace ${name} created`), ...s.activity],
        })),
      saveUser: (user) =>
        set((s) => ({
          users: s.users.some((u) => u.id === user.id)
            ? s.users.map((u) => (u.id === user.id ? user : u))
            : [...s.users, user],
          activity: [
            activity(s.namespace, `User ${user.email} saved as ${user.role}`),
            ...s.activity,
          ],
        })),
      savePolicy: (policy) =>
        set((s) => ({
          policies: s.policies.some((p) => p.id === policy.id)
            ? s.policies.map((p) => (p.id === policy.id ? policy : p))
            : [...s.policies, policy],
          activity: [activity(s.namespace, `Service policy ${policy.name} saved`), ...s.activity],
        })),
      saveSettings: (settings) =>
        set((s) => ({
          settings,
          activity: [activity(s.namespace, 'System settings updated'), ...s.activity],
        })),
      reset: () =>
        set({
          ...createDemoData(),
          namespace: 'social-hawk',
          selectedLbId: '',
          consoleLab1: null,
          applicationLbId: '',
          workspace: 'Web App & API Protection',
          page: 'Overview',
        }),
    }),
    {
      name: 'f5-xc-simulator-v1',
      version: 1,
      merge: (persisted, current) => {
        const previous = persisted as Partial<Store> | undefined;
        const wafs = previous?.wafs ?? current.wafs;
        return {
          ...current,
          ...previous,
          applicationLbId: '',
          wafs: wafs.some((w) => w.id === sharedBaseWaf.id) ? wafs : [...wafs, sharedBaseWaf],
        };
      },
      storage: createJSONStorage(() => ({
        getItem: (key) => {
          try {
            return localStorage.getItem(key);
          } catch {
            reportStorageError();
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, value);
          } catch {
            reportStorageError();
          }
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key);
          } catch {
            reportStorageError();
          }
        },
      })),
      partialize: (state) => {
        const { storageError: _error, applicationLbId: _application, ...rest } = state;
        return rest;
      },
    },
  ),
);
