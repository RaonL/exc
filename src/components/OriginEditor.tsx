import { useState, type FormEvent } from 'react';
import { useConsole } from '../store';
import type { Origin } from '../types';
import { originConfig } from '../lib/config';
import { class1Lab1Source } from '../lib/console-lab';
import { ConfigurationEditor } from './ConfigurationEditor';
import { Field } from './form-fields';
import { OriginServerItem } from './OriginItems';
import { OriginServerFields, OriginHealthChecks, OriginHealthCheckItem } from './OriginPoolFields';
export function OriginEditor({
  initial,
  close,
  notify,
  viewOnly = false,
}: {
  initial?: Origin;
  close: () => void;
  notify: (message: string) => void;
  viewOnly?: boolean;
}) {
  const [readOnly, setReadOnly] = useState(viewOnly);
  const s = useConsole();
  const [opened] = useState(() => ({
    name: initial?.name ?? '',
    endpoint: initial?.endpoint ?? '',
    port: initial?.port ?? 443,
    config: {
      ...originConfig(initial),
      ...(!initial
        ? {
            type: 'Public DNS' as const,
            healthCheck: 'None' as const,
            algorithm: 'Load Balancer Override' as const,
          }
        : {}),
      siteId:
        originConfig(initial).siteId ||
        s.sites.find((site) => site.namespace === s.namespace && site.kind === 'CE')?.id ||
        '',
    },
  }));
  const [name, setName] = useState(opened.name);
  const [endpoint, setEndpoint] = useState(opened.endpoint);
  const [port, setPort] = useState(opened.port);
  const [serverOpen, setServerOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [serverApplied, setServerApplied] = useState(!!initial);
  const [config, setConfig] = useState(opened.config);
  const [error, setError] = useState('');
  const setting = <K extends keyof typeof config>(key: K, value: (typeof config)[K]) =>
    setConfig((v) => ({ ...v, [key]: value }));
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!serverApplied)
      return setError('Origin Servers: click Add Item and Apply an origin server first.');
    if (!/^[a-z][a-z0-9-]{1,62}$/.test(name))
      return setError('Metadata: use a 2–63 character lowercase name.');
    if (
      s.origins.some((o) => o.namespace === s.namespace && o.name === name && o.id !== initial?.id)
    )
      return setError('This origin pool name already exists.');
    const ipv4 =
      /^\d+(\.\d+){3}$/.test(endpoint) && endpoint.split('.').every((n) => Number(n) <= 255);
    const dns = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(endpoint);
    if (config.type.includes('IP') ? !ipv4 : !dns)
      return setError(
        `Origin Servers: enter a valid ${config.type.includes('IP') ? 'IPv4 address' : 'DNS hostname'}.`,
      );
    if (
      config.type.includes('Site') &&
      !s.sites.some((site) => site.id === config.siteId && site.namespace === s.namespace)
    )
      return setError('Origin Servers: select a site.');
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      return setError('Port must be between 1 and 65535.');
    if (config.healthCheck === 'HTTP' && !config.healthPath.startsWith('/'))
      return setError('HTTP health-check path must start with /.');
    if (
      ![config.interval, config.timeout, config.healthyThreshold, config.unhealthyThreshold].every(
        (v) => Number.isInteger(v) && v > 0,
      ) ||
      config.timeout > config.interval
    )
      return setError(
        'Health check values must be positive integers; timeout cannot exceed interval.',
      );
    s.saveOrigin({
      id: initial?.id ?? crypto.randomUUID(),
      namespace: s.namespace,
      name,
      endpoint,
      port,
      healthy: initial?.healthy ?? true,
      config,
    });
    notify(`${name} origin pool saved`);
    close();
  };
  return (
    <>
      <ConfigurationEditor
        kind="Origin Pool"
        readOnly={readOnly}
        onEdit={() => setReadOnly(false)}
        submitLabel={initial ? 'Save Origin Pool' : 'Add Origin Pool'}
        name={initial?.name ?? ''}
        namespace={s.namespace}
        guide={class1Lab1Source}
        className={`origin-editor origin-lab1-editor ${serverOpen || healthOpen ? 'origin-parent-obscured' : ''}`}
        collapsible
        onReset={() => {
          setName(opened.name);
          setEndpoint(opened.endpoint);
          setPort(opened.port);
          setConfig({ ...opened.config });
          setServerApplied(!!initial);
          setError('');
        }}
        close={close}
        onSave={save}
        error={error}
        value={{ name, namespace: s.namespace, endpoint, port, config }}
        sections={[
          {
            id: 'metadata',
            title: 'Metadata',
            onReset: () => {
              setName(opened.name);
              setConfig((v) => ({
                ...v,
                labels: opened.config.labels,
                description: opened.config.description,
              }));
              setError('');
            },
            content: (
              <>
                <div className="form-grid">
                  <Field label="Name *">
                    <input
                      autoFocus
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Labels">
                  <input
                    placeholder="Add Label"
                    value={config.labels ?? ''}
                    onChange={(e) => setting('labels', e.target.value)}
                  />
                </Field>
                <Field label="Description">
                  <textarea
                    value={config.description}
                    onChange={(e) => setting('description', e.target.value)}
                  />
                </Field>
              </>
            ),
          },
          {
            id: 'servers',
            title: 'Origin Servers',
            content: (
              <OriginServerFields
                endpoint={endpoint}
                applied={serverApplied}
                config={config}
                port={port}
                setPort={setPort}
                setting={setting}
                siteName={s.sites.find((site) => site.id === config.siteId)?.name}
                edit={() => setServerOpen(true)}
                remove={() => {
                  setServerApplied(false);
                  setEndpoint('');
                }}
              />
            ),
          },
          {
            id: 'balancing',
            title: 'Other Settings',
            content: (
              <details className="origin-other-settings">
                <summary>
                  ⚠ Not configured <span>Configure ›</span>
                </summary>
                <p className="configuration-help">
                  Additional connection options are outside this training subset. Configure the
                  origin, balancing algorithm, health check and TLS in the sections above.
                </p>
              </details>
            ),
          },
          {
            id: 'health',
            title: 'Health Checks',
            content: (
              <OriginHealthChecks
                config={config}
                edit={() => setHealthOpen(true)}
                remove={() => setting('healthCheck', 'None')}
              />
            ),
          },
          {
            id: 'tls',
            title: 'TLS',
            content: (
              <>
                <div className="origin-choice">
                  <Field label="TLS *">
                    <select
                      value={config.tls ? 'Enable' : 'Disable'}
                      onChange={(e) => setting('tls', e.target.value === 'Enable')}
                    >
                      <option>Disable</option>
                      <option>Enable</option>
                    </select>
                  </Field>
                </div>
                {config.tls && (
                  <Field label="SNI Value">
                    <input
                      placeholder="origin.example.com"
                      value={config.sni}
                      onChange={(e) => setting('sni', e.target.value)}
                    />
                  </Field>
                )}
                <p className="configuration-help">
                  TLS and the balancing algorithm are persisted configuration examples for a single
                  mock endpoint.
                </p>
              </>
            ),
          },
        ].sort(
          (a, b) =>
            ['metadata', 'servers', 'health', 'tls', 'balancing'].indexOf(a.id) -
            ['metadata', 'servers', 'health', 'tls', 'balancing'].indexOf(b.id),
        )}
      />
      {healthOpen && (
        <OriginHealthCheckItem
          config={config}
          namespace={s.namespace}
          close={() => setHealthOpen(false)}
          cancelAll={close}
          onApply={(next) => {
            setConfig(next);
            setHealthOpen(false);
            setError('');
          }}
        />
      )}
      {serverOpen && (
        <OriginServerItem
          endpoint={endpoint}
          config={config}
          namespace={s.namespace}
          sites={s.sites}
          close={() => setServerOpen(false)}
          cancelAll={close}
          onApply={(address, next) => {
            setEndpoint(address);
            setConfig(next);
            setServerApplied(true);
            setServerOpen(false);
            setError('');
          }}
        />
      )}
    </>
  );
}
