import { expect, it } from 'vitest';
import { createDemoData } from '../data/seed';
import { evaluateRequest, lbConfig } from './config';
import { exclusionFromEvent, exactPathRegex, literalPath, exclusionError } from './waf-exclusions';
import type { WafExclusion } from '../types';
import { useConsole } from '../store';
const fixture = () => {
  const data = createDemoData(),
    lb = data.lbs[0];
  const rule: WafExclusion = {
    id: 'exact',
    name: 'product-sqli',
    path: '/product',
    pathMatch: 'Exact',
    method: 'GET',
    attack: 'SQL Injection',
    domain: lb.domains[0],
    expiresAt: '2099-01-01T00:00:00Z',
  };
  lb.config = { ...lbConfig(lb), exclusions: [rule] };
  return { ...data, lb, rule };
};
it('allows only the selected attack on an exact domain, path and method', () => {
  const { lb, wafs, origins } = fixture();
  const request = {
    path: '/product?id=4%20OR%201=1',
    method: 'GET',
    signatureState: 'Existing' as const,
    authority: lb.domains[0],
  };
  expect(evaluateRequest(lb, wafs, origins, 'SQL Injection', request).action).toBe('Allowed');
  for (const scenario of ['Cross-site Scripting', 'Command Injection'] as const)
    expect(evaluateRequest(lb, wafs, origins, scenario, request).action).toBe('Blocked');
  for (const patch of [
    { path: '/product/extra?id=4 OR 1=1' },
    { method: 'POST' },
    { authority: 'other.example.com' },
  ])
    expect(
      evaluateRequest(lb, wafs, origins, 'SQL Injection', { ...request, ...patch }).action,
    ).toBe('Blocked');
});
it.each(['2000-01-01T00:00:00Z', 'not-a-timestamp'])(
  'ignores expired or invalid expiration %s',
  (expiresAt) => {
    const { lb, wafs, origins, rule } = fixture();
    lb.config!.exclusions = [{ ...rule, expiresAt }];
    expect(
      evaluateRequest(lb, wafs, origins, 'SQL Injection', {
        path: '/product?id=4 OR 1=1',
        method: 'GET',
        signatureState: 'Existing',
      }).action,
    ).toBe('Blocked');
  },
);
it('retains legacy prefix and ANY/All exclusion semantics', () => {
  const { lb, wafs, origins } = fixture();
  lb.config!.exclusions = [
    { id: 'legacy', name: 'legacy', path: '/product', attack: 'All', method: 'ANY' },
  ];
  expect(
    evaluateRequest(lb, wafs, origins, 'Command Injection', {
      path: '/product/sub?cmd=cat /etc/passwd',
      method: 'POST',
      signatureState: 'Existing',
    }).action,
  ).toBe('Allowed');
});
it('seeds an event exclusion with the exact path, attack, method and authority', () => {
  const { lb, events } = fixture();
  const event = {
    ...events[0],
    path: '/cart?search=<script>',
    scenario: 'Cross-site Scripting' as const,
    method: 'POST',
    authority: 'alternate.example.com',
  };
  const rule = exclusionFromEvent(event, lb);
  expect(rule).toMatchObject({
    path: '/cart',
    pathMatch: 'Exact',
    attack: 'Cross-site Scripting',
    method: 'POST',
    domain: 'alternate.example.com',
  });
  expect(rule.id).not.toBe(event.id);
});
it('converts anchored literal paths without executing arbitrary regex patterns', () => {
  const path = '/api/v1.0/(products)+';
  expect(literalPath(exactPathRegex(path))).toBe(path);
  expect(literalPath('^/$')).toBe('/');
  for (const pattern of ['.*', '^/(a+)+$', '^/product.*$', '/product', '^/product$extra'])
    expect(literalPath(pattern)).toBeUndefined();
});
it('validates required fields, expiry and names before either Apply or LB Save', () => {
  const { rule } = fixture();
  expect(exclusionError(rule)).toBe('');
  expect(exclusionError({ ...rule, name: '' })).toContain('name');
  expect(exclusionError({ ...rule, path: 'relative' })).toContain('path');
  expect(exclusionError({ ...rule, expiresAt: 'invalid' })).toContain('timestamp');
  expect(exclusionError({ ...rule, domain: 'https://example.com' })).toContain('domain');
});

it('persists host-scoped exceptions and leaves another LB sharing the WAF protected', async () => {
  localStorage.clear();
  useConsole.getState().reset();
  const s = useConsole.getState(),
    lb = s.lbs[0];
  s.saveLb({ ...lb, domains: [...lb.domains, 'alternate.example.com'] });
  const blocked = s.requestApplication(lb.id, '/product?id=4%20OR%201=1', 'GET');
  const current = useConsole.getState().lbs.find((l) => l.id === lb.id)!;
  s.saveLb({
    ...current,
    config: { ...lbConfig(current), exclusions: [exclusionFromEvent(blocked, current)] },
  });
  expect(s.requestApplication(lb.id, '/product?id=4%20OR%201=1', 'GET').responseCode).toBe(200);
  const other = s.requestApplication(
    lb.id,
    'https://alternate.example.com/product?id=4%20OR%201=1',
    'GET',
  );
  expect(other).toMatchObject({ authority: 'alternate.example.com', responseCode: 403 });
  const peer = s.lbs.find((l) => l.id !== lb.id && l.wafId === lb.wafId)!;
  expect(s.requestApplication(peer.id, '/product?id=4%20OR%201=1', 'GET').responseCode).toBe(403);
  expect(useConsole.getState().events.find((e) => e.id === blocked.id)!.responseCode).toBe(403);
  const saved = localStorage.getItem('f5-xc-simulator-v1')!;
  useConsole.setState({ lbs: [] });
  localStorage.setItem('f5-xc-simulator-v1', saved);
  await useConsole.persist.rehydrate();
  expect(
    useConsole.getState().requestApplication(lb.id, '/product?id=4%20OR%201=1', 'GET').responseCode,
  ).toBe(200);
});
