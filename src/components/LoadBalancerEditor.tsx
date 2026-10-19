import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useConsole } from '../store';
import type { LB, RouteRule, SecurityEvent } from '../types';
import { lbConfig } from '../lib/config';
import { class1Lab1Source } from '../lib/console-lab';
import { MetadataFields, DomainFields, OriginPoolFields } from './LoadBalancerBasics';
import { FirewallFields } from './LoadBalancerFirewall';
import { ConfigurationEditor } from './ConfigurationEditor';
import { Field, ToggleField } from './form-fields';
import { Button } from './ui/button';
import { Badge } from './common';
import { exclusionError } from '../lib/waf-exclusions';
import { WafEditor } from './SecurityEditors';
import { OriginEditor } from './OriginEditor';
import { OriginPoolItem } from './OriginItems';
const WafExclusionRules = lazy(() =>
  import('./WafExclusionRules').then((module) => ({ default: module.WafExclusionRules })),
);
export function LBForm({
  initial,
  close,
  notify,
  viewOnly = false,
  exclusionEvent,
}: {
  initial?: LB;
  close: () => void;
  notify: (message: string) => void;
  viewOnly?: boolean;
  exclusionEvent?: SecurityEvent;
}) {
  const s = useConsole();
  const [exclusions, setExclusions] = useState<{ event?: SecurityEvent; newItem?: boolean } | null>(
    exclusionEvent ? { event: exclusionEvent } : null,
  );
  const [readOnly, setReadOnly] = useState(viewOnly);
  const [nested, setNested] = useState<'origin' | 'waf' | null>(null);
  const [originItem, setOriginItem] = useState(false);
  const [viewWaf, setViewWaf] = useState('');
  const [form, setForm] = useState<LB>(
    initial ?? {
      id: crypto.randomUUID(),
      namespace: s.namespace,
      name: '',
      domains: [],
      protocol: 'HTTPS',
      originId: '',
      wafId: '',
      apiProtection: false,
      botDefense: false,
      ddosProtection: true,
      requests: 0,
      createdAt: new Date().toISOString(),
    },
  );
  const [config, setConfig] = useState(lbConfig(initial));
  const [domains, setDomains] = useState<string[]>(initial?.domains ?? ['']);
  const [wafEnabled, setWafEnabled] = useState(!!initial?.wafId);
  const [opened] = useState(() => ({ form, config, domains }));
  const [error, setError] = useState('');
  const update = <K extends keyof LB>(key: K, value: LB[K]) => {
    setForm((v) => ({ ...v, [key]: value }));
    setError('');
  };
  const setting = <K extends keyof typeof config>(key: K, value: (typeof config)[K]) => {
    setConfig((v) => ({ ...v, [key]: value }));
    setError('');
  };
  const origins = s.origins.filter((o) => o.namespace === s.namespace);
  const wafs = s.wafs.filter((w) => w.namespace === s.namespace || w.namespace === 'shared');
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const list = domains.map((d) => d.trim().toLowerCase()).filter(Boolean);
    if (!/^[a-z][a-z0-9-]{1,62}$/.test(form.name))
      return setError('Metadata: use a 2–63 character lowercase name starting with a letter.');
    if (s.lbs.some((l) => l.namespace === s.namespace && l.id !== form.id && l.name === form.name))
      return setError('Metadata: this load balancer name already exists.');
    if (
      !list.length ||
      list.some((d) => !/^(\*\.)?([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(d))
    )
      return setError('Domains: enter valid hostnames without https:// or a path.');
    if (
      new Set(list).size !== list.length ||
      s.lbs.some(
        (l) =>
          l.namespace === s.namespace &&
          l.id !== form.id &&
          l.domains.some((d) => list.includes(d)),
      )
    )
      return setError('Domains: duplicate domain or domain already assigned to another LB.');
    if (!origins.some((o) => o.id === form.originId))
      return setError('Origins: select a pool from the current namespace.');
    if (wafEnabled && !wafs.some((w) => w.id === form.wafId))
      return setError('Web Application Firewall: select a policy from this namespace or shared.');
    if (!Number.isInteger(config.listenPort) || config.listenPort < 1 || config.listenPort > 65535)
      return setError('Listen port must be between 1 and 65535.');
    if (config.vip === 'Internet (Specified VIP)' && !validIpv4(config.vipAddress))
      return setError('VIP Advertisement: enter a valid IPv4 address.');
    if (
      config.vip === 'Custom' &&
      !s.sites.some((site) => site.id === config.siteId && site.namespace === s.namespace)
    )
      return setError('VIP Advertisement: select a site.');
    if (
      form.protocol === 'HTTPS' &&
      config.certificate === 'Custom' &&
      !config.certificateRef.trim()
    )
      return setError('TLS: specify a demo certificate reference.');
    if (
      config.routes.some(
        (r) =>
          !r.name.trim() ||
          !r.path.startsWith('/') ||
          (r.type === 'Simple' && !origins.some((o) => o.id === r.originId)) ||
          (r.type === 'Redirect' && !/^https?:\/\/[^\s]+$/.test(r.redirectUrl)) ||
          !Number.isInteger(r.responseCode) ||
          r.responseCode < 200 ||
          r.responseCode > 599,
      )
    )
      return setError(
        'Routes: check names, paths, pool references, response codes, and redirect URLs.',
      );
    if (config.exclusions.some((e) => exclusionError(e)))
      return setError('WAF exclusions: ' + config.exclusions.map(exclusionError).find(Boolean));
    if (new Set(config.exclusions.map((e) => e.name)).size !== config.exclusions.length)
      return setError('WAF exclusions must have unique names.');
    if (!Number.isFinite(config.timeout) || config.timeout < 1 || config.timeout > 600)
      return setError('Route timeout must be between 1 and 600 seconds.');
    s.saveLb({ ...form, domains: list, config });
    notify(`${form.name} configuration saved`);
    close();
  };
  const routeUpdate = (id: string, patch: Partial<RouteRule>) =>
    setting(
      'routes',
      config.routes.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  const addRoute = () =>
    setting('routes', [
      ...config.routes,
      {
        id: crypto.randomUUID(),
        name: `route-${config.routes.length + 1}`,
        type: 'Simple',
        method: 'ANY',
        match: 'Prefix',
        path: '/',
        enabled: true,
        originId: form.originId,
        wafId: '',
        responseCode: 200,
        responseBody: 'OK',
        redirectUrl: '',
      },
    ]);
  const move = (index: number, delta: number) => {
    const next = [...config.routes];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setting('routes', next);
  };
  return (
    <>
      {!exclusions && (
        <ConfigurationEditor
          kind="HTTP Load Balancer"
          submitLabel={initial ? 'Save HTTP Load Balancer' : 'Add HTTP Load Balancer'}
          name={initial?.name ?? ''}
          namespace={s.namespace}
          guide={class1Lab1Source}
          className="lb-editor"
          collapsible
          onReset={() => {
            setForm(opened.form);
            setConfig(opened.config);
            setDomains(opened.domains);
            setWafEnabled(!!opened.form.wafId);
            setError('');
          }}
          close={close}
          onSave={save}
          error={error}
          value={{ ...form, domains: domains.map((d) => d.trim()), config }}
          readOnly={readOnly}
          onEdit={() => setReadOnly(false)}
          sections={[
            {
              id: 'metadata',
              title: 'Metadata',
              onReset: () => {
                update('name', opened.form.name);
                setConfig((c) => ({
                  ...c,
                  labels: opened.config.labels,
                  description: opened.config.description,
                }));
                setError('');
              },
              content: (
                <MetadataFields
                  form={form}
                  config={config}
                  update={update}
                  setting={setting}
                  readOnly={readOnly}
                />
              ),
            },
            {
              id: 'domains',
              title: 'Domains and LB Type',
              content: (
                <DomainFields
                  form={form}
                  config={config}
                  update={update}
                  setting={setting}
                  domains={domains}
                  setDomains={(value) => {
                    setDomains(value);
                    setError('');
                  }}
                />
              ),
            },
            {
              id: 'origins',
              title: 'Origins',
              content: (
                <OriginPoolFields
                  form={form}
                  config={config}
                  update={update}
                  origins={origins}
                  namespace={s.namespace}
                  onEdit={() => setOriginItem(true)}
                  onCreate={() => setNested('origin')}
                />
              ),
            },
            {
              id: 'routes',
              title: 'Routes',
              description:
                'Rules are evaluated from top to bottom. A request uses the first enabled method/path match.',
              content: (
                <>
                  {config.routes.length === 0 && (
                    <div className="configuration-empty">
                      No explicit routes. All requests use the default origin pool.
                    </div>
                  )}
                  {config.routes.map((r, index) => (
                    <div className="config-item" key={r.id}>
                      <div className="config-item-header">
                        <Badge tone="blue">{index + 1}</Badge>
                        <strong>{r.name || 'New route'}</strong>
                        <button
                          type="button"
                          className="icon-button"
                          disabled={!index}
                          aria-label={`Move ${r.name} up`}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          disabled={index === config.routes.length - 1}
                          aria-label={`Move ${r.name} down`}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-button danger"
                          aria-label={`Remove ${r.name}`}
                          onClick={() =>
                            setting(
                              'routes',
                              config.routes.filter((item) => item.id !== r.id),
                            )
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="form-grid">
                        <Field label="Route Name">
                          <input
                            value={r.name}
                            onChange={(e) => routeUpdate(r.id, { name: e.target.value })}
                          />
                        </Field>
                        <Field label="Route Type">
                          <select
                            value={r.type}
                            onChange={(e) =>
                              routeUpdate(r.id, {
                                type: e.target.value as RouteRule['type'],
                                responseCode: e.target.value === 'Redirect' ? 302 : 200,
                              })
                            }
                          >
                            <option>Simple</option>
                            <option>Redirect</option>
                            <option>Direct Response</option>
                          </select>
                        </Field>
                      </div>
                      <div className="form-grid three">
                        <Field label="HTTP Method">
                          <select
                            value={r.method}
                            onChange={(e) => routeUpdate(r.id, { method: e.target.value })}
                          >
                            {[
                              'ANY',
                              'GET',
                              'POST',
                              'PUT',
                              'PATCH',
                              'DELETE',
                              'OPTIONS',
                              'HEAD',
                            ].map((m) => (
                              <option key={m}>{m}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Path Match">
                          <select
                            value={r.match}
                            onChange={(e) =>
                              routeUpdate(r.id, { match: e.target.value as RouteRule['match'] })
                            }
                          >
                            <option>Prefix</option>
                            <option>Exact</option>
                          </select>
                        </Field>
                        <Field label="Path">
                          <input
                            value={r.path}
                            onChange={(e) => routeUpdate(r.id, { path: e.target.value })}
                          />
                        </Field>
                      </div>
                      {r.type === 'Simple' ? (
                        <Field label="Route Origin Pool">
                          <select
                            value={r.originId}
                            onChange={(e) => routeUpdate(r.id, { originId: e.target.value })}
                          >
                            <option value="">Select an origin pool</option>
                            {origins.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                      ) : (
                        <div className="form-grid">
                          <Field label="Response Code">
                            <select
                              value={r.responseCode}
                              onChange={(e) =>
                                routeUpdate(r.id, { responseCode: Number(e.target.value) })
                              }
                            >
                              {(r.type === 'Redirect'
                                ? [301, 302, 307, 308]
                                : [200, 204, 400, 403, 404, 503]
                              ).map((code) => (
                                <option key={code}>{code}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label={r.type === 'Redirect' ? 'Redirect URL' : 'Response Body'}>
                            <input
                              value={r.type === 'Redirect' ? r.redirectUrl : r.responseBody}
                              onChange={(e) =>
                                routeUpdate(
                                  r.id,
                                  r.type === 'Redirect'
                                    ? { redirectUrl: e.target.value }
                                    : { responseBody: e.target.value },
                                )
                              }
                            />
                          </Field>
                        </div>
                      )}
                      <div className="advanced-field">
                        <Field label="Route App Firewall">
                          <select
                            value={r.wafId}
                            onChange={(e) => routeUpdate(r.id, { wafId: e.target.value })}
                          >
                            <option value="">Inherit from load balancer</option>
                            {wafs.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <ToggleField
                        label={`Activate ${r.name}`}
                        value={r.enabled}
                        onChange={(v) => routeUpdate(r.id, { enabled: v })}
                      />
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addRoute}>
                    <Plus size={14} />
                    Add Route
                  </Button>
                </>
              ),
            },
            {
              id: 'waf',
              title: 'Web Application Firewall',
              content: (
                <FirewallFields
                  form={form}
                  config={config}
                  update={update}
                  setting={setting}
                  wafs={wafs}
                  enabled={wafEnabled}
                  onEnabledChange={(enabled) => {
                    setWafEnabled(enabled);
                    if (!enabled) update('wafId', '');
                  }}
                  onInspect={setViewWaf}
                  onCreate={() => setNested('waf')}
                  onExclusions={(newItem) => setExclusions({ newItem })}
                />
              ),
            },
            {
              id: 'api',
              title: 'API Protection',
              content: (
                <>
                  <ToggleField
                    label="API Discovery"
                    value={config.apiDiscovery}
                    onChange={(v) => setting('apiDiscovery', v)}
                  />
                  <ToggleField
                    label="API Schema Validation"
                    value={form.apiProtection}
                    onChange={(v) => update('apiProtection', v)}
                  />
                  <p className="configuration-help">
                    Discovery generates mock endpoints; schema validation evaluates the API Schema
                    Violation scenario.
                  </p>
                </>
              ),
            },
            {
              id: 'bot',
              title: 'Bot Protection',
              content: (
                <ToggleField
                  label="Bot Defense"
                  value={form.botDefense}
                  onChange={(v) => update('botDefense', v)}
                />
              ),
            },
            {
              id: 'dos',
              title: 'DoS Protection',
              content: (
                <ToggleField
                  label="L7 DDoS Protection"
                  value={form.ddosProtection}
                  onChange={(v) => update('ddosProtection', v)}
                />
              ),
            },
            {
              id: 'other',
              title: 'Other Settings',
              content: (
                <>
                  <Field label="VIP Advertisement">
                    <select
                      value={config.vip}
                      onChange={(e) => setting('vip', e.target.value as typeof config.vip)}
                    >
                      <option>Internet</option>
                      <option>Internet (Specified VIP)</option>
                      <option>Custom</option>
                      <option>Do Not Advertise</option>
                    </select>
                  </Field>
                  {config.vip === 'Internet (Specified VIP)' && (
                    <Field label="Public IPv4 *">
                      <input
                        placeholder="192.0.2.100"
                        value={config.vipAddress}
                        onChange={(e) => setting('vipAddress', e.target.value)}
                      />
                    </Field>
                  )}
                  {config.vip === 'Custom' && (
                    <Field label="Site Reference *">
                      <select
                        value={config.siteId}
                        onChange={(e) => setting('siteId', e.target.value)}
                      >
                        <option value="">Select a site</option>
                        {s.sites
                          .filter((site) => site.namespace === s.namespace)
                          .map((site) => (
                            <option key={site.id} value={site.id}>
                              {site.name} ({site.kind})
                            </option>
                          ))}
                      </select>
                    </Field>
                  )}
                  <p className="configuration-help">
                    Advertisement settings are stored as training configuration. No VIP is
                    advertised.
                  </p>

                  <ToggleField
                    label="CDN Caching"
                    value={config.cdn}
                    onChange={(v) => setting('cdn', v)}
                  />
                  <Field label="Route Timeout (seconds)">
                    <input
                      type="number"
                      min={1}
                      max={600}
                      value={config.timeout}
                      onChange={(e) => setting('timeout', Number(e.target.value))}
                    />
                  </Field>
                  <p className="configuration-help">
                    Caching, TLS, advertisement, and timeout fields are persisted configuration
                    examples; no network processing occurs.
                  </p>
                </>
              ),
            },
          ].sort(
            (a, b) =>
              [
                'metadata',
                'domains',
                'origins',
                'routes',
                'waf',
                'bot',
                'api',
                'dos',
                'other',
              ].indexOf(a.id) -
              [
                'metadata',
                'domains',
                'origins',
                'routes',
                'waf',
                'bot',
                'api',
                'dos',
                'other',
              ].indexOf(b.id),
          )}
        />
      )}
      {exclusions && (
        <Suspense
          fallback={
            <div className="exclusion-loading" role="status">
              Loading WAF exclusion rules…
            </div>
          }
        >
          <WafExclusionRules
            lb={form}
            initial={config.exclusions}
            {...exclusions}
            close={() => setExclusions(null)}
            onApply={(rules) => {
              setting('exclusions', rules);
              setExclusions(null);
            }}
          />
        </Suspense>
      )}
      {originItem && (
        <OriginPoolItem
          origins={origins}
          originId={form.originId}
          weight={config.originWeight ?? 1}
          priority={config.originPriority ?? 1}
          namespace={s.namespace}
          close={() => setOriginItem(false)}
          onApply={(id, weight, priority) => {
            update('originId', id);
            setConfig((c) => ({ ...c, originWeight: weight, originPriority: priority }));
            setOriginItem(false);
          }}
        />
      )}
      {viewWaf && (
        <WafEditor
          initial={s.wafs.find((w) => w.id === viewWaf)}
          viewOnly
          close={() => setViewWaf('')}
          notify={notify}
        />
      )}
      {nested === 'origin' && (
        <OriginEditor
          close={() => setNested(null)}
          notify={(message) => {
            notify(message);
            const created = useConsole.getState().origins.at(-1);
            if (created?.namespace === s.namespace) update('originId', created.id);
          }}
        />
      )}
      {nested === 'waf' && (
        <WafEditor
          close={() => setNested(null)}
          notify={(message) => {
            notify(message);
            const created = useConsole.getState().wafs.at(-1);
            if (created?.namespace === s.namespace) {
              update('wafId', created.id);
              setWafEnabled(true);
            }
          }}
        />
      )}
    </>
  );
}
function validIpv4(value: string) {
  return (
    /^\d+(\.\d+){3}$/.test(value) &&
    value.split('.').every((part) => Number(part) >= 0 && Number(part) <= 255)
  );
}
