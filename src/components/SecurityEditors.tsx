import { useState, type FormEvent } from 'react';
import { useConsole } from '../store';
import type { Waf, WafConfig } from '../types';
import { wafConfig } from '../lib/config';
import { ConfigurationEditor } from './ConfigurationEditor';
import { Field } from './form-fields';
import { WafPolicyFields } from './WafPolicyFields';
import { WafAiFields } from './WafAiFields';
import { WafBotFields } from './WafBotFields';
import { WafAdvancedFields } from './WafAdvancedFields';

export const wafLabSource =
  'https://clouddocs.f5.com/training/community/f5xc/html/class2/lab1.html';
export function WafEditor({
  initial,
  close,
  notify,
  viewOnly = false,
}: {
  initial?: Waf;
  close: () => void;
  notify: (message: string) => void;
  viewOnly?: boolean;
}) {
  const s = useConsole();
  const shared = initial?.namespace === 'shared';
  const [readOnly, setReadOnly] = useState(viewOnly || shared);
  const [name, setName] = useState(initial?.name ?? '');
  const [mode, setMode] = useState<Waf['mode']>(initial?.mode ?? 'Monitoring');
  const [config, setConfig] = useState<WafConfig>(() => {
    const value = wafConfig(initial),
      defaults = wafConfig();
    return {
      ...value,
      responsePage:
        value.responsePage ??
        (value.responseCode !== defaults.responseCode ||
        value.responseBody !== defaults.responseBody
          ? ('Custom' as const)
          : ('Default' as const)),
    };
  });
  const [opened] = useState(() => ({ name, mode, config }));
  const [error, setError] = useState('');
  const setting = <K extends keyof typeof config>(key: K, value: (typeof config)[K]) => {
    setConfig((v) => ({ ...v, [key]: value }));
    setError('');
  };
  const reset = () => {
    setName(opened.name);
    setMode(opened.mode);
    setConfig(opened.config);
    setError('');
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!/^[a-z][a-z0-9-]{1,62}$/.test(name))
      return setError('Metadata: enter a lowercase resource name with 2–63 characters.');
    const namespace = initial?.namespace ?? s.namespace;
    if (s.wafs.some((w) => w.namespace === namespace && w.name === name && w.id !== initial?.id))
      return setError('An App Firewall with this name already exists.');
    if (
      config.policy === 'Custom' &&
      config.staging !== 'Disabled' &&
      (!Number.isInteger(config.stagingDays) || config.stagingDays < 1 || config.stagingDays > 365)
    )
      return setError('Staging period must be 1–365 days.');
    if (config.responsePage === 'Custom' && !config.responseBody.trim())
      return setError('Advanced Configuration: enter a custom blocking response body.');
    const defaults = wafConfig();
    s.saveWaf({
      id: initial?.id ?? crypto.randomUUID(),
      namespace,
      name,
      mode,
      config: {
        ...config,
        ...(config.responsePage === 'Default'
          ? { responseCode: defaults.responseCode, responseBody: defaults.responseBody }
          : {}),
        stagingStartedAt:
          config.policy === 'Default' || config.staging === 'Disabled'
            ? undefined
            : (config.stagingStartedAt ?? new Date().toISOString()),
      },
    });
    notify(`${name} policy saved; future console requests use ${mode} mode`);
    close();
  };
  const attached = initial
    ? s.lbs.filter(
        (l) => l.wafId === initial.id || l.config?.routes.some((r) => r.wafId === initial.id),
      )
    : [];
  return (
    <ConfigurationEditor
      kind="App Firewall"
      className="waf-editor"
      collapsible
      readOnly={readOnly}
      onEdit={shared ? undefined : () => setReadOnly(false)}
      name={initial?.name ?? ''}
      namespace={initial?.namespace ?? s.namespace}
      close={close}
      guide={wafLabSource}
      onSave={save}
      error={error}
      onReset={reset}
      submitLabel={initial ? 'Save App Firewall' : 'Add App Firewall'}
      value={{ name, namespace: initial?.namespace ?? s.namespace, mode, config }}
      sections={[
        {
          id: 'metadata',
          title: 'Metadata',
          description:
            '웹 방화벽 정책의 이름과 설명을 지정합니다. 생성한 정책은 HTTP LB에서 별도로 연결합니다.',
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
              <Field label="Name *">
                <input
                  autoFocus
                  required
                  placeholder="my-app-firewall"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                  }}
                />
              </Field>
              <Field label="Labels">
                <input
                  value={config.labels}
                  placeholder="Add Label"
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
          id: 'mode',
          title: 'Enforcement Mode',
          description:
            'Monitoring은 탐지 기록을 남기고 통과시킵니다. Blocking은 정책에 따라 모의 차단 결과를 만듭니다.',
          onReset: () => {
            setMode(opened.mode);
            setError('');
          },
          content: (
            <>
              <Field label="Enforcement Mode">
                <select
                  required
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value as Waf['mode']);
                    setError('');
                  }}
                >
                  <option>Monitoring</option>
                  <option>Blocking</option>
                </select>
              </Field>
              <p className="configuration-help" role="status">
                {mode === 'Monitoring'
                  ? 'Monitoring logs matched demo attacks as Detected and forwards them to the origin.'
                  : 'Blocking rejects matched demo attacks and logs Blocked events. Exclusions and staging still apply.'}
              </p>
            </>
          ),
        },
        {
          id: 'policy',
          title: 'Security Policy Settings',
          description:
            'Default는 기본 정책을 사용합니다. Custom을 선택하면 서명·정확도·스테이징 설정이 펼쳐집니다.',
          onReset: () => {
            const c = opened.config;
            setConfig((v) => ({
              ...v,
              policy: c.policy,
              disabledAttacks: c.disabledAttacks,
              attackTypes: c.attackTypes,
              accuracy: c.accuracy,
              signatureSettings: c.signatureSettings,
              enhanceWithAi: c.enhanceWithAi,
              riskAction: c.riskAction,
              botProtection: c.botProtection,
              maliciousBotAction: c.maliciousBotAction,
              suspiciousBotAction: c.suspiciousBotAction,
              goodBotAction: c.goodBotAction,
              highAction: c.highAction,
              mediumAction: c.mediumAction,
              lowAction: c.lowAction,
              tuning: c.tuning,
              staging: c.staging,
              stagingDays: c.stagingDays,
              stagingStartedAt: c.stagingStartedAt,
              threatCampaigns: c.threatCampaigns,
            }));
            setError('');
          },
          content: (
            <>
              <WafPolicyFields config={config} setting={setting} />
              {config.policy === 'Custom' && (
                <>
                  <div data-section="bots">
                    <WafBotFields config={config} setting={setting} />
                  </div>
                  <WafAiFields config={config} setting={setting} />
                </>
              )}
            </>
          ),
        },
        {
          id: 'advanced',
          title: 'Advanced Configuration',
          description: '차단 응답과 로그 설정을 조정합니다. 응답은 로컬 모의 요청에만 적용됩니다.',
          onReset: () => {
            const c = opened.config;
            setConfig((v) => ({
              ...v,
              maskLogs: c.maskLogs,
              responsePage: c.responsePage,
              responseCode: c.responseCode,
              responseBody: c.responseBody,
            }));
            setError('');
          },
          content: <WafAdvancedFields config={config} setting={setting} attached={attached} />,
        },
      ]}
    />
  );
}
