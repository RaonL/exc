import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  ExternalLink,
  FlaskConical,
  Play,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { useConsole } from '../store';
import { Badge } from '../components/common';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { Field, ToggleField } from '../components/form-fields';
import { lbConfig, originConfig } from '../lib/config';
import { consoleLab1Checks } from '../lib/console-lab';
import { classes, labById, trainingLabs } from './catalog';
import { apiPaths, fingerprint, referenceConfiguration, request } from './engine';
import { effectiveEnvironment, isComplete, selfTestAll, useTraining } from './store';
import type { Controls, Environment, Lab, RequestInput } from './types';

function referencePreview(e: Environment, lab: Lab) {
  try {
    const solution = referenceConfiguration(e, lab);
    return JSON.stringify({ lb: solution.lb, controls: solution.controls }, null, 2);
  } catch {
    return '앱 manifest가 유효하지 않습니다. JSON을 수정한 후 정답 구성을 확인하세요.';
  }
}
const download = (name: string, value: unknown) => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
function Select({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(ev) => onChange(ev.target.value)}>
        {values.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </Field>
  );
}
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="training-control-group">
      <h3>{title}</h3>
      <div className="training-fields">{children}</div>
    </section>
  );
}

export function TrainingCenter() {
  const t = useTraining(),
    core = useConsole();
  const lab = labById(t.selectedLab),
    category = classes.find((c) => c.id === t.selectedClass)!;
  const session = t.sessions[lab.id],
    environment = session ? effectiveEnvironment(session) : undefined;
  const [tab, setTab] = useState('Guide'),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [reset, setReset] = useState(false);
  const [input, setInput] = useState<RequestInput>(request()),
    [headers, setHeaders] = useState('{}'),
    [body, setBody] = useState('{}'),
    [repeat, setRepeat] = useState(1),
    [filter, setFilter] = useState('All'),
    [expanded, setExpanded] = useState('');
  const [matrix, setMatrix] = useState<ReturnType<typeof selfTestAll>>();
  useEffect(() => {
    setTab('Guide');
    setError('');
    setMessage('');
    setHeaders('{}');
    setBody('{}');
    setInput(
      request({
        path:
          lab.exercise === 'bot-block'
            ? '/flight'
            : ['bot', 'bot-flag', 'human-bot', 'bot-baseline'].includes(lab.exercise)
              ? '/user/vipsignin'
              : lab.exercise === 'endpoint'
                ? '/api/customerlookup/getbydob'
                : lab.exercise === 'zero-day'
                  ? '/ratelimit.php'
                  : '/',
        method: ['bot', 'bot-flag', 'human-bot', 'bot-baseline'].includes(lab.exercise)
          ? 'POST'
          : 'GET',
      }),
    );
  }, [lab.id, lab.exercise]);
  const act = (fn: () => void, success = '') => {
    try {
      fn();
      setError('');
      setMessage(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMessage('');
    }
  };
  const edit = (change: (e: Environment) => void) =>
    act(() =>
      t.update(lab.id, (e) => {
        change(e);
        return e;
      }),
    );
  const control = <K extends keyof Controls>(key: K, value: Controls[K]) =>
    edit((e) => {
      e.controls[key] = value;
    });
  const toggle = (key: keyof Controls, label: string) => (
    <ToggleField
      key={key}
      label={label}
      value={Boolean(environment?.controls[key])}
      onChange={(v) => control(key, v as never)}
    />
  );
  const text = (key: keyof Controls, label: string) => (
    <Field key={key} label={label}>
      <input
        value={String(environment?.controls[key] ?? '')}
        onChange={(ev) => control(key, ev.target.value as never)}
      />
    </Field>
  );
  const number = (key: 'rate' | 'rateWindow', label: string) => (
    <Field key={key} label={label}>
      <input
        type="number"
        min={1}
        max={key === 'rate' ? 1000 : 3600}
        value={environment?.controls[key] ?? 1}
        onChange={(ev) => {
          const value = Number(ev.target.value);
          if (Number.isInteger(value) && value >= 1 && value <= (key === 'rate' ? 1000 : 3600))
            control(key, value);
        }}
      />
    </Field>
  );
  const openConsole = (
    page: 'HTTP Load Balancers' | 'App Firewall' | 'Security Events' | 'Connectivity',
  ) => {
    if (!environment) return;
    core.setNamespace(environment.lb.namespace);
    core.navigate(
      page === 'Connectivity' ? 'Multi-Cloud Network Connect' : 'Web App & API Protection',
      page,
    );
  };
  const current =
    !!session?.verification &&
    !!environment &&
    session.verification.fingerprint === fingerprint(environment);
  const labDone = (id: string) =>
    id === 'c1-lab1'
      ? !!core.consoleLab1 && consoleLab1Checks(core, core.consoleLab1).every((c) => c.pass)
      : !!t.sessions[id] && isComplete(t.sessions[id]);
  const complete = trainingLabs.filter((l) => labDone(l.id)).length;
  const exists = environment && core.lbs.some((l) => l.id === environment.lb.id);
  const x = lab.exercise;
  return (
    <div className="training-center">
      <div className="training-heading">
        <div>
          <div className="training-eyebrow">
            <BookOpen size={14} /> F5 XC COMMUNITY TRAINING
          </div>
          <h1>
            Training Center <Badge tone="blue">SIMULATION</Badge>
          </h1>
          <p>공식 Class 1–8을 따라 설정하고, 요청을 실행하고, 결과로 확인하세요.</p>
        </div>
        <div className="training-summary">
          <strong>
            {complete}
            <small> / 34</small>
          </strong>
          <span>검증 완료 · 브라우저에 저장</span>
          <progress max={34} value={complete} aria-label="전체 실습 완료율" />
        </div>
      </div>
      <div className="training-class-grid">
        {classes.map((c) => {
          const units = trainingLabs.filter((l) => l.classId === c.id),
            done = units.filter((l) => labDone(l.id)).length;
          return (
            <button
              key={c.id}
              className={`training-class ${c.id === t.selectedClass ? 'selected' : ''}`}
              style={{ '--class-color': c.color } as React.CSSProperties}
              onClick={() => t.select(c.id)}
            >
              <span>
                CLASS {c.id}
                <small>
                  {done}/{units.length}
                </small>
              </span>
              <strong>{c.title}</strong>
              <p>{c.subtitle}</p>
              <progress max={units.length} value={done} aria-label={`Class ${c.id} 완료율`} />
            </button>
          );
        })}
      </div>
      <div className="training-scope">
        <FlaskConical size={17} />
        <span>
          실제 F5 접속·공격·스캔은 실행하지 않습니다. 모든 요청은 브라우저 함수로 평가합니다.
          정책·봇 분류·네트워크·AI·CI/CD는 교육용 단순화 모델입니다.
        </span>
      </div>
      <div className="training-workbench">
        <aside className="training-lab-nav">
          <div className="training-nav-title">
            CLASS {category.id}
            <strong>{category.title}</strong>
          </div>
          {trainingLabs
            .filter((l) => l.classId === t.selectedClass)
            .map((l) => (
              <button
                key={l.id}
                className={l.id === lab.id ? 'selected' : ''}
                onClick={() => t.select(l.classId, l.id)}
              >
                <span>
                  {labDone(l.id) ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <span className="training-step-dot" />
                  )}
                </span>
                <span>
                  <small>{l.unit.replaceAll('/', ' · ').toUpperCase()}</small>
                  {l.title}
                </span>
                <ArrowRight size={13} />
              </button>
            ))}
          <div className="training-nav-note">
            실습 간 상태는 독립적입니다.
            <br />
            다음 Lab은 미리 준비한 초기 환경에서 시작합니다.
          </div>
          <Button variant="outline" size="sm" onClick={() => act(() => setMatrix(selfTestAll()))}>
            <ShieldCheck size={14} />
            34개 모델 자체 검증
          </Button>
        </aside>
        <section className="training-detail">
          <header className="training-lab-header">
            <div>
              <span className="training-eyebrow">
                CLASS {lab.classId} / {lab.unit.toUpperCase().replaceAll('/', ' · ')}
              </span>
              <h2>{lab.title}</h2>
              <p>{lab.objective}</p>
            </div>
            <a href={lab.source} target="_blank" rel="noreferrer">
              공식 실습 원문 <ExternalLink size={13} />
            </a>
          </header>
          <div className="training-tabbar" role="tablist" aria-label="실습 화면">
            {['Guide', 'Environment', 'Test', 'Logs', 'Reference']
              .filter((name) => lab.id !== 'c1-lab1' || ['Guide', 'Reference'].includes(name))
              .map((name) => (
                <button
                  role="tab"
                  aria-selected={tab === name}
                  key={name}
                  onClick={() => setTab(name)}
                >
                  {
                    {
                      Guide: '실습 가이드',
                      Environment: '환경 / 설정',
                      Test: '요청 / 검증',
                      Logs: '로그 / 보고서',
                      Reference: '원문 / 차이점',
                    }[name]
                  }
                </button>
              ))}
          </div>
          {error && (
            <div role="alert" className="training-error">
              {error}
            </div>
          )}
          {message && (
            <div role="status" className="training-message">
              {message}
            </div>
          )}
          {!exists && session && (
            <div className="training-error">
              콘솔에서 실습 LB가 삭제되었습니다. 환경 초기화로 다시 준비하세요.
            </div>
          )}
          {tab === 'Guide' && (
            <div className="training-pane">
              <div className="training-guide-intro">
                <Badge tone={labDone(lab.id) ? 'green' : 'blue'}>
                  {labDone(lab.id) ? '검증 완료' : session ? '실습 진행 중' : '시작 전'}
                </Badge>
                <span>단계별 실습 · 자동 저장 · 독립 Namespace</span>
              </div>
              <ol className="training-steps">
                {lab.steps.map((step, i) => (
                  <li key={step}>
                    <span>{i + 1}</span>
                    <div>
                      <strong>{['환경 확인', '설정 구성', '요청 실행', '결과 검증'][i]}</strong>
                      <p>{step}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="training-actions">
                <Button
                  onClick={() =>
                    act(() => {
                      if (lab.id === 'c1-lab1') {
                        core.startConsoleLab1();
                        return;
                      }
                      t.start(lab.id);
                      setTab('Environment');
                    }, '실습 환경이 준비되었습니다. 설정은 자동 저장됩니다.')
                  }
                >
                  <Play size={15} />
                  {lab.id === 'c1-lab1'
                    ? '콘솔에서 실습 시작'
                    : session
                      ? '환경 계속하기'
                      : '실습 환경 시작'}
                </Button>
                {session && lab.id !== 'c1-lab1' && (
                  <Button variant="outline" onClick={() => setTab('Test')}>
                    검증으로 이동 <ArrowRight size={14} />
                  </Button>
                )}
              </div>
              <div className="training-help">
                체크박스를 눌러 완료하는 방식이 아닙니다. 기준 요청을 기록하고 검증 항목을 모두
                통과해야 완료됩니다. 설정을 바꾸면 다시 검증해야 합니다.
              </div>
            </div>
          )}
          {tab === 'Environment' && (
            <div className="training-pane">
              {environment ? (
                <>
                  <div className="training-resource-strip">
                    <span>
                      <small>NAMESPACE</small>
                      {environment.lb.namespace}
                    </span>
                    <span>
                      <small>DOMAIN (LOCAL MODEL)</small>
                      {environment.lb.domains[0]}
                    </span>
                    <Badge tone="green">로컬 상태 저장</Badge>
                  </div>
                  <Group title="Load Balancer / Origin / Application Firewall">
                    <Field label="Load Balancer Name">
                      <input
                        value={environment.lb.name}
                        onChange={(ev) =>
                          edit((e) => {
                            e.lb.name = ev.target.value;
                          })
                        }
                      />
                    </Field>
                    <Select
                      label="Load Balancer Type"
                      value={environment.lb.protocol}
                      values={['HTTP', 'HTTPS']}
                      onChange={(v) =>
                        edit((e) => {
                          e.lb.protocol = v as 'HTTP' | 'HTTPS';
                          e.lb.config = { ...lbConfig(e.lb), listenPort: v === 'HTTP' ? 80 : 443 };
                        })
                      }
                    />
                    <Select
                      label="VIP Advertisement"
                      value={lbConfig(environment.lb).vip}
                      values={['Internet', 'Custom', 'Do Not Advertise']}
                      onChange={(v) =>
                        edit((e) => {
                          e.lb.config = {
                            ...lbConfig(e.lb),
                            vip: v as 'Internet' | 'Custom' | 'Do Not Advertise',
                            siteId: v === 'Custom' ? e.ce.id : '',
                          };
                        })
                      }
                    />
                    <Select
                      label="Origin Server Type"
                      value={originConfig(environment.origins[0]).type}
                      values={['Public DNS', 'Public IP', 'IP on Site', 'DNS on Site']}
                      onChange={(v) =>
                        edit((e) => {
                          e.origins[0].config = {
                            ...originConfig(e.origins[0]),
                            type: v as 'Public DNS' | 'Public IP' | 'IP on Site' | 'DNS on Site',
                            siteId: v.includes('on Site') ? e.ce.id : '',
                          };
                        })
                      }
                    />
                    <Field label="Origin Endpoint">
                      <input
                        value={environment.origins[0].endpoint}
                        onChange={(ev) =>
                          edit((e) => {
                            e.origins[0].endpoint = ev.target.value;
                          })
                        }
                      />
                    </Field>
                    <Field label="Origin Port">
                      <input
                        type="number"
                        min={1}
                        max={65535}
                        value={environment.origins[0].port}
                        onChange={(ev) => {
                          const port = Number(ev.target.value);
                          if (Number.isInteger(port) && port > 0 && port <= 65535)
                            edit((e) => {
                              e.origins[0].port = port;
                            });
                        }}
                      />
                    </Field>
                    <ToggleField
                      label="Attach Application Firewall"
                      value={environment.lb.wafId === environment.waf.id}
                      onChange={(v) =>
                        edit((e) => {
                          e.lb.wafId = v ? e.waf.id : '';
                        })
                      }
                    />
                    <Select
                      label="WAF Enforcement Mode"
                      value={environment.waf.mode}
                      values={['Monitoring', 'Blocking']}
                      onChange={(v) =>
                        edit((e) => {
                          e.waf.mode = v as 'Monitoring' | 'Blocking';
                        })
                      }
                    />
                    <ToggleField
                      label="AWS Origin Healthy"
                      value={environment.origins[0].healthy}
                      onChange={(v) =>
                        edit((e) => {
                          e.origins[0].healthy = v;
                        })
                      }
                    />
                    <ToggleField
                      label="Azure Origin Healthy"
                      value={environment.origins[1].healthy}
                      onChange={(v) =>
                        edit((e) => {
                          e.origins[1].healthy = v;
                        })
                      }
                    />
                    <ToggleField
                      label="Customer Edge Online"
                      value={environment.ce.online}
                      onChange={(v) =>
                        edit((e) => {
                          e.ce.online = v;
                        })
                      }
                    />
                  </Group>
                  {['header', 'negative', 'positive', 'zero-day'].includes(x) && (
                    <Group title="Service Policy — 로컬 규칙 모델">
                      <Select
                        label="Policy Mode"
                        value={environment.controls.policyMode}
                        values={[
                          'Disabled',
                          'Header allowlist',
                          'Negative enforcement',
                          'Positive enforcement',
                          'Exploit deny',
                        ]}
                        onChange={(v) => control('policyMode', v as Controls['policyMode'])}
                      />
                      {x === 'header' && (
                        <>
                          {text('headerName', 'Required Header Name')}
                          {text('headerValue', 'Required Header Value')}
                        </>
                      )}
                      {x === 'negative' && (
                        <>
                          {text('deniedCountry', 'Denied Country')}
                          {toggle('blockBadReputation', 'Block TOR / Spam reputation')}
                        </>
                      )}
                      {x === 'positive' && (
                        <>
                          {text('allowedCountry', 'Allowed Country')}
                          {text('allowedPath', 'Allowed Exact Path (GET)')}
                        </>
                      )}
                      {x === 'zero-day' && (
                        <p>
                          Exploit deny: POST /auth.php + x-demo-exploit: true 를 거부합니다.
                          가이드의 사용자 정의 규칙을 단순화한 로컬 패턴입니다.
                        </p>
                      )}
                    </Group>
                  )}
                  {x === 'route' && (
                    <Group title="Header-based Canary Route">
                      {toggle('canary', 'Enable Canary Route')}
                      {text('canaryHeader', 'Canary Header')}
                      {text('canaryValue', 'Canary Value')}
                      {toggle('rewriteLogin', 'Rewrite /login to /')}
                      {toggle('namespaceHeader', 'Add XC-Namespace Response Header')}
                      <ToggleField
                        label="Attach WAF to /login Route"
                        value={
                          !!environment.lb.config?.routes.some(
                            (r) =>
                              r.path === '/login' && r.enabled && r.wafId === environment.waf.id,
                          )
                        }
                        onChange={(v) =>
                          edit((e) => {
                            e.lb.config = {
                              ...lbConfig(e.lb),
                              routes: v
                                ? [
                                    {
                                      id: e.lb.id + '-login-route',
                                      name: 'login-green',
                                      type: 'Simple',
                                      method: 'ANY',
                                      match: 'Prefix',
                                      path: '/login',
                                      enabled: true,
                                      originId: e.origins[1].id,
                                      wafId: e.waf.id,
                                      responseCode: 200,
                                      responseBody: '',
                                      redirectUrl: '',
                                    },
                                  ]
                                : [],
                            };
                          })
                        }
                      />
                      <p>
                        일치하면 Azure, 그 외는 AWS. x-demo-release 응답 헤더에서 경로를 확인합니다.
                      </p>
                    </Group>
                  )}
                  {['api-lb', 'inventory', 'endpoint', 'discovery', 'advanced'].includes(x) && (
                    <Group title="API Inventory / Protection / Discovery">
                      <ToggleField
                        label="Enable API Protection on LB"
                        value={environment.lb.apiProtection}
                        onChange={(v) =>
                          edit((e) => {
                            e.lb.apiProtection = v;
                          })
                        }
                      />
                      {toggle('inventory', 'Inventory Fall-through Deny')}
                      {toggle('apiDeny', 'Endpoint Deny Rule')}
                      {text('deniedEndpoint', 'Denied API Endpoint')}
                      <ToggleField
                        label="API Discovery / LB"
                        value={
                          environment.controls.apiDiscovery && lbConfig(environment.lb).apiDiscovery
                        }
                        onChange={(v) =>
                          edit((e) => {
                            e.controls.apiDiscovery = v;
                            e.lb.config = { ...lbConfig(e.lb), apiDiscovery: v };
                          })
                        }
                      />
                      {x === 'discovery' &&
                        toggle('connector', 'BIG-IP Connector (synthetic telemetry)')}
                      <p>
                        Known inventory: {apiPaths.join(', ')}.{' '}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            download('training-openapi.json', {
                              openapi: '3.0.3',
                              info: { title: 'Synthetic Demo Bank', version: '1.0.0' },
                              paths: Object.fromEntries(
                                apiPaths.map((path) => [
                                  path,
                                  {
                                    get: {
                                      responses: { 200: { description: 'Synthetic response' } },
                                    },
                                  },
                                ]),
                              ),
                            })
                          }
                        >
                          <Download size={13} />
                          OpenAPI
                        </Button>
                      </p>
                    </Group>
                  )}
                  {['rate', 'zero-day'].includes(x) && (
                    <Group title="Rate Limiting — Burst Multiplier 1">
                      {toggle('rateLimit', 'Enable Rate Limiting')}
                      {number('rate', 'Number of Requests')}
                      {number('rateWindow', 'Period (seconds)')}
                      {x === 'rate' && (
                        <>
                          {text('ratePath', 'Limited Exact Path')}
                          <Select
                            label="Limited Method"
                            value={environment.controls.rateMethod}
                            values={['GET', 'POST', 'ANY']}
                            onChange={(v) => control('rateMethod', v as Controls['rateMethod'])}
                          />
                        </>
                      )}
                      <p>
                        {x === 'zero-day'
                          ? 'POST /auth.php 및 GET /ratelimit.php'
                          : '지정된 메서드·경로'}
                        만 제한합니다. 클라이언트 IP + fingerprint별 고정 시간 창을 사용합니다.
                      </p>
                    </Group>
                  )}
                  {[
                    'bot',
                    'bot-baseline',
                    'bot-flag',
                    'human-bot',
                    'bot-block',
                    'scan',
                    'scan-compare',
                    'advanced',
                  ].includes(x) && (
                    <Group title="Bot Defense — 합성 분류 입력">
                      <ToggleField
                        label="Enable Bot Defense on LB"
                        value={environment.lb.botDefense}
                        onChange={(v) =>
                          edit((e) => {
                            e.lb.botDefense = v;
                          })
                        }
                      />
                      <Select
                        label="Bot Mitigation Mode"
                        value={environment.controls.botMode}
                        values={['Disabled', 'Flag', 'Blocking']}
                        onChange={(v) => control('botMode', v as Controls['botMode'])}
                      />
                      {text('botPath', 'Protected Endpoint')}
                      {x === 'advanced' && text('botExtraPath', 'Contact Protected Endpoint')}
                      <Select
                        label="Protected Method"
                        value={environment.controls.botMethod}
                        values={['GET', 'POST', 'ANY']}
                        onChange={(v) => control('botMethod', v as Controls['botMethod'])}
                      />
                      {toggle('telemetry', 'Client Telemetry (synthetic)')}
                      <p>
                        Bot / Human-like bot 입력은 실제 탐지 엔진 대신 사용하는 시나리오입니다.
                        Human-like 모드는 동일 식별자의 11번째 요청부터 BadBot으로 분류합니다.
                      </p>
                    </Group>
                  )}
                  {x === 'malicious' && (
                    <Group title="Malicious User Detection">
                      {toggle('maliciousDetection', 'Malicious User Detection')}
                      {toggle('maliciousMitigation', 'Temporary Block Mitigation')}
                      <p>
                        동일 IP + fingerprint의 악성 요청이 3회에 도달하면 차단합니다. 실제 JA4
                        추출·JS challenge·CAPTCHA는 실행하지 않습니다.
                      </p>
                    </Group>
                  )}
                  {['ce', 'segments', 'failover', 'overlap'].includes(x) && (
                    <Group title="Multicloud Network — 로컬 연결 모델">
                      <p>
                        {environment.ce.name} · {environment.ce.region} · {environment.ce.address}
                      </p>
                      {x === 'segments' && (
                        <>
                          {toggle('segment', 'Attach DC Segment')}
                          {toggle('segmentPeer', 'Attach AWS Segment')}
                          {toggle('firewall', 'HTTP Allow / SSH Deny Firewall')}
                        </>
                      )}
                      {x === 'failover' && toggle('failover', 'AWS Priority / Azure Fallback')}
                      {x === 'overlap' && (
                        <>
                          {toggle('overlapVip', 'Azure CE VIP for Overlapping IPs')}
                          {toggle('firewall', 'HTTP Allow / SSH Deny Firewall')}
                        </>
                      )}
                      <p>
                        실제 터널·라우팅 테이블·패킷을 생성하지 않으며, HTTP 상태는 연결 모델의
                        결과를 표현합니다.
                      </p>
                    </Group>
                  )}
                  {lab.classId === 7 && (
                    <Group title="App Source / Local Pipeline">
                      <Field label="앱 manifest — 모의 코드 (JSON)">
                        <textarea
                          rows={12}
                          spellCheck={false}
                          value={environment.controls.source}
                          onChange={(ev) => control('source', ev.target.value)}
                        />
                      </Field>
                      <div className="training-pipeline">
                        {(['Build', 'Test', 'Deploy'] as const).map((action) => (
                          <Button
                            key={action}
                            variant="outline"
                            size="sm"
                            onClick={() => act(() => t.pipeline(lab.id, action), `${action} 완료`)}
                          >
                            {action}
                          </Button>
                        ))}
                        <p>
                          {environment.controls.artifact || 'No artifact'} ·{' '}
                          {environment.controls.pipeline.join(' → ') || 'Pipeline idle'}
                        </p>
                        <small>
                          Deploy는 WAF Blocking을 필수로 검사합니다. 실제 React 컴파일·AI 코드
                          생성·GitHub 배포가 아닌 JSON route 계약과 artifact 해시를 검증하는 모의
                          파이프라인입니다.
                        </small>
                      </div>
                    </Group>
                  )}
                  {['scan', 'scan-compare'].includes(x) && (
                    <Group title="Web App Scanning — 합성 보고서">
                      {toggle('scanProfile', 'Scan Profile Configured')}
                      <Select
                        label="Schedule (local model only)"
                        value={environment.controls.scanSchedule}
                        values={['Manual', 'Daily (simulated)']}
                        onChange={(v) => control('scanSchedule', v as Controls['scanSchedule'])}
                      />
                      <p>
                        스캔은 Run Scan을 누를 때만 실행됩니다. Daily는 설정 연습용이며 자동
                        실행되지 않습니다.
                      </p>
                      <Button
                        size="sm"
                        onClick={() =>
                          act(() => t.scan(lab.id), '모의 스캔 완료. 로그 / 보고서를 확인하세요.')
                        }
                      >
                        Run Scan
                      </Button>
                    </Group>
                  )}
                  <div className="training-actions">
                    <Button onClick={() => setTab('Test')}>
                      요청 / 검증으로 이동 <ArrowRight size={14} />
                    </Button>
                    <Button variant="outline" onClick={() => openConsole('HTTP Load Balancers')}>
                      콘솔에서 LB 편집
                    </Button>
                    <Button variant="outline" onClick={() => openConsole('App Firewall')}>
                      App Firewall
                    </Button>
                    {lab.classId === 6 && (
                      <Button variant="outline" onClick={() => openConsole('Connectivity')}>
                        Connectivity
                      </Button>
                    )}
                  </div>
                  <details className="training-solution">
                    <summary>설정이 어려우면: 정답 구성 보기</summary>
                    <p>
                      이 버튼은 설정 예시를 적용합니다. 완료 처리는 별도의 검증이 필요합니다. Class
                      7은 모의 Build/Test/Deploy, 스캔 실습은 모의 Scan도 실행합니다.
                    </p>
                    <pre>{referencePreview(environment, lab)}</pre>
                    <Button
                      variant="outline"
                      onClick={() =>
                        act(
                          () => t.solution(lab.id),
                          '정답 설정 적용. 기준 요청 기록과 결과 검증은 직접 실행하세요.',
                        )
                      }
                    >
                      정답 구성 적용
                    </Button>
                  </details>
                </>
              ) : (
                <div className="training-empty">먼저 실습 가이드에서 환경을 시작하세요.</div>
              )}
            </div>
          )}
          {tab === 'Test' && (
            <div className="training-pane">
              {environment && exists ? (
                <>
                  <div className="training-runbar">
                    <div>
                      <strong>01 · 기준 요청 기록</strong>
                      <p>실습 주제에 맞춘 기준 요청을 현재 환경에서 실행해 비교 자료를 남깁니다.</p>
                      {session.baseline && (
                        <small>
                          기준 응답: {session.baseline.codes.join(' / ')} ·{' '}
                          {new Date(session.baseline.at).toLocaleString()}
                        </small>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        act(() => t.baseline(lab.id), '이 실습의 기준 요청을 기록했습니다.')
                      }
                    >
                      기준 요청 실행
                    </Button>
                  </div>
                  <form
                    className="training-request"
                    onSubmit={(ev) => {
                      ev.preventDefault();
                      act(() => {
                        const parsedHeaders = JSON.parse(headers);
                        if (
                          typeof parsedHeaders !== 'object' ||
                          parsedHeaders === null ||
                          Array.isArray(parsedHeaders) ||
                          Object.values(parsedHeaders).some((v) => typeof v !== 'string')
                        )
                          throw new Error('Headers는 문자열 값의 JSON 객체여야 합니다.');
                        const parsedBody = JSON.parse(body);
                        for (let i = 0; i < repeat; i++)
                          t.probe(lab.id, { ...input, headers: parsedHeaders, body: parsedBody });
                      }, `${repeat}개 로컬 요청 실행 완료`);
                    }}
                  >
                    <h3>02 · Request Builder</h3>
                    <div className="training-fields">
                      <Select
                        label="HTTP Method"
                        value={input.method}
                        values={['GET', 'POST', 'PUT', 'DELETE']}
                        onChange={(method) => setInput({ ...input, method })}
                      />
                      <Field label="Request Path">
                        <input
                          value={input.path}
                          onChange={(ev) => setInput({ ...input, path: ev.target.value })}
                        />
                      </Field>
                      <Select
                        label="Scenario Input"
                        value={input.attack}
                        values={[
                          'None',
                          'SQL Injection',
                          'XSS',
                          'Bot',
                          'Human-like bot',
                          'Malicious user',
                          'Exploit',
                        ]}
                        onChange={(attack) =>
                          setInput({ ...input, attack: attack as RequestInput['attack'] })
                        }
                      />
                      <Field label="Client Fingerprint (JA4 demo)">
                        <input
                          value={input.identity}
                          onChange={(ev) => setInput({ ...input, identity: ev.target.value })}
                        />
                      </Field>
                      <Field label="Client IP (synthetic)">
                        <input
                          value={input.source}
                          onChange={(ev) => setInput({ ...input, source: ev.target.value })}
                        />
                      </Field>
                      <Select
                        label="Client Country"
                        value={input.country}
                        values={['South Korea', 'Fiji', 'United States', 'Japan']}
                        onChange={(country) => setInput({ ...input, country })}
                      />
                      <Select
                        label="IP Reputation"
                        value={input.reputation}
                        values={['Clean', 'TOR', 'Spam']}
                        onChange={(reputation) =>
                          setInput({
                            ...input,
                            reputation: reputation as RequestInput['reputation'],
                          })
                        }
                      />
                      <Select
                        label="Transport"
                        value={input.transport}
                        values={['HTTP', 'SSH']}
                        onChange={(transport) =>
                          setInput({ ...input, transport: transport as RequestInput['transport'] })
                        }
                      />
                      <Field label="Headers (JSON)">
                        <textarea
                          rows={3}
                          value={headers}
                          onChange={(ev) => setHeaders(ev.target.value)}
                        />
                      </Field>
                      <Field label="Body (JSON)">
                        <textarea
                          rows={3}
                          value={body}
                          onChange={(ev) => setBody(ev.target.value)}
                        />
                      </Field>
                      <Field label="Repeat Count">
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={repeat}
                          onChange={(ev) =>
                            setRepeat(Math.max(1, Math.min(20, Number(ev.target.value) || 1)))
                          }
                        />
                      </Field>
                    </div>
                    <div className="training-actions">
                      <Button type="submit">
                        <Play size={14} />
                        로컬 요청 실행
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          edit((e) => {
                            e.runtime.now += 61000;
                          })
                        }
                      >
                        모의 시간 +61초
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          edit((e) => {
                            e.runtime.buckets = {};
                            e.runtime.identities = {};
                          })
                        }
                      >
                        요청 카운터 초기화
                      </Button>
                    </div>
                  </form>
                  {environment.runtime.logs[0] && (
                    <div className="training-last-result">
                      <Badge tone={environment.runtime.logs[0].code >= 400 ? 'red' : 'green'}>
                        HTTP {environment.runtime.logs[0].code}
                      </Badge>
                      <strong>{environment.runtime.logs[0].action}</strong>
                      <span>{environment.runtime.logs[0].reason}</span>
                      <details>
                        <summary>응답 본문 / 헤더</summary>
                        <pre>
                          {JSON.stringify(
                            {
                              body: environment.runtime.logs[0].body,
                              headers: environment.runtime.logs[0].headers,
                            },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    </div>
                  )}
                  <div className="training-runbar">
                    <div>
                      <strong>03 · 현재 설정 검증</strong>
                      <p>
                        정상 요청과 실패 조건을 함께 검사합니다. 테스트는 설정을 자동 수정하지
                        않습니다.
                      </p>
                      <small>
                        장애 검사는 복제한 모델에서 수행하며 실제 저장된 CE·Origin 상태를
                        복구합니다.
                      </small>
                    </div>
                    <Button
                      onClick={() =>
                        act(
                          () => t.verify(lab.id),
                          '검증을 실행했습니다. 아래 PASS / FAIL을 확인하세요.',
                        )
                      }
                    >
                      <ShieldCheck size={15} />
                      현재 설정 검증
                    </Button>
                  </div>
                  {session.verification && (
                    <div className="training-verification">
                      <div>
                        <Badge tone={!current ? 'amber' : isComplete(session) ? 'green' : 'red'}>
                          {!current
                            ? '설정 변경됨 · 재검증 필요'
                            : isComplete(session)
                              ? 'PASS · 실습 완료'
                              : 'FAIL · 설정 확인 필요'}
                        </Badge>
                        <span>
                          {session.verification.checks.filter((c) => c.pass).length}/
                          {session.verification.checks.length} 항목 통과
                        </span>
                      </div>
                      {session.verification.checks.map((check, i) => (
                        <div className="training-check" key={`${check.name}-${i}`}>
                          <Badge tone={check.pass ? 'green' : 'red'}>
                            {check.pass ? 'PASS' : 'FAIL'}
                          </Badge>
                          <div>
                            <strong>{check.name}</strong>
                            <p>기대: {check.expected}</p>
                            <small>{check.actual}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="training-empty">환경 시작 또는 초기화가 필요합니다.</div>
              )}
            </div>
          )}
          {tab === 'Logs' && (
            <div className="training-pane">
              {environment ? (
                <>
                  <div className="training-actions">
                    <Select
                      label="Response Filter"
                      value={filter}
                      values={['All', '200', '403', '429', '503']}
                      onChange={setFilter}
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        download(`${lab.id}-evidence.json`, {
                          lab: lab.source,
                          baseline: session.baseline,
                          verification: session.verification,
                          runtime: environment.runtime,
                        })
                      }
                    >
                      <Download size={14} />
                      증거 JSON
                    </Button>
                    <Button variant="outline" onClick={() => openConsole('Security Events')}>
                      콘솔 Security Events
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        act(() => t.explain(lab.id), '현재 로그에 대한 로컬 설명을 생성했습니다.')
                      }
                    >
                      Explain (local)
                    </Button>
                  </div>
                  {environment.runtime.explanation && (
                    <div className="training-explanation">
                      <strong>AI Assistant 대체 · 로컬 템플릿</strong>
                      <p>{environment.runtime.explanation}</p>
                    </div>
                  )}
                  {environment.runtime.scan && (
                    <div className="training-scan">
                      <h3>모의 Web App Scan</h3>
                      <details>
                        <summary>
                          보호 전후 보고서 비교 ({environment.runtime.scanHistory?.length ?? 1}회)
                        </summary>
                        {environment.runtime.scanHistory?.map((scan, i) => (
                          <p key={i}>
                            Scan #{i + 1}: {scan.findings.filter((f) => !f.resolved).length} open /{' '}
                            {scan.findings.filter((f) => f.resolved).length} mitigated
                          </p>
                        ))}
                      </details>
                      <p>
                        현재 보호 설정을 기준으로 계산한 합성 결과입니다. 실제 취약점 스캐너 결과가
                        아닙니다.
                      </p>
                      {environment.runtime.scan.findings.map((f) => (
                        <div key={f.name}>
                          <Badge tone={f.resolved ? 'green' : 'red'}>
                            {f.resolved ? 'Mitigated' : 'Open'}
                          </Badge>
                          <strong>{f.name}</strong>
                          <span>{f.severity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!!environment.runtime.discovered.length && (
                    <div className="training-discovered">
                      <h3>Discovered / Shadow APIs</h3>
                      {environment.runtime.discovered.map((path) => (
                        <div key={path}>
                          <code>{path}</code>
                          <Badge tone="amber">Shadow</Badge>
                          <span>Demo risk {path.startsWith('/qrcode/') ? '90' : '70'}</span>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          download(`${lab.id}-discovered-openapi.json`, {
                            openapi: '3.0.3',
                            info: { title: 'Synthetic discovery', version: '1.0.0' },
                            paths: Object.fromEntries(
                              environment.runtime.discovered.map((p) => [
                                p,
                                {
                                  get: {
                                    responses: {
                                      200: { description: 'Observed synthetic response' },
                                    },
                                  },
                                },
                              ]),
                            ),
                          })
                        }
                      >
                        발견된 OpenAPI JSON
                      </Button>
                    </div>
                  )}
                  <div className="training-log-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Request</th>
                          <th>Status</th>
                          <th>Action</th>
                          <th>Origin</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {environment.runtime.logs
                          .filter((l) => filter === 'All' || String(l.code) === filter)
                          .map((log) => (
                            <tr key={log.id}>
                              <td>{new Date(log.at).toLocaleTimeString()}</td>
                              <td>
                                <small>{log.request.method}</small> {log.request.path}
                                <small>
                                  {log.request.identity} · {log.request.attack}
                                </small>
                              </td>
                              <td>
                                <Badge tone={log.code >= 400 ? 'red' : 'green'}>{log.code}</Badge>
                              </td>
                              <td>{log.action}</td>
                              <td>{log.origin}</td>
                              <td>
                                <button
                                  className="resource-link"
                                  onClick={() => setExpanded(expanded === log.id ? '' : log.id)}
                                >
                                  JSON
                                </button>
                                {expanded === log.id && <pre>{JSON.stringify(log, null, 2)}</pre>}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {!environment.runtime.logs.length && (
                      <div className="training-empty">
                        요청을 실행하면 증거가 여기에 기록됩니다.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="training-empty">실습을 시작하세요.</div>
              )}
            </div>
          )}
          {tab === 'Reference' && (
            <div className="training-pane training-reference">
              <h3>공식 가이드와 구현 범위</h3>
              <a href={lab.source} target="_blank" rel="noreferrer">
                {lab.source} <ExternalLink size={13} />
              </a>
              <p>
                이 화면의 설명은 원문의 학습 목표를 요약하고 로컬 환경에 맞춰 재구성했습니다. 실제
                UI 명칭은 가이드의 Console 버전과 현재 SaaS 버전에 따라 다를 수 있습니다.
              </p>
              <ul>
                <li>
                  LB·Origin·WAF·CE: 기존 콘솔의 같은 자원을 공유합니다. 콘솔 편집 결과도 다음 검증에
                  반영됩니다.
                </li>
                <li>
                  가이드 전용 정책·Bot profile·API 규칙·rate limiter·세그먼트는 Training Center의
                  단순화 모델입니다. 일반 Simulation Lab에는 이 추가 규칙이 적용되지 않습니다.
                </li>
                <li>
                  공식 실습의 실제 DNS·계정·공격 도구·SSH·BIG-IP·클라우드 배포는 실행하지 않습니다.
                  example.com과 문서용 IP만 데이터로 사용합니다.
                </li>
                <li>
                  모든 요청은 로컬 평가입니다. WAF는 선택한 공격 시나리오, Bot은 합성 분류 입력,
                  악성 사용자는 고정 임계값을 사용하며 실제 보안 엔진과 동일하지 않습니다.
                </li>
                <li>
                  Scan은 합성 보고서, Explain은 규칙 기반 설명, Class 7은 JSON 앱 manifest와 모의
                  파이프라인입니다.
                </li>
                <li>
                  검증 완료 후 설정을 바꾸면 완료 상태가 해제됩니다. 실습 초기화는 해당 실습의
                  자원과 기록만 교체합니다.
                </li>
              </ul>
              <h3>환경 JSON</h3>
              <Button
                variant="outline"
                disabled={!environment}
                onClick={() => environment && download(`${lab.id}-environment.json`, environment)}
              >
                로컬 환경 내려받기
              </Button>
            </div>
          )}
          {session && lab.id !== 'c1-lab1' && (
            <div className="training-bottom">
              <span>
                {session && isComplete(session)
                  ? '✓ 모든 현재 검증 통과'
                  : current
                    ? '검증 결과를 확인하세요'
                    : '설정 저장됨 · 검증으로 학습 결과 확인'}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setReset(true)}>
                <RotateCcw size={13} />이 실습 초기화
              </Button>
            </div>
          )}
        </section>
      </div>
      {matrix && (
        <section className="training-matrix">
          <div>
            <h2>34개 모델 자체 검증</h2>
            <Badge tone={matrix.every((m) => m.pass) ? 'green' : 'red'}>
              {matrix.filter((m) => m.pass).length}/34 PASS
            </Badge>
            <Button variant="ghost" onClick={() => setMatrix(undefined)}>
              닫기
            </Button>
          </div>
          <p>
            격리된 메모리에서 정답 설정으로 각 모델의 양성·음성 테스트를 실행합니다. 학습 진도나
            콘솔 자원을 변경하지 않습니다.
          </p>
          <div>
            {matrix.map((m) => (
              <details key={m.id}>
                <summary>
                  <Badge tone={m.pass ? 'green' : 'red'}>{m.pass ? 'PASS' : 'FAIL'}</Badge>
                  {m.id} · {m.title}
                </summary>
                {m.checks.map((check, i) => (
                  <p key={i}>
                    {check.pass ? '✓' : '✗'} {check.name}: {check.actual}
                  </p>
                ))}
              </details>
            ))}
          </div>
        </section>
      )}
      <Dialog
        open={reset}
        onOpenChange={setReset}
        title="이 실습 환경 초기화"
        description={`${lab.id}의 설정·요청·검증 기록을 지우고 초기 상태로 되돌립니다. 다른 실습과 데모 자원은 유지됩니다.`}
      >
        <div className="training-actions">
          <Button variant="outline" onClick={() => setReset(false)}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              act(() => t.resetLab(lab.id), '실습 환경 초기화 완료');
              setReset(false);
            }}
          >
            실습 초기화
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
