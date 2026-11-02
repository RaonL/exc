import { useState } from 'react';
import type { LBFieldsProps } from './LoadBalancerBasics';
import { ConfigurationEditor } from './ConfigurationEditor';
import { Field, ToggleField } from './form-fields';
import { Button } from './ui/button';

export function TlsAdvancedFields({ form, config, setting }: LBFieldsProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(config.mutualTls!);
  return (
    <>
      {form.protocol === 'HTTPS' && (
        <>
          {config.tlsLevel === 'Custom' && (
            <div className="config-item">
              <Field label="Minimum TLS Version">
                <select
                  value={config.tlsMinimum}
                  onChange={(e) => setting('tlsMinimum', e.target.value as 'TLS 1.2' | 'TLS 1.3')}
                >
                  <option>TLS 1.2</option>
                  <option>TLS 1.3</option>
                </select>
              </Field>
              <Field label="Maximum TLS Version">
                <select
                  value={config.tlsMaximum}
                  onChange={(e) => setting('tlsMaximum', e.target.value as 'TLS 1.2' | 'TLS 1.3')}
                >
                  <option>TLS 1.2</option>
                  <option>TLS 1.3</option>
                </select>
              </Field>
              <Field label="Cipher Suites">
                <input
                  placeholder="TLS_AES_128_GCM_SHA256"
                  value={config.cipherSuites}
                  onChange={(e) => setting('cipherSuites', e.target.value)}
                />
              </Field>
            </div>
          )}
          <Field label="mTLS">
            <select
              value={config.mutualTls?.enabled ? 'Enable' : 'Disable'}
              onChange={(e) =>
                setting('mutualTls', { ...config.mutualTls!, enabled: e.target.value === 'Enable' })
              }
            >
              <option>Disable</option>
              <option>Enable</option>
            </select>
          </Field>
          {config.mutualTls?.enabled && (
            <div className="config-item">
              <p>{config.mutualTls.caReference ? 'Configured' : 'Not configured'}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraft(structuredClone(config.mutualTls!));
                  setOpen(true);
                }}
              >
                Configure mTLS
              </Button>
            </div>
          )}
        </>
      )}
      <Field label="Server Response Header">
        <select
          value={config.serverHeader}
          onChange={(e) => setting('serverHeader', e.target.value as typeof config.serverHeader)}
        >
          {['Default', 'Modify header value', 'Append header value', 'Do not modify'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </Field>
      {(config.serverHeader === 'Modify header value' ||
        config.serverHeader === 'Append header value') && (
        <Field label="Server Header Value *">
          <input
            required
            value={config.serverHeaderValue}
            onChange={(e) => setting('serverHeaderValue', e.target.value)}
          />
        </Field>
      )}
      <Field label="Path Normalization">
        <select
          value={config.pathNormalization === false ? 'Disable' : 'Enable'}
          onChange={(e) => setting('pathNormalization', e.target.value === 'Enable')}
        >
          <option>Enable</option>
          <option>Disable</option>
        </select>
      </Field>
      <ToggleField
        label="Default Load Balancer"
        value={config.defaultLoadBalancer ?? false}
        onChange={(v) => setting('defaultLoadBalancer', v)}
      />
      <Field label="Connection Idle Timeout (ms)">
        <input
          type="number"
          min={1}
          max={2147483647}
          value={config.connectionIdleTimeout}
          onChange={(e) => setting('connectionIdleTimeout', Number(e.target.value))}
        />
      </Field>
      <Field label="HTTP Protocol Configuration">
        <select
          value={config.httpProtocol}
          onChange={(e) => setting('httpProtocol', e.target.value as typeof config.httpProtocol)}
        >
          <option>HTTP/1.1 and HTTP/2</option>
          <option>HTTP/1.1</option>
          <option>HTTP/2</option>
        </select>
      </Field>
      {form.protocol === 'HTTPS' && (
        <Field label="TLS Coalescing Options">
          <select
            value={config.tlsCoalescing}
            onChange={(e) =>
              setting('tlsCoalescing', e.target.value as typeof config.tlsCoalescing)
            }
          >
            <option>Default Coalescing</option>
            <option>Disable Coalescing</option>
          </select>
        </Field>
      )}
      <p className="configuration-help">
        TLS·mTLS·연결 설정은 로컬 저장·조회용입니다. 실제 인증서 검증이나 TLS 연결을 실행하지
        않습니다.
      </p>
      {open && (
        <ConfigurationEditor
          kind="mTLS"
          name={form.name}
          namespace={form.namespace}
          value={draft}
          guide="https://docs.cloud.f5.com/docs-v2/multi-cloud-app-connect/how-to/load-balance/create-http-load-balancer"
          close={() => setOpen(false)}
          submitLabel="Apply"
          onSave={(e) => {
            e.preventDefault();
            setting('mutualTls', draft);
            setOpen(false);
          }}
          sections={[
            {
              id: 'mtls',
              title: 'Mutual TLS',
              content: (
                <>
                  <Field label="CA Certificate Format">
                    <select
                      value={draft.caFormat ?? 'PEM'}
                      onChange={(e) =>
                        setDraft({ ...draft, caFormat: e.target.value as 'PEM' | 'Base64' })
                      }
                    >
                      <option>PEM</option>
                      <option>Base64</option>
                    </select>
                  </Field>
                  <Field label="CA Certificate *">
                    <textarea
                      required
                      placeholder="Paste a training CA certificate"
                      value={draft.caReference}
                      onChange={(e) => setDraft({ ...draft, caReference: e.target.value })}
                    />
                  </Field>
                  <ToggleField
                    label="Client Certificate Optional"
                    value={draft.certificateOptional}
                    onChange={(v) => setDraft({ ...draft, certificateOptional: v })}
                  />
                  <Field label="Verify client certificate with CRL">
                    <select
                      value={draft.crl ? 'CRL' : 'Disable'}
                      onChange={(e) =>
                        setDraft({ ...draft, crl: e.target.value === 'CRL' ? 'training-crl' : '' })
                      }
                    >
                      <option>Disable</option>
                      <option>CRL</option>
                    </select>
                  </Field>
                  {draft.crl && (
                    <Field label="CRL Reference *">
                      <input
                        required
                        value={draft.crl}
                        onChange={(e) => setDraft({ ...draft, crl: e.target.value })}
                      />
                    </Field>
                  )}
                  <ToggleField
                    label="Add X-Forwarded-Client-Cert Header"
                    value={draft.xfcc}
                    onChange={(v) => setDraft({ ...draft, xfcc: v })}
                  />
                  {draft.xfcc && (
                    <div className="config-item">
                      {['By', 'Hash', 'Cert', 'Chain', 'Subject', 'URI', 'DNS'].map((value) => (
                        <label key={value} className="reference-checkbox">
                          <input
                            type="checkbox"
                            checked={draft.xfccFields?.includes(value) ?? false}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                xfccFields: e.target.checked
                                  ? [...(draft.xfccFields ?? []), value]
                                  : (draft.xfccFields ?? []).filter((f) => f !== value),
                              })
                            }
                          />
                          {value}
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="configuration-help">
                    공개 CA 인증서와 로컬 CRL 참조만 저장합니다. 실제 인증서·CRL 검증은 수행하지
                    않습니다. Apply 후 부모 LB도 저장하세요.
                  </p>
                </>
              ),
            },
          ]}
        />
      )}
    </>
  );
}
