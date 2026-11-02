import { afterEach, expect, it, vi } from 'vitest';
import {
  accountStorage,
  requireAccounts,
  replaceAccountMemory,
  readAccountMemory,
  clearAccountMemory,
  useLegacyStorageForTests,
} from './storage';
import { openAccount, closeAccount, collectAccountSnapshot, createSynchronizer } from './workspace';
import { useConsole } from '../store';
import { useTraining } from '../training/store';
import { useApiSecurity } from '../api-security/store';
import { useNavigationResources } from '../navigation/store';

afterEach(() => {
  closeAccount();
  useLegacyStorageForTests();
  vi.restoreAllMocks();
  localStorage.clear();
});
it('never reads old anonymous state for an authenticated account or persists session tokens', () => {
  localStorage.setItem('f5-xc-simulator-v1', 'old-private-data');
  requireAccounts();
  expect(accountStorage.getItem('f5-xc-simulator-v1')).toBeNull();
  replaceAccountMemory('a', { 'f5-xc-simulator-v1': 'a-state' });
  expect(accountStorage.getItem('f5-xc-simulator-v1')).toBe('a-state');
  replaceAccountMemory('b', {});
  expect(accountStorage.getItem('f5-xc-simulator-v1')).toBeNull();
  accountStorage.setItem('f5-xc-training-v1', 'b-progress');
  expect(localStorage.getItem('f5-xc-training-v1')).toBeNull();
  clearAccountMemory();
  expect(readAccountMemory()).toEqual({});
  expect(localStorage.getItem('f5-xc-simulator-v1')).toBe('old-private-data');
});
it('resets all four stores on A to B and restores A settings, Class 1–9 progress and logs', async () => {
  requireAccounts();
  await openAccount('a', {});
  useConsole.getState().setNamespace('a-only');
  useTraining.getState().select(9);
  useApiSecurity.setState({ logs: [{ id: 'a-log' } as never] });
  useNavigationResources.getState().save({
    id: 'a-resource',
    page: 'Saved Filters',
    namespace: 'a-only',
    name: 'a-filter',
    description: '',
    values: {},
    updatedAt: new Date().toISOString(),
  });
  const saved = collectAccountSnapshot();
  await openAccount('b', {});
  expect(useConsole.getState().namespace).toBe('social-hawk');
  expect(useTraining.getState().selectedClass).toBe(1);
  expect(useApiSecurity.getState().logs).toEqual([]);
  expect(useNavigationResources.getState().resources).toEqual([]);
  await openAccount('a', saved);
  expect(useConsole.getState().namespace).toBe('a-only');
  expect(useTraining.getState().selectedClass).toBe(9);
  expect(useApiSecurity.getState().logs[0].id).toBe('a-log');
  expect(useNavigationResources.getState().resources[0].id).toBe('a-resource');
  closeAccount();
  expect(useConsole.getState().namespace).toBe('social-hawk');
});
it('serializes autosaves and flushes the latest account data before logout', async () => {
  requireAccounts();
  await openAccount('a', {});
  let revision = 0;
  let writes = 0;
  const save = vi.fn(async (expected: number) => {
    expect(expected).toBe(revision);
    writes++;
    await Promise.resolve();
    return { revision: ++revision };
  });
  const sync = createSynchronizer(
    0,
    save,
    () => {},
    () => {},
  );
  useConsole.getState().setNamespace('changed');
  await sync.flush();
  expect(writes).toBeGreaterThan(0);
  expect(save.mock.calls.at(-1)?.[0]).toBe(revision - 1);
  sync.stop();
});
it('does not silently overwrite after a server save conflict', async () => {
  requireAccounts();
  await openAccount('a', {});
  const save = vi.fn(async () => {
    throw Error('conflict');
  });
  const failed = vi.fn();
  const sync = createSynchronizer(5, save, () => {}, failed);
  useTraining.getState().select(8);
  await expect(sync.flush()).rejects.toThrow('conflict');
  expect(failed).toHaveBeenCalled();
  sync.stop();
});

it('rejects persisted data that attempts to replace store actions', async () => {
  requireAccounts();
  await expect(
    openAccount('a', {
      'f5-xc-simulator-v1': JSON.stringify({ version: 1, state: { saveLb: 'not-a-function' } }),
    }),
  ).rejects.toThrow();
  expect(typeof useConsole.getState().saveLb).toBe('function');
});

it('keeps the first lab session and baseline logs from every Class 1–9 private across accounts', async () => {
  const { trainingLabs } = await import('../training/catalog');
  requireAccounts();
  await openAccount('all-classes', {});
  for (let classId = 1; classId <= 9; classId++) {
    const lab = trainingLabs.find((item) => item.classId === classId)!;
    useTraining.getState().start(lab.id);
    useTraining.getState().baseline(lab.id);
  }
  const snapshot = collectAccountSnapshot();
  expect(Object.keys(useTraining.getState().sessions)).toHaveLength(9);
  await openAccount('other-student', {});
  expect(useTraining.getState().sessions).toEqual({});
  await openAccount('all-classes', snapshot);
  expect(Object.keys(useTraining.getState().sessions)).toHaveLength(9);
  expect(
    Object.values(useTraining.getState().sessions).every(
      (session) => session.baseline && session.environment.runtime.logs.length > 0,
    ),
  ).toBe(true);
});

it('rejects unsupported state versions instead of silently starting an empty workspace', async () => {
  requireAccounts();
  await expect(
    openAccount('a', { 'f5-xc-simulator-v1': JSON.stringify({ version: 999, state: {} }) }),
  ).rejects.toThrow();
});
