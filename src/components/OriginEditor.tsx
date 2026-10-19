import { useState, type FormEvent } from 'react';
import { useConsole } from '../store';
import type { Origin } from '../types';
import { originConfig } from '../lib/config';
import { class1Lab1Source } from '../lib/console-lab';
import { ConfigurationEditor } from './ConfigurationEditor';
import { Field, ToggleField } from './form-fields';
import { Button } from './ui/button';
import { OriginServerItem } from './OriginItems';
export function OriginEditor({
  initial,
  close,
  notify,
}: {
  initial?: Origin;
  close: () => void;
  notify: (message: string) => void;
}) {
  const s = useConsole();
  const [opened] = useState(() => ({
    name: initial?.name ?? '',
    endpoint: initial?.endpoint ?? '',
    port: initial?.port ?? 443,
    config: {
      ...originConfig(initial),
      ...(!initial ? { type: 'Public DNS' as const, healthCheck: 'None' as const } : {}),
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
        submitLabel={initial ? 'Save Origin Pool' : 'Add Origin Pool'}
        name={initial?.name ?? ''}
        namespace={s.namespace}
        guide={class1Lab1Source}
        className="origin-editor"
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
              <>
                <div className="reference-items origin-server-list">
                  <strong>Origin Servers *</strong>
                  {serverApplied ? (
                    <div
                      className="origin-table-scroll"
                      tabIndex={0}
                      role="region"
                      aria-label="Origin servers table"
                    >
                      <table>
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Origin Server</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              {config.type === 'Public DNS' ? 'Public DNS Name' : config.type}
                            </td>
                            <td>{endpoint}</td>
                            <td>
                              <button
                                type="button"
                                className="resource-link"
                                onClick={() => setServerOpen(true)}
                              >
                                Edit
                              </button>{' '}
                              <button
                                type="button"
                                className="resource-link"
                                onClick={() => {
                                  setServerApplied(false);
                                  setEndpoint('');
                                }}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p>There are no items added yet. Start by adding first item.</p>
                  )}
                  {!serverApplied && (
                    <Button type="button" variant="outline" onClick={() => setServerOpen(true)}>
                      ⊕ Add Item
                    </Button>
                  )}
                </div>
                <Field label="Origin server Port">
                  <select value="Port" onChange={() => {}}>
                    <option>Port</option>
                  </select>
                </Field>
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
                <p className="configuration-help origin-simulation-note">
                  This training subset supports one endpoint per pool. No origin connection is
                  opened.
                </p>
              </>
            ),
          },
          {
            id: 'balancing',
            title: 'Other Settings',
            content: (
              <Field label="Load Balancer Algorithm">
                <select
                  value={config.algorithm}
                  onChange={(e) => setting('algorithm', e.target.value as typeof config.algorithm)}
                >
                  <option>Round Robin</option>
                  <option>Least Active Requests</option>
                  <option>Random</option>
                </select>
              </Field>
            ),
          },
          {
            id: 'health',
            title: 'Health Checks',
            content: (
              <>
                <Field label="Health Check">
                  <select
                    value={config.healthCheck}
                    onChange={(e) =>
                      setting('healthCheck', e.target.value as typeof config.healthCheck)
                    }
                  >
                    <option value="None">No Health Check</option>
                    <option value="HTTP">HTTP HealthCheck</option>
                    <option value="TCP">TCP HealthCheck</option>
                  </select>
                </Field>
                {config.healthCheck !== 'None' && (
                  <>
                    {config.healthCheck === 'HTTP' && (
                      <Field label="HTTP Path">
                        <input
                          value={config.healthPath}
                          onChange={(e) => setting('healthPath', e.target.value)}
                        />
                      </Field>
                    )}
                    <div className="form-grid">
                      <Field label="Interval (seconds)">
                        <input
                          type="number"
                          min={1}
                          value={config.interval}
                          onChange={(e) => setting('interval', Number(e.target.value))}
                        />
                      </Field>
                      <Field label="Timeout (seconds)">
                        <input
                          type="number"
                          min={1}
                          value={config.timeout}
                          onChange={(e) => setting('timeout', Number(e.target.value))}
                        />
                      </Field>
                      <Field label="Healthy Threshold">
                        <input
                          type="number"
                          min={1}
                          value={config.healthyThreshold}
                          onChange={(e) => setting('healthyThreshold', Number(e.target.value))}
                        />
                      </Field>
                      <Field label="Unhealthy Threshold">
                        <input
                          type="number"
                          min={1}
                          value={config.unhealthyThreshold}
                          onChange={(e) => setting('unhealthyThreshold', Number(e.target.value))}
                        />
                      </Field>
                    </div>
                  </>
                )}
                <div className="configuration-info">
                  Health-check parameters are stored for training. Use Simulate failure / Recover in
                  the pool list to change health deterministically.
                </div>
              </>
            ),
          },
          {
            id: 'tls',
            title: 'TLS',
            content: (
              <>
                <ToggleField
                  label="Enable TLS to Origin Servers"
                  value={config.tls}
                  onChange={(v) => setting('tls', v)}
                />
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
      {serverOpen && (
        <OriginServerItem
          endpoint={endpoint}
          config={config}
          namespace={s.namespace}
          sites={s.sites}
          close={() => setServerOpen(false)}
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
