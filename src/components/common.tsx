import { useId, type ReactNode } from 'react';
import { Search, ChevronRight, Inbox, ArrowUpRight } from 'lucide-react';
import { Button } from './ui/button';
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'green' | 'red' | 'amber' | 'blue' | 'neutral';
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Status({ healthy, label }: { healthy: boolean; label?: string }) {
  return (
    <span className={`status ${healthy ? 'healthy' : 'unhealthy'}`}>
      <i />
      {label ?? (healthy ? 'Healthy' : 'Unhealthy')}
    </span>
  );
}
export function Card({
  title,
  children,
  action,
  className = '',
}: {
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-title">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Stat({
  label,
  value,
  sub,
  onClick,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button className="stat" onClick={onClick} disabled={!onClick}>
      <span>
        {label}
        {onClick && <ArrowUpRight size={13} />}
      </span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </button>
  );
}
export function Empty({
  title = 'No resources found',
  description = 'Try another filter or create a resource in this namespace.',
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search by name…',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <label className="search-input">
      <Search size={16} />
      <input
        id={id}
        name="resource-search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function TextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ChevronRight size={14} />
    </button>
  );
}
export function SectionNote({ children }: { children: ReactNode }) {
  return <div className="section-note">{children}</div>;
}
export function download(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ExportButton({ data, name }: { data: unknown; name: string }) {
  return (
    <Button
      variant="outline"
      onClick={() => download(`${name}.json`, JSON.stringify(data, null, 2))}
    >
      Export JSON
    </Button>
  );
}
export const time = (value: string) =>
  new Date(value).toLocaleString('en-GB', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
