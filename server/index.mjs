import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApplication } from './app.mjs';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const production = process.env.NODE_ENV === 'production';
if (production && !process.env.APP_ORIGIN)
  throw Error('Set APP_ORIGIN to the public HTTPS origin.');
const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:5173';
const app = await createApplication({
  databasePath: process.env.DATABASE_PATH ?? resolve(root, 'server-data/xc.sqlite'),
  origin,
  seedPassword: process.env.DEMO_ACCOUNT_PASSWORD,
  secureCookies: production,
  trustProxy: process.env.TRUST_PROXY === 'true',
  staticDirectory: resolve(root, 'dist'),
});
const port = Number(process.env.PORT ?? 3001),
  host = process.env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1');
app.server.listen(port, host, () => console.log(`XC server listening on ${host}:${port}`));
const shutdown = () =>
  app.server.close(() => {
    app.close();
    process.exit(0);
  });
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
