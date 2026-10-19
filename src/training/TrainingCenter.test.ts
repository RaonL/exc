import { afterEach, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { TrainingCenter } from './TrainingCenter';
import { useTraining } from './store';
import { useConsole } from '../store';
let root: Root | undefined;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  document.body.replaceChildren();
});
it('keeps the editor usable with an unfinished Class 7 manifest and does not run the pipeline while rendering', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  useConsole.getState().reset();
  useTraining.setState({ selectedClass: 7, selectedLab: 'c7-module1', sessions: {} });
  useTraining.getState().start('c7-module1');
  useTraining.getState().update('c7-module1', (e) => {
    e.controls.source = '{';
    return e;
  });
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(createElement(TrainingCenter)));
  const environment = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent === '환경 / 설정',
  )!;
  await act(async () => environment.click());
  expect(document.querySelector('textarea')?.value).toBe('{');
  expect(host.textContent).toContain('앱 manifest가 유효하지 않습니다.');
  expect(useTraining.getState().sessions['c7-module1'].environment.controls.pipeline).toEqual([]);
});
