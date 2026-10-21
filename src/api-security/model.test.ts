import { beforeEach, expect, it } from 'vitest';
import {
  defaults,
  demoSpec,
  evaluateApi,
  parseSpec,
  environmentError,
  learnEndpoint,
  runSuite,
} from './model';
import type { ApiSettings, TestEnvironment } from './model';
import { useApiSecurity } from './store';
import { useConsole } from '../store';
const lb = () => useConsole.getState().lbs[0];
beforeEach(() => {
  localStorage.clear();
  useConsole.getState().reset();
  useApiSecurity.setState({
    files: [],
    definitions: [],
    integrations: [],
    endpoints: [],
    logs: [],
    runs: [],
  });
});
it('Report, Block, Skip and fall-through depend on the saved config, not canned success', () => {
  const c: ApiSettings = {
    ...defaults(),
    definitionId: 'def',
    validation: 'API Inventory' as const,
    requestMode: 'Validate' as const,
  };
  const spec = parseSpec(JSON.stringify(demoSpec));
  const q = { path: '/api/orders', method: 'POST', body: { quantity: 'wrong' } };
  expect(evaluateApi(c, spec, q).action).toBe('Detected');
  c.requestAction = 'Block';
  expect(evaluateApi(c, spec, q)).toMatchObject({ action: 'Blocked', code: 403 });
  expect(evaluateApi(c, spec, { ...q, body: { quantity: 2 } }).code).toBe(200);
  c.requestMode = 'Skip';
  expect(evaluateApi(c, spec, q).action).toBe('Allowed');
  c.fallMode = 'Custom';
  c.fallRules = [
    { name: 'unknown', path: '/api/unknown', method: 'GET', domain: 'Any Domain', action: 'Block' },
  ];
  expect(evaluateApi(c, spec, { path: '/api/unknown', method: 'GET' }).code).toBe(403);
  expect(evaluateApi(c, spec, { path: '/else', method: 'GET' }).code).toBe(200);
});
it('Custom List scopes rule domain/method/path and response processing independently', () => {
  const c: ApiSettings = { ...defaults(), definitionId: 'def', validation: 'Custom List' };
  c.rules = [
    {
      name: 'orders',
      path: '/api/orders',
      method: 'POST',
      domain: 'shop.example.com',
      action: 'Block',
    },
  ];
  const spec = parseSpec(JSON.stringify(demoSpec));
  expect(
    evaluateApi(c, spec, {
      path: '/api/orders',
      method: 'POST',
      domain: 'shop.example.com',
      body: {},
    }).code,
  ).toBe(403);
  expect(
    evaluateApi(c, spec, {
      path: '/api/orders',
      method: 'POST',
      domain: 'other.example.com',
      body: {},
    }).code,
  ).toBe(200);
  c.validation = 'API Inventory';
  c.requestMode = 'Skip';
  c.responseMode = 'Validate';
  c.responseAction = 'Block';
  expect(
    evaluateApi(c, spec, { path: '/api/orders', method: 'POST', responseBody: { id: 12 } }).phase,
  ).toBe('response');
});
it('rejects malformed and unsupported specs without fetching remote refs', () => {
  expect(() => parseSpec('{}')).toThrow();
  expect(() => parseSpec('{')).toThrow();
  expect(() =>
    parseSpec(
      JSON.stringify({
        ...demoSpec,
        paths: { '/x': { get: { $ref: 'https://invalid.example/spec' } } },
      }),
    ),
  ).toThrow(/ref/i);
});
it('discovery learns eligible responses only, merges sources and honors redirects', () => {
  const c = defaults();
  expect(
    learnEndpoint([], c, 'lb', { path: '/api/orders', method: 'GET', code: 200 }, 0),
  ).toHaveLength(0);
  c.discovery = true;
  let endpoints = learnEndpoint([], c, 'lb', { path: '/api/orders', method: 'GET', code: 200 }, 0);
  endpoints = learnEndpoint(
    endpoints,
    c,
    'lb',
    { path: '/api/orders', method: 'GET', code: 200, source: 'Code' },
    1,
  );
  expect(endpoints[0].sources).toEqual(['Traffic', 'Code']);
  expect(
    learnEndpoint(endpoints, c, 'lb', { path: '/redirect', method: 'GET', code: 302 }, 1),
  ).toHaveLength(1);
  c.redirects = true;
  expect(
    learnEndpoint(endpoints, c, 'lb', { path: '/redirect', method: 'GET', code: 302 }, 1),
  ).toHaveLength(2);
  expect(
    learnEndpoint(endpoints, c, 'lb', { path: '/fail', method: 'GET', code: 403 }, 1),
  ).toHaveLength(1);
});
it('requires LB domain and 2 standard/1 admin distinct valid credentials', () => {
  const env: TestEnvironment = { domain: lb().domains[0], destructive: false, credentials: [] };
  expect(environmentError(env, lb().domains)).toMatch(/3|Standard/);
  env.credentials = ['u1', 'u2', 'admin'].map((name, i) => ({
    name,
    type: 'API Key' as const,
    role: i < 2 ? ('Standard' as const) : ('Admin' as const),
    key: 'x-demo',
    value: 'demo-only',
  }));
  expect(environmentError(env, lb().domains)).toBe('');
  expect(environmentError({ ...env, domain: 'outside.example.com' }, lb().domains)).not.toBe('');
  expect(
    environmentError(
      { ...env, credentials: env.credentials.map((c) => ({ ...c, role: 'Standard' as const })) },
      lb().domains,
    ),
  ).not.toBe('');
});
it('stores files/definitions, prevents dangling references and survives rehydration', async () => {
  const s = useApiSecurity.getState();
  const f = s.saveFile({
    name: 'demo',
    namespace: lb().namespace,
    description: '',
    text: JSON.stringify(demoSpec),
  });
  const d = s.saveDefinition({
    name: 'demo-def',
    namespace: lb().namespace,
    description: '',
    fileIds: [f.id],
  });
  expect(() => s.deleteResource('file', f.id, [])).toThrow(/refer/i);
  expect(() =>
    s.saveDefinition({
      name: 'bad',
      namespace: lb().namespace,
      description: '',
      fileIds: ['missing'],
    }),
  ).toThrow();
  const saved = localStorage.getItem('f5-xc-api-security-v1')!;
  useApiSecurity.setState({ files: [], definitions: [] });
  localStorage.setItem('f5-xc-api-security-v1', saved);
  await useApiSecurity.persist.rehydrate();
  expect(useApiSecurity.getState().definitions[0].id).toBe(d.id);
});
it('suite requires saved prerequisites and produces role/response evidence; disabled destructive methods skip', () => {
  const c = defaults();
  expect(() => runSuite(c, parseSpec(JSON.stringify(demoSpec)), lb().domains, 0)).toThrow();
  c.testing = true;
  c.environments = [
    {
      domain: lb().domains[0],
      destructive: false,
      credentials: ['u1', 'u2', 'admin'].map((name, i) => ({
        name,
        type: 'API Key',
        role: i < 2 ? 'Standard' : 'Admin',
        key: 'x-demo',
        value: 'demo-only',
      })),
    },
  ];
  const run = runSuite(c, parseSpec(JSON.stringify(demoSpec)), lb().domains, 1);
  expect(run.checks.some((x) => x.method === 'DELETE' && x.outcome === 'Skipped')).toBe(true);
  expect(run.trace.join(' ')).toContain('external_requests=0');
  c.environments[0].destructive = true;
  expect(
    runSuite(c, parseSpec(JSON.stringify(demoSpec)), lb().domains, 2).checks.some(
      (x) => x.method === 'DELETE' && x.outcome !== 'Skipped',
    ),
  ).toBe(true);
});

it('expired credentials and response schema violations cannot silently pass', () => {
  const env: TestEnvironment = {
    domain: lb().domains[0],
    destructive: false,
    credentials: ['u1', 'u2', 'a'].map((name, i) => ({
      name,
      type: 'Bearer Token',
      role: i < 2 ? 'Standard' : 'Admin',
      value: 'demo',
      expiresAt: '2000-01-01',
    })),
  };
  expect(environmentError(env, lb().domains)).toMatch(/expired/);
  const c: ApiSettings = {
    ...defaults(),
    definitionId: 'def',
    validation: 'API Inventory',
    requestMode: 'Skip',
    responseMode: 'Validate',
    responseAction: 'Block',
  };
  expect(
    evaluateApi(c, parseSpec(JSON.stringify(demoSpec)), {
      method: 'POST',
      path: '/api/orders',
      responseBody: { id: 5 },
    }),
  ).toMatchObject({ code: 403, phase: 'response' });
});
it('existing console application requests use saved API mode and preserve report/block event evidence', () => {
  const s = useApiSecurity.getState(),
    target = lb();
  const f = s.saveFile({
    name: 'local-api',
    namespace: target.namespace,
    description: '',
    text: JSON.stringify(demoSpec),
  });
  const d = s.saveDefinition({
    name: 'local-definition',
    namespace: target.namespace,
    description: '',
    fileIds: [f.id],
  });
  const c: ApiSettings = {
    ...defaults(),
    discovery: true,
    definitionId: d.id,
    validation: 'API Inventory',
    requestAction: 'Report',
  };
  useConsole.getState().saveLb({
    ...target,
    wafId: '',
    apiProtection: true,
    config: { ...target.config!, apiSecurity: c },
  });
  const a = useConsole.getState().requestApplication(target.id, '/api/orders?limit=wrong', 'GET');
  expect(a).toMatchObject({ responseCode: 200, action: 'Detected' });
  useConsole.getState().saveLb({
    ...useConsole.getState().lbs.find((l) => l.id === target.id)!,
    config: { ...target.config!, apiSecurity: { ...c, requestAction: 'Block' } },
  });
  expect(
    useConsole.getState().requestApplication(target.id, '/api/orders?limit=wrong', 'GET'),
  ).toMatchObject({ responseCode: 403, action: 'Blocked' });
  expect(useConsole.getState().events.find((e) => e.id === a.id)?.action).toBe('Detected');
});

it('validates schema locations and explicit skip, missing refs and namespace boundaries', () => {
  const spec = parseSpec(JSON.stringify(demoSpec));
  const c: ApiSettings = {
    ...defaults(),
    definitionId: 'def',
    validation: 'API Inventory',
    requestAction: 'Block',
  };
  expect(evaluateApi(c, spec, { path: '/api/orders?limit=bad', method: 'GET' })).toMatchObject({
    code: 403,
    action: 'Blocked',
  });
  c.requestProperties = [];
  expect(evaluateApi(c, spec, { path: '/api/orders?limit=bad', method: 'GET' }).code).toBe(200);
  expect(evaluateApi(c, undefined, { path: '/api/orders', method: 'GET' }).code).toBe(403);
  const s = useApiSecurity.getState(),
    f = s.saveFile({
      name: 'other-api',
      namespace: 'different',
      description: '',
      text: JSON.stringify(demoSpec),
    });
  expect(() =>
    s.saveDefinition({
      name: 'bad-ref',
      namespace: lb().namespace,
      description: '',
      fileIds: [f.id],
    }),
  ).toThrow(/Namespace/);
});
it('scheduled runs, purge and evidence persistence use the saved LB configuration and simulated clock', async () => {
  const s = useApiSecurity.getState(),
    target = lb();
  const file = s.saveFile({
    name: 'time-api',
    namespace: target.namespace,
    description: '',
    text: JSON.stringify(demoSpec),
  });
  const def = s.saveDefinition({
    name: 'time-def',
    namespace: target.namespace,
    description: '',
    fileIds: [file.id],
  });
  const c: ApiSettings = {
    ...defaults(),
    discovery: true,
    purgeDays: 1,
    definitionId: def.id,
    testing: true,
    frequency: 'Every Week',
    environments: [
      {
        domain: target.domains[0],
        destructive: false,
        credentials: ['u1', 'u2', 'admin'].map((name, i) => ({
          name,
          type: 'API Key',
          role: i < 2 ? 'Standard' : 'Admin',
          key: 'x-demo',
          value: 'demo-only',
        })),
      },
    ],
  };
  const configured = { ...target, config: { ...target.config!, apiSecurity: c } };
  s.probe(configured, { path: '/api/orders', method: 'GET' });
  s.run(configured);
  s.advance([configured], 1);
  expect(useApiSecurity.getState().runs).toHaveLength(1);
  s.advance([configured], 6);
  expect(useApiSecurity.getState().runs).toHaveLength(2);
  s.purge(configured);
  expect(useApiSecurity.getState().endpoints).toHaveLength(0);
  const serialized = localStorage.getItem('f5-xc-api-security-v1')!;
  useApiSecurity.setState({ runs: [], logs: [] });
  localStorage.setItem('f5-xc-api-security-v1', serialized);
  await useApiSecurity.persist.rehydrate();
  expect(useApiSecurity.getState().runs).toHaveLength(2);
  expect(useApiSecurity.getState().logs).toHaveLength(1);
  expect(useApiSecurity.getState().runs[0].trace.join(' ')).not.toContain('demo-only');
});
