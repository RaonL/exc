import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api, ApiError, type AccountUser } from './api';
import {
  openAccount,
  closeAccount,
  createSynchronizer,
  type AccountStores,
  type SaveStatus,
} from './workspace';
import { AccountContext } from './context';
import { Login } from './Login';
import { onSessionChange } from './sessionSignal';
import { demoMode } from './mode';
export function AccountGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [status, setStatus] = useState<SaveStatus>('saved'),
    [busy, setBusy] = useState(false);
  const sync = useRef<ReturnType<typeof createSynchronizer> | null>(null),
    generation = useRef(0);
  const expire = (message: string) => {
    generation.current++;
    sync.current?.stop();
    sync.current = null;
    closeAccount();
    setUser(null);
    setLoading(false);
    setError(message);
  };
  const load = async (account: AccountUser) => {
    const run = ++generation.current;
    setLoading(true);
    setError('');
    sync.current?.stop();
    try {
      const snapshot = await api<{ stores: AccountStores; revision: number }>('/state', {
        account: account.id,
      });
      if (run !== generation.current) return;
      await openAccount(account.id, snapshot.stores);
      if (run !== generation.current) return;
      sync.current = createSynchronizer(
        snapshot.revision,
        (revision, stores) =>
          api('/state', { method: 'PUT', account: account.id, body: { revision, stores } }),
        setStatus,
        (error) => {
          if (error instanceof ApiError && error.status === 401) expire(error.message);
          else setError(error instanceof Error ? error.message : '서버 저장에 실패했습니다.');
        },
      );
      setStatus('saved');
      setUser(account);
      setLoading(false);
    } catch (error) {
      if (run !== generation.current) return;
      closeAccount();
      setUser(null);
      setLoading(false);
      setError(error instanceof Error ? error.message : '실습 데이터를 불러오지 못했습니다.');
      throw error;
    }
  };
  useEffect(() => {
    let cancelled = false;
    void api<{ user: AccountUser }>('/auth/session')
      .then(async (result) => {
        if (!cancelled) await load(result.user);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoading(false);
        if (!(error instanceof ApiError && error.status === 401))
          setError('인증 서버에 연결할 수 없습니다. 서버 실행 상태를 확인하고 다시 시도하세요.');
      });
    return () => {
      cancelled = true;
      generation.current++;
      sync.current?.stop();
      closeAccount();
    };
  }, []);
  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => {
      if (demoMode) {
        void sync.current?.flush().catch(() => {});
        return;
      }
      if (sync.current?.isDirty()) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const saveOnHide = () => {
      void sync.current?.flush().catch(() => {});
    };
    window.addEventListener('beforeunload', preventLoss);
    window.addEventListener('pagehide', saveOnHide);
    return () => {
      window.removeEventListener('beforeunload', preventLoss);
      window.removeEventListener('pagehide', saveOnHide);
    };
  }, []);
  useEffect(
    () =>
      onSessionChange(() => expire('다른 탭에서 로그인 상태가 변경되었습니다. 다시 로그인하세요.')),
    [],
  );
  const logout = async () => {
    setBusy(true);
    setError('');
    try {
      await sync.current?.flush();
      await api('/auth/logout', { method: 'POST', body: {}, account: user?.id });
      expire('');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) expire(error.message);
      else setError(error instanceof Error ? error.message : '로그아웃하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <main className="account-loading" role="status">
        계정과 실습 데이터를 불러오는 중…
      </main>
    );
  if (!user)
    return (
      <>
        {error && (
          <div className="account-entry-error" role="alert">
            {error}
            <button onClick={() => window.location.reload()}>다시 연결</button>
          </div>
        )}
        <Login onLogin={load} />
      </>
    );
  return (
    <AccountContext.Provider
      value={{
        user,
        status,
        busy,
        logout,
        retrySave: async () => {
          setError('');
          await sync.current?.flush();
        },
      }}
    >
      {error && (
        <div className="account-save-error" role="alert">
          {error}
          <button
            onClick={() => {
              void sync.current?.flush().catch(() => {});
            }}
          >
            저장 재시도
          </button>
          <button onClick={() => window.location.reload()}>저장 값 다시 불러오기</button>
        </div>
      )}
      {children}
    </AccountContext.Provider>
  );
}
