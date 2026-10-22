import { expect, it } from 'vitest';
import { buildApiDashboard, summarizeRequest, pathSegments } from './dashboard';
import { demoSpec } from './model';
import type { ApiLog } from './store';

const log = (code: number, action: ApiLog['action'], lbId = 'lb'): ApiLog => ({
  id: `${code}`,
  lbId,
  at: 1000,
  path: '/api/orders?limit=2',
  method: 'POST',
  code,
  action,
  phase: 'request',
  reason: 'local schema check',
  trace: [],
  settings: '{}',
});
it('counts real request logs, scopes LB and joins Inventory with Traffic by method and path', () => {
  const data = buildApiDashboard(
    'lb',
    demoSpec,
    [],
    [log(200, 'Detected'), log(403, 'Blocked'), log(200, 'Allowed', 'other')],
    [],
    0,
  );
  expect(data.total).toBe(2);
  expect(data.statuses.map((x) => x.count)).toEqual([0, 1, 0, 1, 0]);
  const row = data.rows.find((x) => x.path === '/api/orders' && x.method === 'POST')!;
  expect(row.calls).toBe(2);
  expect(row.attacks).toBe(2);
  expect(row.categories).toContain('Inventory');
  expect(row.sources).toContain('Traffic');
  expect(data.rows.find((x) => x.path === '/api/orders' && x.method === 'GET')!.calls).toBe(0);
});
it('reports auth header presence and field-name labels without storing values', () => {
  const summary = summarizeRequest(
    { authorization: 'Bearer private', 'X-API-Key': 'secret' },
    { email: 'private@example.test', password: 'secret', nested: { card_number: '123' } },
    {},
  );
  expect(summary.auth).toBe('Authenticated');
  expect(summary.sensitive.sort()).toEqual(['Credit Card', 'Email', 'Password']);
  expect(JSON.stringify(summary)).not.toContain('secret');
  expect(summarizeRequest({}, {}, {}).auth).toBe('Un-Authenticated');
});
it('matches parameterized paths and keeps test findings separate from actual calls', () => {
  const data = buildApiDashboard(
    'lb',
    demoSpec,
    [],
    [{ ...log(200, 'Allowed'), path: '/api/orders/42', method: 'DELETE' }],
    [
      {
        lbId: 'lb',
        at: 2000,
        checks: [
          {
            path: '/api/orders/{id}',
            method: 'DELETE',
            outcome: 'Open',
            name: 'test',
            source: 'API Testing',
            reason: 'dummy role mismatch',
          },
        ],
        trace: [],
        fingerprint: '{}',
      },
    ],
    0,
  );
  expect(data.total).toBe(1);
  const row = data.rows.find((x) => x.method === 'DELETE')!;
  expect(row.path).toBe('/api/orders/{id}');
  expect(row.risk).toBe(80);
  expect(row.lastTested).toBe(2000);
  expect(row.findings).toHaveLength(1);
});
it('does not fabricate activity for code crawling fixtures and filters logs by time', () => {
  const data = buildApiDashboard(
    'lb',
    undefined,
    [
      {
        lbId: 'lb',
        path: '/crawl',
        method: 'GET',
        sources: ['API Crawling'],
        lastSeen: 500,
        calls: 9,
      },
    ],
    [log(200, 'Allowed')],
    [],
    1500,
  );
  expect(data.total).toBe(0);
  expect(data.rows.find((x) => x.path === '/crawl')!.calls).toBe(0);
  expect(data.rows.find((x) => x.path === '/crawl')!.categories).not.toContain('Shadow');
  const withInventory=buildApiDashboard('lb',demoSpec,[{lbId:'lb',path:'/crawl',method:'GET',sources:['API Crawling'],lastSeen:500,calls:9}],[],[],1500);
  expect(withInventory.rows.find(x=>x.path==='/crawl')!.categories).toContain('Shadow');
});

it('uses the latest run when two runs share the same simulated timestamp', () => {
  const check = {
    path: '/api/admin',
    method: 'GET',
    name: 'auth',
    source: 'API Testing' as const,
    reason: 'dummy',
  };
  const runs = [
    {
      lbId: 'lb',
      at: 1000,
      checks: [{ ...check, outcome: 'Mitigated' as const }],
      trace: [],
      fingerprint: 'new',
    },
    {
      lbId: 'lb',
      at: 1000,
      checks: [{ ...check, outcome: 'Open' as const }],
      trace: [],
      fingerprint: 'old',
    },
  ];
  const row = buildApiDashboard('lb', demoSpec, [], [], runs, 0).rows.find(
    (r) => r.path === '/api/admin',
  )!;
  expect(row.risk).toBe(0);
  expect(row.findings).toHaveLength(1);
  expect(row.testFingerprint).toBe('new');
});

it('retains learned classifications and latest testing metadata outside the traffic time window', () => {
  const data = buildApiDashboard(
    'lb',
    demoSpec,
    [],
    [{ ...log(200, 'Detected'), summary: { auth: 'Authenticated', sensitive: ['credit-card'] } }],
    [],
    2000,
  );
  const row = data.rows.find((r) => r.method === 'POST' && r.path === '/api/orders')!;
  expect(data.total).toBe(0);
  expect(row.calls).toBe(0);
  expect(row.sensitive).toContain('credit-card');
  expect(row.auth).toBe('Authenticated');
  expect(row.lastActivity).toBe(1000);
  expect(row.threat).toBe('None');
  expect(row.schemaStatus).toBe('Inventory');
});

it('builds path hierarchy segments without confusing query values with a segment', () => {
  expect(pathSegments('/api/orders/{id}?limit=2')).toEqual(['api', 'orders', '{id}']);
  expect(pathSegments('/')).toEqual(['/']);
});
