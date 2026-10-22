import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LBForm } from './LoadBalancerEditor';
import type { LB } from '../types';
import { sharedBaseWaf } from '../lib/console-lab';
import { useConsole } from '../store';
import { lbConfig } from '../lib/config';

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

async function render(initial?: LB, viewOnly = false) {
  await act(async () =>
    root.render(createElement(LBForm, { initial, viewOnly, close, notify: vi.fn() })),
  );
}
function domain(index = 1) {
  return document.querySelector(`[aria-label="Domain ${index}"]`) as HTMLInputElement;
}
async function createDraft() {
  await render();
  await fill(field('Name *'), 'lab1-test-lb');
  await fill(domain(), 'lab1-test.lab-sec.f5demos.com');
  await fill(field('Load Balancer Type'), 'HTTP');
  const add = document.querySelector('[data-section="origins"] .btn') as HTMLButtonElement;
  await act(async () => add.click());
  await fill(field('Origin Pool *'), useConsole.getState().origins[0].id);
  await click('Apply');
}

it('keeps WAF Enable separate from policy selection and rejects an empty selection', async () => {
  await createDraft();
  await fill(field('Web Application Firewall (WAF)'), 'Enable');
  expect(field('Enable *').value).toBe('');
  await click('JSON');
  await click('Add HTTP Load Balancer');
  expect(document.querySelector('[role="alert"]')?.textContent).toContain(
    'Web Application Firewall:',
  );
  expect(useConsole.getState().lbs.some((l) => l.name === 'lab1-test-lb')).toBe(false);
  expect(close).not.toHaveBeenCalled();
});

it('creates and restores HTTP/80, DNS, origin and shared WAF from the same form', async () => {
  await createDraft();
  const manageDns = [...document.querySelectorAll('label')]
    .find((l) => l.textContent?.includes('Automatically Manage DNS Records'))!
    .querySelector('input')!;
  await act(async () => manageDns.click());
  await fill(field('Web Application Firewall (WAF)'), 'Enable');
  await fill(field('Enable *'), sharedBaseWaf.id);
  await click('Add HTTP Load Balancer');
  await act(async () => {
    await useConsole.persist.rehydrate();
  });
  expect(useConsole.getState().lbs.find((l) => l.name === 'lab1-test-lb')).toMatchObject({
    protocol: 'HTTP',
    wafId: sharedBaseWaf.id,
    originId: useConsole.getState().origins[0].id,
    config: { listenPort: 80, manageDns: true, vip: 'Internet' },
  });
  expect(close).toHaveBeenCalledOnce();
});

it('resets the opened LB draft including an enabled but unselected WAF', async () => {
  const initial = useConsole.getState().lbs[0];
  await render(initial);
  await fill(field('Name *'), 'discarded-name');
  await fill(domain(), 'discarded.example.com');
  await fill(field('Web Application Firewall (WAF)'), 'Disable');
  await click('Reset all configuration fields');
  expect(field('Name *').value).toBe(initial.name);
  expect(domain().value).toBe(initial.domains[0]);
  expect(field('Enable *').value).toBe(initial.wafId);
  expect(close).not.toHaveBeenCalled();
});

it('requires Apply for origin changes and discards the parent draft on Cancel', async () => {
  const initial = useConsole.getState().lbs[0];
  await render(initial);
  const edit = document.querySelector(
    '[data-section="origins"] .resource-link',
  ) as HTMLButtonElement;
  await act(async () => edit.click());
  await fill(field('Origin Pool *'), useConsole.getState().origins[1].id);
  await click('Discard');
  expect(document.querySelector('[data-section="origins"]')?.textContent).toContain(
    useConsole.getState().origins[0].name,
  );
  await fill(field('Name *'), 'cancelled-lb');
  await click('Cancel and Exit');
  expect(useConsole.getState().lbs.find((l) => l.id === initial.id)).toEqual(initial);
});

it('resets settings to defaults only in the draft and can restore opened values', async () => {
  const initial = useConsole.getState().lbs[0];
  const persisted = localStorage.getItem('f5-xc-simulator-v1');
  await render(initial);
  await fill(field('Description'), 'Unsaved change');
  await click('LB 설정 초기화');
  await click('Keep editing');
  expect(field('Description').value).toBe('Unsaved change');
  await click('LB 설정 초기화');
  await click('Reset draft settings');
  expect(field('Name *').value).toBe(initial.name);
  expect(domain().value).toBe(initial.domains[0]);
  expect(field('Load Balancer Type').value).toBe('Automatic');
  expect(field('Description').value).toBe('');
  expect(field('Web Application Firewall (WAF)').value).toBe('Disable');
  expect(document.querySelector('[data-section="origins"]')?.textContent).not.toContain(
    useConsole.getState().origins[0].name,
  );
  expect(localStorage.getItem('f5-xc-simulator-v1')).toBe(persisted);
  await click('Reset all configuration fields');
  expect(field('Enable *').value).toBe(initial.wafId);
  expect(document.querySelector('[data-section="origins"]')?.textContent).toContain(
    useConsole.getState().origins[0].name,
  );
  await click('Cancel and Exit');
  expect(useConsole.getState().lbs.find((l) => l.id === initial.id)).toEqual(initial);
});

it('saves reset settings after reselecting an origin while retaining identity and other resources', async () => {
  const initial = useConsole.getState().lbs[0];
  const others = useConsole.getState().lbs.filter((l) => l.id !== initial.id);
  const wafs = useConsole.getState().wafs;
  const origins = useConsole.getState().origins;
  await render(initial);
  await click('LB 설정 초기화');
  await click('Reset draft settings');
  await act(async () =>
    (document.querySelector('[data-section="origins"] .btn') as HTMLButtonElement).click(),
  );
  await fill(field('Origin Pool *'), origins[0].id);
  await click('Apply');
  await click('Save HTTP Load Balancer');
  await act(async () => useConsole.persist.rehydrate());
  expect(useConsole.getState().lbs.find((l) => l.id === initial.id)).toMatchObject({
    id: initial.id,
    name: initial.name,
    namespace: initial.namespace,
    domains: initial.domains,
    requests: initial.requests,
    createdAt: initial.createdAt,
    protocol: 'HTTPS',
    wafId: '',
    originId: origins[0].id,
    apiProtection: false,
    botDefense: false,
    ddosProtection: true,
    config: { listenPort: 443, routes: [], exclusions: [], timeout: 30, manageDns: false },
  });
  expect(useConsole.getState().lbs.filter((l) => l.id !== initial.id)).toEqual(others);
  expect(useConsole.getState().wafs).toEqual(wafs);
  expect(useConsole.getState().origins).toEqual(origins);
});

it('filters domain rows without changing their order and cancels creation without persisting', async () => {
  const persisted = localStorage.getItem('f5-xc-simulator-v1');
  await createDraft();
  await click('Add domain');
  await fill(domain(2), 'second.example.com');
  await fill(document.querySelector('[aria-label="Search domains"]') as HTMLInputElement, 'second');
  expect(domain(1).closest('tr')?.hidden).toBe(true);
  expect(domain(2).closest('tr')?.hidden).toBe(false);
  await fill(document.querySelector('[aria-label="Search domains"]') as HTMLInputElement, '');
  expect(domain(1).value).toBe('lab1-test.lab-sec.f5demos.com');
  expect(domain(2).value).toBe('second.example.com');
  await click('Cancel and Exit');
  expect(localStorage.getItem('f5-xc-simulator-v1')).toBe(persisted);
  expect(useConsole.getState().lbs.some((l) => l.name === 'lab1-test-lb')).toBe(false);
});

it('rejects a policy from another namespace even if loaded into an old draft', async () => {
  const initial = useConsole.getState().lbs[0];
  useConsole
    .getState()
    .saveWaf({ id: 'foreign-waf', namespace: 'staging', name: 'foreign-waf', mode: 'Blocking' });
  await render({ ...initial, wafId: 'foreign-waf' });
  await click('JSON');
  await click('Save HTTP Load Balancer');
  expect(useConsole.getState().lbs.find((l) => l.id === initial.id)?.wafId).toBe(initial.wafId);
  expect(close).not.toHaveBeenCalled();
});

it('retains identity, request totals and advanced settings when saving basic edits', async () => {
  const initial = useConsole.getState().lbs[0];
  await render(initial);
  await fill(field('Description'), 'Updated from the LB console');
  await click('Save HTTP Load Balancer');
  const saved = useConsole.getState().lbs.find((l) => l.id === initial.id)!;
  expect(saved).toMatchObject({
    ...initial,
    config: { ...initial.config, description: 'Updated from the LB console' },
  });
  expect(saved.requests).toBe(initial.requests);
});

it('opens configuration read-only and enters edit mode without saving', async () => {
  await render(useConsole.getState().lbs[0], true);
  expect(document.querySelector('.xc-read-row')?.textContent).toContain(
    useConsole.getState().lbs[0].name,
  );
  expect(document.querySelector('input[name="lb-name"]')).toBeNull();
  await click('Edit Configuration');
  expect(field('Name *').matches(':disabled')).toBe(false);
  expect(close).not.toHaveBeenCalled();
});

it('closes only the open WAF dropdown on Escape and retains the parent LB draft', async () => {
  await render(useConsole.getState().lbs[0]);
  const trigger = document.querySelector('.xc-select [role="combobox"]') as HTMLButtonElement;
  await act(async () => trigger.click());
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  await act(async () =>
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    ),
  );
  expect(close).not.toHaveBeenCalled();
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
});

it('keeps saved domain arrays unchanged while editing, removing and cancelling rows', async () => {
  const original = structuredClone(useConsole.getState().lbs[0]);
  await render(useConsole.getState().lbs[0]);
  await fill(domain(), 'draft-domain.example.com');
  expect(useConsole.getState().lbs.find((l) => l.id === original.id)?.domains).toEqual(
    original.domains,
  );
  await click('Add domain');
  await fill(domain(2), 'second.example.com');
  const remove = document.querySelector(
    '[data-section="domains"] .resource-link',
  ) as HTMLButtonElement;
  await act(async () => remove.click());
  expect(domain().value).toBe('second.example.com');
  await click('Cancel and Exit');
  expect(useConsole.getState().lbs.find((l) => l.id === original.id)).toEqual(original);
});

it('clears an outdated domain validation error when the draft is corrected', async () => {
  await render(useConsole.getState().lbs[0]);
  await fill(domain(), 'https://invalid.example.com');
  await click('Save HTTP Load Balancer');
  expect(document.querySelector('[role="alert"]')?.textContent).toContain('Domains:');
  await fill(domain(), 'corrected.example.com');
  expect(document.querySelector('[role="alert"]')).toBeNull();
});

it('follows live XC section order and exposes a nested routes table in View without changing saved configuration', async () => {
  const original = useConsole.getState().lbs[0];
  await render(
    {
      ...original,
      config: {
        ...lbConfig(original),
        routes: [
          {
            id: 'rea-route',
            name: 'rea-route',
            type: 'Simple',
            path: '/',
            method: 'ANY',
            match: 'Prefix',
            enabled: true,
            originId: original.originId,
            wafId: '',
            responseCode: 200,
            responseBody: 'OK',
            redirectUrl: '',
          },
        ],
      },
    },
    true,
  );
  const titles = [...document.querySelectorAll('.config-navigation nav button')].map(
    (b) => b.textContent,
  );
  expect(titles.indexOf('VIP Advertisement')).toBeLessThan(titles.indexOf('SSL/TLS Type'));
  expect(titles.indexOf('SSL/TLS Type')).toBeLessThan(titles.indexOf('Routes'));
  expect(titles).not.toContain('Origins');
  expect(titles.indexOf('Common Security Controls')).toBeLessThan(titles.indexOf('API Protection'));
  const before = JSON.stringify(useConsole.getState().lbs);
  await click('View Routes Configuration');
  expect([...document.querySelectorAll('[role="dialog"]')].at(-1)?.textContent).toContain(
    'Parameters',
  );
  expect(JSON.stringify(useConsole.getState().lbs)).toBe(before);
});

it('applies nested route edits to the draft, saves and reloads them before routing a request', async () => {
  const original = useConsole.getState().lbs[0];
  await render(original);
  const before = JSON.stringify(useConsole.getState().lbs);
  await click('Configure Routes');
  await click('Add Route');
  await fill(field('Path'), '/rea-route');
  await fill(field('Route Type'), 'Direct Response');
  await fill(field('Response Code'), '204');
  await click('Apply');
  expect(JSON.stringify(useConsole.getState().lbs)).toBe(before);
  await click('Save HTTP Load Balancer');
  const saved = localStorage.getItem('f5-xc-simulator-v1')!;
  await act(async () => {
    useConsole.setState({ lbs: [] });
    localStorage.setItem('f5-xc-simulator-v1', saved);
    await useConsole.persist.rehydrate();
  });
  expect(
    useConsole
      .getState()
      .lbs.find((l) => l.id === original.id)
      ?.config?.routes.at(-1)?.path,
  ).toBe('/rea-route');
  await act(async () => {
    expect(
      useConsole.getState().requestApplication(original.id, '/rea-route', 'GET').responseCode,
    ).toBe(204);
  });
});
