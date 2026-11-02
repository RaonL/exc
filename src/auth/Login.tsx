import { useState, type FormEvent } from 'react';
import { api, type AccountUser } from './api';
import { demoMode } from './mode';
export function Login({ onLogin }: { onLogin: (user: AccountUser) => Promise<void> }) {
  const [signup, setSignup] = useState(false),
    [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (signup && password !== confirmation) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    setBusy(true);
    try {
      const { user } = await api<{ user: AccountUser }>(`/auth/${signup ? 'signup' : 'login'}`, {
        method: 'POST',
        body: { username, password },
      });
      setPassword('');
      setConfirmation('');
      await onLogin(user);
    } catch (error) {
      setError(error instanceof Error ? error.message : '로그인 요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="account-entry">
      <section className="account-intro">
        <span className="account-wordmark">XC Console Simulator</span>
        <span className="account-eyebrow">LEARNING WORKSPACE</span>
        <h1>나만의 XC 실습 공간</h1>
        <p>설정부터 테스트 결과까지 계정별로 보관합니다.</p>
        <ul>
          <li>Class 1–9 실습과 진행률</li>
          <li>HTTP LB · WAF · API 설정</li>
          <li>모의 요청 결과와 상세 로그</li>
        </ul>
        <small>비공식 학습용 시뮬레이터 · 실제 F5 계정과 별개입니다.</small>
      </section>
      <section className="account-form-panel">
        <form onSubmit={submit} className="account-form">
          <span className="account-eyebrow">YOUR WORKSPACE</span>
          <h2>{signup ? '회원가입' : '로그인'}</h2>
          <p>
            {signup
              ? '새 계정에 별도의 실습 공간을 만듭니다.'
              : '로그인하여 저장된 실습을 이어가세요.'}
          </p>
          <label>
            아이디
            <input
              autoFocus
              required
              autoComplete="username"
              pattern="[a-zA-Z0-9_]{3,32}"
              minLength={3}
              maxLength={32}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={busy}
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              required
              autoComplete={signup ? 'new-password' : 'current-password'}
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </label>
          {signup && (
            <>
              <label>
                비밀번호 확인
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  disabled={busy}
                />
              </label>
              <small>아이디: 영문·숫자·밑줄 3–32자 · 비밀번호: 8자 이상</small>
            </>
          )}
          {error && (
            <p role="alert" className="account-error">
              {error}
            </p>
          )}
          <button type="submit" className="account-primary" disabled={busy}>
            {busy ? '처리 중…' : signup ? '계정 만들기' : '로그인'}
          </button>
          {!demoMode && (
            <button
              type="button"
              className="account-secondary"
              disabled={busy}
              onClick={() => {
                setSignup(!signup);
                setError('');
                setPassword('');
                setConfirmation('');
              }}
            >
              {signup ? '기존 계정으로 로그인' : '새 계정 만들기'}
            </button>
          )}
          <div className="account-demo-note">
            실습 예시 계정 <strong>ete_root1 · ete_root2 · ete_root3</strong>
            <span>
              {demoMode
                ? '데모 로그인 · 이 브라우저에 계정별 저장 · 다른 PC와 동기화되지 않습니다.'
                : '공유 예시 계정에는 실습용 데이터만 입력하세요.'}
            </span>
          </div>
        </form>
      </section>
    </main>
  );
}
