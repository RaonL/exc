import fs from 'node:fs';
import crypto from 'node:crypto';
const read = (name) =>
  JSON.parse(
    fs
      .readFileSync(`output/verification/persist-${name}-run.txt`, 'utf8')
      .match(/### Result\s*\n([\s\S]*?)\n### Ran/)[1],
  );
const before = read('before'),
  after = read('after');
const sessions = JSON.parse(before.training).state.sessions,
  restored = JSON.parse(after.training).state.sessions;
const result = {
  checkedAt: new Date().toISOString(),
  sessions: Object.fromEntries(
    Object.entries(sessions).map(([id, value]) => [
      id,
      JSON.stringify(value) === JSON.stringify(restored[id]),
    ]),
  ),
  coreUnchanged: before.core === after.core,
  beforeHash: crypto.createHash('sha256').update(before.training).digest('hex'),
  afterHash: crypto.createHash('sha256').update(after.training).digest('hex'),
};
result.pass =
  Object.keys(result.sessions).length === 33 &&
  Object.values(result.sessions).every(Boolean) &&
  result.coreUnchanged;
fs.writeFileSync('output/verification/persistence.json', JSON.stringify(result, null, 2));
console.log(result);
if (!result.pass) process.exitCode = 1;
