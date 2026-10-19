import { useState, type FormEvent } from 'react';
import type { LB, WafExclusion } from '../types';
import {
  exactPathRegex,
  literalPath,
  exclusionError,
  exclusionGuide,
  wafAttacks,
} from '../lib/waf-exclusions';
import { ConfigurationEditor } from './ConfigurationEditor';
import { Field } from './form-fields';
export function WafExclusionEditor({
  initial,
  lb,
  close,
  onApply,
  names = [],
}: {
  initial: WafExclusion;
  lb: LB;
  close: () => void;
  onApply: (rule: WafExclusion) => void;
  names?: string[];
}) {
  const [form, setForm] = useState(initial);
  const [regex, setRegex] = useState(exactPathRegex(initial.path));
  const [error, setError] = useState('');
  const update = <K extends keyof WafExclusion>(key: K, value: WafExclusion[K]) => {
    setForm((v) => ({ ...v, [key]: value }));
    setError('');
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    const path = form.pathMatch === 'Exact' ? literalPath(regex) : form.path;
    if (!path)
      return setError(
        'Path Regex: use an anchored literal path such as ^/product$. Pattern operators are not supported.',
      );
    const rule = { ...form, path };
    const problem = exclusionError(rule);
    if (problem) return setError(problem);
    if (names.includes(rule.name)) return setError('An exclusion with this name already exists.');
    onApply(rule);
  };
  return (
    <ConfigurationEditor
      kind="Simple WAF Exclusion Rule"
      name={initial.name}
      namespace={lb.namespace}
      resourceContext={{
        title: 'HTTP Load Balancer',
        trail: [lb.name, 'Web Application Firewall', 'WAF Exclusion Rules', 'New Item'],
      }}
      className="lb-editor exclusion-editor"
      collapsible
      guide={exclusionGuide}
      close={close}
      onSave={save}
      submitLabel="Apply"
      cancelLabel="Back"
      error={error}
      value={form}
      onReset={() => {
        setForm(initial);
        setRegex(exactPathRegex(initial.path));
        setError('');
      }}
      sections={[
        {
          id: 'metadata',
          title: 'Metadata',
          content: (
            <>
              <Field label="Name *">
                <input
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={form.description ?? ''}
                  onChange={(e) => update('description', e.target.value)}
                />
              </Field>
            </>
          ),
        },
        {
          id: 'domain',
          title: 'Domain',
          content: (
            <>
              <Field label="Domain">
                <select
                  value={form.domain ? 'Exact Value' : 'Any Domain'}
                  onChange={(e) =>
                    update('domain', e.target.value === 'Any Domain' ? '' : lb.domains[0])
                  }
                >
                  <option>Exact Value</option>
                  <option>Any Domain</option>
                </select>
              </Field>
              {form.domain && (
                <div className="waf-dependent-fields">
                  <Field label="Exact Value *">
                    <input
                      required
                      value={form.domain}
                      onChange={(e) => update('domain', e.target.value)}
                    />
                  </Field>
                </div>
              )}
            </>
          ),
        },
        {
          id: 'path',
          title: 'Path',
          content: (
            <>
              <Field label="Path">
                <select
                  value={form.pathMatch === 'Exact' ? 'Path Regex' : 'Prefix'}
                  onChange={(e) => {
                    if (e.target.value === 'Path Regex') setRegex(exactPathRegex(form.path));
                    update('pathMatch', e.target.value === 'Path Regex' ? 'Exact' : 'Prefix');
                  }}
                >
                  <option>Path Regex</option>
                  <option>Prefix</option>
                </select>
              </Field>
              <div className="waf-dependent-fields">
                {form.pathMatch === 'Exact' ? (
                  <Field label="Path Regex *">
                    <input
                      required
                      value={regex}
                      onChange={(e) => {
                        setRegex(e.target.value);
                        const path = literalPath(e.target.value);
                        if (path) setForm((v) => ({ ...v, path }));
                        setError('');
                      }}
                    />
                  </Field>
                ) : (
                  <Field label="Path Prefix *">
                    <input
                      required
                      value={form.path}
                      onChange={(e) => update('path', e.target.value)}
                    />
                  </Field>
                )}
                <p className="configuration-help">
                  Path Regex supports anchored literal paths only. Query parameters are excluded
                  from the path match.
                </p>
              </div>
            </>
          ),
        },
        {
          id: 'methods',
          title: 'Methods',
          content: (
            <Field label="Methods">
              <select value={form.method} onChange={(e) => update('method', e.target.value)}>
                {['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
          ),
        },
        {
          id: 'action',
          title: 'Action',
          content: (
            <>
              <Field label="Action">
                <select defaultValue="App Firewall Detection Control">
                  <option>App Firewall Detection Control</option>
                </select>
              </Field>
              <div className="waf-signatures">
                <h3>Attack Types</h3>
                <Field label="Excluded Attack Type">
                  <select
                    value={form.attack}
                    onChange={(e) => update('attack', e.target.value as WafExclusion['attack'])}
                  >
                    <option>All</option>
                    {wafAttacks.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </Field>
                <p className="configuration-help">
                  Local attack-type detection control. Signature IDs and parameter contexts are not
                  simulated.
                </p>
              </div>
            </>
          ),
        },
        {
          id: 'expiration',
          title: 'Expiration Timestamp',
          content: (
            <>
              <Field label="Expiration Timestamp">
                <input
                  value={form.expiresAt ?? ''}
                  placeholder="2026-12-31T23:59:59Z"
                  onChange={(e) => update('expiresAt', e.target.value)}
                />
              </Field>
              <p className="configuration-help">
                Empty means no expiration. Expired rules do not bypass WAF. Apply updates the draft;
                Save HTTP Load Balancer commits it.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
