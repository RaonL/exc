import { useState } from 'react';
import { Field } from '../components/form-fields';
import { Button } from '../components/ui/button';
import { ConfigurationEditor } from '../components/ConfigurationEditor';
import { ReferenceSelect } from '../components/ReferenceSelect';
import { useApiSecurity } from './store';
import {
  environmentError,
  type ApiSettings,
  type Credential,
  type TestEnvironment,
  type Rule,
} from './model';
import type { LB } from '../types';
export const sources = {
  discovery: 'https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/quickstart/api-security',
  protection:
    'https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/quickstart/api-protection',
  testing:
    'https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/quickstart/automate-sec-test',
};
export function Choice({
  label,
  value,
  values,
  change,
}: {
  label: string;
  value: string;
  values: string[];
  change: (v: string) => void;
}) {
  return (
    <div className="api-field">
      <strong>{label}</strong>
      <ReferenceSelect
        label={label}
        value={value}
        options={values.map((value) => ({ value }))}
        onChange={change}
      />
    </div>
  );
}
export function SecretField({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: (v: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(value);
  return (
    <div className="api-secret">
      <strong>{label}</strong>
      <p>
        {value ? 'Configured · dummy secret' : 'Not configured'}{' '}
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setDraft(value);
            setOpen(true);
          }}
        >
          Configure {label}
        </Button>
      </p>
      {open && (
        <ConfigurationEditor
          kind="Secret Type"
          name=""
          namespace="Local dummy"
          guide={sources.discovery}
          value={{ configured: !!draft }}
          close={() => setOpen(false)}
          onSave={(e) => {
            e.preventDefault();
            change(draft);
            setOpen(false);
          }}
          submitLabel="Apply"
          sections={[
            {
              id: 'secret',
              title: 'Secret Type',
              content: (
                <>
                  <p>
                    학습용 문자열만 입력하세요. Blindfold 암호화는 재현하지 않습니다. 값은 로컬에
                    저장됩니다.
                  </p>
                  <Field label="Secret (dummy only)">
                    <input
                      type="password"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      required
                    />
                  </Field>
                </>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
function RuleEditor({
  initial,
  close,
  apply,
  fall,
}: {
  initial?: Rule;
  close: () => void;
  apply: (r: Rule) => void;
  fall: boolean;
}) {
  const [r, set] = useState<Rule>(
      initial ?? { name: '', path: '', method: 'GET', domain: 'Any Domain', action: 'Report' },
    ),
    [error, err] = useState('');
  return (
    <ConfigurationEditor
      kind={fall ? 'Custom Fall Through Rule' : 'Validation Rule'}
      name={initial?.name ?? ''}
      namespace="Local"
      guide={sources.protection}
      close={close}
      value={r}
      error={error}
      submitLabel="Apply"
      onSave={(e) => {
        e.preventDefault();
        if (!r.name || !r.path.startsWith('/'))
          return err('Name and local endpoint path are required.');
        apply(r);
      }}
      sections={[
        {
          id: 'name',
          title: 'Name',
          content: (
            <Field label="Rule Name">
              <input
                required
                value={r.name}
                onChange={(e) => set({ ...r, name: e.target.value })}
              />
            </Field>
          ),
        },
        {
          id: 'processing',
          title: fall ? 'Action' : 'OpenAPI Validation Request Processing Mode',
          content: (
            <Choice
              label="Action"
              value={r.action}
              values={['Skip', 'Report', 'Block']}
              change={(v) => set({ ...r, action: v as Rule['action'] })}
            />
          ),
        },
        {
          id: 'domain',
          title: 'Domain / API Endpoint',
          content: (
            <>
              <Field label="Domain">
                <input value={r.domain} onChange={(e) => set({ ...r, domain: e.target.value })} />
              </Field>
              <Field label="Path">
                <input
                  required
                  placeholder="/api/orders"
                  value={r.path}
                  onChange={(e) => set({ ...r, path: e.target.value })}
                />
              </Field>
              <Choice
                label="Methods"
                value={r.method}
                values={['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']}
                change={(v) => set({ ...r, method: v })}
              />
            </>
          ),
        },
      ]}
    />
  );
}
function CredentialEditor({
  initial,
  apply,
  close,
}: {
  initial?: Credential;
  apply: (c: Credential) => void;
  close: () => void;
}) {
  const [c, set] = useState<Credential>(
    initial ?? {
      name: '',
      type: 'API Key',
      role: 'Standard',
      key: 'x-demo-key',
      value: '',
      method: 'POST',
    },
  );
  return (
    <ConfigurationEditor
      kind="Credential"
      name={initial?.name ?? ''}
      namespace="Local dummy"
      guide={sources.testing}
      close={close}
      value={{ ...c, value: 'REDACTED' }}
      submitLabel="Apply"
      onSave={(e) => {
        e.preventDefault();
        apply(c);
      }}
      sections={[
        {
          id: 'general',
          title: 'General',
          content: (
            <Field label="Credential Name">
              <input
                required
                value={c.name}
                onChange={(e) => set({ ...c, name: e.target.value })}
              />
            </Field>
          ),
        },
        {
          id: 'details',
          title: 'Credential Details',
          content: (
            <>
              <Choice
                label="Credential Type"
                value={c.type}
                values={['API Key', 'Basic Authentication', 'Bearer Token', 'Login Endpoint']}
                change={(v) => set({ ...c, type: v as Credential['type'] })}
              />
              {c.type === 'API Key' && (
                <Field label="Key">
                  <input
                    required
                    value={c.key ?? ''}
                    onChange={(e) => set({ ...c, key: e.target.value })}
                  />
                </Field>
              )}
              {c.type === 'Basic Authentication' && (
                <Field label="User">
                  <input
                    required
                    value={c.user ?? ''}
                    onChange={(e) => set({ ...c, user: e.target.value })}
                  />
                </Field>
              )}
              {c.type === 'Login Endpoint' && (
                <>
                  <Field label="Login Path">
                    <input
                      required
                      value={c.path ?? ''}
                      onChange={(e) => set({ ...c, path: e.target.value })}
                    />
                  </Field>
                  <Choice
                    label="Login Method"
                    value={c.method ?? 'POST'}
                    values={['POST', 'GET']}
                    change={(v) => set({ ...c, method: v })}
                  />
                  <Field label="JSON Request Payload">
                    <textarea
                      required
                      value={c.payload ?? ''}
                      onChange={(e) => set({ ...c, payload: e.target.value })}
                    />
                  </Field>
                  <Field label="Token Response Key">
                    <input
                      required
                      value={c.tokenKey ?? ''}
                      onChange={(e) => set({ ...c, tokenKey: e.target.value })}
                    />
                  </Field>
                </>
              )}
              <SecretField
                label={c.type === 'Basic Authentication' ? 'Password' : 'Token / Value'}
                value={c.value}
                change={(value) => set({ ...c, value })}
              />
              <Choice
                label="Role"
                value={c.role}
                values={['Standard', 'Admin']}
                change={(v) => set({ ...c, role: v as Credential['role'] })}
              />
              <Field label="Expiry (optional, simulated clock)">
                <input
                  type="datetime-local"
                  value={c.expiresAt ?? ''}
                  onChange={(e) => set({ ...c, expiresAt: e.target.value })}
                />
              </Field>
            </>
          ),
        },
      ]}
    />
  );
}
function EnvironmentEditor({
  lb,
  initial,
  apply,
  close,
}: {
  lb: LB;
  initial?: TestEnvironment;
  apply: (c: TestEnvironment) => void;
  close: () => void;
}) {
  const [env, set] = useState<TestEnvironment>(
      initial ?? { domain: '', destructive: false, credentials: [] },
    ),
    [cred, setCred] = useState<number | null>(null),
    [error, err] = useState('');
  return (
    <>
      <ConfigurationEditor
        kind="Testing Environment"
        name={initial?.domain ?? ''}
        namespace={lb.namespace}
        guide={sources.testing}
        value={{ ...env, credentials: env.credentials.map((c) => ({ ...c, value: 'REDACTED' })) }}
        close={close}
        error={error}
        submitLabel="Apply"
        onSave={(e) => {
          e.preventDefault();
          const error = environmentError(env, lb.domains, useApiSecurity.getState().clock);
          if (error) return err(error);
          apply(env);
        }}
        sections={[
          {
            id: 'environment',
            title: 'Environment Details',
            content: (
              <>
                <Choice
                  label="Domain"
                  value={env.domain}
                  values={['', ...lb.domains]}
                  change={(domain) => set({ ...env, domain })}
                />
                <Field label="Use Destructive Methods (e.g., DELETE, PUT)">
                  <input
                    type="checkbox"
                    checked={env.destructive}
                    onChange={(e) => set({ ...env, destructive: e.target.checked })}
                  />
                </Field>
                <p>전체 동작은 더미 평가입니다. 실제 DELETE·PUT 요청을 전송하지 않습니다.</p>
              </>
            ),
          },
          {
            id: 'credentials',
            title: 'Credentials',
            content: (
              <>
                <p>Standard 2개 + Admin 1개 이상을 직접 추가하세요.</p>
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {env.credentials.map((c, i) => (
                      <tr key={i}>
                        <td>{c.name}</td>
                        <td>{c.role}</td>
                        <td>
                          <Button type="button" variant="ghost" onClick={() => setCred(i)}>
                            Edit {c.name}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              set({
                                ...env,
                                credentials: env.credentials.filter((_, n) => n !== i),
                              })
                            }
                          >
                            Delete {c.name}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCred(env.credentials.length)}
                >
                  Add Credential
                </Button>
              </>
            ),
          },
        ]}
      />
      {cred !== null && (
        <CredentialEditor
          initial={env.credentials[cred]}
          close={() => setCred(null)}
          apply={(c) => {
            const next = [...env.credentials];
            next[cred] = c;
            set({ ...env, credentials: next });
            setCred(null);
          }}
        />
      )}
    </>
  );
}
export function ApiSettingsFields({
  lb,
  value,
  onChange,
}: {
  lb: LB;
  value: ApiSettings;
  onChange: (v: ApiSettings) => void;
}) {
  const s = useApiSecurity(),
    c = value,
    [modal, setModal] = useState<'validation' | 'environment' | null>(null),
    [environmentIndex, setEnvironmentIndex] = useState<number>(0),
    [crawl, setCrawl] = useState(false),
    [crawlDraft, setCrawlDraft] = useState({ domain: lb.domains[0] ?? '', user: '', secret: '' });
  const update = <K extends keyof ApiSettings>(key: K, v: ApiSettings[K]) =>
    onChange({ ...c, [key]: v });
  const choice = (label: string, key: keyof ApiSettings, values: string[]) => (
    <Choice
      label={label}
      value={String(c[key])}
      values={values}
      change={(v) => update(key, v as never)}
    />
  );
  const toggle = (label: string, key: 'discovery' | 'redirects' | 'crawling' | 'testing') => (
    <Choice
      label={label}
      value={c[key] ? 'Enable' : 'Disable'}
      values={['Disable', 'Enable']}
      change={(v) => update(key, v === 'Enable')}
    />
  );
  return (
    <div className="api-settings-fields">
      {toggle('API Discovery', 'discovery')}
      {c.discovery && (
        <div className="api-nested">
          {toggle('Learn From Traffic With Redirect Response', 'redirects')}
          <p>Disable: 2xx만 검색 · Enable: 3xx 리디렉션도 학습</p>
          <Field label="Purge Duration for Inactive Discovered APIs from Traffic (days)">
            <input
              type="number"
              min={1}
              max={365}
              value={c.purgeDays}
              onChange={(e) => update('purgeDays', Number(e.target.value))}
            />
          </Field>
          <Choice
            label="API Discovery Policy"
            value={c.discoveryPolicy ?? 'Built-in'}
            values={['Built-in']}
            change={() => update('discoveryPolicy', 'Built-in')}
          />
          <Choice
            label="Sensitive Data Discovery"
            value={c.sensitiveDataDiscovery ?? 'Default'}
            values={['Default', 'Disable']}
            change={(v) => update('sensitiveDataDiscovery', v as 'Default' | 'Disable')}
          />
          <h3>API Repositories</h3>
          <div className="api-field">
            <strong>Code Base Integration</strong>
            <ReferenceSelect
              label="Code Base Integration"
              value={c.integrationId}
              options={[
                { value: '', label: 'Select item' },
                ...s.integrations
                  .filter((i) => i.namespace === lb.namespace)
                  .map((i) => ({ value: i.id, label: i.namespace + '/' + i.name })),
              ]}
              onChange={(v) => update('integrationId', v)}
            />
          </div>
          {c.integrationId && (
            <>
              <p>{s.integrations.find((i) => i.id === c.integrationId)?.name}</p>
              <Field label="API Repositories (dummy organization/repository)">
                <input
                  value={c.repositories.join(',')}
                  onChange={(e) =>
                    update(
                      'repositories',
                      e.target.value
                        .split(',')
                        .map((x) => x.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </Field>
            </>
          )}
          {toggle('API Crawling', 'crawling')}
          {c.crawling && (
            <>
              <h3>Domains to Crawl</h3>
              {c.crawlDomains.map((d, i) => (
                <div key={i}>
                  {d.domain} · {d.user}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      update(
                        'crawlDomains',
                        c.crawlDomains.filter((_, n) => n !== i),
                      )
                    }
                  >
                    Delete Crawl Domain
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCrawlDraft({ domain: lb.domains[0] ?? '', user: '', secret: '' });
                  setCrawl(true);
                }}
              >
                Add Crawl Domain
              </Button>
            </>
          )}
        </div>
      )}
      <Choice
        label="API Definition"
        value={c.definitionId ? 'Enable' : 'Disable'}
        values={['Disable', 'Enable']}
        change={(v) =>
          update(
            'definitionId',
            v === 'Disable'
              ? ''
              : (s.definitions.find((d) => d.namespace === lb.namespace)?.id ??
                  'select-definition'),
          )
        }
      />
      {c.definitionId && (
        <div className="api-nested">
          <div className="api-field">
            <strong>Select API Definition</strong>
            <ReferenceSelect
              label="Select API Definition"
              value={c.definitionId}
              options={[
                { value: 'select-definition', label: 'Select item' },
                ...s.definitions
                  .filter((d) => d.namespace === lb.namespace || d.namespace === 'shared')
                  .map((d) => ({ value: d.id, label: d.namespace + '/' + d.name })),
              ]}
              onChange={(v) => update('definitionId', v)}
            />
          </div>
          {choice('Validation', 'validation', ['Disabled', 'API Inventory', 'Custom List'])}
          {c.validation !== 'Disabled' && (
            <Button type="button" variant="outline" onClick={() => setModal('validation')}>
              {c.validation} · Configure
            </Button>
          )}
        </div>
      )}
      {toggle('API Testing', 'testing')}
      {c.testing && (
        <div className="api-nested">
          <h3>Testing Environments</h3>
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Credentials</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {c.environments.map((e, i) => (
                <tr key={i}>
                  <td>{e.domain}</td>
                  <td>{e.credentials.length}</td>
                  <td>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEnvironmentIndex(i);
                        setModal('environment');
                      }}
                    >
                      Edit Environment
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        update(
                          'environments',
                          c.environments.filter((_, n) => n !== i),
                        )
                      }
                    >
                      Delete Environment
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEnvironmentIndex(c.environments.length);
              setModal('environment');
            }}
          >
            Add Testing Environment
          </Button>
          {choice('Frequency of Test', 'frequency', ['Every Week', 'Every Day', 'Every Month'])}
          <Field label="Custom Header">
            <input
              value={c.customHeader}
              onChange={(e) => update('customHeader', e.target.value)}
            />
          </Field>
          <p>Header key: x-f5-apitesting-identifier · 일정은 실습의 모의 시계로 실행합니다.</p>
        </div>
      )}
      {modal === 'validation' && (
        <ValidationEditor
          value={c}
          close={() => setModal(null)}
          apply={(v) => {
            onChange(v);
            setModal(null);
          }}
        />
      )}
      {modal === 'environment' && (
        <EnvironmentEditor
          lb={lb}
          initial={c.environments[environmentIndex]}
          close={() => setModal(null)}
          apply={(e) => {
            const next = [...c.environments];
            next[environmentIndex] = e;
            update('environments', next);
            setModal(null);
          }}
        />
      )}
      {crawl && (
        <ConfigurationEditor
          kind="Domain to Crawl"
          name=""
          namespace={lb.namespace}
          value={{ ...crawlDraft, secret: 'REDACTED' }}
          close={() => setCrawl(false)}
          guide={sources.discovery}
          submitLabel="Apply"
          onSave={(e) => {
            e.preventDefault();
            update('crawlDomains', [...c.crawlDomains, crawlDraft]);
            setCrawl(false);
          }}
          sections={[
            {
              id: 'domain',
              title: 'Domain',
              content: (
                <>
                  <Choice
                    label="Crawl Domain"
                    value={crawlDraft.domain}
                    values={lb.domains}
                    change={(domain) => setCrawlDraft({ ...crawlDraft, domain })}
                  />
                  <Field label="Crawl User">
                    <input
                      required
                      value={crawlDraft.user}
                      onChange={(e) => setCrawlDraft({ ...crawlDraft, user: e.target.value })}
                    />
                  </Field>
                  <SecretField
                    label="Crawl Password"
                    value={crawlDraft.secret}
                    change={(secret) => setCrawlDraft({ ...crawlDraft, secret })}
                  />
                </>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
function ValidationEditor({
  value,
  close,
  apply,
}: {
  value: ApiSettings;
  close: () => void;
  apply: (v: ApiSettings) => void;
}) {
  const [c, set] = useState(() => structuredClone(value)),
    [rule, setRule] = useState<{ index: number; fall: boolean } | null>(null);
  const rules = (fall: boolean) => {
    const list = fall ? c.fallRules : c.rules;
    return (
      <>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Path</th>
              <th>Method</th>
              <th>Action</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r, i) => (
              <tr key={i}>
                <td>{r.name}</td>
                <td>{r.path}</td>
                <td>{r.method}</td>
                <td>{r.action}</td>
                <td>
                  <Button type="button" variant="ghost" onClick={() => setRule({ index: i, fall })}>
                    Edit Rule {r.name}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      set({ ...c, [fall ? 'fallRules' : 'rules']: list.filter((_, n) => n !== i) })
                    }
                  >
                    Delete Rule {r.name}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button
          type="button"
          variant="outline"
          onClick={() => setRule({ index: list.length, fall })}
        >
          {fall ? 'Add Fall Through Rule' : 'Add Validation Rule'}
        </Button>
      </>
    );
  };
  return (
    <>
      <ConfigurationEditor
        kind={c.validation === 'API Inventory' ? 'API Inventory validation' : 'Validation rules'}
        name=""
        namespace="Local"
        guide={sources.protection}
        close={close}
        value={c}
        submitLabel="Apply"
        onSave={(e) => {
          e.preventDefault();
          apply(c);
        }}
        sections={[
          {
            id: 'request',
            title: 'OpenAPI Validation Request Processing Mode',
            content: (
              <>
                <Choice
                  label="OpenAPI Validation Request Processing Mode"
                  value={c.requestMode}
                  values={['Validate', 'Skip']}
                  change={(v) => set({ ...c, requestMode: v as ApiSettings['requestMode'] })}
                />
                {c.requestMode === 'Validate' && (
                  <>
                    <Choice
                      label="Request Validation Enforcement Type"
                      value={c.requestAction}
                      values={['Report', 'Block']}
                      change={(v) =>
                        set({ ...c, requestAction: v as ApiSettings['requestAction'] })
                      }
                    />
                    <h3>Request Validation Properties</h3>
                    {['Path Parameters', 'Query Parameters', 'HTTP Headers', 'Request Body'].map(
                      (p) => (
                        <Field key={p} label={p}>
                          <input
                            type="checkbox"
                            checked={c.requestProperties.includes(p)}
                            onChange={(e) =>
                              set({
                                ...c,
                                requestProperties: e.target.checked
                                  ? [...c.requestProperties, p]
                                  : c.requestProperties.filter((v) => v !== p),
                              })
                            }
                          />
                        </Field>
                      ),
                    )}
                  </>
                )}
                {c.validation === 'Custom List' && rules(false)}
              </>
            ),
          },
          {
            id: 'response',
            title: 'OpenAPI Validation Response Processing Mode',
            content: (
              <>
                <Choice
                  label="OpenAPI Validation Response Processing Mode"
                  value={c.responseMode}
                  values={['Skip', 'Validate']}
                  change={(v) => set({ ...c, responseMode: v as ApiSettings['responseMode'] })}
                />
                {c.responseMode === 'Validate' && (
                  <Choice
                    label="Response Validation Enforcement Type"
                    value={c.responseAction}
                    values={['Report', 'Block']}
                    change={(v) =>
                      set({ ...c, responseAction: v as ApiSettings['responseAction'] })
                    }
                  />
                )}
              </>
            ),
          },
          {
            id: 'fall',
            title: 'Fall Through Mode',
            content: (
              <>
                <Choice
                  label="Fall Through Mode"
                  value={c.fallMode}
                  values={['Allow', 'Custom']}
                  change={(v) => set({ ...c, fallMode: v as ApiSettings['fallMode'] })}
                />
                {c.fallMode === 'Custom' && rules(true)}
              </>
            ),
          },
        ]}
      />
      {rule && (
        <RuleEditor
          initial={(rule.fall ? c.fallRules : c.rules)[rule.index]}
          fall={rule.fall}
          close={() => setRule(null)}
          apply={(r) => {
            const key = rule.fall ? 'fallRules' : 'rules';
            const next = [...c[key]];
            next[rule.index] = r;
            set({ ...c, [key]: next });
            setRule(null);
          }}
        />
      )}
    </>
  );
}
