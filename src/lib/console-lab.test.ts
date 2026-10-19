import { beforeEach, expect, it } from 'vitest';
import { useConsole } from '../store';
import { lbConfig, originConfig } from './config';
import {
  classifyLocalPath,
  consoleLab1Checks,
  lab1Samples,
  localRequestPath,
  sharedBaseWaf,
} from './console-lab';
import type { LB } from '../types';
beforeEach(() => {
  localStorage.clear();
  useConsole.getState().reset();
});
function createFromConsole() {
  const s = useConsole.getState();
  s.startConsoleLab1();
  const ns = useConsole.getState().namespace;
  s.saveOrigin({
    id: 'console-pool',
    namespace: ns,
    name: `${ns}-pool`,
    endpoint: 'demo-app.amer.myedgedemo.com',
    port: 80,
    healthy: true,
    config: { ...originConfig(), type: 'Public DNS' },
  });
  const lb: LB = {
    id: 'console-lb',
    namespace: ns,
    name: `${ns}-lb`,
    domains: [`${ns}.lab-sec.f5demos.com`],
    protocol: 'HTTP',
    originId: 'console-pool',
    wafId: '',
    apiProtection: false,
    botDefense: false,
    ddosProtection: false,
    requests: 0,
    createdAt: new Date().toISOString(),
    config: {
      ...lbConfig(),
      listenPort: 80,
      manageDns: true,
      listenPortChoice: 'HTTP Listen Port',
    },
  };
  s.saveLb(lb);
  return lb;
}
it('starts an empty console namespace and preserves existing resources on repeat', () => {
  const before = JSON.stringify(useConsole.getState().lbs);
  useConsole.getState().startConsoleLab1();
  expect(JSON.stringify(useConsole.getState().lbs)).toBe(before);
  expect(useConsole.getState().page).toBe('Origin Pools');
  expect(useConsole.getState().origins.filter((o) => o.namespace === 'class1-lab1')).toEqual([]);
  const at = useConsole.getState().consoleLab1!.startedAt;
  useConsole.getState().startConsoleLab1();
  expect(useConsole.getState().consoleLab1!.startedAt).toBe(at);
  expect(useConsole.getState().wafs.filter((w) => w.id === sharedBaseWaf.id)).toHaveLength(1);
});
it('completes Lab 1 only using saved console resources, genuine request records and inspection', () => {
  const lb = createFromConsole(),
    s = useConsole.getState();
  let checks = consoleLab1Checks(useConsole.getState(), useConsole.getState().consoleLab1!);
  expect(checks.filter((c) => c.pass)).toHaveLength(2);
  const baseline = s.requestApplication(lb.id, '/headers', 'GET');
  expect(baseline.responseCode).toBe(200);
  expect(baseline.evaluatedWafId).toBeUndefined();
  s.saveLb({ ...useConsole.getState().lbs.find((l) => l.id === lb.id)!, wafId: sharedBaseWaf.id });
  const normal = s.requestApplication(lb.id, '/', 'GET');
  expect(normal.responseCode).toBe(200);
  expect(normal.evaluatedWafId).toBe(sharedBaseWaf.id);
  for (const sample of lab1Samples.slice(2)) {
    const event = s.requestApplication(lb.id, sample.path, 'GET');
    expect(event.responseCode).toBe(403);
    expect(event.count).toBe(1);
    expect(event.responseBody).toContain(event.id);
    expect(event.generatedBy).toBe('console-request');
  }
  checks = consoleLab1Checks(useConsole.getState(), useConsole.getState().consoleLab1!);
  expect(checks.filter((c) => c.pass)).toHaveLength(5);
  s.inspectRequest(useConsole.getState().events[0].id);
  expect(
    consoleLab1Checks(useConsole.getState(), useConsole.getState().consoleLab1!).every(
      (c) => c.pass,
    ),
  ).toBe(true);
  s.saveLb({
    ...useConsole.getState().lbs.find((l) => l.id === lb.id)!,
    config: { ...lb.config!, manageDns: false },
  });
  expect(
    consoleLab1Checks(useConsole.getState(), useConsole.getState().consoleLab1!).find(
      (c) => c.id === 'lb',
    )!.pass,
  ).toBe(false);
});
it('evaluates new requests with current WAF mode while preserving historical console evidence', () => {
  const lb = createFromConsole(),
    s = useConsole.getState();
  s.saveLb({ ...lb, wafId: sharedBaseWaf.id });
  const blocked = s.requestApplication(lb.id, '/product?id=4%20OR%201=1', 'GET');
  s.saveWaf({ ...sharedBaseWaf, mode: 'Monitoring' });
  expect(useConsole.getState().events.find((e) => e.id === blocked.id)!.responseCode).toBe(403);
  const detected = s.requestApplication(lb.id, '/product?id=4%20OR%201=1', 'GET');
  expect(detected.responseCode).toBe(200);
  expect(detected.action).toBe('Detected');
});
it('classifies the official encoded query patterns without executing content', () => {
  expect(classifyLocalPath('/?cmd=cat%20/etc/passwd')).toBe('Command Injection');
  expect(classifyLocalPath('/product?id=4%27%20OR%20%271%27=%271')).toBe('SQL Injection');
  expect(classifyLocalPath('/cart?search=%3Cscript%3Ealert(1)%3C%2Fscript%3E')).toBe(
    'Cross-site Scripting',
  );
  expect(classifyLocalPath('/product?id=42')).toBe('Normal HTTP traffic');
  expect(classifyLocalPath('/?q=%ZZ')).toBe('Normal HTTP traffic');
});
it('accepts only the selected LB host, protocol and port in the virtual address bar', () => {
  const lb = createFromConsole();
  expect(localRequestPath(lb, `http://${lb.domains[0]}/headers`)).toBe('/headers');
  for (const value of [
    'https://example.com/',
    'javascript:alert(1)',
    '//example.com/',
    'https://' + lb.domains[0] + '/',
    'http://' + lb.domains[0] + ':9000/',
  ])
    expect(() => localRequestPath(lb, value)).toThrow();
});
it('reflects origin failure and disables requests outside the current namespace', () => {
  const lb = createFromConsole(),
    s = useConsole.getState();
  s.setOriginHealth(lb.originId, false);
  expect(s.requestApplication(lb.id, '/', 'GET').responseCode).toBe(503);
  s.setNamespace('production');
  expect(() => s.requestApplication(lb.id, '/', 'GET')).toThrow();
});
it('does not make a WAF in a foreign namespace attachable but allows shared policies', () => {
  const lb = createFromConsole(),
    s = useConsole.getState();
  s.saveWaf({ ...sharedBaseWaf, id: 'foreign', namespace: 'production' });
  s.saveLb({ ...lb, wafId: 'foreign' });
  expect(s.requestApplication(lb.id, '/cart?q=%3Cscript%3E', 'GET').responseCode).toBe(200);
  s.saveLb({ ...lb, wafId: sharedBaseWaf.id });
  expect(s.requestApplication(lb.id, '/cart?q=%3Cscript%3E', 'GET').responseCode).toBe(403);
});
it('persists console lab progress and restores shared policy for old saved data', async () => {
  const lb = createFromConsole();
  useConsole.getState().requestApplication(lb.id, '/', 'GET');
  const value = localStorage.getItem('f5-xc-simulator-v1')!;
  const legacy = JSON.parse(value);
  legacy.state.wafs = legacy.state.wafs.filter((w: { id: string }) => w.id !== sharedBaseWaf.id);
  localStorage.setItem('f5-xc-simulator-v1', JSON.stringify(legacy));
  await useConsole.persist.rehydrate();
  expect(useConsole.getState().consoleLab1?.namespace).toBe('class1-lab1');
  expect(useConsole.getState().wafs.some((w) => w.id === sharedBaseWaf.id)).toBe(true);
  expect(useConsole.getState().events[0].lbId).toBe(lb.id);
});
