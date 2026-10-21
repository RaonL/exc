import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { GuideChecklist } from './GuideChecklist';

it('keeps manual checklist notes on reopen without treating them as saved configuration', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  const node = document.createElement('div'); document.body.append(node);
  let root = createRoot(node);
  const props = { identity: 'testing-step3', title: 'Credentials', items: ['user-one / Standard', 'administrator / Admin'] };
  try {
    await act(async () => root.render(createElement(GuideChecklist, props)));
    await act(async () => node.querySelector<HTMLInputElement>('input')!.click());
    expect(node.textContent).toContain('설정 저장·검증 완료와 별개');
    await act(async () => root.unmount());
    root = createRoot(node);
    await act(async () => root.render(createElement(GuideChecklist, props)));
    expect(node.querySelector<HTMLInputElement>('input')!.checked).toBe(true);
    expect(node.querySelectorAll<HTMLInputElement>('input')[1].checked).toBe(false);
  } finally { await act(async () => root.unmount()); node.remove(); }
});
