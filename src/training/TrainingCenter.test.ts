import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { TrainingCenter } from './TrainingCenter';
import { useTraining } from './store';
import { useConsole } from '../store';
import { trainingLabs } from './catalog';
import { labGuideFields } from './lab-guide';
import { effectiveEnvironment } from './store';
let root: Root | undefined;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  document.body.replaceChildren();
});
it('returns from embedded settings to the actual console and closes the settings dialog through its callback', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  useConsole.getState().reset();
  useTraining.setState({
    selectedClass: 3,
    selectedLab: 'c3-lab1',
    sessions: {},
    guideTab: 'Environment',
  });
  useTraining.getState().start('c3-lab1');
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  const close = vi.fn();
  await act(async () =>
    root!.render(createElement(TrainingCenter, { embedded: true, onOpenConsole: close })),
  );
  const button = [...host.querySelectorAll('button')].find(
    (b) => b.textContent === '콘솔에서 LB 편집',
  )!;
  await act(async () => button.click());
  expect(close).toHaveBeenCalledOnce();
  expect(useConsole.getState()).toMatchObject({
    namespace: 'training-c3-lab1',
    page: 'HTTP Load Balancers',
  });
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

it('shows actionable Class1 cards instead of a stale legacy session deletion error', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  useConsole.getState().reset();
  useTraining.setState({ selectedClass: 1, selectedLab: 'c1-lab1', sessions: {} });
  useTraining.getState().start('c1-lab1');
  useConsole.setState({ lbs: [] });
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(createElement(TrainingCenter)));
  expect(document.querySelector('[aria-label="Class1 Lab1 쉬운 따라하기"]')).toBeTruthy();
  expect(host.textContent).toContain('demo-app.amer.myedgedemo.com');
  expect(host.textContent).toContain('1. 콘솔에서 따라하기');
  expect(host.textContent).not.toContain('콘솔에서 실습 LB가 삭제되었습니다');
});

it.each(trainingLabs.filter((l) => l.id !== 'c1-lab1'))(
  '$id displays every guide target beside an actual editable setting',
  async (lab) => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    useConsole.getState().reset();
    useTraining.setState({
      selectedClass: lab.classId,
      selectedLab: lab.id,
      sessions: {},
      guideTab: 'Environment',
    });
    useTraining.getState().start(lab.id);
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root!.render(createElement(TrainingCenter, { embedded: true })));
    const fields = labGuideFields(
      lab,
      effectiveEnvironment(useTraining.getState().sessions[lab.id]),
    );
    for (const field of fields) {
      const input = host.querySelector(`[data-guide-field="${field.id}"]`);
      expect(input, `${lab.id}: ${field.label}`).toBeTruthy();
      expect(input!.querySelector('input,select,textarea,button'), field.label).toBeTruthy();
      expect(input!.textContent).toContain(field.expected);
    }
  },
);
