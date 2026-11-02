import { spawn } from 'node:child_process';
const children = [
  spawn(process.execPath, ['--env-file-if-exists=.env.server.local', 'server/index.mjs'], {
    stdio: 'inherit',
  }),
  spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--configLoader', 'native', '--host', '127.0.0.1'],
    { stdio: 'inherit' },
  ),
];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', () => stop(1));
  child.on('exit', (code) => stop(code ?? 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
