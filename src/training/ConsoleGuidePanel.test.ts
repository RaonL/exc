import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { OriginEditor } from '../components/OriginEditor';
import { LBForm } from '../components/LoadBalancerEditor';
import { useConsole } from '../store';

let root: Root;
const click = async (name: string) => {
  const item = [...document.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === name || b.getAttribute('aria-label') === name,
  );
  expect(item, name).toBeDefined();
  await act(async () => item!.click());
};
const fill = async (selector: string, value: string) => {
  const input = document.querySelector(selector) as HTMLInputElement;
  expect(input, selector).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  useConsole.getState().reset();
  useConsole.getState().startConsoleLab1();
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

it('keeps the guide in parent and nested origin forms and checks input without saving it', async () => {
  await act(async () =>
    root.render(createElement(OriginEditor, { close: vi.fn(), notify: vi.fn() })),
  );
  expect(document.querySelector('[aria-label="설정 따라하기 가이드"]')).toBeTruthy();
  await fill('[data-guide-field="origin-name"] input', 'class1-lab1-pool');
  expect(
    document.querySelector('[aria-label="Name 입력 확인"]')?.getAttribute('aria-checked'),
  ).toBe('true');
  expect(useConsole.getState().origins.some((o) => o.namespace === 'class1-lab1')).toBe(false);
  await click('⊕ Add Item');
  expect(
    document.querySelector('.origin-server-editor [aria-label="설정 따라하기 가이드"]')
      ?.textContent,
  ).toContain('demo-app.amer.myedgedemo.com');
  await fill(
    '.origin-server-editor [data-guide-field="server-dns"] input',
    'demo-app.amer.myedgedemo.com',
  );
  await click('Apply');
  expect(
    document
      .querySelector('[aria-label="Origin Servers → Add Item 입력 확인"]')
      ?.getAttribute('aria-checked'),
  ).toBe('true');
  expect(
    document.querySelector('[aria-label="Port 입력 확인"]')?.getAttribute('aria-checked'),
  ).toBe('false');
  await click('Collapse Origin Servers');
  await fill('[aria-label="Find configuration section"]', 'Metadata');
  await click('설정 위치: Port');
  expect(
    document.querySelector('[data-section="servers"] .config-section-body')?.hasAttribute('hidden'),
  ).toBe(false);
  expect(
    document.querySelector('[data-guide-field="origin-port"] .guide-inline')?.className,
  ).toContain('current');
  await fill('[data-guide-field="origin-port"] input', '80');
  expect(
    document.querySelector('[aria-label="Port 입력 확인"]')?.getAttribute('aria-checked'),
  ).toBe('true');
  expect(document.querySelector('.guide-saved')?.textContent).toContain('아직 저장된');
  await click('Cancel and Exit');
  expect(useConsole.getState().origins.some((o) => o.namespace === 'class1-lab1')).toBe(false);
});

it('keeps the WAF step on reload and preserves LB edits when switching guide steps', async () => {
  await act(async () => root.render(createElement(LBForm, { close: vi.fn(), notify: vi.fn() })));
  await fill('[data-guide-field="lb-name"] input', 'my-unsaved-lb');
  await click('④ WAF 연결');
  expect(document.querySelector('.console-guide-panel')?.textContent).toContain(
    'shared/base-appfw',
  );
  await act(async () => useConsole.persist.rehydrate());
  expect(useConsole.getState().consoleLab1?.guideStep).toBe('waf');
  await click('② LB 기본 설정');
  expect(
    (document.querySelector('[data-guide-field="lb-name"] input') as HTMLInputElement).value,
  ).toBe('my-unsaved-lb');
});
