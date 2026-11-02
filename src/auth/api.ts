import { notifySessionChange } from './sessionSignal';
import { demoMode } from './mode';
import { demoRequest } from './demo';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export type AccountUser = { id: string; username: string };
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; account?: string; keepalive?: boolean } = {},
): Promise<T> {
  if (demoMode) {
    const result = demoRequest(path, options, (status, message) => new ApiError(status, message));
    if (['/auth/login', '/auth/logout'].includes(path)) notifySessionChange();
    return result as T;
  }
  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    ...(options.keepalive ? { keepalive: true } : {}),
    headers: {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.account ? { 'X-XC-Account': options.account } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const result = await response.json().catch(() => ({ error: '서버 응답을 확인할 수 없습니다.' }));
  if (!response.ok)
    throw new ApiError(response.status, result.error ?? '요청을 처리하지 못했습니다.');
  if (['/auth/login', '/auth/signup', '/auth/logout'].includes(path)) notifySessionChange();
  return result as T;
}
