import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LocalResourcePage } from './LocalResourcePage';
import { resourceDefinitions } from './resource-catalog';
import { referencePages } from './catalog';
import { useNavigationResources } from './store';
import { useConsole } from '../store';
let root: Root;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  useConsole.getState().reset();
  useNavigationResources.setState({ resources: [] });
  const div = document.createElement('div');
  document.body.append(div);
  root = createRoot(div);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
const click = async (name: string) => {
  const b = [...document.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === name || b.getAttribute('aria-label') === name,
  );
  expect(b, name).toBeDefined();
  await act(async () => b!.click());
};
it('creates, reloads and views a new Health Check without changing Class resources', async () => {
  const before = JSON.stringify({
    lbs: useConsole.getState().lbs,
    wafs: useConsole.getState().wafs,
    origins: useConsole.getState().origins,
  });
  await act(async () => root.render(createElement(LocalResourcePage, { page: 'Health Checks' })));
  await click('Add Health Check');
  const input = document.querySelector('input[required]') as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      input,
      'demo-health',
    );
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await click('Save Health Check');
  const saved = localStorage.getItem('f5-xc-navigation-resources-v1')!;
  await act(async () => {
    useNavigationResources.setState({ resources: [] });
    localStorage.setItem('f5-xc-navigation-resources-v1', saved);
    await useNavigationResources.persist.rehydrate();
  });
  await click('demo-health');
  expect(document.querySelector('.config-editor')?.getAttribute('data-mode')).toBe('view');
  expect(document.querySelector('select')?.matches(':disabled')).toBe(true);
  expect(
    JSON.stringify({
      lbs: useConsole.getState().lbs,
      wafs: useConsole.getState().wafs,
      origins: useConsole.getState().origins,
    }),
  ).toBe(before);
});
it('has a real screen definition for every newly linked resource and isolates namespaces', () => {
  for (const page of referencePages)
    if (page !== 'Alerts' && page !== 'About')
      expect(resourceDefinitions[page].fields.length).toBeGreaterThan(0);
  const r = {
    id: 'one',
    page: 'Saved Filters' as const,
    namespace: 'one',
    name: 'same-name',
    description: '',
    values: {},
    updatedAt: '2026-10-22T00:00:00Z',
  };
  useNavigationResources.getState().save(r);
  useNavigationResources.getState().save({ ...r, id: 'two', namespace: 'two' });
  expect(() => useNavigationResources.getState().save({ ...r, id: 'three' })).toThrow(
    'already exists',
  );
  expect(useNavigationResources.getState().resources).toHaveLength(2);
});
