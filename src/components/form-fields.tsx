import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactNode,
  type ReactElement,
  type HTMLAttributes,
} from 'react';
import { Switch } from './ui/switch';
import { GuideHint, useGuideField } from '../training/GuideFieldContext';
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const guide = useGuideField(label);
  return (
    <label className="field" data-guide-field={guide?.id}>
      <span>{label}</span>
      {Children.map(children, (child) => {
        if (!isValidElement(child) || !['input', 'select', 'textarea'].includes(String(child.type)))
          return child;
        const control = child as ReactElement<HTMLAttributes<HTMLElement> & { name?: string }>;
        return cloneElement(control, {
          id: control.props.id ?? id,
          name: control.props.name ?? control.props.id ?? id,
          'aria-describedby':
            [control.props['aria-describedby'], hint && `${id}-hint`].filter(Boolean).join(' ') ||
            undefined,
        });
      })}
      {guide && <GuideHint id={guide.id} />}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </label>
  );
}
export function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = useId();
  const guide = useGuideField(label);
  return (
    <label className="toggle-field" data-guide-field={guide?.id}>
      <span>{label}</span>
      <Switch id={id} name={id} checked={value} onCheckedChange={onChange} aria-label={label} />
      {guide && <GuideHint id={guide.id} />}
    </label>
  );
}
