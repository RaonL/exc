import { useState } from 'react';
import { Filter } from 'lucide-react';
import { Field } from './form-fields';
import { Button } from './ui/button';
import type { SecurityEvent } from '../types';
export interface EventFilter {
  key: 'req_id' | 'req_path' | 'src_ip';
  operator: 'In' | 'Not in';
  values: string[];
}
export function matchesEventFilter(event: SecurityEvent, filter: EventFilter | null) {
  if (!filter) return true;
  const value =
    filter.key === 'req_id' ? event.id : filter.key === 'req_path' ? event.path : event.source;
  const included = filter.values.includes(value);
  return filter.operator === 'In' ? included : !included;
}
export function EventFilters({
  value,
  onApply,
}: {
  value: EventFilter | null;
  onApply: (v: EventFilter | null) => void;
}) {
  const [open, setOpen] = useState(false),
    [key, setKey] = useState<EventFilter['key']>('req_id'),
    [operator, setOperator] = useState<EventFilter['operator']>('In'),
    [text, setText] = useState(''),
    [error, setError] = useState('');
  return (
    <div className="event-filter-bar">
      <Filter size={16} />
      {value && (
        <span className="event-filter-chip">
          {value.key} · {value.operator} · {value.values.join(', ')}
        </span>
      )}
      <Button
        variant="ghost"
        onClick={() => {
          setOpen(!open);
          setError('');
        }}
      >
        Add Filter
      </Button>
      {value && (
        <Button variant="ghost" onClick={() => onApply(null)}>
          Clear All
        </Button>
      )}
      {open && (
        <form
          className="event-filter-popover"
          aria-label="Add event filter"
          onSubmit={(e) => {
            e.preventDefault();
            const values = [
              ...new Set(
                text
                  .split(/[,\n]/)
                  .map((x) => x.trim())
                  .filter(Boolean),
              ),
            ];
            if (!values.length) {
              setError('Enter at least one filter value.');
              return;
            }
            onApply({ key, operator, values });
            setOpen(false);
          }}
        >
          <Field label="Select Key">
            <select value={key} onChange={(e) => setKey(e.target.value as EventFilter['key'])}>
              <option>req_id</option>
              <option>req_path</option>
              <option>src_ip</option>
            </select>
          </Field>
          <Field label="Select Operator">
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value as EventFilter['operator'])}
            >
              <option>In</option>
              <option>Not in</option>
            </select>
          </Field>
          <Field label="Assign Values or Type to Add">
            <textarea
              autoFocus
              placeholder="Paste a Support ID"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError('');
              }}
            />
          </Field>
          {error && <p role="alert">{error}</p>}
          <div className="event-filter-buttons">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Apply</Button>
          </div>
        </form>
      )}
    </div>
  );
}
