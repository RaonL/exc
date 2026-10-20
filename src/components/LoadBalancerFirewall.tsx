import { Plus } from 'lucide-react';
import type { Waf } from '../types';
import type { LBFieldsProps } from './LoadBalancerBasics';
import { Field } from './form-fields';
import { Button } from './ui/button';
import { Badge } from './common';
import { ReferenceSelect } from './ReferenceSelect';
import { useState } from 'react';
export function FirewallFields({
  form,
  config,
  update,
  wafs,
  enabled,
  onEnabledChange,
  onInspect,
  onCreate,
  onExclusions,
}: LBFieldsProps & {
  wafs: Waf[];
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onInspect: (id: string) => void;
  onCreate: () => void;
  onExclusions: (newItem?: boolean) => void;
}) {
  const [unmodeled, setUnmodeled] = useState('');
  return (
    <>
      <Field label="Web Application Firewall (WAF)">
        <ReferenceSelect
          label="Web Application Firewall (WAF)"
          value={enabled ? 'Enable' : 'Disable'}
          onChange={(value) => onEnabledChange(value === 'Enable')}
          options={[
            {
              value: 'Disable',
              description: 'No WAF configuration for this load balancer',
              default: true,
            },
            { value: 'Enable', description: 'Reference to App Firewall configuration object' },
          ]}
        />
      </Field>
      {enabled && (
        <div className="lb-waf-selection">
          <Field label="Enable *">
            <ReferenceSelect
              label="Enable *"
              value={form.wafId}
              onChange={(value) => update('wafId', value)}
              onAdd={onCreate}
              options={[
                { value: '', label: 'Select App Firewall' },
                ...wafs.map((w) => ({ value: w.id, label: `${w.namespace}/${w.name}` })),
              ]}
            />
          </Field>
          {form.wafId && (
            <button
              type="button"
              className="resource-link lb-waf-inspect"
              onClick={() => onInspect(form.wafId)}
            >
              View Configuration ↗
            </button>
          )}
        </div>
      )}
      <Field label="WAF Exclusion">
        <select value="Inline Rules" onChange={() => {}}>
          <option>Inline Rules</option>
        </select>
      </Field>
      <div className="lb-exclusion-inline">
        <div className="config-subheading">
          WAF Exclusion Rules <Badge>{config.exclusions.length} rules</Badge>
        </div>
        <div className="configuration-summary">
          {config.exclusions.map((e) => (
            <div key={e.id}>
              <strong>{e.name}</strong>
              <span>
                {e.attack} · {e.method} · {e.pathMatch === 'Exact' ? 'Exact' : 'Prefix'} {e.path}
              </span>
            </div>
          ))}
          {!config.exclusions.length && (
            <p className="configuration-help">No WAF exclusion rules configured.</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          aria-label="Configure WAF Exclusion Rules"
          onClick={() => onExclusions()}
        >
          Configure
        </Button>
        <Button type="button" variant="outline" onClick={() => onExclusions(true)}>
          <Plus size={14} />
          Add Exclusion Rule
        </Button>
      </div>
      {[
        'Data Guard Rules',
        'Cross-Site Request Forgery Protection',
        'GraphQL Inspection',
        'Cookie Protection',
      ].map((title) => (
        <div className="xc-unmodeled-control" key={title}>
          <h3>{title} ⓘ</h3>
          <p>
            <span>⚠</span> Not configured{' '}
            <button type="button" onClick={() => setUnmodeled(unmodeled === title ? '' : title)}>
              Configure ›
            </button>
            <small>미구현</small>
          </p>
          {unmodeled === title && (
            <p role="status">
              설정 위치를 보여주는 학습용 화면입니다. 이 보호 기능의 설정·평가 엔진은 미구현입니다.
            </p>
          )}
        </div>
      ))}
    </>
  );
}
