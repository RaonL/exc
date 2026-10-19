import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { WafEditor } from './SecurityEditors';
import { useConsole } from '../store';
import { wafConfig } from '../lib/config';
import { sharedBaseWaf } from '../lib/console-lab';
import type { Waf } from '../types';
import { ConsoleApplication } from './ConsoleApplication';

let root: Root;
let close: ReturnType<typeof vi.fn>;
const field = (name: string) => {
  const label = [...document.querySelectorAll('label')].find(
    (l) => l.querySelector('span')?.textContent?.trim() === name,
  );
  expect(label, `field ${name}`).toBeDefined();
  return label!.querySelector('input,select,textarea') as HTMLInputElement;
};
const click = async (name: string) => {
  const button = [...document.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === name || b.getAttribute('aria-label') === name,
  );
  expect(button, `button ${name}`).toBeDefined();
  await act(async () => button!.click());
};
const fill = async (name: string, value: string) => {
  const element = field(name);
  const prototype =
    element.tagName === 'SELECT'
      ? HTMLSelectElement.prototype
      : element.tagName === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(
      new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }),
    );
  });
};
async function render(initial?: Waf, viewOnly = false) {
  await act(async () =>
    root.render(createElement(WafEditor, { initial, viewOnly, close, notify: vi.fn() })),
  );
}
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

it('creates the official Custom policy with all accuracy levels and restores it from storage', async () => {
  await render();
  await fill('Name *', 'lab1-appfw');
  await fill('Enforcement Mode', 'Blocking');
  await fill('Security Policy', 'Custom');
  expect(document.querySelector('[data-section="policy"]')!.textContent).toContain(
    'Attack Signatures Staging',
  );
  await fill('Signature Selection by Accuracy', 'High, Medium and Low');
  await click('Add App Firewall');
  const created = useConsole.getState().wafs.find((w) => w.name === 'lab1-appfw')!;
  expect(created.mode).toBe('Blocking');
  expect(created.config).toMatchObject({
    policy: 'Custom',
    accuracy: 'High, Medium and Low',
    tuning: true,
    staging: 'Disabled',
  });
  const stored = localStorage.getItem('f5-xc-simulator-v1')!;
  await act(async () => {
    useConsole.setState({ wafs: [] });
    localStorage.setItem('f5-xc-simulator-v1', stored);
    await useConsole.persist.rehydrate();
  });
  expect(useConsole.getState().wafs.find((w) => w.id === created.id)).toEqual(created);
  expect(close).toHaveBeenCalledOnce();
});

it('resets opened values without saving, including nested policy and response fields', async () => {
  const original = useConsole.getState().wafs[0];
  await render(original);
  const before = JSON.stringify(useConsole.getState().wafs);
  await fill('Name *', 'discarded-appfw');
  await fill('Enforcement Mode', original.mode === 'Blocking' ? 'Monitoring' : 'Blocking');
  await fill('Security Policy', 'Custom');
  await fill('Signature Selection by Accuracy', 'High');
  await click('Reset all configuration fields');
  expect(field('Name *').value).toBe(original.name);
  expect(field('Enforcement Mode').value).toBe(original.mode);
  expect(field('Security Policy').value).toBe(wafConfig(original).policy);
  expect(JSON.stringify(useConsole.getState().wafs)).toBe(before);
  expect(close).not.toHaveBeenCalled();
});

it('discards policy edits and leaves linked load balancers and events unchanged on cancel', async () => {
  const original = useConsole.getState().wafs[0];
  await render(original);
  const before = JSON.stringify(useConsole.getState());
  await fill('Enforcement Mode', 'Monitoring');
  await fill('Security Policy', 'Custom');
  await click('Cancel and Exit');
  expect(JSON.stringify(useConsole.getState())).toBe(before);
  expect(close).toHaveBeenCalledOnce();
});

it('switches an attached policy without rewriting real console request evidence', async () => {
  const s = useConsole.getState();
  const lb = s.lbs[0];
  const waf = s.wafs.find((w) => w.id === lb.wafId)!;
  const blocked = s.requestApplication(lb.id, '/product?id=4%20OR%201=1', 'GET');
  expect(blocked.responseCode).toBe(403);
  await render(waf, true);
  await click('Edit Configuration');
  expect(close).not.toHaveBeenCalled();
  await fill('Enforcement Mode', 'Monitoring');
  await click('Save App Firewall');
  expect(useConsole.getState().wafs.find((w) => w.id === waf.id)!.mode).toBe('Monitoring');
  let monitored;
  await act(async () => {
    monitored = useConsole.getState().requestApplication(lb.id, '/product?id=4%20OR%201=1', 'GET');
  });
  expect(monitored).toMatchObject({
    responseCode: 200,
    action: 'Detected',
    evaluatedWafId: waf.id,
  });
  expect(useConsole.getState().events.find((e) => e.id === blocked.id)).toMatchObject({
    responseCode: 403,
    action: 'Blocked',
  });
});

it('exposes custom response under Advanced Configuration and returns to the default response', async () => {
  const s = useConsole.getState(),
    original = s.wafs[0];
  const legacy = {
    ...original,
    config: { ...wafConfig(original), responseCode: 429, responseBody: 'Legacy custom body' },
  };
  await render(legacy);
  expect(field('Blocking Response Page').value).toBe('Custom');
  expect(document.querySelector('[data-section="advanced"]')!.textContent).toContain(
    'Custom Blocking Response Page Body',
  );
  await fill('Blocking Response Page', 'Default');
  await click('Save App Firewall');
  expect(useConsole.getState().wafs.find((w) => w.id === original.id)!.config).toMatchObject({
    responseCode: 403,
    responseBody: wafConfig().responseBody,
  });
});

it('rejects duplicate names in JSON view and clears the error after correction', async () => {
  await render();
  await fill('Name *', useConsole.getState().wafs[0].name);
  await click('JSON');
  await click('Add App Firewall');
  expect(document.querySelector('[role="alert"]')!.textContent).toContain('already exists');
  await click('Form');
  await fill('Name *', 'unique-appfw');
  expect(document.querySelector('[role="alert"]')).toBeNull();
});

it('keeps shared policy read-only and does not offer a save or edit action', async () => {
  await render(sharedBaseWaf);
  expect(field('Name *').matches(':disabled')).toBe(true);
  const labels = [...document.querySelectorAll('button')].map((b) => b.textContent?.trim());
  expect(labels).not.toContain('Edit Configuration');
  expect(labels).not.toContain('Save App Firewall');
  await click('Close');
  expect(close).toHaveBeenCalledOnce();
});

it('ignores inactive staging validation when the Default policy is selected', async () => {
  const original = useConsole.getState().wafs[0];
  await render({
    ...original,
    config: { ...wafConfig(original), policy: 'Custom', staging: 'New signatures', stagingDays: 0 },
  });
  await click('JSON');
  await click('Save App Firewall');
  expect(document.querySelector('[role="alert"]')!.textContent).toContain('1–365');
  expect(close).not.toHaveBeenCalled();
  await click('Form');
  await fill('Security Policy', 'Default');
  await click('Save App Firewall');
  expect(close).toHaveBeenCalledOnce();
});

it('resets disabled attack types and staging drafts without mutating saved arrays', async () => {
  const original = useConsole.getState().wafs[0];
  await render(original);
  const before = JSON.stringify(useConsole.getState().wafs);
  await fill('Security Policy', 'Custom');
  await fill('Attack Types', 'Custom');
  const checkbox = field('Command Injection');
  await act(async () => checkbox.click());
  await fill('Attack Signatures Staging', 'New signatures');
  await fill('Staging Period (days)', '3');
  await click('Reset all configuration fields');
  await fill('Security Policy', 'Custom');
  expect(field('Attack Types').value).toBe('Default');
  expect(field('Attack Signatures Staging').value).toBe('Disabled');
  expect(JSON.stringify(useConsole.getState().wafs)).toBe(before);
});

it('shows a saved custom block body safely with its Support ID in the console application', async () => {
  const s = useConsole.getState(),
    lb = s.lbs[0],
    waf = s.wafs.find((w) => w.id === lb.wafId)!;
  s.saveWaf({
    ...waf,
    config: {
      ...wafConfig(waf),
      responseBody: '<script>unsafe()</script> Request {{request_id}}',
      responseCode: 429,
    },
  });
  s.openApplication(lb.id);
  await act(async () => root.render(createElement(ConsoleApplication)));
  await click('SQL Injection');
  const result = document.querySelector('.application-response')!;
  const event = useConsole.getState().events[0];
  expect(result.textContent).toContain('HTTP 429');
  expect(result.querySelector('.application-block-body')!.textContent).toBe(
    event.responseBody!.replaceAll('{{request_id}}', event.id),
  );
  expect(result.querySelector('script')).toBeNull();
});
