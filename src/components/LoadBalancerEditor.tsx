import { ApiSettingsFields } from '../api-security/ApiSettingsFields';
import { defaults as apiDefaults, environmentError } from '../api-security/model';
import { configurationError, useApiSecurity } from '../api-security/store';
import { lazy, Suspense, useState, type FormEvent } from 'react';
import { useConsole } from '../store';
import type { LB, SecurityEvent } from '../types';
import { lbConfig } from '../lib/config';
import { class1Lab1Source } from '../lib/console-lab';
import { MetadataFields, DomainFields, OriginPoolFields } from './LoadBalancerBasics';
import { FirewallFields } from './LoadBalancerFirewall';
import { ConfigurationEditor } from './ConfigurationEditor';
import { ToggleField } from './form-fields';
import { Button } from './ui/button';
import { exclusionError } from '../lib/waf-exclusions';
import { WafEditor } from './SecurityEditors';
import { OriginEditor } from './OriginEditor';
import { OriginPoolItem } from './OriginItems';
import { RoutesEditor, RoutesTable } from './LoadBalancerRoutes';
import { VipFields, DeliveryFields } from './LoadBalancerDelivery';
import { LoadBalancerReset } from './LoadBalancerReset';
const WafExclusionRules = lazy(() =>
  import('./WafExclusionRules').then((module) => ({ default: module.WafExclusionRules })),
);
export function LBForm({
  initial,
  close,
  notify,
  viewOnly = false,
  initialSection,
  exclusionEvent,
}: {
  initial?: LB;
  close: () => void;
  notify: (message: string) => void;
  viewOnly?: boolean;
  initialSection?: string;
  exclusionEvent?: SecurityEvent;
}) {
  const s = useConsole();
  const [exclusions, setExclusions] = useState<{ event?: SecurityEvent; newItem?: boolean } | null>(
    exclusionEvent ? { event: exclusionEvent } : null,
  );
  const [routesOpen, setRoutesOpen] = useState(false);
  const [readOnly, setReadOnly] = useState(viewOnly);
  const [nested, setNested] = useState<'origin' | 'waf' | null>(null);
  const [originItem, setOriginItem] = useState(false);
  const [viewWaf, setViewWaf] = useState('');
  const [inspectOrigin, setInspectOrigin] = useState<{ id: string; edit: boolean } | null>(null);
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
  const [opened] = useState(() => structuredClone({ form, config, domains }));
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
  const resetDefaults = () => {
    if (readOnly) return;
    setForm((current) => ({
      ...current,
      protocol: 'HTTPS',
      originId: '',
      wafId: '',
      apiProtection: false,
      botDefense: false,
      ddosProtection: true,
      config: undefined,
    }));
    setConfig(lbConfig());
    setWafEnabled(false);
    setError('');
  };
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
    if (config.apiSecurity) {
      const target = { ...form, domains: list };
      const apiError = configurationError(config.apiSecurity, target);
      if (apiError) return setError(apiError);
      if (config.apiSecurity.testing) {
        if (!config.apiSecurity.environments.length)
          return setError('Add Testing Environments before saving API Testing.');
        for (const env of config.apiSecurity.environments) {
          const e = environmentError(env, list, useApiSecurity.getState().clock);
          if (e) return setError(e);
        }
      }
    }
    s.saveLb({ ...form, domains: list, config });
    notify(`${form.name} configuration saved`);
    close();
  };
  return (
    <>
      {!exclusions && (
        <ConfigurationEditor
          initialSection={initialSection}
          kind="HTTP Load Balancer"
          submitLabel={initial ? 'Save HTTP Load Balancer' : 'Add HTTP Load Balancer'}
          name={initial?.name ?? ''}
          namespace={s.namespace}
          guide={class1Lab1Source}
          className={`lb-editor ${originItem || nested || viewWaf || inspectOrigin ? 'lb-parent-obscured' : ''}`}
          collapsible
          toolbarActions={<LoadBalancerReset onReset={resetDefaults} />}
          onReset={() => {
            const restored = structuredClone(opened);
            setForm(restored.form);
            setConfig(restored.config);
            setDomains(restored.domains);
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
              description: '리소스 이름과 설명을 지정합니다. 현재 Namespace 안에 저장됩니다.',
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
              title: 'Domains',
              description:
                '요청을 받을 도메인과 HTTP / HTTPS 유형을 선택합니다. 인증서·DNS 설정은 학습용 입력입니다.',
              content: (
                <DomainFields
                  part="domains"
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
              id: 'tls',
              title: 'SSL/TLS Type',
              content: (
                <DomainFields
                  part="tls"
                  form={form}
                  config={config}
                  update={update}
                  setting={setting}
                  domains={domains}
                  setDomains={setDomains}
                />
              ),
            },
            {
              id: 'cdn',
              title: 'CDN',
              content: (
                <ToggleField
                  label="CDN Caching"
                  value={config.cdn}
                  onChange={(v) => setting('cdn', v)}
                />
              ),
            },
            {
              id: 'delivery',
              title: 'Common Delivery Controls',
              content: <DeliveryFields config={config} setting={setting} />,
            },
            {
              id: 'origins',
              title: 'Origins',
              description:
                '기본 요청을 전달할 Origin Pool을 추가합니다. 중첩 폼의 Apply 후 하단 저장까지 완료하세요.',
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
              content: (
                <>
                  <RoutesTable config={config} origins={origins} />
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={readOnly ? 'View Routes Configuration' : 'Configure Routes'}
                    onClick={() => setRoutesOpen(true)}
                  >
                    {readOnly ? 'View Configuration' : 'Configure'} →
                  </Button>
                </>
              ),
            },
            {
              id: 'waf',
              title: 'Web Application Firewall',
              description:
                'Enable을 선택한 뒤 App Firewall 객체를 연결합니다. 정책 생성만으로는 LB에 적용되지 않습니다.',
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
                  <ApiSettingsFields
                    lb={{ ...form, domains: domains.map((d) => d.trim()) }}
                    value={{
                      ...apiDefaults(),
                      discovery: config.apiDiscovery,
                      ...config.apiSecurity,
                    }}
                    onChange={(value) => {
                      setConfig((current) => ({
                        ...current,
                        apiSecurity: value,
                        apiDiscovery: value.discovery,
                      }));
                      setError('');
                    }}
                  />
                  {!config.apiSecurity && (
                    <ToggleField
                      label="API Schema Validation"
                      value={form.apiProtection}
                      onChange={(v) => update('apiProtection', v)}
                    />
                  )}
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
              title: 'L7 Denial of Service (DoS)',
              content: (
                <ToggleField
                  label="L7 DDoS Protection"
                  value={form.ddosProtection}
                  onChange={(v) => update('ddosProtection', v)}
                />
              ),
            },
            {
              id: 'malware',
              title: 'Malware Protection',
              content: (
                <p className="xc-unmodeled-notice">
                  Not configured · 미구현: 설정 위치 참고용입니다.
                </p>
              ),
            },
            {
              id: 'client',
              title: 'Client-Side Defense',
              content: (
                <p className="xc-unmodeled-notice">
                  Not configured · 미구현: 설정 위치 참고용입니다.
                </p>
              ),
            },
            {
              id: 'common',
              title: 'Common Security Controls',
              content: (
                <p className="xc-unmodeled-notice">
                  Not configured · 미구현: 설정 위치 참고용입니다.
                </p>
              ),
            },
            {
              id: 'other',
              title: 'VIP Advertisement',
              content: (
                <VipFields
                  config={config}
                  setting={setting}
                  sites={s.sites.filter((site) => site.namespace === form.namespace)}
                />
              ),
            },
          ]
            .filter(
              (section) =>
                !readOnly || section.id !== (config.routes.length ? 'origins' : 'routes'),
            )
            .sort(
              (a, b) =>
                [
                  'metadata',
                  'domains',
                  'other',
                  'tls',
                  'origins',
                  'routes',
                  'cdn',
                  'delivery',
                  'waf',
                  'common',
                  'dos',
                  'api',
                  'bot',
                  'malware',
                  'client',
                ].indexOf(a.id) -
                [
                  'metadata',
                  'domains',
                  'other',
                  'tls',
                  'origins',
                  'routes',
                  'cdn',
                  'delivery',
                  'waf',
                  'common',
                  'dos',
                  'api',
                  'bot',
                  'malware',
                  'client',
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
      {routesOpen && (
        <RoutesEditor
          initial={config}
          form={form}
          origins={origins}
          wafs={wafs}
          readOnly={readOnly}
          close={() => setRoutesOpen(false)}
          apply={(routes) => {
            setting('routes', routes);
            setRoutesOpen(false);
          }}
        />
      )}
      {originItem && (
        <OriginPoolItem
          origins={origins}
          originId={form.originId}
          weight={config.originWeight ?? 1}
          priority={config.originPriority ?? 1}
          namespace={s.namespace}
          close={() => setOriginItem(false)}
          onCancelAll={close}
          obscured={!!inspectOrigin}
          onInspect={(id, edit) => setInspectOrigin({ id, edit })}
          onApply={(id, weight, priority) => {
            update('originId', id);
            setConfig((c) => ({ ...c, originWeight: weight, originPriority: priority }));
            setOriginItem(false);
          }}
        />
      )}
      {inspectOrigin && (
        <OriginEditor
          initial={s.origins.find((o) => o.id === inspectOrigin.id)}
          viewOnly={!inspectOrigin.edit}
          close={() => setInspectOrigin(null)}
          notify={notify}
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
