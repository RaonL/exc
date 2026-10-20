import { useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useConsole } from '../store';
import { lab1Samples } from '../lib/console-lab';
import { lbConfig } from '../lib/config';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './common';
import type { SecurityEvent } from '../types';
import { ConsoleGuidePanel } from '../training/ConsoleGuidePanel';
import { guideFields, type GuideStep } from '../training/console-guide';

export function ConsoleApplication() {
  const s = useConsole(),
    lb = s.lbs.find((l) => l.id === s.applicationLbId && l.namespace === s.namespace);
  if (!lb) return null;
  return <Application key={lb.id} id={lb.id} close={() => s.openApplication('')} />;
}
function Application({ id, close }: { id: string; close: () => void }) {
  const s = useConsole(),
    lb = s.lbs.find((l) => l.id === id)!;
  const port = lbConfig(lb).listenPort;
  const guided = s.consoleLab1?.namespace === lb.namespace && lb.name === `${lb.namespace}-lb`;
  const guideStep: GuideStep = s.consoleLab1?.guideStep === 'baseline' ? 'baseline' : 'attacks';
  const base = `${lb.protocol.toLowerCase()}://${lb.domains[0]}${(port === 80 && lb.protocol === 'HTTP') || (port === 443 && lb.protocol === 'HTTPS') ? '' : `:${port}`}`;
  const [url, setUrl] = useState(`${base}/`),
    [method, setMethod] = useState('GET'),
    [result, setResult] = useState<SecurityEvent>(),
    [error, setError] = useState('');
  const execute = (target: string) => {
    setUrl(target);
    try {
      setResult(s.requestApplication(id, target, method));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };
  return (
    <Dialog
      open
      onOpenChange={close}
      wide
      title="Open Application"
      description="Local application preview · no DNS lookup or external HTTP request is made."
    >
      <div className={guided ? 'guided-application' : ''}>
        <div className="console-application">
          <div className="local-address">
            <select
              id="application-request-method"
              name="application-method"
              aria-label="Application request method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option>GET</option>
              <option>POST</option>
              <option>HEAD</option>
            </select>
            <input
              id="application-request-url"
              name="application-url"
              aria-label="Application URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') execute(url);
              }}
            />
            <Button onClick={() => execute(url)}>
              Go <ArrowRight size={13} />
            </Button>
          </div>
          <div className="application-menu">
            <strong>F5 XC Demo App</strong>
            <Badge tone="blue">LOCAL</Badge>
            <span>Menu</span>
            {lab1Samples.map((sample) => (
              <button key={sample.label} onClick={() => execute(base + sample.path)}>
                {sample.label}
              </button>
            ))}
          </div>
          {error && (
            <div role="alert" className="config-error">
              {error}
            </div>
          )}
          {!result ? (
            <div className="application-welcome">
              <h2>Demo application ready</h2>
              <p>
                Home 또는 HEADER로 정상 요청을 생성한 뒤, WAF 연결 전후의 공격 샘플을 비교하세요.
              </p>
              <Button variant="outline" onClick={() => execute(`${base}/`)}>
                Open Home
              </Button>
            </div>
          ) : (
            <div className="application-response" role="status">
              <div>
                <Badge tone={(result.responseCode ?? 200) >= 400 ? 'red' : 'green'}>
                  HTTP {result.responseCode}
                </Badge>
                <strong>{result.action}</strong>
                <span>Duration {result.durationMs} ms · simulated</span>
              </div>
              {result.action === 'Blocked' ? (
                <>
                  <h2>The requested URL was rejected.</h2>
                  <p>Please contact your administrator.</p>
                  {result.responseBody && (
                    <pre className="application-block-body">
                      {result.responseBody.replaceAll('{{request_id}}', result.id)}
                    </pre>
                  )}
                  <p>
                    Support ID: <code>{result.id}</code>
                  </p>
                </>
              ) : result.path.startsWith('/headers') ? (
                <>
                  <h2>HEADER</h2>
                  <pre>{`Host: ${lb.domains[0]}\nMethod: ${result.method}\nX-Forwarded-For: ${result.source}\nX-Request-ID: ${result.id}`}</pre>
                </>
              ) : (
                <>
                  <h2>
                    {result.responseCode === 200
                      ? 'Welcome to the F5 XC Demo App'
                      : 'Application unavailable'}
                  </h2>
                  <p>
                    {result.responseCode === 200
                      ? 'This response was generated from your saved load balancer and origin configuration.'
                      : result.reason}
                  </p>
                </>
              )}
              <p>{result.reason}</p>
              <details>
                <summary>Request / Response JSON</summary>
                <pre>{JSON.stringify({ req_id: result.id, ...result }, null, 2)}</pre>
              </details>
              <div className="application-result-actions">
                <Button
                  variant="outline"
                  onClick={() => {
                    s.selectLb(id);
                    close();
                  }}
                >
                  Performance Monitoring
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    s.selectLb(id, 'Security');
                    s.navigate('Web App & API Protection', 'Security Analytics');
                    useConsole.setState({ selectedLbId: id });
                    close();
                  }}
                >
                  <ShieldCheck size={13} />
                  Security Analytics
                </Button>
              </div>
            </div>
          )}
          <p className="configuration-help">
            샘플 쿼리 문자열을 로컬 규칙으로 분류합니다. 실제 공격 엔진·스크립트·명령은 실행하지
            않습니다. 모든 결과는 콘솔 Requests / Security Analytics에도 기록됩니다.
          </p>
        </div>
        {guided && (
          <ConsoleGuidePanel
            kind="Open Application"
            fields={guideFields('Open Application', lb, s, guideStep)}
            step={guideStep}
          />
        )}
      </div>
    </Dialog>
  );
}
