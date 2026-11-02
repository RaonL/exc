import { useConsole } from '../store';
import { useTraining } from '../training/store';
import { useApiSecurity } from '../api-security/store';
import { useNavigationResources } from '../navigation/store';
import type { StoreApi } from 'zustand';
import {
  replaceAccountMemory,
  clearAccountMemory,
  readAccountMemory,
  pauseAccountWrites,
  onAccountWrite,
} from './storage';
export type AccountStores = Record<string, string>;
const stores = [useConsole, useTraining, useApiSecurity, useNavigationResources];
function resetStore<T extends object>(store: StoreApi<T>) {
  const initial = store.getInitialState();
  const fresh = Object.fromEntries(
    Object.entries(initial).map(([key, value]) => [
      key,
      typeof value === 'function' ? value : structuredClone(value),
    ]),
  );
  store.setState(fresh as T, true);
}
function resetStores() {
  resetStore(useConsole);
  resetStore(useTraining);
  resetStore(useApiSecurity);
  resetStore(useNavigationResources);
}
export async function openAccount(userId: string, snapshot: AccountStores) {
  // Never merge another account's or anonymous browser state into this account.
  clearAccountMemory();
  pauseAccountWrites(true);
  try {
    resetStores();
    for (const [key, serialized] of Object.entries(snapshot)) {
      const parsed = JSON.parse(serialized);
      if (!parsed || typeof parsed.state !== 'object' || !parsed.state)
        throw Error(`저장된 데이터 형식 오류: ${key}`);
      const store = stores.find((candidate) => candidate.persist.getOptions().name === key);
      if (!store) throw Error('알 수 없는 저장 항목입니다.');
      if (parsed.version !== (store.persist.getOptions().version ?? 0))
        throw Error(`지원하지 않는 저장 버전: ${key}`);
      const initial = Object.fromEntries(Object.entries(store.getInitialState()));
      for (const [field, value] of Object.entries(parsed.state)) {
        if (!Object.hasOwn(initial, field) || typeof initial[field] === 'function')
          throw Error(`허용되지 않은 저장 필드: ${field}`);
        const expected = initial[field];
        if (
          expected === null
            ? value !== null && typeof value !== 'object'
            : Array.isArray(expected)
              ? !Array.isArray(value)
              : typeof expected !== typeof value ||
                (typeof expected === 'object' && (value === null || Array.isArray(value)))
        )
          throw Error(`저장된 필드 형식 오류: ${field}`);
      }
    }
    replaceAccountMemory(userId, snapshot);
    for (const store of stores) await store.persist.rehydrate();
  } catch (error) {
    clearAccountMemory();
    resetStores();
    throw error;
  } finally {
    pauseAccountWrites(false);
  }
}
export function closeAccount() {
  pauseAccountWrites(true);
  clearAccountMemory();
  resetStores();
  pauseAccountWrites(false);
}
export const collectAccountSnapshot = () => readAccountMemory();
export type SaveStatus = 'saved' | 'saving' | 'error';
export function createSynchronizer(
  initialRevision: number,
  save: (revision: number, snapshot: AccountStores) => Promise<{ revision: number }>,
  status: (value: SaveStatus) => void,
  onError: (error: unknown) => void,
) {
  let revision = initialRevision,
    dirty = false,
    stopped = false,
    pending: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = async (): Promise<void> => {
    clearTimeout(timer);
    if (pending) {
      await pending;
      if (dirty && !stopped) return flush();
      return;
    }
    if (!dirty || stopped) return;
    pending = (async () => {
      while (dirty && !stopped) {
        dirty = false;
        status('saving');
        try {
          const result = await save(revision, collectAccountSnapshot());
          if (stopped) return;
          revision = result.revision;
          status(dirty ? 'saving' : 'saved');
        } catch (error) {
          if (stopped) return;
          dirty = true;
          status('error');
          onError(error);
          throw error;
        }
      }
    })();
    try {
      await pending;
    } finally {
      pending = null;
    }
  };
  const unsubscribe = onAccountWrite(() => {
    if (stopped) return;
    dirty = true;
    status('saving');
    clearTimeout(timer);
    timer = setTimeout(() => {
      void flush().catch(() => {});
    }, 600);
  });
  return {
    flush,
    stop: () => {
      stopped = true;
      clearTimeout(timer);
      unsubscribe();
    },
    isDirty: () => dirty || !!pending,
  };
}
