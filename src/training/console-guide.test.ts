import { beforeEach, expect, it } from 'vitest';
import { useConsole } from '../store';
import { guideFields, openGuideStep } from './console-guide';
import { lbConfig } from '../lib/config';

beforeEach(() => {
  localStorage.clear();
  useConsole.getState().reset();
});
it('opens the requested console step without creating or overwriting resources and persists the guide', async () => {
  const lbs = useConsole.getState().lbs;
  const origins = useConsole.getState().origins;
  openGuideStep('lb');
  expect(useConsole.getState()).toMatchObject({
    namespace: 'class1-lab1',
    page: 'HTTP Load Balancers',
    consoleLab1: { guideStep: 'lb', guideOpen: true },
  });
  expect(useConsole.getState().lbs).toEqual(lbs);
  expect(useConsole.getState().origins).toEqual(origins);
  await useConsole.persist.rehydrate();
  expect(useConsole.getState().consoleLab1?.guideStep).toBe('lb');
});
it('checks origin draft values independently and never treats draft input as a saved resource', () => {
  openGuideStep('origin');
  const fields = guideFields(
    'Origin Pool',
    {
      name: 'class1-lab1-pool',
      endpoint: 'demo-app.amer.myedgedemo.com',
      port: 443,
      config: { type: 'Public DNS' },
    },
    useConsole.getState(),
    'origin',
  );
  expect(fields.find((f) => f.id === 'origin-name')?.pass).toBe(true);
  expect(fields.find((f) => f.id === 'origin-server')?.pass).toBe(true);
  expect(fields.find((f) => f.id === 'origin-port')?.pass).toBe(false);
  expect(useConsole.getState().origins.some((o) => o.namespace === 'class1-lab1')).toBe(false);
});
it('requires the lab namespace pool, exact HTTP/DNS settings and the shared WAF reference', () => {
  openGuideStep('lb');
  const state = useConsole.getState();
  const initial = state.lbs[0];
  const value = {
    ...initial,
    name: 'class1-lab1-lb',
    domains: ['class1-lab1.lab-sec.f5demos.com'],
    protocol: 'HTTP',
    config: { ...lbConfig(), listenPort: 80, manageDns: true },
  };
  const fields = guideFields('HTTP Load Balancer', value, state, 'lb');
  expect(fields.find((f) => f.id === 'lb-http')?.pass).toBe(true);
  expect(fields.find((f) => f.id === 'lb-dns')?.pass).toBe(true);
  expect(fields.find((f) => f.id === 'lb-origin')?.pass).toBe(false);
  expect(guideFields('HTTP Load Balancer', value, state, 'waf').every((f) => f.pass)).toBe(false);
});

it('checks each attack independently and ignores other policies and old requests', () => {
  openGuideStep('attacks');
  const state = useConsole.getState();
  const lb = { ...state.lbs[0], id: 'guide-lb', namespace: 'class1-lab1', name: 'class1-lab1-lb' };
  const event = {
    ...state.events[0],
    lbId: lb.id,
    namespace: lb.namespace,
    generatedBy: 'console-request' as const,
    timestamp: new Date(Date.now() + 1000).toISOString(),
    scenario: 'SQL Injection' as const,
    responseCode: 403,
    action: 'Blocked' as const,
    evaluatedWafId: 'waf-shared-base-appfw',
  };
  const fields = guideFields(
    'Open Application',
    lb,
    { ...state, lbs: [lb], events: [event] },
    'attacks',
  );
  expect(fields.find((f) => f.title === 'SQL Injection')?.pass).toBe(true);
  expect(fields.find((f) => f.title === 'XSS')?.pass).toBe(false);
  expect(fields.find((f) => f.title === 'Command Injection')?.pass).toBe(false);
  expect(
    guideFields(
      'Open Application',
      lb,
      { ...state, lbs: [lb], events: [{ ...event, evaluatedWafId: 'other-policy' }] },
      'attacks',
    ).some((f) => f.pass),
  ).toBe(false);
  expect(
    guideFields(
      'Open Application',
      lb,
      { ...state, lbs: [lb], events: [{ ...event, timestamp: '2000-01-01T00:00:00Z' }] },
      'attacks',
    ).some((f) => f.pass),
  ).toBe(false);
});
