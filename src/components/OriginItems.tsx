import { useState, type FormEvent } from 'react';
import { ConfigurationEditor } from './ConfigurationEditor';
import { Field } from './form-fields';
import type { Origin, OriginConfig } from '../types';
import { class1Lab1Source } from '../lib/console-lab';

export function OriginServerItem({
  endpoint,
  config,
  namespace,
  onApply,
  close,
  sites,
  cancelAll,
}: {
  endpoint: string;
  config: OriginConfig;
  namespace: string;
  onApply: (endpoint: string, config: OriginConfig) => void;
  close: () => void;
  sites: { id: string; namespace: string; name: string }[];
  cancelAll?: () => void;
}) {
  const [address, setAddress] = useState(endpoint),
    [draft, setDraft] = useState(config),
    [error, setError] = useState('');
  const reset = () => {
    setAddress(endpoint);
    setDraft(config);
    setError('');
  };
  const apply = (event: FormEvent) => {
    event.preventDefault();
    const ipv4 =
      /^\d+(\.\d+){3}$/.test(address) && address.split('.').every((p) => Number(p) <= 255);
    const dns = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(address);
    if (draft.type.includes('IP') ? !ipv4 : !dns)
      return setError('Enter a valid DNS hostname or IPv4 address for the selected type.');
    if (
      draft.type.includes('Site') &&
      !sites.some((s) => s.id === draft.siteId && s.namespace === namespace)
    )
      return setError('Select a site in this namespace.');
    onApply(address, draft);
  };
  return (
    <ConfigurationEditor
      kind="Origin Server"
      resourceContext={{ title: 'Origin Pool', trail: ['Origin Servers', 'New Item'] }}
      className="origin-editor origin-server-editor"
      collapsible
      onReset={reset}
      name=""
      namespace={namespace}
      guide={class1Lab1Source}
      close={close}
      onCancelAll={cancelAll}
      onSave={apply}
      submitLabel="Apply"
      cancelLabel="Back"
      error={error}
      value={{ endpoint: address, ...draft }}
      sections={[
        {
          id: 'origin-server',
          title: 'Origin Server',
          onReset: reset,
          content: (
            <>
              <Field label="Select Type of Origin Server *">
                <select
                  value={draft.type}
                  onChange={(e) => {
                    setDraft({ ...draft, type: e.target.value as OriginConfig['type'] });
                    setError('');
                  }}
                >
                  <option value="Public DNS">Public DNS Name of Origin Server</option>
                  <option value="Public IP">Public IP of Origin Server</option>
                  <option value="IP on Site">IP address of Origin Server on given Sites</option>
                  <option value="DNS on Site">DNS Name of Origin Server on given Sites</option>
                </select>
              </Field>
              <div className="origin-dependent-field">
                <Field label={draft.type.includes('IP') ? 'IP Address *' : 'DNS Name *'}>
                  <input
                    required
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setError('');
                    }}
                    placeholder="demo-app.amer.myedgedemo.com"
                  />
                </Field>
              </div>
              {draft.type.includes('Site') && (
                <>
                  <Field label="Site Reference">
                    <select
                      value={draft.siteId}
                      onChange={(e) => setDraft({ ...draft, siteId: e.target.value })}
                    >
                      <option value="">Select a site</option>
                      {sites
                        .filter((s) => s.namespace === namespace)
                        .map((s) => (
                          <option value={s.id} key={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="Select Network on the Site">
                    <select
                      value={draft.network}
                      onChange={(e) =>
                        setDraft({ ...draft, network: e.target.value as OriginConfig['network'] })
                      }
                    >
                      <option>Inside Network</option>
                      <option>Outside Network</option>
                    </select>
                  </Field>
                </>
              )}
            </>
          ),
        },
      ]}
    />
  );
}

export function OriginPoolItem({
  origins,
  originId,
  weight,
  priority,
  namespace,
  onApply,
  close,
  onCancelAll,
  onInspect,
  obscured = false,
}: {
  origins: Origin[];
  originId: string;
  weight: number;
  priority: number;
  namespace: string;
  onApply: (id: string, weight: number, priority: number) => void;
  close: () => void;
  onCancelAll?: () => void;
  onInspect?: (id: string, edit: boolean) => void;
  obscured?: boolean;
}) {
  const [id, setId] = useState(originId),
    [w, setW] = useState(weight),
    [p, setP] = useState(priority),
    [error, setError] = useState('');
  return (
    <ConfigurationEditor
      kind="Origin Pool with Weight and Priority"
      className={`lb-editor lb-origin-item ${obscured ? 'lb-parent-obscured' : ''}`}
      resourceContext={{
        title: 'HTTP Load Balancer',
        trail: ['Origins', 'Origin Pools', 'New Item'],
      }}
      collapsible
      onReset={() => {
        setId(originId);
        setW(weight);
        setP(priority);
        setError('');
      }}
      name=""
      namespace={namespace}
      guide={class1Lab1Source}
      close={close}
      submitLabel="Apply"
      cancelLabel="Discard"
      onCancelAll={onCancelAll}
      value={{ originId: id, weight: w, priority: p }}
      error={error}
      onSave={(event) => {
        event.preventDefault();
        if (
          !origins.some((o) => o.id === id && o.namespace === namespace) ||
          !Number.isInteger(w) ||
          w < 1 ||
          !Number.isInteger(p) ||
          p < 1
        )
          return setError('Select an origin pool and positive integer weight / priority.');
        onApply(id, w, p);
      }}
      sections={[
        {
          id: 'pool-method',
          title: 'Origin Pool with Weight and Priority',
          content: (
            <>
              <Field label="Select Origin Pool Method">
                <select value="Origin Pool" onChange={() => {}}>
                  <option>Origin Pool</option>
                </select>
              </Field>
              <Field label="Origin Pool *">
                <select required value={id} onChange={(e) => setId(e.target.value)}>
                  <option value="">Select an origin pool</option>
                  {origins
                    .filter((o) => o.namespace === namespace)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.namespace}/{o.name}
                      </option>
                    ))}
                </select>
              </Field>
              {id && onInspect && (
                <div className="lb-origin-reference-actions">
                  <button
                    type="button"
                    className="resource-link"
                    onClick={() => onInspect(id, false)}
                  >
                    View Configuration ↗
                  </button>
                  <button
                    type="button"
                    className="resource-link"
                    onClick={() => onInspect(id, true)}
                  >
                    Edit Configuration ↗
                  </button>
                </div>
              )}
              <Field label="Weight">
                <input
                  type="number"
                  min={1}
                  value={w}
                  onChange={(e) => setW(Number(e.target.value))}
                />
              </Field>
              <Field label="Priority">
                <input
                  type="number"
                  min={1}
                  value={p}
                  onChange={(e) => setP(Number(e.target.value))}
                />
              </Field>
              <p className="configuration-help">
                This single-pool simulator stores weight and priority. It does not distribute
                traffic across multiple pools.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
