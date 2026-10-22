import type { WafFieldsProps } from './WafPolicyFields';
import { Field } from './form-fields';

export function WafAiFields({ config, setting }: WafFieldsProps) {
  return (
    <div className="waf-signatures">
      <Field label="Enhance with AI">
        <select
          value={config.enhanceWithAi ? 'Enable' : 'Disable'}
          onChange={(e) => setting('enhanceWithAi', e.target.value === 'Enable')}
        >
          <option>Disable</option>
          <option>Enable</option>
        </select>
      </Field>
      {config.enhanceWithAi && (
        <Field label="Action By Risk Score">
          <select
            value={config.riskAction ?? 'Mitigate High Risk Only'}
            onChange={() => setting('riskAction', 'Mitigate High Risk Only')}
          >
            <option>Mitigate High Risk Only</option>
          </select>
        </Field>
      )}
      <p className="configuration-help">
        REA에서 관찰한 설정을 로컬에 저장합니다. 실제 AI 엔진·위험도 계산식은 확인되지 않아 이
        옵션으로 모의 판정을 바꾸지 않습니다. 모의 결과는 Enforcement Mode와 서명별 동작을 따릅니다.
      </p>
    </div>
  );
}
