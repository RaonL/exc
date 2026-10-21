import { expect, it } from 'vitest';
import { requestPathError } from './request-input';

it('rejects pasted method or body in the path without rejecting encoded query values', () => {
  expect(requestPathError('/api/orders body {"quantity":"wrong"}')).toContain('Request Body JSON');
  expect(requestPathError('POST /api/orders')).toBeTruthy();
  expect(requestPathError('//example.com')).toBeTruthy();
  expect(requestPathError('/api/orders?limit=wrong')).toBe('');
  expect(requestPathError('/api/search?q=hello%20world')).toBe('');
});
