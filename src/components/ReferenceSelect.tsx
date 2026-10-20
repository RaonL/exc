import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, PlusCircle } from 'lucide-react';
type Option = { value: string; label?: string; description?: string; default?: boolean };
export function ReferenceSelect({
  label,
  value,
  options,
  onChange,
  onAdd,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  onAdd?: () => void;
}) {
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(0),
    ref = useRef<HTMLDivElement>(null),
    id = useId();
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="xc-select" ref={ref}>
      <select
        hidden
        aria-hidden="true"
        tabIndex={-1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label ?? o.value}
          </option>
        ))}
      </select>
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="listbox"
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => {
          setActive(
            Math.max(
              0,
              options.findIndex((o) => o.value === value),
            ),
          );
          setOpen(!open);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
            return;
          }
          if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
            setOpen(true);
            setActive((i) =>
              e.key === 'Home'
                ? 0
                : e.key === 'End'
                  ? options.length - 1
                  : (i + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length,
            );
          }
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (open) {
              onChange(options[active].value);
              setOpen(false);
            } else setOpen(true);
          }
        }}
      >
        <span className="xc-select-branch">↪</span>
        {selected?.label ?? selected?.value ?? 'Select App Firewall'}
        <ChevronDown size={17} />
      </button>
      {open && (
        <div className="xc-select-popup">
          <div id={id} role="listbox" aria-label={label}>
            {options.map((o, i) => (
              <button
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={o.value === value}
                id={`${id}-${i}`}
                className={active === i ? 'active' : ''}
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <span>
                  {o.label ?? o.value}
                  {o.default && <small>Default</small>}
                </span>
                {o.description && <p>{o.description}</p>}
              </button>
            ))}
          </div>
          {onAdd && (
            <button
              type="button"
              className="xc-select-add"
              onClick={() => {
                setOpen(false);
                onAdd();
              }}
            >
              <PlusCircle size={20} /> Add Item
            </button>
          )}
        </div>
      )}
    </div>
  );
}
