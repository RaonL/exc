import { beforeEach, expect, it, vi } from 'vitest';
import { useConsole } from '../store';
import { wafConfig, lbConfig } from './config';
import type { CatalogMatch, SimulatedRequest } from '../types';
const match: CatalogMatch = {
  kind: 'signatures',
  id: 'test-1',
  name: 'Catalog test',
  attackType: 'SQL-Injection',
  accuracy: 'High',
  risk: 'High',
};
const request: SimulatedRequest = {
  path: '/catalog-test',
  method: 'GET',
  signatureState: 'Existing',
};
beforeEach(() => {
  localStorage.clear();
  useConsole.getState().reset();
});
it('persists a single event and snapshot, preserving earlier results after policy changes', () => {
  const s = useConsole.getState(),
    lb = s.lbs[0],
    waf = s.wafs.find((w) => w.id === lb.wafId)!;
  s.saveWaf({ ...waf, mode: 'Monitoring', config: wafConfig(waf) });
  const first = s.runCatalogTest(lb.id, match, request);
  expect(first.action).toBe('Detected');
  expect(first.count).toBe(1);
  s.saveWaf({
    ...waf,
    mode: 'Blocking',
    config: { ...wafConfig(waf), responseCode: 429, responseBody: 'Blocked {{request_id}}' },
  });
  const second = s.runCatalogTest(lb.id, match, request);
  expect(second.action).toBe('Blocked');
  expect(second.responseCode).toBe(429);
  expect(second.responseBody).toContain(second.id);
  const events = useConsole.getState().events;
  expect(events.find((e) => e.id === first.id)?.action).toBe('Detected');
  expect(events.find((e) => e.id === first.id)?.policySnapshot?.mode).toBe('Monitoring');
  expect(
    JSON.parse(localStorage.getItem('f5-xc-simulator-v1')!).state.events[0].evaluationTrace,
  ).toEqual(second.evaluationTrace);
  expect(useConsole.getState().lbs.find((l) => l.id === lb.id)?.requests).toBe(lb.requests + 2);
});
it('rejects wrong-namespace LB and invalid inputs without creating events or making requests', () => {
  const s = useConsole.getState(),
    before = s.events.length;
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  expect(() => s.runCatalogTest('missing', match, request)).toThrow();
  s.setNamespace('production');
  expect(() => s.runCatalogTest(s.lbs[0].id, match, request)).toThrow();
  s.setNamespace('social-hawk');
  expect(() =>
    s.runCatalogTest(s.lbs[0].id, match, { ...request, path: 'https://example.test' }),
  ).toThrow();
  expect(useConsole.getState().events).toHaveLength(before);
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});
it('uses route response after WAF report and snapshots route-scoped policy decisions', () => {
  const s = useConsole.getState(),
    lb = s.lbs[0],
    waf = s.wafs[0];
  s.saveWaf({ ...waf, mode: 'Monitoring' });
  s.saveLb({
    ...lb,
    config: {
      ...lbConfig(lb),
      routes: [
        {
          id: 'direct',
          name: 'direct',
          type: 'Direct Response',
          enabled: true,
          method: 'ANY',
          match: 'Exact',
          path: request.path,
          originId: lb.originId,
          wafId: waf.id,
          responseCode: 202,
          responseBody: 'training response',
          redirectUrl: '',
        },
      ],
    },
  });
  const event = s.runCatalogTest(lb.id, match, request);
  expect(event.responseCode).toBe(202);
  expect(event.action).toBe('Detected');
  expect(event.evaluationTrace?.join('\n')).toContain('direct');
});
