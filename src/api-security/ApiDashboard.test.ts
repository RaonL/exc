import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ApiDashboard } from './ApiDashboard';
import { useConsole } from '../store';
import { useApiSecurity } from './store';

let root: Root;
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

it('shows the live XC columns, keeps inventory when calls age out, and explores path segments', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  localStorage.clear();
  useConsole.getState().reset();
  const lb = useConsole.getState().lbs[0];
  useApiSecurity.setState({
    clock: 1000000,
    endpoints: [
      {
        lbId: lb.id,
        path: '/api/orders/42',
        method: 'GET',
        sources: ['Traffic'],
        calls: 5,
        lastSeen: 1,
      },
    ],
    files: [],
    definitions: [],
    logs: [],
    runs: [],
  });
  const node = document.createElement('div');
  document.body.append(node);
  root = createRoot(node);
  await act(async () => root.render(createElement(ApiDashboard, { lb })));
  for (const name of ['Threat Level', 'Schema Status', 'Last Updated', 'Discovery Source'])
    expect([...document.querySelectorAll('th')].some((t) => t.textContent === name)).toBe(true);
  expect(
    document.querySelector('select[aria-label="Dashboard time range"]')?.getAttribute('aria-label'),
  ).toBeTruthy();
  expect(document.body.textContent).toContain('Discovered: 1');
  expect(document.querySelector('[role="img"]')?.getAttribute('aria-label')).toContain(
    'Total API Calls 0',
  );
  const button = (text: string) =>
    [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!;
  await act(async () => button('Graph').click());
  expect(document.body.textContent).toContain('Segment 3');
  await act(async () => document.querySelectorAll<HTMLButtonElement>('.api-segment-column button')[2].click());
  expect(document.querySelector('.api-segment-results')?.textContent).toContain('/api/orders/42');
  await act(async () => button('All paths').click());
  await act(async () =>
    document.querySelector<HTMLButtonElement>('.api-segment-column button')!.click(),
  );
  expect(document.querySelector('.api-segment-column button')?.getAttribute('aria-pressed')).toBe(
    'true',
  );
  await act(async () =>
    document.querySelector<HTMLButtonElement>('.api-segment-results button')!.click(),
  );
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('GET /api/orders/42');
});
