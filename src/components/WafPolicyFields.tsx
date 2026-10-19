import type { WafConfig } from '../types';
import { Field } from './form-fields';

export interface WafFieldsProps {
  config: WafConfig;
  setting: <K extends keyof WafConfig>(key: K, value: WafConfig[K]) => void;
}
export function WafPolicyFields({ config, setting }: WafFieldsProps) {
  return (
    <>
      <Field label="Security Policy">
        <select
          value={config.policy}
          onChange={(e) => setting('policy', e.target.value as WafConfig['policy'])}
        >
          <option>Default</option>
          <option>Custom</option>
        </select>
      </Field>
      {config.policy === 'Custom' && (
        <div className="waf-dependent-fields">
          <div className="waf-signatures">
            <h3>Attack Signatures</h3>
            <Field label="Attack Types">
              <select
                value={
                  config.attackTypes ?? (config.disabledAttacks.length > 0 ? 'Custom' : 'Default')
                }
                onChange={(e) => {
                  setting('attackTypes', e.target.value as 'Default' | 'Custom');
                  if (e.target.value === 'Default') setting('disabledAttacks', []);
                }}
              >
                <option>Default</option>
                <option>Custom</option>
              </select>
            </Field>
            {(config.attackTypes === 'Custom' || config.disabledAttacks.length > 0) && (
              <fieldset className="waf-attack-types">
                <legend>Disabled Attack Types</legend>
                {['SQL Injection', 'Cross-site Scripting', 'Command Injection'].map((attack) => (
                  <Field label={attack} key={attack}>
                    <input
                      type="checkbox"
                      checked={config.disabledAttacks.includes(attack)}
                      onChange={(e) =>
                        setting(
                          'disabledAttacks',
                          e.target.checked
                            ? [...config.disabledAttacks, attack]
                            : config.disabledAttacks.filter((a) => a !== attack),
                        )
                      }
                    />
                  </Field>
                ))}
              </fieldset>
            )}
            <Field label="Signature Selection by Accuracy">
              <select
                value={config.accuracy}
                onChange={(e) => setting('accuracy', e.target.value as WafConfig['accuracy'])}
              >
                <option>High</option>
                <option>High and Medium</option>
                <option>High, Medium and Low</option>
              </select>
            </Field>
            <Field label="High Accuracy Signature Action">
              <select
                value={config.highAction}
                onChange={(e) => setting('highAction', e.target.value as WafConfig['highAction'])}
              >
                <option>Block</option>
                <option>Report</option>
                <option>Ignore</option>
              </select>
            </Field>
            <p className="configuration-help">
              Demo SQLi, XSS and command injection signatures have high accuracy. All three accuracy
              selections include them.
            </p>
          </div>
          <Field label="Automatic Attack Signatures Tuning">
            <select
              value={config.tuning ? 'Enable' : 'Disable'}
              onChange={(e) => setting('tuning', e.target.value === 'Enable')}
            >
              <option>Enable</option>
              <option>Disable</option>
            </select>
          </Field>
          <Field label="Attack Signatures Staging">
            <select
              value={config.staging}
              onChange={(e) => {
                setting('staging', e.target.value as WafConfig['staging']);
                setting('stagingStartedAt', undefined);
              }}
            >
              <option value="Disabled">Disable</option>
              <option value="New signatures">Stage new attack signatures</option>
              <option value="New and updated signatures">
                Stage new and updated attack signatures
              </option>
            </select>
          </Field>
          {config.staging !== 'Disabled' && (
            <div className="waf-dependent-fields">
              <Field label="Staging Period (days)">
                <input
                  type="number"
                  min={1}
                  max={365}
                  required
                  value={config.stagingDays}
                  onChange={(e) => setting('stagingDays', Number(e.target.value))}
                />
              </Field>
            </div>
          )}
          <Field label="Threat Campaigns">
            <select
              value={config.threatCampaigns ? 'Enable' : 'Disable'}
              onChange={(e) => setting('threatCampaigns', e.target.value === 'Enable')}
            >
              <option>Enable</option>
              <option>Disable</option>
            </select>
          </Field>
          <p className="configuration-help">
            Tuning and threat campaigns are saved configuration examples. Staging reports new or
            updated signatures during the selected period; console attack samples use existing
            signatures.
          </p>
        </div>
      )}
    </>
  );
}
