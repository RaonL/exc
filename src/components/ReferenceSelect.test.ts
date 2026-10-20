import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { ReferenceSelect } from './ReferenceSelect';
it('offers descriptive options with keyboard selection without submitting the parent form', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node),
    change = vi.fn(),
    submit = vi.fn();
  await act(async () =>
    root.render(
      createElement(
        'form',
        { onSubmit: submit },
        createElement(ReferenceSelect, {
          label: 'WAF',
          value: 'Disable',
          options: [
            { value: 'Disable', description: 'No inspection' },
            { value: 'Enable', description: 'Policy reference' },
          ],
          onChange: change,
        }),
      ),
    ),
  );
  const trigger = node.querySelector('[role="combobox"]') as HTMLButtonElement;
  await act(async () => trigger.click());
  expect(node.querySelector('[role="listbox"]')?.textContent).toContain('Policy reference');
  await act(async () =>
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })),
  );
  await act(async () =>
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
  );
  expect(change).toHaveBeenCalledWith('Enable');
  expect(submit).not.toHaveBeenCalled();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  await act(async () => root.unmount());
  node.remove();
});
