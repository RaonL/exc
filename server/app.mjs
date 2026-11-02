import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { openDatabase, hashPassword, verifyPassword, digest, createSession } from './database.mjs';

const storeKeys = new Set([
  'f5-xc-simulator-v1',
  'f5-xc-training-v1',
  'f5-xc-api-security-v1',
  'f5-xc-navigation-resources-v1',
]);
const bodyLimit = 8 * 1024 * 1024;
const failure = (status, message) => Object.assign(new Error(message), { status });
const json = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};
function headers(res, secure) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  );
  if (secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
}
const tokenFrom = (req) => {
  const value = req.headers.cookie
    ?.split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith('xc_session='))
    ?.slice(11);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
};
const cookie = (res, token, secure) =>
  res.setHeader(
    'Set-Cookie',
    `xc_session=${token ?? ''}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token ? 7 * 86400 : 0}${secure ? '; Secure' : ''}`,
  );
async function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json'))
    throw failure(415, 'JSON 요청이 필요합니다.');
  if (Number(req.headers['content-length'] ?? 0) > bodyLimit)
    throw failure(413, '저장 데이터가 너무 큽니다.');
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > bodyLimit) throw failure(413, '저장 데이터가 너무 큽니다.');
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString());
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error();
    return value;
  } catch {
    throw failure(422, '올바른 JSON 객체가 필요합니다.');
  }
}
function credentials(input) {
  if (Object.keys(input).some((k) => !['username', 'password'].includes(k)))
    throw failure(422, '허용되지 않은 입력입니다.');
  const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : '';
  if (
    !/^[a-z0-9_]{3,32}$/.test(username) ||
    typeof input.password !== 'string' ||
    input.password.length < 8 ||
    input.password.length > 128
  )
    throw failure(422, '아이디는 영문 소문자·숫자·밑줄 3–32자, 비밀번호는 8–128자로 입력하세요.');
  return { username, password: input.password };
}
function stateInput(input) {
  if (
    Object.keys(input).some((k) => !['revision', 'stores'].includes(k)) ||
    !Number.isSafeInteger(input.revision) ||
    input.revision < 0 ||
    !input.stores ||
    typeof input.stores !== 'object' ||
    Array.isArray(input.stores)
  )
    throw failure(422, '저장 형식이 올바르지 않습니다.');
  for (const [key, value] of Object.entries(input.stores)) {
    if (!storeKeys.has(key) || typeof value !== 'string')
      throw failure(422, '허용되지 않은 저장 항목입니다.');
    try {
      const parsed = JSON.parse(value);
      if (
        !parsed ||
        typeof parsed.state !== 'object' ||
        !parsed.state ||
        Array.isArray(parsed.state)
      )
        throw Error();
    } catch {
      throw failure(422, '저장 항목의 형식이 올바르지 않습니다.');
    }
  }
  return JSON.stringify(input.stores);
}
export async function createApplication({
  databasePath,
  origin,
  seedPassword,
  secureCookies = false,
  staticDirectory,
  authLimit = 20,
  trustProxy = false,
} = {}) {
  const expectedOrigin = new URL(origin).origin;
  if (secureCookies && !expectedOrigin.startsWith('https://'))
    throw Error('Production APP_ORIGIN must use HTTPS');
  if (staticDirectory && databasePath !== ':memory:') {
    const normalize = (value) =>
      process.platform === 'win32' ? resolve(value).toLowerCase() : resolve(value);
    const root = normalize(staticDirectory),
      data = normalize(databasePath);
    if (data === root || data.startsWith(root + sep))
      throw Error('Account database must be outside the public static directory.');
  }
  const database = await openDatabase(databasePath, seedPassword);
  const dummyHash = await hashPassword('random-unusable-dummy-password');
  const attempts = new Map();
  const authenticate = (req) => {
    const token = tokenFrom(req);
    if (!token) throw failure(401, '로그인이 필요합니다.');
    const user = database
      .prepare(
        'SELECT users.id,username FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?',
      )
      .get(digest(token), Date.now());
    if (!user) throw failure(401, '로그인이 만료되었습니다. 다시 로그인하세요.');
    return user;
  };
  const server = createServer(async (req, res) => {
    headers(res, secureCookies);
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        if (url.search) throw failure(400, '이 API는 쿼리 매개변수를 허용하지 않습니다.');
        if (!['GET', 'HEAD'].includes(req.method)) {
          if (req.headers.origin !== expectedOrigin)
            throw failure(403, '허용되지 않은 요청 출처입니다.');
          if (req.headers['sec-fetch-site'] === 'cross-site')
            throw failure(403, '교차 사이트 요청은 허용되지 않습니다.');
        }
        if (url.pathname === '/api/health' && req.method === 'GET')
          return json(res, 200, { ok: true });
        if (
          ['/api/auth/signup', '/api/auth/login'].includes(url.pathname) &&
          req.method === 'POST'
        ) {
          const ip = trustProxy
            ? String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress)
                .split(',')[0]
                .trim()
            : req.socket.remoteAddress;
          const now = Date.now();
          const attempt = attempts.get(ip);
          if (!attempt || attempt.until <= now)
            attempts.set(ip, { count: 1, until: now + 15 * 60000 });
          else {
            attempt.count++;
            if (attempt.count > authLimit) {
              res.setHeader('Retry-After', String(Math.ceil((attempt.until - now) / 1000)));
              throw failure(429, '로그인 시도가 많습니다. 잠시 후 다시 시도하세요.');
            }
          }
          if (attempts.size > 10000)
            for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
          const { username, password } = credentials(await body(req));
          let user = database
            .prepare('SELECT id,username,password_hash FROM users WHERE username=?')
            .get(username);
          if (url.pathname.endsWith('/signup')) {
            if (user) throw failure(409, '이미 사용 중인 아이디입니다.');
            const passwordHash = await hashPassword(password);
            const id = randomUUID();
            try {
              database
                .prepare('INSERT INTO users VALUES(?,?,?,?)')
                .run(id, username, passwordHash, now);
            } catch (e) {
              if (e.code?.includes('SQLITE_CONSTRAINT'))
                throw failure(409, '이미 사용 중인 아이디입니다.');
              throw e;
            }
            user = { id, username };
          } else {
            const valid = await verifyPassword(password, user?.password_hash ?? dummyHash);
            if (!user || !valid) throw failure(401, '아이디 또는 비밀번호가 일치하지 않습니다.');
          }
          cookie(res, createSession(database, user.id, tokenFrom(req)), secureCookies);
          return json(res, url.pathname.endsWith('/signup') ? 201 : 200, {
            user: { id: user.id, username: user.username },
          });
        }
        if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
          const token = tokenFrom(req);
          if (req.headers['x-xc-account'] && authenticate(req).id !== req.headers['x-xc-account'])
            throw failure(401, '계정이 변경되었습니다. 다시 로그인하세요.');
          if (token) database.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));
          cookie(res, null, secureCookies);
          return json(res, 200, { ok: true });
        }
        if (url.pathname === '/api/auth/session' && req.method === 'GET')
          return json(res, 200, { user: authenticate(req) });
        if (url.pathname === '/api/state' && ['GET', 'PUT'].includes(req.method)) {
          const user = authenticate(req);
          if (req.headers['x-xc-account'] !== user.id)
            throw failure(401, '계정이 변경되었습니다. 다시 로그인하세요.');
          if (req.method === 'GET') {
            const row = database
              .prepare('SELECT data,revision FROM user_states WHERE user_id=?')
              .get(user.id);
            return json(res, 200, {
              stores: row ? JSON.parse(row.data) : {},
              revision: row?.revision ?? 0,
            });
          }
          const input = await body(req),
            data = stateInput(input);
          // Ownership comes only from the authenticated session. Revision is checked atomically.
          const result =
            input.revision === 0
              ? database
                  .prepare(
                    'INSERT OR IGNORE INTO user_states(user_id,data,revision,updated_at) VALUES(?,?,1,?)',
                  )
                  .run(user.id, data, Date.now())
              : database
                  .prepare(
                    'UPDATE user_states SET data=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=?',
                  )
                  .run(data, Date.now(), user.id, input.revision);
          if (result.changes !== 1)
            throw failure(409, '다른 창에서 데이터가 변경되었습니다. 새로고침 후 다시 작업하세요.');
          return json(res, 200, { revision: input.revision + 1 });
        }
        throw failure(404, 'API를 찾을 수 없습니다.');
      }
      if (!staticDirectory || !['GET', 'HEAD'].includes(req.method))
        throw failure(404, '페이지를 찾을 수 없습니다.');
      const root = resolve(staticDirectory),
        path = resolve(root, '.' + decodeURIComponent(url.pathname));
      if (path !== root && !path.startsWith(root + sep))
        throw failure(404, '페이지를 찾을 수 없습니다.');
      let file = path;
      try {
        if (!(await stat(file)).isFile()) file = resolve(root, 'index.html');
      } catch {
        if (extname(path)) throw failure(404, '파일을 찾을 수 없습니다.');
        file = resolve(root, 'index.html');
      }
      const mime = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.ico': 'image/x-icon',
        '.woff2': 'font/woff2',
      }[extname(file)];
      if (!mime) throw failure(404, '파일을 찾을 수 없습니다.');
      const content = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (e) {
      if (res.headersSent) return res.end();
      if (!e.status) console.error('Request failed:', e.code ?? e.name);
      json(res, e.status ?? 500, { error: e.status ? e.message : '서버 오류가 발생했습니다.' });
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  return { server, database, close: () => database.close() };
}
