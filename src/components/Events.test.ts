import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SecurityEvents } from './Events';
import { lbConfig } from '../lib/config';

import { useConsole } from '../store';

let root: Root;
const button = (text: string) => {
  const found = [...document.querySelectorAll('button')]
    .reverse()
    .find(
      (b) =>
        !b.closest('[aria-hidden="true"]') &&
        (b.textContent?.trim() === text || b.getAttribute('aria-label') === text),
    );
  expect(found, `button ${text}`).toBeDefined();
  return found!;
};
const click = async (text: string) => {
  await act(async () => button(text).click());
  if (text === 'Create WAF Exclusion rule') {
    await act(async () => {
      await vi.dynamicImportSettled();
    });
  }
};
const field = (name: string) => {
  const label = [...document.querySelectorAll('label')].find(
    (l) => l.querySelector('span')?.textContent?.replace(/\s+/g, ' ').trim() === name,
  );
  return label!.querySelector('input,select,textarea') as HTMLInputElement;
};
const fill = async (element: HTMLInputElement, value: string) => {
  await act(async () => {
    const prototype =
      element.tagName === 'SELECT'
        ? HTMLSelectElement.prototype
        : element.tagName === 'TEXTAREA'
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
    element.dispatchEvent(
      new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }),
    );
  });
};
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  useConsole.getState().reset();
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

vi.mock('./RequestTelemetry', () => ({
  RequestTelemetry: () => null,
  MonitoringRange: () => null,
}));
async function render() {
  await act(async () => root.render(createElement(SecurityEvents, { openLab: vi.fn() })));
}

it('filters by an exact Support ID using req_id In and clears the filter', async () => {
  const event = useConsole.getState().events[0];
  await render();
  await click('Add Filter');
  await fill(field('Select Key'), 'req_id');
  await fill(field('Select Operator'), 'In');
  await fill(field('Assign Values or Type to Add'), event.id);
  await click('Apply');
  expect(document.querySelector('[data-event-id="' + event.id + '"]')).not.toBeNull();
  expect(document.querySelectorAll('[data-event-id]')).toHaveLength(1);
  await click('Clear All');
  expect(document.querySelectorAll('[data-event-id]').length).toBeGreaterThan(1);
});
it('expands Information and JSON inline with the original req_id and request result', async () => {
  const event = useConsole.getState().events[0];
  await render();
  await click('Expand event ' + event.id);
  expect(document.querySelector('.event-inline-detail')!.textContent).toContain(event.id);
  await click('JSON');
  expect(document.querySelector('.event-inline-detail pre')!.textContent).toContain(
    '"req_id": "' + event.id + '"',
  );
});
it('applies an event exclusion to the LB draft and discards it if the parent is cancelled', async () => {
  const s = useConsole.getState(),
    event = s.requestApplication(s.lbs[0].id, '/product?id=4%20OR%201=1', 'GET');
  await render();
  const before = JSON.stringify(useConsole.getState().lbs);
  await click('Actions for event ' + event.id);
  await click('Create WAF Exclusion rule');
  expect(field('Path Regex *').value).toBe('^/product$');
  await click('Apply');
  await click('Apply');
  expect(JSON.stringify(useConsole.getState().lbs)).toBe(before);
  await click('Cancel and Exit');
  expect(JSON.stringify(useConsole.getState().lbs)).toBe(before);
});
it('saves an event exception on the LB only and preserves other attacks and history', async () => {
  const s = useConsole.getState(),
    lb = s.lbs[0],
    event = s.requestApplication(lb.id, '/product?id=4%20OR%201=1', 'GET');
  await render();
  const policies = JSON.stringify(s.wafs);
  await click('Actions for event ' + event.id);
  await click('Create WAF Exclusion rule');
  await click('Apply');
  await click('Apply');
  await click('Save HTTP Load Balancer');
  const state = useConsole.getState();
  expect(lbConfig(state.lbs.find((l) => l.id === lb.id)).exclusions).toHaveLength(1);
  expect(JSON.stringify(state.wafs)).toBe(policies);
  await act(async () => {
    expect(state.requestApplication(lb.id, '/product?id=4%20OR%201=1', 'GET').action).toBe(
      'Allowed',
    );
    expect(state.requestApplication(lb.id, '/product?q=%3Cscript%3E', 'GET').action).toBe(
      'Blocked',
    );
    expect(state.requestApplication(lb.id, '/?cmd=cat%20/etc/passwd', 'GET').action).toBe(
      'Blocked',
    );
    expect(state.requestApplication(lb.id, '/product/other?id=4%20OR%201=1', 'GET').action).toBe(
      'Blocked',
    );
  });
  expect(useConsole.getState().events.find((e) => e.id === event.id)!.action).toBe('Blocked');
});

it('keeps an edited literal path consistent in JSON and when switching to Prefix', async () => {
  const s = useConsole.getState(),
    event = s.requestApplication(s.lbs[0].id, '/product?id=4%20OR%201=1', 'GET');
  await render();
  await click('Actions for event ' + event.id);
  await click('Create WAF Exclusion rule');
  await fill(field('Path Regex *'), '^/api/check$');
  await click('JSON');
  expect(document.querySelector('.config-json pre')!.textContent).toContain('"path": "/api/check"');
  await click('Form');
  await fill(field('Path'), 'Prefix');
  expect(field('Path Prefix *').value).toBe('/api/check');
});

it('supports exact Not in values and leaves the active filter unchanged when cancelled', async () => {
  const ids = useConsole.getState().events.map((e) => e.id);
  await render();
  await click('Add Filter');
  await fill(field('Select Operator'), 'Not in');
  await fill(field('Assign Values or Type to Add'), ids.slice(0, 2).join(','));
  await click('Apply');
  expect(document.querySelectorAll('[data-event-id]')).toHaveLength(ids.length - 2);
  await click('Add Filter');
  await fill(field('Assign Values or Type to Add'), 'not-a-request');
  await click('Cancel');
  expect(document.querySelectorAll('[data-event-id]')).toHaveLength(ids.length - 2);
});
