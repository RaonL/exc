import { expect, it } from 'vitest';
import { classes, trainingLabs } from './catalog';
import { createEnvironment, referenceConfiguration, verifyLab } from './engine';
it('offers Class 9 community labs with local before/after verification', () => {
  expect(classes.some((c) => c.id === 9)).toBe(true);
  const labs = trainingLabs.filter((l) => l.classId === 9);
  expect(labs).toHaveLength(5);
  for (const lab of labs) {
    expect(lab.source).toContain('github.com/Mettichi1/');
    expect(
      verifyLab(referenceConfiguration(createEnvironment(lab), lab), lab).verification.checks.every(
        (c) => c.pass,
      ),
    ).toBe(true);
  }
});
