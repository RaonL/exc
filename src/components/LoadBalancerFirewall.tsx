import { Plus } from 'lucide-react';
import type { Waf } from '../types';
import type { LBFieldsProps } from './LoadBalancerBasics';
import { Field } from './form-fields';
import { Button } from './ui/button';
import { Badge } from './common';
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
  return (
    <>
      <Field label="Web Application Firewall (WAF)">
        <select
          value={enabled ? 'Enable' : 'Disable'}
          onChange={(e) => onEnabledChange(e.target.value === 'Enable')}
        >
          <option>Disable</option>
          <option disabled={!wafs.length}>Enable</option>
        </select>
      </Field>
      {enabled && (
        <div className="lb-waf-selection">
          <Field label="Enable *">
            <select required value={form.wafId} onChange={(e) => update('wafId', e.target.value)}>
              <option value="">Select a Web Application Firewall</option>
              {wafs.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.namespace}/{w.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
      {form.wafId && (
        <Button type="button" variant="ghost" onClick={() => onInspect(form.wafId)}>
          View Configuration ↗
        </Button>
      )}
      <Button type="button" variant="outline" onClick={() => onCreate()}>
        <Plus size={13} />
        Add App Firewall
      </Button>
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
    </>
  );
}
