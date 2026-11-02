import { beforeEach, expect, it, vi } from 'vitest';
import { api } from './api';

beforeEach(() => localStorage.clear());
it('logs all three demo users in without an API server, rejects wrong credentials', async () => {
  const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
  try {
    for (const username of ['ete_root1', 'ete_root2', 'ete_root3']) {
      const result = await api<{ user: { id: string; username: string } }>('/auth/login', {
        method: 'POST',
        body: { username, password: 'etrevers' },
      });
      expect(result.user.username).toBe(username);
      expect(await api('/auth/session')).toEqual(result);
      await api('/auth/logout', { method: 'POST', body: {}, account: result.user.id });
      await expect(api('/auth/session')).rejects.toMatchObject({ status: 401 });
    }
    await expect(
      api('/auth/login', { method: 'POST', body: { username: 'ete_root1', password: 'wrong' } }),
    ).rejects.toMatchObject({ status: 401 });
    expect(network).not.toHaveBeenCalled();
  } finally {
    network.mockRestore();
  }
});
it('persists separate snapshots across logout/login and rejects stale account writes', async () => {
  const login = async (username: string) =>
    (
      await api<{ user: { id: string } }>('/auth/login', {
        method: 'POST',
        body: { username, password: 'etrevers' },
      })
    ).user;
  const first = await login('ete_root1');
  const stores = {
    'f5-xc-training-v1': JSON.stringify({ state: { progress: 'class9' }, version: 0 }),
  };
  await api('/state', { method: 'PUT', account: first.id, body: { revision: 0, stores } });
  const second = await login('ete_root2');
  expect(await api('/state', { account: second.id })).toEqual({ revision: 0, stores: {} });
  await expect(
    api('/state', { method: 'PUT', account: first.id, body: { revision: 1, stores: {} } }),
  ).rejects.toMatchObject({ status: 401 });
  await login('ete_root1');
  expect(await api('/state', { account: first.id })).toEqual({ revision: 1, stores });
});
