import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createApplication } from './app.mjs';

const origin = 'http://127.0.0.1:5173';
async function fixture(t, extra = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'xc-auth-'));
  const app = await createApplication({
    databasePath: join(directory, 'test.sqlite'),
    origin,
    seedPassword: 'testing-only-pass',
    ...extra,
  });
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  t.after(async () => {
    await new Promise((resolve) => app.server.close(resolve));
    app.close();
    assert.ok(directory.startsWith(join(tmpdir(), 'xc-auth-')));
    await rm(directory, { recursive: true, force: true });
  });
  const identities = new Map();
  const request = async (path, method = 'GET', body, cookie = '', headers = {}) =>
    fetch(base + path, {
      method,
      headers: {
        Origin: origin,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(identities.has(cookie) ? { 'X-XC-Account': identities.get(cookie) } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const login = async (username = 'ete_root1') => {
    const r = await request('/api/auth/login', 'POST', { username, password: 'testing-only-pass' });
    assert.equal(r.status, 200);
    const cookie = r.headers.get('set-cookie').split(';')[0];
    identities.set(cookie, (await r.json()).user.id);
    return cookie;
  };
  return { app, request, login, directory };
}
const payload = (value) => ({
  stores: {
    'f5-xc-simulator-v1': JSON.stringify({ version: 1, state: { marker: value } }),
    'f5-xc-training-v1': JSON.stringify({ version: 1, state: { sessions: { class9: value } } }),
  },
});

test('seeds exactly three normal accounts with hashed passwords; login cookie is HttpOnly and rotates', async (t) => {
  const { app, request, login } = await fixture(t);
  assert.equal(app.database.prepare('SELECT count(*) AS n FROM users').get().n, 3);
  const rows = app.database.prepare('SELECT password_hash FROM users').all();
  assert.ok(rows.every((r) => !r.password_hash.includes('testing-only-pass')));
  const a = await login();
  const b = await login('ete_root2');
  const c = await login('ete_root3');
  assert.notEqual(a, b);
  assert.notEqual(b, c);
  const response = await request(
    '/api/auth/login',
    'POST',
    { username: 'ete_root1', password: 'testing-only-pass' },
    a,
  );
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(response.headers.get('set-cookie'), /SameSite=Strict/);
  assert.equal((await request('/api/auth/session', 'GET', undefined, a)).status, 401);
  assert.equal(
    (
      await request('/api/auth/login', 'POST', {
        username: 'ete_root1',
        password: 'wrong-password',
      })
    ).status,
    401,
  );
});
test('signup, session refresh, logout and revoked session work', async (t) => {
  const { request } = await fixture(t);
  const r = await request('/api/auth/signup', 'POST', {
    username: 'new_student',
    password: 'signup-password',
  });
  assert.equal(r.status, 201);
  const cookie = r.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/api/auth/session', 'GET', undefined, cookie)).status, 200);
  assert.equal(
    (
      await request('/api/auth/signup', 'POST', {
        username: 'new_student',
        password: 'signup-password',
      })
    ).status,
    409,
  );
  assert.equal((await request('/api/auth/logout', 'POST', {}, cookie)).status, 200);
  assert.equal((await request('/api/auth/session', 'GET', undefined, cookie)).status, 401);
  assert.equal((await request('/api/state', 'GET')).status, 401);
});
test('state ownership is server derived; switches are isolated and stale writes rejected', async (t) => {
  const { request, login } = await fixture(t);
  const a = await login(),
    b = await login('ete_root2');
  const write = await request('/api/state', 'PUT', { revision: 0, ...payload('a') }, a);
  assert.equal(write.status, 200);
  assert.equal((await write.json()).revision, 1);
  assert.deepEqual((await (await request('/api/state', 'GET', undefined, b)).json()).stores, {});
  assert.equal(
    (await request('/api/state', 'PUT', { revision: 0, ...payload('stale') }, a)).status,
    409,
  );
  assert.equal(
    (await request('/api/state', 'PUT', { revision: 0, userId: 'someone', ...payload('b') }, b))
      .status,
    422,
  );
  assert.equal(
    (
      await request('/api/state', 'PUT', { revision: 0, ...payload('stolen') }, b, {
        'X-XC-Account': 'wrong-user',
      })
    ).status,
    401,
  );
  assert.ok(
    (await (await request('/api/state', 'GET', undefined, a)).json()).stores[
      'f5-xc-training-v1'
    ].includes('class9'),
  );
  assert.equal((await request('/api/state?userId=someone', 'GET', undefined, b)).status, 400);
});
test('rejects CSRF, invalid state keys, expired sessions and weak signup passwords', async (t) => {
  const { app, request, login } = await fixture(t);
  const cookie = await login();
  assert.equal(
    (
      await request('/api/state', 'PUT', { revision: 0, ...payload('x') }, cookie, {
        Origin: 'https://evil.example',
      })
    ).status,
    403,
  );
  assert.equal(
    (await request('/api/state', 'PUT', { revision: 0, stores: { invalid: 'x' } }, cookie)).status,
    422,
  );
  assert.equal(
    (await request('/api/auth/signup', 'POST', { username: 'safe_user', password: 'short' }))
      .status,
    422,
  );
  app.database.prepare('UPDATE sessions SET expires_at=0').run();
  assert.equal((await request('/api/state', 'GET', undefined, cookie)).status, 401);
});
test('stored state survives reopening database, sessions are not client selected', async (t) => {
  const { app, request, login, directory } = await fixture(t);
  const cookie = await login();
  await request('/api/state', 'PUT', { revision: 0, ...payload('durable') }, cookie);
  const second = await createApplication({ databasePath: join(directory, 'test.sqlite'), origin });

  assert.equal(second.database.prepare('SELECT count(*) AS n FROM users').get().n, 3);
  assert.ok(second.database.prepare('SELECT data FROM user_states').get().data.includes('durable'));
  assert.equal(
    (await request('/api/auth/session', 'GET', undefined, 'xc_session=forged')).status,
    401,
  );
  second.close();
});
test('rate limits repeated authentication attempts and sends no-store security headers', async (t) => {
  const { request } = await fixture(t, { authLimit: 2 });
  for (let i = 0; i < 2; i++)
    await request('/api/auth/login', 'POST', { username: 'missing', password: 'wrong-password' });
  const response = await request('/api/auth/login', 'POST', {
    username: 'missing',
    password: 'wrong-password',
  });
  assert.equal(response.status, 429);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('does not let a stale tab log out a different account', async (t) => {
  const { request, login } = await fixture(t);
  const cookie = await login('ete_root2');
  assert.equal(
    (await request('/api/auth/logout', 'POST', {}, cookie, { 'X-XC-Account': 'stale-account' }))
      .status,
    401,
  );
  assert.equal((await request('/api/auth/session', 'GET', undefined, cookie)).status, 200);
});
test('production requires HTTPS and issues Secure session cookies and HSTS', async (t) => {
  await assert.rejects(
    createApplication({ databasePath: ':memory:', origin, secureCookies: true }),
    /HTTPS/,
  );
  const { request } = await fixture(t, { origin: 'https://xc.example.test', secureCookies: true });
  const response = await request(
    '/api/auth/login',
    'POST',
    { username: 'ete_root1', password: 'testing-only-pass' },
    '',
    { Origin: 'https://xc.example.test' },
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /; Secure/);
  assert.match(response.headers.get('strict-transport-security'), /max-age/);
});

test('serves the production SPA with security headers while keeping state authenticated', async (t) => {
  const { writeFile } = await import('node:fs/promises');
  const directory = await mkdtemp(join(tmpdir(), 'xc-static-'));
  t.after(async () => {
    assert.ok(directory.startsWith(join(tmpdir(), 'xc-static-')));
    await rm(directory, { recursive: true, force: true });
  });
  await writeFile(join(directory, 'index.html'), '<html>XC login shell</html>');
  const { request } = await fixture(t, { staticDirectory: directory });
  const response = await request('/');
  assert.equal(response.status, 200);
  assert.match(await response.text(), /XC login shell/);
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal((await request('/api/state')).status, 401);
  assert.equal((await request('/%2e%2e%2fsecret.json')).status, 404);
});
test('refuses to put the account database inside the public static directory', async () => {
  let app;
  try {
    await assert.rejects(async () => {
      app = await createApplication({
        databasePath: resolve('dist/exposed.sqlite'),
        staticDirectory: resolve('dist'),
        origin,
      });
    }, /outside/);
  } finally {
    app?.close();
  }
});
