import { expect, it } from 'vitest';
import { createDemoData } from '../data/seed';
import { lbConfig, wafConfig } from './config';
import { evaluateCatalogRequest } from './catalog-simulation';
import type { CatalogMatch, SimulatedRequest, WafConfig } from '../types';
const signature: CatalogMatch = {
  kind: 'signatures',
  id: '123',
  name: 'Example SQL',
  attackType: 'SQL-Injection',
  accuracy: 'High',
  risk: 'High',
};
const request: SimulatedRequest = {
  path: '/catalog-test',
  method: 'GET',
  signatureState: 'Existing',
};
function run(
  options: {
    mode?: 'Monitoring' | 'Blocking';
    config?: Partial<WafConfig>;
    match?: CatalogMatch;
    request?: Partial<SimulatedRequest>;
    noWaf?: boolean;
    unhealthy?: boolean;
  } = {},
) {
  const { lbs, wafs, origins } = createDemoData();
  const lb = { ...lbs[0], wafId: options.noWaf ? '' : wafs[0].id, config: lbConfig(lbs[0]) };
  const waf = {
    ...wafs[0],
    mode: options.mode ?? 'Blocking',
    config: { ...wafConfig(), ...options.config },
  };
  return evaluateCatalogRequest(
    lb,
    [waf],
    origins.map((o) => ({ ...o, healthy: !options.unhealthy })),
    options.match ?? signature,
    { ...request, ...options.request },
  );
}
it.each(['Monitoring', 'Blocking'] as const)(
  'evaluates %s and records a complete explanation',
  (mode) => {
    const result = run({ mode });
    expect(result.action).toBe(mode === 'Monitoring' ? 'Detected' : 'Blocked');
    expect(result.responseCode).toBe(mode === 'Monitoring' ? 200 : 403);
    expect(result.evaluationTrace.join('\n')).toContain(mode);
    expect(result.evaluationTrace.join('\n')).toContain('external_requests=0');
    expect(result.policySnapshot?.mode).toBe(mode);
  },
);
it('passes without WAF, and separates origin failure from WAF blocking', () => {
  expect(run({ noWaf: true }).action).toBe('Allowed');
  const result = run({ mode: 'Monitoring', unhealthy: true });
  expect(result.action).toBe('Detected');
  expect(result.responseCode).toBe(503);
});
it.each(['Default', 'Custom'] as const)(
  'excludes Low accuracy signatures under %s policy',
  (policy) => {
    expect(
      run({
        config: { policy, accuracy: 'High and Medium' },
        match: { ...signature, accuracy: 'Low' },
      }).action,
    ).toBe('Allowed');
  },
);
it('honors disabled attack aliases, accuracy-specific Ignore/Report, and included Low signatures', () => {
  expect(run({ config: { policy: 'Custom', disabledAttacks: ['SQL Injection'] } }).action).toBe(
    'Allowed',
  );
  expect(
    run({
      config: { policy: 'Custom', mediumAction: 'Report' },
      match: { ...signature, accuracy: 'Medium' },
    }).action,
  ).toBe('Detected');
  expect(
    run({
      config: { policy: 'Custom', lowAction: 'Ignore', accuracy: 'High, Medium and Low' },
      match: { ...signature, accuracy: 'Low' },
    }).action,
  ).toBe('Allowed');
  expect(
    run({
      config: { policy: 'Custom', accuracy: 'High, Medium and Low' },
      match: { ...signature, accuracy: 'Low' },
    }).action,
  ).toBe('Blocked');
});
it('stages New signatures until expiry and keeps existing signatures enforced', () => {
  const config: Partial<WafConfig> = {
    policy: 'Custom',
    staging: 'New signatures',
    stagingDays: 7,
    stagingStartedAt: new Date().toISOString(),
  };
  expect(run({ config, request: { signatureState: 'New' } }).action).toBe('Detected');
  expect(run({ config }).action).toBe('Blocked');
  expect(
    run({
      config: { ...config, stagingStartedAt: '2000-01-01T00:00:00Z' },
      request: { signatureState: 'New' },
    }).action,
  ).toBe('Blocked');
});
it.each([
  ['Malicious Bot', 'Blocked'],
  ['Trusted Bot', 'Detected'],
  ['Untrusted Bot', 'Detected'],
] as const)('evaluates %s using WAF signature bot settings', (botClass, action) => {
  expect(run({ match: { ...signature, kind: 'bots', botClass } }).action).toBe(action);
  expect(run({ mode: 'Monitoring', match: { ...signature, kind: 'bots', botClass } }).action).toBe(
    'Detected',
  );
});
it('honors custom bot Ignore and does not use LB Bot Defense to override WAF Monitoring', () => {
  expect(
    run({
      config: { botProtection: 'Custom', maliciousBotAction: 'Ignore' },
      match: { ...signature, kind: 'bots', botClass: 'Malicious Bot' },
    }).action,
  ).toBe('Allowed');
  expect(
    run({ mode: 'Monitoring', match: { ...signature, kind: 'bots', botClass: 'Malicious Bot' } })
      .action,
  ).toBe('Detected');
});
it('uses first route WAF and matching exclusions with expiry', () => {
  const { lbs, wafs, origins } = createDemoData();
  const lb = {
    ...lbs[0],
    config: {
      ...lbConfig(),
      routes: [
        {
          id: 'r',
          name: 'test-route',
          type: 'Simple' as const,
          enabled: true,
          method: 'GET',
          match: 'Exact' as const,
          path: request.path,
          originId: lbs[0].originId,
          wafId: wafs[1].id,
          responseCode: 200,
          responseBody: '',
          redirectUrl: '',
        },
      ],
      exclusions: [
        {
          id: 'e',
          name: 'test-exclusion',
          attack: 'SQL Injection' as const,
          path: request.path,
          method: 'GET',
          pathMatch: 'Exact' as const,
        },
      ],
    },
  };
  const result = evaluateCatalogRequest(lb, wafs, origins, signature, request);
  expect(result.evaluatedWafId).toBe(wafs[1].id);
  expect(result.action).toBe('Allowed');
  expect(result.evaluationTrace.join('\n')).toContain('test-exclusion');
  lb.config.exclusions[0] = {
    ...lb.config.exclusions[0],
    ...{ expiresAt: '2000-01-01T00:00:00Z' },
  };
  expect(
    evaluateCatalogRequest(
      lb,
      wafs.map((w) => ({ ...w, mode: 'Blocking' })),
      origins,
      signature,
      request,
    ).action,
  ).toBe('Blocked');
});
it('fails unknown bot classifications and signature accuracy instead of inventing results', () => {
  expect(() => run({ match: { ...signature, accuracy: '' } })).toThrow();
  expect(() => run({ match: { ...signature, kind: 'bots', botClass: 'Unknown' } })).toThrow();
  expect(() => run({ match: { ...signature, kind: 'bots', botClass: 'toString' } })).toThrow();
});
it('identifies response signatures as an assumed response match rather than request payload detection', () => {
  const result = run({ match: { ...signature, appliesTo: 'Response' } });
  expect(result.action).toBe('Blocked');
  expect(result.evaluationTrace.join('\n')).toContain('phase=Response');
  expect(result.evaluationTrace.join('\n')).toContain('응답을 모의 차단');
});
