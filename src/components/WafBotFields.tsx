import { Field } from './form-fields';
import type { WafFieldsProps } from './WafPolicyFields';
export function WafBotFields({ config, setting }: WafFieldsProps) {
  return (
    <>
      <Field label="Signature-Based Bot Protection">
        <select
          value={config.botProtection ?? 'Default'}
          onChange={(e) => setting('botProtection', e.target.value as 'Default' | 'Custom')}
        >
          <option>Default</option>
          <option>Custom</option>
        </select>
      </Field>
      <p className="configuration-help">
        WAF의 서명 기반 봇 정책입니다. 별도 Bot Defense 제품 설정과 구분합니다. Default는 Malicious
        Bot=Block, Suspicious/Good Bot=Report입니다. Monitoring 모드는 Block도 기록 후 통과시킵니다.
      </p>
      {config.botProtection === 'Custom' && (
        <div className="waf-dependent-fields">
          {(
            [
              ['Malicious Bot', 'maliciousBotAction', 'Block'],
              ['Suspicious Bot', 'suspiciousBotAction', 'Report'],
              ['Good Bot', 'goodBotAction', 'Report'],
            ] as const
          ).map(([label, key, fallback]) => (
            <Field key={key} label={label}>
              <select
                value={config[key] ?? fallback}
                onChange={(e) => setting(key, e.target.value as 'Block' | 'Report' | 'Ignore')}
              >
                <option>Block</option>
                <option>Report</option>
                <option>Ignore</option>
              </select>
            </Field>
          ))}
        </div>
      )}
    </>
  );
}
