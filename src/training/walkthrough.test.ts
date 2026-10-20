import { expect, it } from 'vitest';
import { trainingLabs, labById } from './catalog';
import { buildWalkthrough } from './walkthrough';
import { dummyAppResponse } from './dummy-app';
it('provides fixtures, concrete settings and runnable samples for all 34 units', () => {
  for (const lab of trainingLabs) {
    const guide = buildWalkthrough(lab);
    expect(guide.fixtures.length).toBeGreaterThan(3);
    expect(guide.settings.length).toBeGreaterThan(0);
    expect(guide.samples.length).toBeGreaterThan(0);
    for (const sample of guide.samples) {
      expect(sample.input.path.startsWith('/')).toBe(true);
      expect(sample.before).toHaveLength(sample.repeat);
      expect(sample.after).toHaveLength(sample.repeat);
    }
  }
});
it('shows independent known before/after examples for endpoint deny, bots and rate limiting', () => {
  const api = buildWalkthrough(labById('c4-lab3')).samples.find(
    (s) => s.input.path === '/api/customerlookup/getbydob',
  )!;
  expect(api.before[0].code).toBe(200);
  expect(api.after[0].code).toBe(403);
  const human = buildWalkthrough(labById('c5-lab3')).samples.find(
    (s) => s.input.attack === 'Human-like bot',
  )!;
  expect(human.repeat).toBe(12);
  expect(human.after[9].headers['x-demo-bot']).toBe('Human');
  expect(human.after[10].headers['x-demo-bot']).toBe('BadBot');
  const rate = buildWalkthrough(labById('c8-lab3')).samples.find((s) => s.repeat === 4)!;
  expect(rate.before.map((s) => s.code)).toEqual([200, 200, 200, 200]);
  expect(rate.after.map((s) => s.code)).toEqual([200, 200, 200, 429]);
});
it('returns explicit synthetic customer and airline data without credentials or network access', () => {
  expect(
    JSON.parse(
      dummyAppResponse('/api/customerlookup/getbydob', 'GET', '/api/customerlookup/getbydob'),
    ).ssn,
  ).toBe('DEMO-NOT-REAL');
  expect(JSON.parse(dummyAppResponse('/flight', 'GET', '/flight')).flights[0].flightNumber).toBe(
    'DEMO101',
  );
  expect(
    JSON.parse(dummyAppResponse('/user/vipsignin', 'POST', '/user/vipsignin')).simulation,
  ).toBe(true);
});
