import type { Endpoint, Spec, Suite } from './model';
import type { ApiLog } from './store';

export type RequestSummary = { auth: 'Authenticated' | 'Un-Authenticated'; sensitive: string[] };
const labels: [RegExp, string][] = [
  [/^(ssn|social_security_number)$/i, 'SSN'], [/^(ccn|card_?number|credit_?card)$/i, 'Credit Card'],
  [/e[-_]?mail/i, 'Email'], [/password|passwd/i, 'Password'], [/token|api[-_]?key/i, 'Token'],
];
// Store labels only; raw field values and credential values never enter this summary.
export function summarizeRequest(headers: Record<string, unknown>, body: unknown, response: unknown): RequestSummary {
  const found = new Set<string>();
  const visit = (value: unknown, depth = 0) => {
    if (depth > 12 || !value || typeof value !== 'object') return;
    Object.entries(value).forEach(([name, child]) => {
      labels.forEach(([pattern, label]) => { if (pattern.test(name)) found.add(label); });
      visit(child, depth + 1);
    });
  };
  visit(body); visit(response);
  return {
    auth: Object.entries(headers).some(([key, value]) => /^(authorization|x-api-key|x-demo-key|cookie)$/i.test(key) && !!value) ? 'Authenticated' : 'Un-Authenticated',
    sensitive: [...found],
  };
}
export type DashboardRow = Endpoint & {
  key: string; group: string; categories: string[]; sensitive: string[]; auth: string;
  threat: 'None' | 'Medium' | 'High'; schemaStatus: 'Inventory' | 'Learned' | 'Not learned';
  attacks: number; risk: number | null; lastTested: number; lastActivity: number;
  findings: Suite['checks']; logs: ApiLog[];
  testFingerprint?: string;
};
export const pathMatches = (template: string, path: string) => {
  const a = template.split('/'), b = path.split('?')[0].split('/');
  return a.length === b.length && a.every((v, i) => /^\{[^}]+\}$/.test(v) || v === b[i]);
};
export const pathSegments = (path: string) => {
  const segments = path.split('?')[0].split('/').filter(Boolean);
  return segments.length ? segments : ['/'];
};
export const endpointKey = (method: string, path: string) => `${method.toUpperCase()} ${path.split('?')[0]}`;

export function buildApiDashboard(lbId: string, spec: Spec | undefined, endpoints: Endpoint[], logs: ApiLog[], runs: (Suite & { lbId: string })[], since: number) {
  const rows = new Map<string, DashboardRow>();
  const canonical = (path: string, method: string) => Object.keys(spec?.paths ?? {}).find(p => spec!.paths[p][method.toLowerCase()] && pathMatches(p, path)) ?? path.split('?')[0];
  const ensure = (path: string, method: string) => {
    method = method.toUpperCase(); path = canonical(path, method);
    const key = endpointKey(method, path);
    if (!rows.has(key)) rows.set(key, { key, lbId, path, method, sources: [], lastSeen: 0, lastActivity: 0, calls: 0, group: '/' + (path.split('/').filter(Boolean).slice(0, 2).join('/')), categories: [], sensitive: [], auth: 'Unknown', attacks: 0, threat: 'None', schemaStatus: 'Not learned', risk: null, lastTested: 0, findings: [], logs: [] });
    return rows.get(key)!;
  };
  for (const [path, operations] of Object.entries(spec?.paths ?? {})) {
    for (const [method, operation] of Object.entries(operations)) {
      const row = ensure(path, method); row.categories.push('Inventory'); row.sources.push('OpenAPI');
      const names: string[] = [];
      const scan = (value: unknown, depth = 0) => {
        if (!value || typeof value !== 'object' || depth > 16) return;
        for (const [key, child] of Object.entries(value)) {
          if (key === 'properties' && child && typeof child === 'object') names.push(...Object.keys(child));
          scan(child, depth + 1);
        }
      };
      scan(operation);
      row.sensitive = [...new Set(names.flatMap(name => labels.filter(([re]) => re.test(name)).map(([, label]) => label)))];
    }
  }
  endpoints.filter(e => e.lbId === lbId).forEach(e => {
    const row = ensure(e.path, e.method);
    row.sources = [...new Set([...row.sources, ...e.sources])];
    row.lastSeen = Math.max(row.lastSeen, e.lastSeen); row.lastActivity = Math.max(row.lastActivity, e.lastSeen);
    row.categories.push('Discovered');
    if (!row.categories.includes('Inventory')) row.categories.push('Shadow');
  });
  const allLogs = logs.filter(l => l.lbId === lbId);
  allLogs.forEach(l => {
    const row = ensure(l.path, l.method);
    row.lastActivity = Math.max(row.lastActivity, l.at);
    row.sensitive = [...new Set([...row.sensitive, ...(l.summary?.sensitive ?? [])])];
    row.sources = [...new Set([...row.sources, 'Traffic'])];
  });
  const selectedLogs = allLogs.filter(l => l.at >= since);
  selectedLogs.forEach(l => {
    const row = ensure(l.path, l.method); row.calls++; row.logs.push(l);
    row.sources = [...new Set([...row.sources, 'Traffic'])];
    row.sensitive = [...new Set([...row.sensitive, ...(l.summary?.sensitive ?? [])])];
    if (l.action === 'Detected' || l.action === 'Blocked') row.attacks++;
  });
  const latestTests = new Map<string, Suite>();
  for (const run of [...runs.filter(r => r.lbId === lbId)].sort((a,b) => b.at - a.at)) {
    for (const check of run.checks) {
      const row = ensure(check.path, check.method);
      if (!latestTests.has(row.key)) latestTests.set(row.key, run);
      if (latestTests.get(row.key) === run) {
        row.lastTested = run.at; row.testFingerprint = run.fingerprint; row.findings.push(check);
      }
      row.lastActivity = Math.max(row.lastActivity, run.at);
    }
  }
  for (const row of rows.values()) {
    row.categories = [...new Set(row.categories)];
    if (!row.categories.length) row.categories = ['Observed'];
    row.logs.sort((a,b) => b.at - a.at);
    const auth = new Set(allLogs.filter(l => endpointKey(l.method, canonical(l.path, l.method)) === row.key).map(l => l.summary?.auth ?? 'Unknown'));
    row.schemaStatus = row.categories.includes('Inventory') ? 'Inventory' : row.categories.includes('Discovered') ? 'Learned' : 'Not learned';
    row.threat = row.logs.some(l => l.action === 'Detected') ? 'High' : row.attacks ? 'Medium' : 'None';
    row.auth = auth.size > 1 ? 'Mixed' : [...auth][0] ?? 'Unknown';
    row.risk = row.findings.some(c => c.outcome === 'Open') ? 80 : row.logs.some(l => l.action === 'Detected') ? 60 : row.logs.some(l => l.action === 'Blocked') ? 40 : row.calls || row.findings.some(c => c.outcome === 'Mitigated') ? 0 : null;
  }
  return {
    rows: [...rows.values()], total: selectedLogs.length,
    statuses: [1,2,3,4,5].map(n => ({ name: `${n}XX`, count: selectedLogs.filter(l => Math.floor(l.code / 100) === n).length })),
  };
}
