import type { LB } from '../types';
import type { WafFieldsProps } from './WafPolicyFields';
import { Field } from './form-fields';
export function WafAdvancedFields({
  config,
  setting,
  attached,
}: WafFieldsProps & { attached: LB[] }) {
  return (
    <>
      <Field label="Mask Sensitive Parameters in Logs">
        <select
          value={config.maskLogs ? 'Default' : 'Disable'}
          onChange={(e) => setting('maskLogs', e.target.value === 'Default')}
        >
          <option>Default</option>
          <option>Disable</option>
        </select>
      </Field>
      <Field label="Blocking Response Page">
        <select
          value={config.responsePage}
          onChange={(e) => setting('responsePage', e.target.value as 'Default' | 'Custom')}
        >
          <option>Default</option>
          <option>Custom</option>
        </select>
      </Field>
      {config.responsePage === 'Custom' && (
        <div className="waf-dependent-fields">
          <Field label="Response Code">
            <select
              value={config.responseCode}
              onChange={(e) => setting('responseCode', Number(e.target.value))}
            >
              {[403, 401, 429].map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Custom Blocking Response Page Body"
            hint="Text is displayed safely; HTML and scripts are not executed. {{request_id}} is replaced with the Support ID."
          >
            <textarea
              rows={5}
              required
              value={config.responseBody}
              onChange={(e) => setting('responseBody', e.target.value)}
            />
          </Field>
          <div className="response-preview">
            <span>Plain-text preview · HTTP {config.responseCode}</span>
            <pre>{config.responseBody}</pre>
          </div>
        </div>
      )}
      <p className="configuration-help">
        Log masking is saved without a live security engine. Policy saves apply to future console
        requests; earlier request events retain their original result.
      </p>
      <div className="configuration-summary">
        <div>
          <span>Attached load balancers</span>
          <strong>{attached.length}</strong>
        </div>
        {attached.map((lb) => (
          <div key={lb.id}>
            <span>
              {lb.namespace}/{lb.name}
            </span>
            <span>Policy linked</span>
          </div>
        ))}
      </div>
    </>
  );
}
