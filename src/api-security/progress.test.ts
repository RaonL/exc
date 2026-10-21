import { expect, it } from 'vitest';
import { protectionResourceProgress } from './progress';

it('completes definition creation before the definition is attached to an LB', () => {
  const files = [{ id: 'file', namespace: 'api-quickstart' }];
  const definitions = [{ id: 'definition', namespace: 'api-quickstart', fileIds: ['file'] }];
  expect(protectionResourceProgress('api-quickstart', files, definitions, '')).toEqual([true, true, false]);
  expect(protectionResourceProgress('api-quickstart', files, definitions, 'definition')).toEqual([true, true, true]);
});

it('does not complete creation for missing files or another namespace', () => {
  const definition = { id: 'definition', namespace: 'other', fileIds: ['file'] };
  expect(protectionResourceProgress('api-quickstart', [], [definition], '')).toEqual([false, false, false]);
  expect(protectionResourceProgress('api-quickstart', [], [{ ...definition, namespace: 'api-quickstart' }], '')).toEqual([false, false, false]);
});
