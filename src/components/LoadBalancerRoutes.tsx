import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { LB, LBConfig, Origin, Waf, RouteRule } from '../types';
import { ConfigurationEditor } from './ConfigurationEditor';
import { Field, ToggleField } from './form-fields';
import { Button } from './ui/button';
import { Badge } from './common';

export function RoutesTable({ config, origins }: { config: LBConfig; origins: Origin[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {['Order', 'Type', 'Caching', 'State', 'Parameters'].map((t) => (
              <th key={t}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {config.routes.map((r, i) => (
            <tr key={r.id}>
              <td>{i + 1}</td>
              <td>{r.type}</td>
              <td>{config.cdn ? 'Enabled' : 'Disabled'}</td>
              <td>{r.enabled ? 'Enabled' : 'Disabled'}</td>
              <td>
                HTTP Method {r.method} · Path {r.match} {r.path}
                {r.type === 'Simple'
                  ? ' · Origin Pool ' +
                    (origins.find((o) => o.id === r.originId)?.name ?? r.originId)
                  : ' · Response ' + r.responseCode}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!config.routes.length && (
        <p className="configuration-help">
          No explicit routes. All requests use the default origin pool.
        </p>
      )}
    </div>
  );
}
export function RoutesEditor({
  initial,
  form,
  origins,
  wafs,
  readOnly,
  close,
  apply,
}: {
  initial: LBConfig;
  form: LB;
  origins: Origin[];
  wafs: Waf[];
  readOnly: boolean;
  close: () => void;
  apply: (routes: RouteRule[]) => void;
}) {
  const [config, setConfig] = useState(() => structuredClone(initial));
  const setting = <K extends keyof LBConfig>(key: K, value: LBConfig[K]) =>
    setConfig((v) => ({ ...v, [key]: value }));
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
    <ConfigurationEditor
      kind="Routes"
      name={form.name}
      namespace={form.namespace}
      readOnly={readOnly}
      value={config.routes}
      guide="https://docs.cloud.f5.com/docs-v2/multi-cloud-app-connect/how-to/load-balance/create-http-load-balancer"
      close={close}
      submitLabel="Apply"
      onSave={(e) => {
        e.preventDefault();
        apply(config.routes);
      }}
      sections={[
        {
          id: 'route-list',
          title: 'Routes',
          content: readOnly ? (
            <RoutesTable config={config} origins={origins} />
          ) : (
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
                        {['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].map(
                          (m) => (
                            <option key={m}>{m}</option>
                          ),
                        )}
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
      ]}
    />
  );
}
