import { useId, useState, type Dispatch, type SetStateAction } from 'react';
import { ShieldCheck, Search, Pencil, Trash2, CirclePlus } from 'lucide-react';
import type { LB, LBConfig, Origin } from '../types';
import { Field, ToggleField } from './form-fields';
import { Button } from './ui/button';
import { GuideHint } from '../training/GuideFieldContext';
export type LBFieldsProps = {
  form: LB;
  config: LBConfig;
  update: <K extends keyof LB>(key: K, value: LB[K]) => void;
  setting: <K extends keyof LBConfig>(key: K, value: LBConfig[K]) => void;
};
export function MetadataFields({
  form,
  config,
  update,
  setting,
  readOnly,
}: LBFieldsProps & { readOnly: boolean }) {
  return (
    <>
      <div className="form-grid">
        <Field label="Name *">
          <input
            required
            autoFocus={!readOnly}
            placeholder="my-application-lb"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </Field>
      </div>
      <Field label="Labels">
        <input
          placeholder="Add Label"
          value={config.labels}
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
  );
}
export function DomainFields({
  form,
  config,
  update,
  setting,
  domains,
  setDomains,
  part = 'all',
}: LBFieldsProps & {
  domains: string[];
  setDomains: Dispatch<SetStateAction<string[]>>;
  part?: 'all' | 'domains' | 'tls';
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  return (
    <>
      {part !== 'tls' && (
        <>
          <div className="reference-items lb-domains" data-guide-field="lb-domain">
            <strong>Domains *</strong>
            <GuideHint id="lb-domain" />
            <div className="lb-items-toolbar">
              <small>
                {domains.length} item{domains.length === 1 ? '' : 's'}
              </small>
              <label className="lb-items-search">
                <Search size={15} />
                <input
                  aria-label="Search domains"
                  placeholder="Search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <div className="lb-table-scroll" role="region" aria-label="Domains table" tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Domains</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((domain, index) => (
                    <tr key={index} hidden={!domain.toLowerCase().includes(query.toLowerCase())}>
                      <td>{index + 1}</td>
                      <td>
                        <input
                          id={`${id}-domain-${index}`}
                          name={`domain-${index}`}
                          aria-label={`Domain ${index + 1}`}
                          required={domain.toLowerCase().includes(query.toLowerCase())}
                          value={domain}
                          placeholder="class1-lab1.lab-sec.f5demos.com"
                          onChange={(event) => {
                            const items = [...domains];
                            items[index] = event.target.value;
                            setDomains(items);
                          }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          aria-label={`Remove domain ${index + 1}`}
                          className="resource-link"
                          disabled={domains.length === 1}
                          onClick={() => setDomains(domains.filter((_, i) => i !== index))}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              type="button"
              variant="outline"
              aria-label="Add domain"
              onClick={() => {
                setQuery('');
                setDomains([...domains, '']);
              }}
            >
              <CirclePlus size={16} /> Add Item
            </Button>
          </div>
        </>
      )}
      {part !== 'domains' && (
        <>
          <div className="form-grid">
            <Field label="Load Balancer Type">
              <select
                value={form.protocol === 'HTTP' ? 'HTTP' : config.certificate}
                onChange={(e) => {
                  update('protocol', e.target.value === 'HTTP' ? 'HTTP' : 'HTTPS');
                  setting('listenPort', e.target.value === 'HTTP' ? 80 : 443);
                  if (e.target.value !== 'HTTP')
                    setting('certificate', e.target.value as 'Automatic' | 'Custom');
                }}
              >
                <option value="HTTP">HTTP</option>
                <option value="Automatic">HTTPS with Automatic Certificate</option>
                <option value="Custom">HTTPS with Custom Certificate</option>
              </select>
            </Field>
          </div>
          <div className="lb-type-settings">
            <label className="reference-checkbox" data-guide-field="lb-dns">
              <input
                id={`${id}-dns`}
                name="manage-dns"
                type="checkbox"
                checked={config.manageDns ?? false}
                onChange={(e) => setting('manageDns', e.target.checked)}
              />
              Automatically Manage DNS Records
              <GuideHint id="lb-dns" />
            </label>
            {form.protocol === 'HTTP' && (
              <Field label="HTTP Listen Port Choice *">
                <select
                  value={config.listenPortChoice ?? 'HTTP Listen Port'}
                  onChange={(e) => {
                    setting(
                      'listenPortChoice',
                      e.target.value as 'HTTP Listen Port' | 'Default Port',
                    );
                    if (e.target.value === 'Default Port') setting('listenPort', 80);
                  }}
                >
                  <option>HTTP Listen Port</option>
                  <option>Default Port</option>
                </select>
              </Field>
            )}
            <Field label={form.protocol === 'HTTP' ? 'HTTP Listen Port *' : 'HTTPS Listen Port *'}>
              <input
                type="number"
                disabled={form.protocol === 'HTTP' && config.listenPortChoice === 'Default Port'}
                min={1}
                max={65535}
                required
                value={config.listenPort}
                onChange={(e) => setting('listenPort', Number(e.target.value))}
              />
            </Field>
            {form.protocol === 'HTTPS' && (
              <>
                <div className="configuration-info">
                  <ShieldCheck size={16} />
                  {config.certificate === 'Automatic'
                    ? 'Automatic certificate selection is simulated. No certificate is issued and no DNS change is required.'
                    : 'Enter a demo certificate name. Certificate material is not uploaded or used.'}
                </div>
                {config.certificate === 'Custom' && (
                  <Field label="TLS Certificate Reference *">
                    <input
                      value={config.certificateRef}
                      onChange={(e) => setting('certificateRef', e.target.value)}
                      placeholder="training-tls-certificate"
                    />
                  </Field>
                )}
                <ToggleField
                  label="HTTP Redirect to HTTPS"
                  value={config.redirectHttps}
                  onChange={(v) => setting('redirectHttps', v)}
                />
                <ToggleField
                  label="Add HSTS Header"
                  value={config.hsts}
                  onChange={(v) => setting('hsts', v)}
                />
                <div className="advanced-field">
                  <Field label="TLS Security Level">
                    <select
                      value={config.tlsLevel}
                      onChange={(e) =>
                        setting('tlsLevel', e.target.value as typeof config.tlsLevel)
                      }
                    >
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </Field>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
export function OriginPoolFields({
  form,
  config,
  update,
  origins,
  namespace,
  onEdit,
  onCreate,
}: Omit<LBFieldsProps, 'setting'> & {
  origins: Origin[];
  namespace: string;
  onEdit: () => void;
  onCreate: () => void;
}) {
  return (
    <>
      <div className="reference-items lb-origins" data-guide-field="lb-origin">
        <strong>Origin Pools</strong>
        <GuideHint id="lb-origin" />
        {form.originId ? (
          <div
            className="lb-table-scroll"
            role="region"
            aria-label="Origin pools table"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Weight</th>
                  <th>Priority</th>
                  <th>Endpoint Subsets</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Origin Pool</td>
                  <td>
                    {namespace}/{origins.find((o) => o.id === form.originId)?.name}
                  </td>
                  <td>{config.originWeight ?? 1}</td>
                  <td>{config.originPriority ?? 1}</td>
                  <td>—</td>
                  <td>
                    <button
                      type="button"
                      aria-label="Edit origin pool connection"
                      title="Edit origin pool connection"
                      className="resource-link"
                      onClick={() => onEdit()}
                    >
                      <Pencil size={16} />
                    </button>{' '}
                    <button
                      type="button"
                      className="resource-link"
                      aria-label="Remove origin pool connection"
                      title="Remove origin pool connection"
                      onClick={() => update('originId', '')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p>There are no items added yet. Start by adding first item.</p>
        )}
        <Button type="button" variant="outline" onClick={() => onEdit()}>
          {form.originId ? 'Edit Item' : '+ Add Item'}
        </Button>
      </div>
      <Button type="button" variant="ghost" onClick={() => onCreate()}>
        Create New Origin Pool
      </Button>
      <p className="configuration-help">
        Routes can choose another pool. Create pools under Manage → Load Balancers → Origin Pools.
      </p>
    </>
  );
}
