import { expect, it } from 'vitest';
import { labById } from './catalog';
import { createEnvironment, referenceConfiguration, request, sendRequest } from './engine';
it('unattached WAF cannot claim detection and internal VIP requires the configured Host', () => {
  const wafLab = labById('c4-lab4'),
    initial = createEnvironment(wafLab);
  expect(sendRequest(initial, request({ attack: 'XSS' }), wafLab).result.action).toBe('Allowed');
  const lab = labById('c6-module2-lab4'),
    e = referenceConfiguration(createEnvironment(lab), lab);
  expect(sendRequest(e, request({ headers: { host: '10.1.1.5' } }), lab).result.code).toBe(404);
  expect(sendRequest(e, request({ headers: { host: e.lb.domains[0] } }), lab).result.code).toBe(
    200,
  );
});
it('Class 6 overlapping networks GET-only policy rejects HEAD without rejecting GET', () => {
  const lab = labById('c6-module2-lab4'),
    e = referenceConfiguration(createEnvironment(lab), lab);
  expect(sendRequest(e, request({ method: 'HEAD' }), lab).result.code).toBe(403);
  expect(sendRequest(e, request({ method: 'GET' }), lab).result.code).toBe(200);
});
it('Class 5 Lab 1 attaches WAF while leaving Bot Defense disabled and login bots observable', () => {
  const lab = labById('c5-lab1'),
    e = referenceConfiguration(createEnvironment(lab), lab);
  expect(e.lb.wafId).toBe(e.waf.id);
  expect(e.lb.botDefense).toBe(false);
  expect(
    sendRequest(e, request({ path: '/user/vipsignin', method: 'POST', attack: 'Bot' }), lab).result
      .code,
  ).toBe(200);
});
it('stores readable trace and substitutes the actual Support ID in a training blocking response', () => {
  const lab = labById('c2-lab1'),
    e = referenceConfiguration(createEnvironment(lab), lab);
  e.waf.config = {
    description: '',
    labels: '',
    policy: 'Default',
    disabledAttacks: [],
    accuracy: 'High and Medium',
    highAction: 'Block',
    tuning: true,
    staging: 'Disabled',
    stagingDays: 7,
    threatCampaigns: true,
    maskLogs: true,
    responseCode: 403,
    responseBody: 'Rejected {{request_id}}',
  };
  const result = sendRequest(e, request({ attack: 'SQL Injection' }), lab).result;
  expect(result.body).toContain(result.id);
  expect(result.body).not.toContain('{{request_id}}');
  expect(result.trace?.join('\n')).toContain('external_requests=0');
});
