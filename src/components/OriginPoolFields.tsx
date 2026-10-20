import { useId, useState, type FormEvent } from 'react';
import { Pencil, PlusCircle, Search, Trash2 } from 'lucide-react';
import type { OriginConfig } from '../types';
import { Button } from './ui/button';
import { GuideHint } from '../training/GuideFieldContext';
import { Field } from './form-fields';
import { ConfigurationEditor } from './ConfigurationEditor';
import { class1Lab1Source } from '../lib/console-lab';

export function OriginServerFields({
  endpoint,
  applied,
  config,
  port,
  siteName,
  setPort,
  setting,
  edit,
  remove,
}: {
  endpoint: string;
  applied: boolean;
  config: OriginConfig;
  port: number;
  siteName?: string;
  setPort: (port: number) => void;
  setting: <K extends keyof OriginConfig>(key: K, value: OriginConfig[K]) => void;
  edit: () => void;
  remove: () => void;
}) {
  const [query, setQuery] = useState('');
  const searchId = useId();
  const matches = `${config.type} ${endpoint} ${siteName ?? ''} ${config.network}`
    .toLowerCase()
    .includes(query.toLowerCase());
  return (
    <>
      <div className="reference-items origin-server-list" data-guide-field="origin-server">
        <strong>Origin Servers *</strong>
        <GuideHint id="origin-server" />
        {applied ? (
          <>
            <div className="origin-items-toolbar">
              <span>1 item</span>
              <label>
                <Search size={15} />
                <input
                  id={searchId}
                  name="origin-server-search"
                  aria-label="Search origin servers"
                  placeholder="Search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <div
              className="origin-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Origin servers table"
            >
              <table>
                <thead>
                  <tr>
                    {['Type', 'Name/IP', 'Site/VSite', 'Network/Segment', 'Labels', 'Actions'].map(
                      (label) => (
                        <th key={label}>{label}</th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {matches ? (
                    <tr>
                      <td>{config.type}</td>
                      <td title={endpoint}>{endpoint}</td>
                      <td>{config.type.includes('Site') ? siteName || '—' : '—'}</td>
                      <td>{config.type.includes('Site') ? config.network : '—'}</td>
                      <td>—</td>
                      <td>
                        <button
                          type="button"
                          aria-label="Edit"
                          title="Edit origin server"
                          onClick={edit}
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          type="button"
                          aria-label="Remove origin server"
                          title="Remove origin server"
                          onClick={remove}
                        >
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={6}>No origin servers match your search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p>There are no items added yet. Start by adding first item.</p>
        )}
        <Button
          type="button"
          variant="outline"
          aria-label="⊕ Add Item"
          disabled={applied}
          title={
            applied
              ? 'This simulator supports one origin server per pool. Edit or remove the existing server.'
              : 'Add origin server'
          }
          onClick={edit}
        >
          <PlusCircle size={16} /> Add Item
        </Button>
      </div>
      <div className="origin-choice">
        <Field label="Origin server Port">
          <select value="Port" onChange={() => {}}>
            <option>Port</option>
          </select>
        </Field>
      </div>
      <div className="origin-dependent-field">
        <Field label="Port *">
          <input
            type="number"
            min={1}
            max={65535}
            required
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
          />
        </Field>
      </div>
      <div className="origin-choice">
        <Field label="Port used for health check">
          <select value="Endpoint port" onChange={() => {}}>
            <option>Endpoint port</option>
          </select>
        </Field>
      </div>
      <Field label="LoadBalancer Algorithm *">
        <select
          value={config.algorithm}
          onChange={(e) => setting('algorithm', e.target.value as OriginConfig['algorithm'])}
        >
          <option>Load Balancer Override</option>
          <option>Round Robin</option>
          <option>Least Active Requests</option>
          <option>Random</option>
        </select>
      </Field>
      <Field label="Endpoint Selection *">
        <select value="Local Endpoints Preferred" onChange={() => {}}>
          <option>Local Endpoints Preferred</option>
        </select>
      </Field>
      <p className="configuration-help">
        Simulation: one origin server per pool. Balancing and endpoint selection are configuration
        examples.
      </p>
    </>
  );
}

export function OriginHealthChecks({
  config,
  edit,
  remove,
}: {
  config: OriginConfig;
  edit: () => void;
  remove: () => void;
}) {
  const configured = config.healthCheck !== 'None';
  return (
    <div className="reference-items origin-health-list">
      <div
        className="origin-table-scroll"
        role="region"
        aria-label="Health checks table"
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Health Check object ⓘ</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {configured ? (
              <tr>
                <td>1</td>
                <td>
                  {config.healthCheck}
                  {config.healthCheck === 'HTTP' ? ` · ${config.healthPath}` : ''}
                </td>
                <td>
                  <button type="button" aria-label="Edit health check" onClick={edit}>
                    <Pencil size={17} />
                  </button>
                  <button type="button" aria-label="Remove health check" onClick={remove}>
                    <Trash2 size={17} />
                  </button>
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={3}>There are no items added yet. Start by adding first item.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="outline" disabled={configured} onClick={edit}>
        <PlusCircle size={16} /> Add Item
      </Button>
      <small>Local HTTP/TCP check configuration; no external health-check object is created.</small>
    </div>
  );
}

export function OriginHealthCheckItem({
  config,
  namespace,
  close,
  cancelAll,
  onApply,
}: {
  config: OriginConfig;
  namespace: string;
  close: () => void;
  cancelAll: () => void;
  onApply: (config: OriginConfig) => void;
}) {
  const [draft, setDraft] = useState({
    ...config,
    healthCheck: config.healthCheck === 'None' ? ('HTTP' as const) : config.healthCheck,
  });
  const [error, setError] = useState('');
  const setting = <K extends keyof OriginConfig>(key: K, value: OriginConfig[K]) =>
    setDraft((c) => ({ ...c, [key]: value }));
  const apply = (e: FormEvent) => {
    e.preventDefault();
    if (draft.healthCheck === 'HTTP' && !draft.healthPath.startsWith('/'))
      return setError('HTTP health-check path must start with /.');
    if (
      ![draft.interval, draft.timeout, draft.healthyThreshold, draft.unhealthyThreshold].every(
        (v) => Number.isInteger(v) && v > 0,
      ) ||
      draft.timeout > draft.interval
    )
      return setError(
        'Health check values must be positive integers; timeout cannot exceed interval.',
      );
    onApply(draft);
  };
  return (
    <ConfigurationEditor
      kind="Health Check"
      name=""
      namespace={namespace}
      guide={class1Lab1Source}
      className="origin-editor origin-health-editor"
      resourceContext={{ title: 'Origin Pool', trail: ['Health Checks', 'New Item'] }}
      close={close}
      onCancelAll={cancelAll}
      onSave={apply}
      submitLabel="Apply"
      cancelLabel="Back"
      error={error}
      value={draft}
      sections={[
        {
          id: 'health-check',
          title: 'Health Check',
          content: (
            <>
              <p className="configuration-help">
                Simulation Mode · Configure a local check for this pool.
              </p>
              <Field label="Health Check">
                <select
                  value={draft.healthCheck}
                  onChange={(e) => setting('healthCheck', e.target.value as 'HTTP' | 'TCP')}
                >
                  <option>HTTP</option>
                  <option>TCP</option>
                </select>
              </Field>
              {draft.healthCheck === 'HTTP' && (
                <Field label="HTTP Path">
                  <input
                    required
                    value={draft.healthPath}
                    onChange={(e) => setting('healthPath', e.target.value)}
                  />
                </Field>
              )}
              {(
                [
                  ['interval', 'Interval (seconds)'],
                  ['timeout', 'Timeout (seconds)'],
                  ['healthyThreshold', 'Healthy Threshold'],
                  ['unhealthyThreshold', 'Unhealthy Threshold'],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    type="number"
                    min={1}
                    required
                    value={draft[key]}
                    onChange={(e) => setting(key, Number(e.target.value))}
                  />
                </Field>
              ))}
            </>
          ),
        },
      ]}
    />
  );
}
