import { useState } from 'react';
import type { Environment } from './types';
import { parsePolicyFile } from './policy-file';
import { lbConfig } from '../lib/config';
export function PolicyFile({
  environment: e,
  apply,
}: {
  environment: Environment;
  apply: (update: (next: Environment) => void) => void;
}) {
  const [source, setSource] = useState(
    'controls:\n  waf:\n    enabled: false\n  api_discovery:\n    enabled: false\n  bot_advanced:\n    enabled: false\n  rate_limiting:\n    enabled: false',
  );
  const [message, setMessage] = useState('');
  return (
    <div className="training-help">
      <h4>Task 1 · security-controls.yaml</h4>
      <p>
        공식 GitLab 파일 변경을 대신하는 로컬 입력입니다. 모두 false로 적용 후 Build → Test →
        Deploy를 실행하면 WAF gate가 실패합니다. waf를 true로 변경·적용하고 다시 실행하세요.
      </p>
      <label>
        security-controls.yaml
        <textarea rows={10} value={source} onChange={(ev) => setSource(ev.target.value)} />
      </label>
      <button
        type="button"
        onClick={() => {
          try {
            const c = parsePolicyFile(source);
            apply((next) => {
              next.lb.wafId = c.waf ? next.waf.id : '';
              next.waf.mode = c.waf ? 'Blocking' : 'Monitoring';
              next.controls.apiDiscovery = c.api_discovery;
              next.lb.config = { ...lbConfig(next.lb), apiDiscovery: c.api_discovery };
              next.lb.botDefense = c.bot_advanced;
              next.controls.botMode = c.bot_advanced ? 'Blocking' : 'Disabled';
              next.controls.rateLimit = c.rate_limiting;
            });
            setMessage('로컬 정책 적용 완료. Build / Test / Deploy 결과를 확인하세요.');
          } catch (error) {
            setMessage(String(error));
          }
        }}
      >
        Apply local controls
      </button>
      <p role="status">{message}</p>
      <small>
        현재 WAF: {e.lb.wafId ? e.waf.mode : 'Detached'} · 파일 파서는 이 네 개 boolean만
        지원합니다.
      </small>
    </div>
  );
}
