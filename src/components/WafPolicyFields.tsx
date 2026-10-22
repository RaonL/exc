import type { WafConfig } from '../types';
import { Field } from './form-fields';
import { ReferenceSelect } from './ReferenceSelect';

export interface WafFieldsProps {
  config: WafConfig;
  setting: <K extends keyof WafConfig>(key: K, value: WafConfig[K]) => void;
}
export function WafPolicyFields({ config, setting }: WafFieldsProps) {
  return (
    <>
      <Field label="Security Policy">
        <ReferenceSelect
          label="Security Policy"
          value={config.policy}
          onChange={(value) => setting('policy', value as WafConfig['policy'])}
          options={[
            {
              value: 'Default',
              description: 'Use default application security settings',
              default: true,
            },
            { value: 'Custom', description: 'Customize attack signatures and protection settings' },
          ]}
        />
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
                {[
                  'SQL Injection',
                  'Cross-site Scripting',
                  'Command Injection',
                  'Abuse of Functionality',
                  'Authentication/Authorization Attacks',
                  'Buffer Overflow',
                  'Denial of Service',
                  'Detection Evasion',
                  'Directory Indexing',
                  'HTTP Parser Attack',
                  'HTTP Response Splitting',
                  'Information Leakage',
                  'LDAP Injection',
                  'Malicious File Upload',
                  'Non-browser client',
                  'Other Application Attacks',
                  'Path Traversal',
                  'Predictable Resource Location',
                  'Remote File Include',
                  'Server Side Code Injection',
                  'Session Hijacking',
                  'Trojan/Backdoor/Spyware',
                  'Vulnerability Scan',
                  'XPath Injection',
                ].map((attack) => (
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
            <Field label="Signature Settings by Accuracy">
              <select
                value={config.signatureSettings ?? 'Default'}
                onChange={(e) =>
                  setting('signatureSettings', e.target.value as 'Default' | 'Custom')
                }
              >
                <option>Default</option>
                <option>Custom</option>
              </select>
            </Field>
            {config.signatureSettings !== 'Custom' && (
              <Field label="Signature Selection by Accuracy">
                <ReferenceSelect
                  label="Signature Selection by Accuracy"
                  value={config.accuracy}
                  onChange={(value) => setting('accuracy', value as WafConfig['accuracy'])}
                  options={[
                    { value: 'High', description: 'Enables only high accuracy signatures' },
                    {
                      value: 'High and Medium',
                      description: 'Enables high and medium accuracy signatures',
                      default: true,
                    },
                    {
                      value: 'High, Medium and Low',
                      description: 'Enables high, medium and low accuracy signatures',
                    },
                  ]}
                />
              </Field>
            )}
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
            {(['Medium', 'Low'] as const).map((accuracy) => (
              <Field key={accuracy} label={`${accuracy} Accuracy Signature Action`}>
                <select
                  value={
                    accuracy === 'Medium'
                      ? (config.mediumAction ?? 'Block')
                      : (config.lowAction ?? 'Block')
                  }
                  onChange={(e) =>
                    setting(
                      accuracy === 'Medium' ? 'mediumAction' : 'lowAction',
                      e.target.value as 'Block' | 'Report' | 'Ignore',
                    )
                  }
                >
                  <option>Block</option>
                  <option>Report</option>
                  <option>Ignore</option>
                </select>
              </Field>
            ))}
            <p className="configuration-help">
              {config.signatureSettings === 'Custom' ? 'Custom uses the selected action for each accuracy. Monitoring records matches without blocking.' : 'Demo SQLi, XSS and command injection signatures have high accuracy. All three accuracy selections include them.'}
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
