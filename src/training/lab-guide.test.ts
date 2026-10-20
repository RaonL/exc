import { beforeEach, expect, it } from 'vitest';
import { trainingLabs, labById } from './catalog';
import { createEnvironment, referenceConfiguration } from './engine';
import { labGuideFields, resourceGuideFields } from './lab-guide';
import { useConsole } from '../store';
import { effectiveEnvironment, useTraining } from './store';

beforeEach(() => {
  localStorage.clear();
  useConsole.getState().reset();
  useTraining.setState({
    sessions: {},
    selectedClass: 1,
    selectedLab: 'c1-lab1',
    guideTab: 'Guide',
  });
});

it.each(trainingLabs)(
  '$id has actionable targets checked against actual values without modifying resources',
  (lab) => {
    const initial = createEnvironment(lab),
      snapshot = structuredClone(initial);
    const target = referenceConfiguration(initial, lab);
    const fields = labGuideFields(lab, initial);
    expect(fields.length).toBeGreaterThan(5);
    expect(new Set(fields.map((f) => f.id)).size).toBe(fields.length);
    expect(fields.every((f) => f.label && f.expected)).toBe(true);
    expect(labGuideFields(lab, target).every((f) => f.pass)).toBe(true);
    expect(initial).toEqual(snapshot);
  },
);

it('checks header and rate goal values even when defaults already match and invalidates changed values', () => {
  const lab = labById('c3-lab1');
  const e = referenceConfiguration(createEnvironment(lab), lab);
  e.controls.headerValue = 'wrong';
  const fields = labGuideFields(lab, e);
  expect(fields.find((f) => f.label === 'Required Header Value')?.pass).toBe(false);
  expect(fields.find((f) => f.label === 'Required Header Name')?.pass).toBe(true);
  const rate = labById('c4-lab5'),
    r = referenceConfiguration(createEnvironment(rate), rate);
  r.controls.rate = 4;
  expect(labGuideFields(rate, r).find((f) => f.label === 'Number of Requests')?.pass).toBe(false);
});

it('checks console drafts independently from saved LB and WAF, including nested origin selection', () => {
  const lab = labById('c2-lab1'),
    e = createEnvironment(lab);
  const target = referenceConfiguration(e, lab);
  expect(
    resourceGuideFields(lab, e, 'App Firewall', target.waf).find(
      (f) => f.label === 'Enforcement Mode',
    )?.pass,
  ).toBe(true);
  expect(
    resourceGuideFields(lab, e, 'App Firewall', e.waf).find((f) => f.label === 'Enforcement Mode')
      ?.pass,
  ).toBe(false);
  expect(
    resourceGuideFields(lab, e, 'HTTP Load Balancer', target.lb).find(
      (f) => f.id === 'waf-reference',
    )?.pass,
  ).toBe(true);
  expect(
    resourceGuideFields(lab, e, 'Origin Pool with Weight and Priority', {
      originId: 'wrong',
      weight: 1,
      priority: 1,
    }).find((f) => f.id === 'pool-reference')?.pass,
  ).toBe(false);
  expect(e.lb.wafId).toBe('');
  expect(e.waf.mode).toBe('Monitoring');
});

it('persists guide location and actual manual settings, shares console edits and keeps lab sessions isolated', async () => {
  const t = useTraining.getState();
  t.start('c3-lab1');
  t.select(3, 'c3-lab1');
  t.setGuideTab('Environment');
  t.update('c3-lab1', (e) => {
    e.controls.policyMode = 'Header allowlist';
    return e;
  });
  t.start('c4-lab5');
  await useTraining.persist.rehydrate();
  expect(useTraining.getState().guideTab).toBe('Environment');
  expect(useTraining.getState().sessions['c3-lab1'].environment.controls.policyMode).toBe(
    'Header allowlist',
  );
  expect(useTraining.getState().sessions['c4-lab5'].environment.controls.policyMode).toBe(
    'Disabled',
  );
  const session = useTraining.getState().sessions['c3-lab1'];
  useConsole.getState().saveWaf({ ...session.environment.waf, mode: 'Blocking' });
  expect(effectiveEnvironment(session).waf.mode).toBe('Blocking');
});
