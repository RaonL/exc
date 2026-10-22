import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { WaapNavigation, LearningNavigation } from './WaapNavigation';
import { manageMenu } from './catalog';
import App from '../App';
import { useConsole } from '../store';
let root: Root;
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  document.body.replaceChildren();
});
it('matches the captured Manage names and order and opens the Load Balancers children', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const expected = [
    'Load Balancers',
    'CDN',
    'BIG-IP Virtual Servers',
    'Third-Party Applications',
    'App Firewall',
    'Service Policies',
    'Rate Limiter Policies',
    'Shared Objects',
    'AI & ML',
    'Public IP Addresses',
    'Alerts Management',
    'Files',
    'API Security',
    'Reports',
    'Certificate Management',
    'Bot Defense Management',
    'Saved Filters',
  ];
  expect(manageMenu.map((m) => m.label)).toEqual(expected);
  const go = vi.fn();
  const node = document.createElement('div');
  document.body.append(node);
  root = createRoot(node);
  await act(async () =>
    root.render(createElement(WaapNavigation, { page: 'HTTP Load Balancers', onNavigate: go })),
  );
  const btn = (name: string) =>
    [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === name)!;
  await act(async () => btn('Load Balancers').click());
  expect(document.querySelector('[aria-label="Load Balancers submenu"]')?.textContent).toContain(
    'Health Checks',
  );
  await act(async () => btn('Health Checks').click());
  expect(go).toHaveBeenLastCalledWith('Health Checks');
  expect(document.querySelector('[aria-label="Load Balancers submenu"]')).toBeNull();
});
it('keeps Class 1–9 and API Quickstarts exclusively in the learning section', async () => {
  const node = document.createElement('div');
  document.body.append(node);
  root = createRoot(node);
  const go = vi.fn();
  const lab = vi.fn();
  await act(async () =>
    root.render(createElement(LearningNavigation, { onNavigate: go, onLab: lab })),
  );
  const group = document.querySelector('details')!;
  expect(group.textContent).toContain('Class 1–9');
  expect(group.textContent).toContain('API Quickstarts');
  const train = [...group.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('Training Center'),
  )!;
  await act(async () => train.click());
  expect(go).toHaveBeenCalledWith('Training Center');
  expect(manageMenu.flatMap((m) => m.children ?? []).map((c) => c.page)).not.toContain(
    'API Quickstarts',
  );
});
it('routes a previously missing menu to an editable page rather than a scope popup', async () => {
  localStorage.clear();
  useConsole.getState().reset();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const node = document.createElement('div');
  document.body.append(node);
  root = createRoot(node);
  await act(async () => {
    useConsole.getState().navigate('Web App & API Protection', 'Third-Party Applications');
    root.render(createElement(App));
  });
  expect(document.body.textContent).toContain('Add Third-Party Application');
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  const before = JSON.stringify(useConsole.getState().lbs);
  await act(async () =>
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Add Third-Party Application')!
      .click(),
  );
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
    'Third-Party Application Configuration',
  );
  expect(JSON.stringify(useConsole.getState().lbs)).toBe(before);
  vi.restoreAllMocks();
});
