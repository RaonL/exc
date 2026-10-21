import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement, useState, type FormEvent } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ConfigurationEditor } from './ConfigurationEditor';
let root: Root | undefined;

it('opens the requested API section without saving configuration', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const scroll = vi.fn();
  const previous = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = scroll;
  const save = vi.fn();
  try {
    const container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root!.render(createElement(ConfigurationEditor, {
      kind: 'HTTP Load Balancer', name: 'shop-lb', namespace: 'api-quickstart',
      initialSection: 'api', value: {}, guide: '', close: vi.fn(), onSave: save,
      sections: [
        { id: 'metadata', title: 'Metadata', content: 'metadata' },
        { id: 'api', title: 'API Protection', content: 'api settings' },
      ],
    })));
    expect(scroll).toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  } finally {
    HTMLElement.prototype.scrollIntoView = previous;
  }
});
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  document.body.replaceChildren();
});
it('enters edit mode without submitting or closing the resource configuration', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const save = vi.fn((event: FormEvent) => event.preventDefault());
  const close = vi.fn();
  function Harness() {
    const [readOnly, setReadOnly] = useState(true);
    return createElement(ConfigurationEditor, {
      kind: 'HTTP Load Balancer',
      name: 'training-lb',
      namespace: 'social-hawk',
      sections: [
        {
          id: 'metadata',
          title: 'Metadata',
          content: createElement('input', { 'aria-label': 'Name', defaultValue: 'training-lb' }),
        },
      ],
      value: { name: 'training-lb' },
      onSave: save,
      close,
      guide: 'https://docs.cloud.f5.com',
      readOnly,
      onEdit: () => setReadOnly(false),
    });
  }
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(createElement(Harness)));
  const edit = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent === 'Edit Configuration',
  )!;
  await act(async () => edit.click());
  expect(save).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  expect(
    (document.querySelector('input[aria-label="Name"]') as HTMLInputElement).matches(':disabled'),
  ).toBe(false);
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  const submit = Array.from(document.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Save and Exit'),
  )!;
  await act(async () => submit.click());
  expect(save).toHaveBeenCalledOnce();
});

it('Apply in a portaled nested configuration does not submit the parent LB form', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const parent = vi.fn((e: FormEvent) => e.preventDefault());
  const child = vi.fn((e: FormEvent) => e.preventDefault());
  const nested = createElement(ConfigurationEditor, {
    kind: 'Secret Type',
    name: '',
    namespace: 'local',
    value: {},
    guide: 'https://docs.cloud.f5.com',
    close: vi.fn(),
    onSave: child,
    submitLabel: 'Apply',
    sections: [{ id: 'secret', title: 'Secret', content: 'Dummy value' }],
  });
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root!.render(
      createElement(ConfigurationEditor, {
        kind: 'HTTP Load Balancer',
        name: 'parent',
        namespace: 'local',
        value: {},
        guide: 'https://docs.cloud.f5.com',
        close: vi.fn(),
        onSave: parent,
        sections: [{ id: 'api', title: 'API Protection', content: nested }],
      }),
    ),
  );
  const button = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === 'Apply',
  )!;
  await act(async () => button.click());
  expect(child).toHaveBeenCalledOnce();
  expect(parent).not.toHaveBeenCalled();
});
