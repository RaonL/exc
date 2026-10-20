import { createContext, useContext } from 'react';
import type { GuideField } from './console-guide';
export const GuideFieldContext = createContext<{ fields: GuideField[]; current: string }>({
  fields: [],
  current: '',
});
export function useGuideField(label: string) {
  return useContext(GuideFieldContext).fields.find((field) => field.label === label);
}
export function GuideHint({ id }: { id: string }) {
  const { fields, current } = useContext(GuideFieldContext);
  const field = fields.find((item) => item.id === id);
  if (!field) return null;
  return (
    <small
      aria-hidden="true"
      className={`guide-inline ${current === id ? 'current' : ''} ${field.pass ? 'complete' : ''}`}
    >
      <span className="guide-check">{field.pass ? '✓' : ''}</span> 실습 입력값:{' '}
      <b>{field.expected}</b>
    </small>
  );
}
