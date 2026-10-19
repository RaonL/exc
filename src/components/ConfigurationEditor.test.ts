import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement, useState, type FormEvent } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ConfigurationEditor } from './ConfigurationEditor';
let root: Root | undefined;
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
