import { beforeEach, describe, expect, it } from 'vitest';
import { classes, labById, trainingLabs } from './catalog';
import {
  createEnvironment,
  explain,
  fingerprint,
  pipeline,
  referenceConfiguration,
  request,
  runScan,
  sendRequest,
  verifyLab,
} from './engine';
import { effectiveEnvironment, isComplete, selfTestAll, useTraining } from './store';
import { useConsole } from '../store';
import type { Environment } from './types';

const lab = (id: string) => labById(id);
const ready = (id: string) => referenceConfiguration(createEnvironment(lab(id)), lab(id));
beforeEach(() => {
  localStorage.clear();
  useConsole.getState().reset();
  useTraining.setState({ sessions: {}, selectedClass: 1, selectedLab: 'c1-lab1' });
});
describe('official Class 1–8 catalog', () => {
  it('has 34 unique units, all 8 classes and valid canonical official paths', () => {
    expect(trainingLabs).toHaveLength(34);
    expect(new Set(trainingLabs.map((l) => l.id)).size).toBe(34);
    expect(classes.map((c) => trainingLabs.filter((l) => l.classId === c.id).length)).toEqual([
      4, 5, 3, 7, 4, 4, 4, 3,
    ]);
    for (const unit of trainingLabs) {
      expect(new URL(unit.source).hostname).toBe('clouddocs.f5.com');
      expect(unit.source.match(/https:/g)).toHaveLength(1);
      expect(unit.steps).toHaveLength(4);
    }
  });
  for (const unit of trainingLabs) {
    it(`${unit.id}: reference configuration passes actual probes`, () => {
      let e = ready(unit.id);
      e = explain(sendRequest(e, request({ attack: 'SQL Injection' }), unit).environment);
      const result = verifyLab(e, unit);
      expect(result.verification.checks.filter((c) => !c.pass)).toEqual([]);
      expect(
        result.environment.runtime.logs.length + result.verification.checks.length,
      ).toBeGreaterThan(2);
    });
    it(`${unit.id}: broken origin cannot pass verification`, () => {
      const e = ready(unit.id);
      e.lb.originId = 'missing-origin';
      expect(verifyLab(e, unit).verification.checks.every((c) => c.pass)).toBe(false);
    });
  }
});
describe('stateful local evaluation', () => {
  it('rate limit is scoped by client and resets only after its time window', () => {
    const unit = lab('c8-lab3');
    let e = ready(unit.id);
    const q = request({ path: '/ratelimit.php' });
    for (let i = 0; i < 3; i++) {
      const r = sendRequest(e, q, unit);
      expect(r.result.code).toBe(200);
      e = r.environment;
    }
    let r = sendRequest(e, q, unit);
    expect(r.result.code).toBe(429);
    e = r.environment;
    expect(sendRequest(e, { ...q, identity: 'other' }, unit).result.code).toBe(200);
    expect(sendRequest(e, { ...q, method: 'POST' }, unit).result.code).toBe(200);
    expect(sendRequest(e, { ...q, path: '/health' }, unit).result.code).toBe(200);
    e.runtime.now += 59000;
    expect(sendRequest(e, q, unit).result.code).toBe(429);
    e.runtime.now += 1000;
    expect(sendRequest(e, q, unit).result.code).toBe(200);
  });
  it('same shared IP permits a normal fingerprint after malicious identity is blocked', () => {
    const unit = lab('c2-lab3');
    let e = ready(unit.id);
    for (let i = 0; i < 3; i++)
      e = sendRequest(e, request({ attack: 'Malicious user', identity: 'bad' }), unit).environment;
    expect(e.runtime.logs[0].code).toBe(403);
    expect(sendRequest(e, request({ identity: 'good' }), unit).result.code).toBe(200);
  });
  it('Flag never blocks and Human-like telemetry changes after ten requests', () => {
    const unit = lab('c5-lab3');
    let e = ready(unit.id);
    for (let i = 1; i <= 12; i++) {
      const r = sendRequest(
        e,
        request({ method: 'POST', path: '/user/vipsignin', attack: 'Human-like bot' }),
        unit,
      );
      e = r.environment;
      expect(r.result.code).toBe(200);
      expect(r.result.headers['x-demo-bot']).toBe(i <= 10 ? 'Human' : 'BadBot');
    }
    e.controls.telemetry = false;
    e.runtime.identities = {};
    for (let i = 0; i < 12; i++)
      e = sendRequest(
        e,
        request({ method: 'POST', path: '/user/vipsignin', attack: 'Human-like bot' }),
        unit,
      ).environment;
    expect(e.runtime.logs[0].headers['x-demo-bot']).toBe('Human');
  });
  it('failover follows current origin health and validation restores saved health and clock', () => {
    const unit = lab('c6-module2-lab3');
    const e = ready(unit.id);
    e.origins[0].healthy = false;
    expect(sendRequest(e, request(), unit).result.origin).toBe('azure-canary');
    e.controls.failover = false;
    expect(sendRequest(e, request(), unit).result.code).toBe(503);
    const valid = ready(unit.id),
      f = fingerprint(valid),
      clock = valid.runtime.now;
    const result = verifyLab(valid, unit);
    expect(fingerprint(result.environment)).toBe(f);
    expect(result.environment.runtime.now).toBe(clock);
  });
  it('header policy uses case-insensitive header names and exact values', () => {
    const unit = lab('c3-lab1'),
      e = ready(unit.id);
    expect(
      sendRequest(e, request({ headers: { 'X-F5-Appworld': 'RjUtQXBwd29ybGQ=' } }), unit).result
        .code,
    ).toBe(200);
    expect(
      sendRequest(e, request({ headers: { 'x-f5-appworld': 'wrong' } }), unit).result.code,
    ).toBe(403);
  });
  it('endpoint deny follows guide and does not deny other inventory endpoints', () => {
    const unit = lab('c4-lab3'),
      e = ready(unit.id);
    expect(
      sendRequest(e, request({ path: '/api/customerlookup/getbydob' }), unit).result.code,
    ).toBe(403);
    expect(
      sendRequest(e, request({ path: '/api/customerlookup/getbyname' }), unit).result.code,
    ).toBe(200);
    e.controls.deniedEndpoint = '/wrong';
    expect(verifyLab(e, unit).verification.checks.every((c) => c.pass)).toBe(false);
  });
  it('disabled connector cannot discover BIG-IP telemetry', () => {
    const unit = lab('c4-lab7'),
      e = ready(unit.id);
    e.controls.connector = false;
    const r = sendRequest(e, request({ path: '/qrcode/form' }), unit);
    expect(r.environment.runtime.discovered).toEqual([]);
    expect(verifyLab(e, unit).verification.checks.every((c) => c.pass)).toBe(false);
  });
  it('rejects external URL and malformed pipeline manifest without mutating environment', () => {
    const unit = lab('c7-module2'),
      e = ready(unit.id),
      before = fingerprint(e);
    expect(() => sendRequest(e, request({ path: 'https://example.com' }), unit)).toThrow();
    expect(fingerprint(e)).toBe(before);
    e.controls.source = '{';
    expect(() => pipeline(e, 'Build')).toThrow();
  });
  it('changed source must be built and tested before deployment', () => {
    let e = ready('c7-module2');
    e.controls.source = e.controls.source.replace('Hello XC', 'Changed');
    expect(() => pipeline(e, 'Deploy')).toThrow();
    e = pipeline(e, 'Build');
    expect(() => pipeline(e, 'Deploy')).toThrow();
    e = pipeline(e, 'Test');
    e = pipeline(e, 'Deploy');
    expect(sendRequest(e, request(), lab('c7-module2')).result.body).toBe('Changed');
  });
  it('deployment gate rejects an unprotected app even after build and test', () => {
    let e = createEnvironment(lab('c7-module2'));
    e = pipeline(e, 'Build');
    e = pipeline(e, 'Test');
    expect(() => pipeline(e, 'Deploy')).toThrow('Security gate');
    e.lb.wafId = e.waf.id;
    e.waf.mode = 'Blocking';
    expect(pipeline(e, 'Deploy').controls.pipeline).toContain('Deploy');
  });
  it('scan findings depend on current controls; stale report fails', () => {
    const unit = lab('c2-lab4');
    let e = ready(unit.id);
    expect(e.runtime.scan!.findings.every((f) => f.resolved)).toBe(true);
    e.lb.wafId = '';
    expect(verifyLab(e, unit).verification.checks.every((c) => c.pass)).toBe(false);
    e = runScan(e);
    expect(e.runtime.scan!.findings.filter((f) => !f.resolved)).toHaveLength(2);
  });
});
describe('persistent training integration', () => {
  it('requires learner baseline and invalidates completion after a core console edit', () => {
    const t = useTraining.getState();
    t.start('c1-lab1');
    t.solution('c1-lab1');
    t.verify('c1-lab1');
    expect(isComplete(useTraining.getState().sessions['c1-lab1'])).toBe(false);
    t.baseline('c1-lab1');
    t.verify('c1-lab1');
    const session = useTraining.getState().sessions['c1-lab1'];
    expect(isComplete(session)).toBe(true);
    const waf = useConsole.getState().wafs.find((w) => w.id === session.environment.waf.id)!;
    useConsole.getState().saveWaf({ ...waf, mode: 'Monitoring' });
    expect(isComplete(session)).toBe(false);
    expect(effectiveEnvironment(session).waf.mode).toBe('Monitoring');
    t.start('c1-lab1');
    expect(useConsole.getState().wafs.find((w) => w.id === waf.id)!.mode).toBe('Monitoring');
  });
  it('reset touches only the chosen lab and evidence is visible in console', () => {
    const t = useTraining.getState();
    t.start('c1-lab1');
    t.baseline('c1-lab1');
    t.start('c8-lab3');
    t.solution('c8-lab3');
    t.baseline('c8-lab3');
    const unaffected = JSON.stringify(useTraining.getState().sessions['c8-lab3']);
    const normal = JSON.stringify(
      useConsole.getState().lbs.filter((l) => l.namespace === 'social-hawk'),
    );
    expect(useConsole.getState().events.some((e) => e.namespace === 'training-c1-lab1')).toBe(true);
    t.resetLab('c1-lab1');
    expect(JSON.stringify(useTraining.getState().sessions['c8-lab3'])).toBe(unaffected);
    expect(
      JSON.stringify(useConsole.getState().lbs.filter((l) => l.namespace === 'social-hawk')),
    ).toBe(normal);
    expect(useConsole.getState().events.some((e) => e.namespace === 'training-c1-lab1')).toBe(
      false,
    );
  });
  it('rehydrates progress, controls, counters and logs', async () => {
    const t = useTraining.getState();
    t.start('c8-lab3');
    t.solution('c8-lab3');
    t.baseline('c8-lab3');
    t.probe('c8-lab3', request({ path: '/ratelimit.php' }));
    t.verify('c8-lab3');
    const saved = localStorage.getItem('f5-xc-training-v1')!;
    const expected = JSON.stringify(useTraining.getState().sessions);
    useTraining.setState({ sessions: {} });
    localStorage.setItem('f5-xc-training-v1', saved);
    await useTraining.persist.rehydrate();
    expect(JSON.stringify(useTraining.getState().sessions)).toBe(expected);
  });
  it('model self-check changes no learner progress or console state', () => {
    const before = JSON.stringify(useConsole.getState()),
      progress = JSON.stringify(useTraining.getState());
    const result = selfTestAll();
    expect(result.filter((r) => !r.pass)).toEqual([]);
    expect(JSON.stringify(useConsole.getState())).toBe(before);
    expect(JSON.stringify(useTraining.getState())).toBe(progress);
  });
  it('source edits are preserved when continuing a lab', () => {
    const t = useTraining.getState();
    t.start('c7-module1');
    t.update('c7-module1', (e: Environment) => {
      e.controls.source = 'unfinished';
      return e;
    });
    t.start('c7-module1');
    expect(useTraining.getState().sessions['c7-module1'].environment.controls.source).toBe(
      'unfinished',
    );
  });
  it('deleting a console LB invalidates completion and does not silently pass using stale data', () => {
    const t = useTraining.getState();
    t.start('c1-lab1');
    t.solution('c1-lab1');
    t.baseline('c1-lab1');
    t.verify('c1-lab1');
    const session = useTraining.getState().sessions['c1-lab1'];
    expect(isComplete(session)).toBe(true);
    useConsole.getState().deleteLb(session.environment.lb.id);
    expect(isComplete(session)).toBe(false);
  });
});
