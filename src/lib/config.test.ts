import { describe, expect, it } from 'vitest';
import { createDemoData } from '../data/seed';
import { evaluateRequest, lbConfig, originConfig, wafConfig, hasWaf, isLbHealthy } from './config';
import type { RouteRule, SimulatedRequest } from '../types';
const request: SimulatedRequest = {
  path: '/api/v1/products',
  method: 'GET',
  signatureState: 'Existing',
};
const route = (patch: Partial<RouteRule> = {}): RouteRule => ({
  id: 'test-route',
  name: 'api-route',
  type: 'Simple',
  path: '/api',
  match: 'Prefix',
  method: 'ANY',
  enabled: true,
  originId: 'origin-api',
  wafId: '',
  responseCode: 200,
  responseBody: 'OK',
  redirectUrl: '',
  ...patch,
});
describe('Detailed configuration evaluation', () => {
  it('normalizes legacy resources without deleting their existing settings', () => {
    const { lbs, origins, wafs } = createDemoData();
    expect(lbConfig(lbs[0]).certificate).toBe('Automatic');
    expect(wafConfig(wafs[0]).policy).toBe('Default');
    expect(originConfig(origins[0]).healthCheck).toBe('HTTP');
    expect(lbs[0].requests).toBe(128460);
  });
  it('matches the first enabled method/path route and preserves the default fallback', () => {
    const { lbs, origins, wafs } = createDemoData();
    const lb = {
      ...lbs[0],
      config: {
        ...lbConfig(),
        routes: [
          route({ enabled: false, type: 'Direct Response', responseCode: 404 }),
          route({ method: 'POST', type: 'Direct Response', responseCode: 204 }),
          route({
            id: 'fallback',
            type: 'Direct Response',
            responseCode: 200,
            responseBody: 'training',
          }),
        ],
      },
    };
    expect(evaluateRequest(lb, wafs, origins, 'Normal HTTP traffic', request).responseBody).toBe(
      'training',
    );
    expect(
      evaluateRequest(lb, wafs, origins, 'Normal HTTP traffic', { ...request, method: 'POST' })
        .responseCode,
    ).toBe(204);
    expect(
      evaluateRequest(lb, wafs, origins, 'Normal HTTP traffic', { ...request, path: '/other' })
        .reason,
    ).toContain('social-hawk-web-pool');
  });
  it('supports exact matching without matching longer paths', () => {
    const { lbs, origins, wafs } = createDemoData();
    const lb = {
      ...lbs[0],
      config: {
        ...lbConfig(),
        routes: [
          route({ match: 'Exact', path: '/health', type: 'Direct Response', responseCode: 204 }),
        ],
      },
    };
    expect(
      evaluateRequest(lb, wafs, origins, 'Normal HTTP traffic', { ...request, path: '/health' })
        .responseCode,
    ).toBe(204);
    expect(
      evaluateRequest(lb, wafs, origins, 'Normal HTTP traffic', {
        ...request,
        path: '/health/details',
      }).responseCode,
    ).toBe(200);
  });
  it('lets a route override its parent WAF while other routes inherit', () => {
    const { lbs, origins, wafs } = createDemoData();
    const lb = { ...lbs[0], config: { ...lbConfig(), routes: [route({ wafId: 'waf-monitor' })] } };
    expect(evaluateRequest(lb, wafs, origins, 'SQL Injection', request).action).toBe('Detected');
    expect(
      evaluateRequest(lb, wafs, origins, 'SQL Injection', { ...request, path: '/login' }).action,
    ).toBe('Blocked');
  });
  it('applies WAF exclusions only to matching methods, attack types and prefixes', () => {
    const { lbs, origins, wafs } = createDemoData();
    const lb = {
      ...lbs[0],
      config: {
        ...lbConfig(),
        exclusions: [
          {
            id: 'exclude',
            name: 'health',
            path: '/api',
            method: 'GET',
            attack: 'SQL Injection' as const,
          },
        ],
      },
    };
    expect(evaluateRequest(lb, wafs, origins, 'SQL Injection', request).action).toBe('Allowed');
    expect(
      evaluateRequest(lb, wafs, origins, 'SQL Injection', { ...request, method: 'POST' }).action,
    ).toBe('Blocked');
    expect(evaluateRequest(lb, wafs, origins, 'Cross-site Scripting', request).action).toBe(
      'Blocked',
    );
  });
  it.each(['Report', 'Ignore'] as const)('evaluates Custom high accuracy action %s', (action) => {
    const { lbs, origins, wafs } = createDemoData();
    const waf = {
      ...wafs[0],
      config: { ...wafConfig(), policy: 'Custom' as const, highAction: action },
    };
    expect(evaluateRequest(lbs[0], [waf], origins, 'SQL Injection', request).action).toBe(
      action === 'Report' ? 'Detected' : 'Allowed',
    );
  });
  it('disables selected attack types only in a Custom security policy', () => {
    const { lbs, origins, wafs } = createDemoData();
    const config = { ...wafConfig(), disabledAttacks: ['SQL Injection'] };
    expect(
      evaluateRequest(lbs[0], [{ ...wafs[0], config }], origins, 'SQL Injection', request).action,
    ).toBe('Blocked');
    expect(
      evaluateRequest(
        lbs[0],
        [{ ...wafs[0], config: { ...config, policy: 'Custom' } }],
        origins,
        'SQL Injection',
        request,
      ).action,
    ).toBe('Allowed');
  });
  it('reports staged new signatures but blocks existing signatures, then enforces after expiry', () => {
    const { lbs, origins, wafs } = createDemoData();
    const config = {
      ...wafConfig(),
      policy: 'Custom' as const,
      staging: 'New signatures' as const,
      stagingDays: 1,
      stagingStartedAt: new Date().toISOString(),
    };
    const waf = { ...wafs[0], config };
    expect(
      evaluateRequest(lbs[0], [waf], origins, 'SQL Injection', {
        ...request,
        signatureState: 'New',
      }).action,
    ).toBe('Detected');
    expect(evaluateRequest(lbs[0], [waf], origins, 'SQL Injection', request).action).toBe(
      'Blocked',
    );
    expect(
      evaluateRequest(
        lbs[0],
        [
          {
            ...waf,
            config: {
              ...config,
              stagingStartedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
            },
          },
        ],
        origins,
        'SQL Injection',
        { ...request, signatureState: 'New' },
      ).action,
    ).toBe('Blocked');
  });
  it('uses the custom blocking code and response body before a direct-response route', () => {
    const { lbs, origins, wafs } = createDemoData();
    const lb = {
      ...lbs[0],
      config: { ...lbConfig(), routes: [route({ type: 'Direct Response', responseCode: 204 })] },
    };
    const waf = {
      ...wafs[0],
      config: { ...wafConfig(), responseCode: 429, responseBody: 'training block' },
    };
    const event = evaluateRequest(lb, [waf], origins, 'SQL Injection', request);
    expect(event.responseCode).toBe(429);
    expect(event.responseBody).toBe('training block');
  });
  it('stages updated signatures only when new-and-updated staging is selected', () => {
    const { lbs, origins, wafs } = createDemoData();
    const config = {
      ...wafConfig(),
      policy: 'Custom' as const,
      staging: 'New signatures' as const,
    };
    const updated = { ...request, signatureState: 'Updated' as const };
    expect(
      evaluateRequest(lbs[0], [{ ...wafs[0], config }], origins, 'SQL Injection', updated).action,
    ).toBe('Blocked');
    expect(
      evaluateRequest(
        lbs[0],
        [{ ...wafs[0], config: { ...config, staging: 'New and updated signatures' } }],
        origins,
        'SQL Injection',
        updated,
      ).action,
    ).toBe('Detected');
  });
  it('returns redirect results and models unavailable upstreams as 503', () => {
    const { lbs, origins, wafs } = createDemoData();
    const lb = {
      ...lbs[0],
      config: {
        ...lbConfig(),
        routes: [
          route({
            type: 'Redirect',
            responseCode: 302,
            redirectUrl: 'https://training.example.com',
          }),
        ],
      },
    };
    expect(evaluateRequest(lb, wafs, origins, 'Normal HTTP traffic', request).responseCode).toBe(
      302,
    );
    expect(
      evaluateRequest(
        lbs[0],
        wafs,
        origins.map((o) => ({ ...o, healthy: false })),
        'Normal HTTP traffic',
        request,
      ).responseCode,
    ).toBe(503);
  });
  it('includes route-level origins and firewalls in resource summaries', () => {
    const { lbs, origins } = createDemoData();
    const lb = {
      ...lbs[0],
      wafId: '',
      config: { ...lbConfig(), routes: [route({ wafId: 'waf-standard' })] },
    };
    expect(hasWaf(lb)).toBe(true);
    expect(isLbHealthy(lb, origins)).toBe(true);
    expect(
      isLbHealthy(
        lb,
        origins.map((o) => (o.id === 'origin-api' ? { ...o, healthy: false } : o)),
      ),
    ).toBe(false);
  });
});
