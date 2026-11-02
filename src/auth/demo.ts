import type { AccountUser } from './api';
const sessionKey = 'xc-demo-session-v1';
const users = ['ete_root1', 'ete_root2', 'ete_root3'];
const stateKey = (id: string) => `xc-demo-workspace-v1:${id}`;
type Options = { method?: string; body?: unknown; account?: string };
export function demoRequest(
  path: string,
  options: Options,
  fail: (status: number, message: string) => Error,
): unknown {
  const body = options.body as Record<string, unknown> | undefined;
  if (path === '/auth/login' && options.method === 'POST') {
    const username = String(body?.username ?? '')
      .trim()
      .toLowerCase();
    if (!users.includes(username) || body?.password !== 'etrevers')
      throw fail(401, '아이디 또는 비밀번호가 일치하지 않습니다.');
    localStorage.setItem(sessionKey, username);
    return { user: { id: `demo-${username}`, username } };
  }
  if (path === '/auth/signup') throw fail(400, '데모 모드는 예시 계정 3개만 사용합니다.');
  const username = localStorage.getItem(sessionKey);
  if (!username || !users.includes(username)) throw fail(401, '다시 로그인하세요.');
  const user: AccountUser = { id: `demo-${username}`, username };
  if (options.account && options.account !== user.id)
    throw fail(401, '계정이 변경되었습니다. 다시 로그인하세요.');
  if (path === '/auth/session') return { user };
  if (path === '/auth/logout' && options.method === 'POST') {
    localStorage.removeItem(sessionKey);
    return { ok: true };
  }
  if (path === '/state') {
    if (options.account !== user.id) throw fail(401, '계정을 확인하세요.');
    const raw = localStorage.getItem(stateKey(user.id));
    const current = raw ? JSON.parse(raw) : { revision: 0, stores: {} };
    if ((options.method ?? 'GET') === 'GET') return current;
    if (options.method === 'PUT') {
      if (body?.revision !== current.revision)
        throw fail(409, '다른 탭에서 데이터가 변경됐습니다. 새로고침하세요.');
      if (!body || !body.stores || typeof body.stores !== 'object')
        throw fail(400, '저장 데이터 형식 오류');
      const next = { revision: current.revision + 1, stores: body.stores };
      localStorage.setItem(stateKey(user.id), JSON.stringify(next));
      return { revision: next.revision };
    }
  }
  throw fail(404, '지원하지 않는 데모 요청입니다.');
}
