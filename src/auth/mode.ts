// Static hosting uses a deliberately public demo login. Server authentication is opt-in.
export const demoMode = import.meta.env.VITE_AUTH_MODE !== 'server';
