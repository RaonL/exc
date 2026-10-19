import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConsole } from './store';
import type { LB, Scenario } from './types';
import { lbConfig, wafConfig } from './lib/config';
const get = useConsole.getState;
beforeEach(() => {
  localStorage.clear();
  get().reset();
  useConsole.setState({ storageError: false });
});
describe('Cross-screen simulation contracts', () => {
  it('persists detailed LB/WAF settings and applies them consistently after rehydration', async () => {
    const lb = get().lbs[0];
    const waf = get().wafs[0];
    get().saveLb({
      ...lb,
      config: {
        ...lbConfig(lb),
        description: 'Detailed training app',
        exclusions: [
          { id: 'health-exclusion', name: 'health', path: '/health', method: 'GET', attack: 'All' },
        ],
      },
    });
    get().saveWaf({
      ...waf,
      config: {
        ...wafConfig(waf),
        policy: 'Custom',
        highAction: 'Block',
        staging: 'New signatures',
        stagingStartedAt: new Date().toISOString(),
      },
    });
    await useConsole.persist.rehydrate();
    expect(get().lbs[0].config?.description).toBe('Detailed training app');
    get().simulate('SQL Injection', lb.id, {
      path: '/health',
      method: 'GET',
      signatureState: 'Existing',
    });
    expect(get().events[0].action).toBe('Allowed');
    get().simulate('SQL Injection', lb.id, { path: '/api', method: 'GET', signatureState: 'New' });
    expect(get().events[0].action).toBe('Detected');
    expect(get().events[0].reason).toContain('staged');
    get().saveWaf({
      ...get().wafs[0],
      config: {
        ...wafConfig(get().wafs[0]),
        staging: 'Disabled',
        responseCode: 429,
        responseBody: 'blocked for training',
      },
    });
    expect(get().events[0].action).toBe('Blocked');
    expect(get().events[0].responseCode).toBe(429);
    get().saveWaf({ ...get().wafs[0], mode: 'Monitoring' });
    expect(get().events[0].action).toBe('Detected');
    expect(get().events[0].responseBody).toBeUndefined();
    expect(get().events[1].action).toBe('Allowed');
  });
  it('respects the LB API Discovery switch', () => {
    const lb = get().lbs[0];
    get().saveLb({ ...lb, config: { ...lbConfig(lb), apiDiscovery: false } });
    const count = get().endpoints.length;
    expect(get().simulate('Shadow API Discovery', lb.id)).toContain('disabled');
    expect(get().endpoints).toHaveLength(count);
  });
  it('continues in memory when browser storage is unavailable without a retry loop', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is full', 'QuotaExceededError');
    });
    try {
      const original = get().lbs[0].requests;
      get().simulate('Normal HTTP traffic', 'lb-social');
      await Promise.resolve();
      await Promise.resolve();
      expect(get().storageError).toBe(true);
      expect(get().lbs[0].requests).toBe(original + 1200);
      expect(storage).toHaveBeenCalledTimes(2);
    } finally {
      storage.mockRestore();
    }
  });
  it('creates, updates, persists and deletes load balancers with dependent events', async () => {
    const lb: LB = {
      ...get().lbs[0],
      id: 'test-lb',
      name: 'test-lb',
      domains: ['training.example.com'],
      requests: 0,
    };
    get().saveLb(lb);
    get().simulate('SQL Injection', lb.id);
    expect(get().lbs.find((l) => l.id === lb.id)?.requests).toBe(48);
    get().saveLb({ ...get().lbs.find((l) => l.id === lb.id)!, protocol: 'HTTP' });
    expect(get().lbs).toHaveLength(4);
    await useConsole.persist.rehydrate();
    expect(get().lbs.find((l) => l.id === lb.id)?.protocol).toBe('HTTP');
    expect(get().events.some((e) => e.lbId === lb.id)).toBe(true);
    get().deleteLb(lb.id);
    expect(get().lbs).toHaveLength(3);
    expect(get().events.some((e) => e.lbId === lb.id)).toBe(false);
  });
  it('evaluates WAF mode and updates linked SQLi/XSS events only', () => {
    get().simulate('SQL Injection', 'lb-api');
    expect(get().events[0].action).toBe('Detected');
    const waf = get().wafs.find((w) => w.id === 'waf-monitor')!;
    get().saveWaf({ ...waf, mode: 'Blocking' });
    expect(
      get()
        .events.filter(
          (e) =>
            e.lbId === 'lb-api' && ['SQL Injection', 'Cross-site Scripting'].includes(e.scenario),
        )
        .every((e) => e.action === 'Blocked'),
    ).toBe(true);
    expect(get().events.find((e) => e.id === 'evt-4')?.action).toBe('Blocked');
    get().saveWaf({ ...waf, mode: 'Monitoring' });
    expect(get().events[0].action).toBe('Detected');
    expect(get().events.find((e) => e.id === 'evt-1')?.action).toBe('Blocked');
  });
  it('evaluates attack detection after attaching and detaching a WAF', () => {
    const lb = get().lbs[0];
    get().saveLb({ ...lb, wafId: '' });
    get().simulate('SQL Injection', lb.id);
    expect(get().events[0].action).toBe('Detected');
    get().saveLb({ ...get().lbs[0], wafId: 'waf-standard' });
    get().simulate('SQL Injection', lb.id);
    expect(get().events[0].action).toBe('Blocked');
  });
  it.each([
    ['API Schema Violation', 'apiProtection'],
    ['Bot Detection', 'botDefense'],
    ['L7 DDoS', 'ddosProtection'],
  ] as const)('respects LB protection flags for %s', (scenario, flag) => {
    get().saveLb({ ...get().lbs[0], [flag]: false });
    get().simulate(scenario, 'lb-social');
    expect(get().events[0].action).toBe('Detected');
    get().saveLb({ ...get().lbs[0], [flag]: true });
    get().simulate(scenario, 'lb-social');
    expect(get().events[0].action).toBe('Blocked');
  });
  it('increments the request counter consistently for normal traffic and DDoS', () => {
    const original = get().lbs[0].requests;
    get().simulate('Normal HTTP traffic', 'lb-social');
    get().simulate('L7 DDoS', 'lb-social');
    expect(get().lbs[0].requests).toBe(original + 1200 + 8400);
    expect(get().events.find((e) => e.scenario === 'Normal HTTP traffic')?.action).toBe('Allowed');
  });
  it('connects origin failure to all dependent LB health and allows recovery', () => {
    get().simulate('Origin Server Failure', 'lb-social');
    const origin = get().origins.find((o) => o.id === get().lbs[0].originId)!;
    expect(origin.healthy).toBe(false);
    expect(get().lbs.filter((l) => l.originId === origin.id)).toHaveLength(2);
    get().setOriginHealth(origin.id, true);
    expect(get().origins.find((o) => o.id === origin.id)?.healthy).toBe(true);
  });
  it('shares CE status between simulation and topology data', () => {
    get().simulate('CE Offline', 'lb-social');
    expect(get().sites.find((site) => site.id === 'ce-seoul')?.online).toBe(false);
    get().simulate('CE Online', 'lb-social');
    expect(get().sites.find((site) => site.id === 'ce-seoul')?.online).toBe(true);
  });
  it('discovers shadow APIs and adopts them without duplicating the endpoint', () => {
    const count = get().endpoints.length;
    get().simulate('Shadow API Discovery', 'lb-social');
    const endpoint = get().endpoints.at(-1)!;
    expect(endpoint.shadow).toBe(true);
    expect(endpoint.lbId).toBe('lb-social');
    get().adoptEndpoint(endpoint.id);
    expect(get().endpoints).toHaveLength(count + 1);
    expect(get().endpoints.at(-1)?.shadow).toBe(false);
  });
  it('rejects cross-namespace simulation targets', () => {
    const initial = get().events.length;
    get().setNamespace('staging');
    expect(get().simulate('SQL Injection', 'lb-social')).toContain('namespace');
    expect(get().events).toHaveLength(initial);
    expect(get().selectedLbId).toBe('');
  });
  it('keeps all scenarios local, with deterministic outcomes, and restores seed data', () => {
    const scenarios: Scenario[] = [
      'Normal HTTP traffic',
      'SQL Injection',
      'Cross-site Scripting',
      'API Schema Violation',
      'Shadow API Discovery',
      'Bot Detection',
      'L7 DDoS',
      'Origin Server Failure',
      'CE Offline',
      'CE Online',
    ];
    scenarios.forEach((scenario) =>
      expect(get().simulate(scenario, 'lb-social')).toBeTypeOf('string'),
    );
    get().addNamespace('training');
    get().saveSettings({ tenant: 'changed', email: 'demo@example.com', retention: 1 });
    get().reset();
    expect(get().lbs).toHaveLength(3);
    expect(get().events).toHaveLength(4);
    expect(get().namespaces).not.toContain('training');
    expect(get().settings.tenant).toBe('f5-xc-training');
  });
  it('prunes expired request events using the selected retention period', () => {
    get().saveSettings({ ...get().settings, retention: 1 });
    useConsole.setState((s) => ({
      events: [
        {
          ...s.events[0],
          id: 'expired',
          timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        ...s.events,
      ],
    }));
    get().simulate('Normal HTTP traffic', 'lb-social');
    expect(get().events.some((e) => e.id === 'expired')).toBe(false);
  });
});
