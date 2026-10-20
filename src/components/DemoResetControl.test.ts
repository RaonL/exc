import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DemoResetControl } from './DemoResetControl';
import { useConsole } from '../store';

let root: Root;
let notify: ReturnType<typeof vi.fn>;
const click = async (name: string) => {
  const button = [...document.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === name,
  );
  expect(button, name).toBeDefined();
  await act(async () => button!.click());
};
beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  useConsole.getState().reset();
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  notify = vi.fn();
  await act(async () => root.render(createElement(DemoResetControl, { onReset: notify })));
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
});

it('shows a labelled reset button and cancel leaves all saved data intact', async () => {
  const persisted = localStorage.getItem('f5-xc-simulator-v1');
  await click('설정 초기화');
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('모든 Namespace');
  expect(localStorage.getItem('f5-xc-simulator-v1')).toBe(persisted);
  await click('취소');
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(localStorage.getItem('f5-xc-simulator-v1')).toBe(persisted);
  expect(notify).not.toHaveBeenCalled();
});

it('restores seed data only after explicit confirmation and persists the reset', async () => {
  const original = useConsole.getState().lbs[0];
  await act(async () =>
    useConsole.getState().saveLb({ ...original, name: 'changed-before-reset', requests: 321 }),
  );
  await click('설정 초기화');
  expect(useConsole.getState().lbs[0].name).toBe('changed-before-reset');
  await click('전체 데모 데이터 초기화');
  await act(async () => useConsole.persist.rehydrate());
  expect(useConsole.getState().lbs.find((l) => l.id === original.id)).toEqual({
    ...original, createdAt: expect.any(String),
  });
  expect(notify).toHaveBeenCalledOnce();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
