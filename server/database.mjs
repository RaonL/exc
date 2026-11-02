import { DatabaseSync } from 'node:sqlite';
import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const scrypt = promisify(scryptCallback);
export const digest = (token) => createHash('sha256').update(token).digest('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
  const [, salt, expected] = encoded.split('$');
  const actual = await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
export async function openDatabase(path, seedPassword) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS session_user ON sessions(user_id);
 CREATE TABLE IF NOT EXISTS user_states(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL);
 `);
  try {
    if (seedPassword) {
      if (seedPassword.length < 8 || seedPassword.length > 128)
        throw Error('DEMO_ACCOUNT_PASSWORD must have 8–128 characters');
      for (const username of ['ete_root1', 'ete_root2', 'ete_root3']) {
        if (!db.prepare('SELECT id FROM users WHERE username=?').get(username))
          db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(
            randomUUID(),
            username,
            await hashPassword(seedPassword),
            Date.now(),
          );
      }
    }
    return db;
  } catch (e) {
    db.close();
    throw e;
  }
}
export function createSession(db, userId, oldToken, now = Date.now()) {
  if (oldToken) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(oldToken));
  db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token), userId, now + 7 * 86400000);
  return token;
}
