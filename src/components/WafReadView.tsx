import type { Waf } from '../types';
import { wafConfig } from '../lib/config';
const item = (label: string, value: unknown) => (
  <div className="xc-read-row">
    <span>{label}: ⓘ</span>
    <strong>{String(value)}</strong>
  </div>
);
export function WafReadView({ waf, section }: { waf: Waf; section: string }) {
  const c = wafConfig(waf);
  if (section === 'mode') return item('Enforcement Mode', waf.mode);
  if (section === 'policy')
    return (
      <>
        {item('Security Policy', c.policy)}
        {c.policy === 'Custom' && (
          <div className="xc-read-nested">
            <h3>Attack Signatures</h3>
            {item('Attack Types', c.attackTypes ?? 'Default')}
            {c.disabledAttacks.length > 0 &&
              item('Disabled Attack Types', c.disabledAttacks.join(', '))}
            {item('Signature Settings by Accuracy', c.signatureSettings ?? 'Default')}
            {c.signatureSettings !== 'Custom' &&
              item('Signature Selection by Accuracy', c.accuracy)}
            {item('High Accuracy', c.highAction)}
            {item('Medium Accuracy', c.mediumAction ?? 'Block')}
            {item('Low Accuracy', c.lowAction ?? 'Block')}
            {item('Automatic Attack Signatures Tuning', c.tuning ? 'Enable' : 'Disable')}
            {item('Attack Signatures Staging', c.staging)}
            {item('Threat Campaigns', c.threatCampaigns ? 'Enable' : 'Disable')}
            {item('Signature-Based Bot Protection', c.botProtection ?? 'Default')}
            {c.botProtection === 'Custom' && (
              <>
                {item('Malicious Bot', c.maliciousBotAction ?? 'Block')}
                {item('Suspicious Bot', c.suspiciousBotAction ?? 'Report')}
                {item('Good Bot', c.goodBotAction ?? 'Report')}
              </>
            )}
            {item('Enhance with AI', c.enhanceWithAi ? 'Enable' : 'Disable')}
            {c.enhanceWithAi &&
              item('Action By Risk Score', c.riskAction ?? 'Mitigate High Risk Only')}
          </div>
        )}
      </>
    );
  return (
    <>
      {item('Allowed Response Status Codes', 'Default')}
      {item('Mask Sensitive Parameters in Logs', c.maskLogs ? 'Default' : 'Disable')}
      {item('Blocking Response Page', c.responsePage ?? 'Default')}
      {c.responsePage === 'Custom' && (
        <>
          {item('Response Code', c.responseCode)}
          <pre>{c.responseBody}</pre>
        </>
      )}
    </>
  );
}
