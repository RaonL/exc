import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { OriginEditor } from './OriginEditor';
import { useConsole } from '../store';

let root: Root;
let close: ReturnType<typeof vi.fn>;
const button = (text: string) => {
  const found = [...document.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === text || b.getAttribute('aria-label') === text,
  );
  expect(found, `button ${text}`).toBeDefined();
  return found!;
};
const click = async (text: string) => act(async () => button(text).click());
const field = (name: string) => {
  const label = [...document.querySelectorAll('label')].find(
    (l) => l.querySelector('span')?.textContent?.replace(/\s+/g, ' ').trim() === name,
  );
  return label!.querySelector('input,select,textarea') as HTMLInputElement;
};
const fill = async (element: HTMLInputElement, value: string) => {
  await act(async () => {
    const prototype =
      element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  useConsole.getState().reset();
  close = vi.fn();
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function edit() {
  const original = useConsole.getState().origins[0];
  await act(async () =>
    root.render(createElement(OriginEditor, { initial: original, close, notify: vi.fn() })),
  );
  return original;
}

it('resets the opened origin draft without changing stored resources or submitting', async () => {
  const original = await edit();
  const before = JSON.stringify(useConsole.getState().origins);
  await fill(field('Name *'), 'changed-origin');
  await fill(field('Port *'), '81');
  await click('Reset all configuration fields');
  expect(field('Name *').value).toBe(original.name);
  expect(field('Port *').value).toBe(String(original.port));
  expect(JSON.stringify(useConsole.getState().origins)).toBe(before);
  expect(close).not.toHaveBeenCalled();
});

it('collapses a section without losing its draft, then reopens it from navigation', async () => {
  await edit();
  await fill(field('Port *'), '81');
  await click('Collapse Origin Servers');
  expect(document.querySelector('[data-section="servers"] [hidden]')).not.toBeNull();
  await click('Origin Servers');
  expect(document.querySelector('[data-section="servers"] [hidden]')).toBeNull();
  expect(field('Port *').value).toBe('81');
  expect(close).not.toHaveBeenCalled();
});

it('discards a nested server edit on Back and the parent draft on Cancel', async () => {
  const original = await edit();
  await click('Edit');
  const address = field('IP Address *');
  await fill(address, '192.0.2.99');
  await click('Back');
  expect(document.querySelector('[data-section="servers"]')!.textContent).toContain(
    original.endpoint,
  );
  expect(document.querySelector('[data-section="servers"]')!.textContent).not.toContain(
    '192.0.2.99',
  );
  await fill(field('Name *'), 'discarded-name');
  await click('Cancel and Exit');
  expect(useConsole.getState().origins.find((o) => o.id === original.id)).toEqual(original);
  expect(close).toHaveBeenCalledOnce();
});

it('exposes named controls and tab selection, retaining unsaved inputs across views', async () => {
  await edit();
  const controls = [
    ...document.querySelectorAll('input:not([aria-hidden="true"]),select,textarea'),
  ];
  expect(controls.filter((c) => !c.id || !c.getAttribute('name')).map((c) => c.outerHTML)).toEqual(
    [],
  );
  await fill(field('Name *'), 'draft-origin');
  await click('JSON');
  expect(document.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain(
    'JSON',
  );
  expect(document.querySelector('[role="tabpanel"]')?.textContent).toContain('draft-origin');
  await click('Form');
  expect(field('Name *').value).toBe('draft-origin');
});

it('creates a pool only after the nested DNS draft is applied and the parent is saved', async () => {
  const count = useConsole.getState().origins.length;
  await act(async () => root.render(createElement(OriginEditor, { close, notify: vi.fn() })));
  await fill(field('Name *'), 'browser-origin-pool');
  await click('⊕ Add Item');
  await fill(field('DNS Name *'), 'demo-app.amer.myedgedemo.com');
  expect(useConsole.getState().origins).toHaveLength(count);
  await click('Apply');
  expect(useConsole.getState().origins).toHaveLength(count);
  await fill(field('Port *'), '80');
  await click('Add Origin Pool');
  const created = useConsole.getState().origins.find((o) => o.name === 'browser-origin-pool')!;
  expect(created).toMatchObject({
    endpoint: 'demo-app.amer.myedgedemo.com',
    port: 80,
    healthy: true,
    config: { type: 'Public DNS' },
  });
  expect(useConsole.getState().origins).toHaveLength(count + 1);
  expect(close).toHaveBeenCalledOnce();
});

it('saves edits while preserving the origin identity, health, LB links and storage restoration', async () => {
  const s = useConsole.getState();
  const id = s.origins[0].id;
  s.setOriginHealth(id, false);
  const lbs = structuredClone(useConsole.getState().lbs);
  const original = await edit();
  await fill(field('Port *'), '81');
  await click('Save Origin Pool');
  await act(async () => {
    await useConsole.persist.rehydrate();
  });
  expect(useConsole.getState().origins.find((o) => o.id === id)).toMatchObject({
    ...original,
    port: 81,
    healthy: false,
  });
  expect(useConsole.getState().lbs).toEqual(lbs);
});

it('resets Metadata independently and supports keyboard view switching without saving', async () => {
  const original = await edit();
  await fill(field('Name *'), 'draft-name');
  await fill(field('Port *'), '81');
  await click('Reset Metadata');
  expect(field('Name *').value).toBe(original.name);
  expect(field('Port *').value).toBe('81');
  await act(async () =>
    button('Form').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })),
  );
  expect(document.activeElement?.textContent).toContain('JSON');
  expect(document.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain(
    'JSON',
  );
  expect(close).not.toHaveBeenCalled();
});

it('clears a stale origin-address error when the invalid input is corrected', async () => {
  await edit();
  await click('Edit');
  await fill(field('IP Address *'), 'invalid');
  await click('Apply');
  expect(document.querySelector('[role="alert"]')?.textContent).toContain('Enter a valid');
  await fill(field('IP Address *'), '192.0.2.10');
  expect(document.querySelector('[role="alert"]')).toBeNull();
});
