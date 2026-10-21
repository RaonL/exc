import { useState } from 'react';
import { useConsole } from '../store';
import { useApiSecurity, settingsFor } from './store';
import { defaults, type Endpoint, type Probe } from './model';
import { sources } from './ApiSettingsFields';
import { LBForm } from '../components/LoadBalancerEditor';
import { ApiResourceEditor } from './ApiResources';
import { Badge, Card } from '../components/common';
import { Button } from '../components/ui/button';
import { Field } from '../components/form-fields';
import { lbConfig } from '../lib/config';
import figures from '../../public/references/api-quickstart/index.json';
import { DiscoveryGuide } from './DiscoveryGuide';
const courses = [
  {
    title: '① Setting Up API Discovery',
    source: sources.discovery,
    slug: 'api-security',
    steps: [
      [
        'HTTP Load Balancer 찾기',
        'Manage → Load Balancers → HTTP Load Balancers. 전용 더미 환경 준비 후 LB를 선택합니다.',
      ],
      [
        'API Discovery 활성화',
        'Edit Configuration → API Protection → API Discovery Enable. 2xx 학습·3xx 옵션과 Purge Duration을 지정하고 저장합니다.',
      ],
      [
        'Code Scanning 연결',
        'Manage → API Management → Code Base Integration에서 shop-code를 생성합니다. LB API Repositories에 integration과 demo-org/shop을 연결합니다.',
      ],
      [
        'API Crawling 연결',
        'LB → API Protection → API Crawling Enable → Domains to Crawl에 LB 도메인과 demo-user/demo-only를 추가하고 Apply 후 LB를 저장합니다.',
      ],
      [
        '검색 결과 비교',
        'Run Traffic/Code/API Crawling 더미 요청을 실행하고 API Endpoints의 Discovery Source를 비교합니다. 실제 2~4시간 대기는 모의 실행으로 대체합니다.',
      ],
    ],
  },
  {
    title: '② Setting Up API Protection',
    source: sources.protection,
    slug: 'api-protection',
    steps: [
      [
        'OpenAPI 파일 준비·업로드',
        'Manage → Files → OpenAPI Files → Add OpenAPI File. shop-openapi 이름으로 제공 JSON을 업로드하고 저장합니다.',
      ],
      [
        'API Definition 생성',
        'Manage → API Management → API Definition → Add API Definition. shop-definition에 shop-openapi 파일을 선택하고 저장합니다.',
      ],
      [
        'HTTP LB에 정의 연결',
        'Manage Configuration → Edit Configuration → API Protection → API Definition Enable → shop-definition 선택. Validation은 초기 Disabled입니다.',
      ],
      [
        'API Inventory 검증',
        'Validation API Inventory → Configure → Request Validate / Report. Apply 후 LB 저장. POST /api/orders에 quantity 문자열을 보내 200 Detected를 확인합니다.',
      ],
      [
        'Block·Custom List·Fall Through 비교',
        '같은 폼에서 Block으로 바꾼 뒤 403 Blocked를 비교합니다. Custom List에 POST /api/orders를 추가하고 Fall Through Custom의 GET /api/unknown Block 규칙을 별도로 저장해 비교합니다.',
      ],
    ],
  },
  {
    title: '③ Automate API Security Testing',
    source: sources.testing,
    slug: 'automate-sec-test',
    steps: [
      [
        'API Testing 활성화',
        'HTTP LB → API Protection → API Testing Enable. 정의 파일을 연결해야 로컬 테스트 대상을 만들 수 있습니다.',
      ],
      [
        'Testing Environment 생성',
        'Testing Environments → Add Item. LB 도메인만 선택할 수 있습니다. Use Destructive Methods는 더미 DELETE/PUT 평가 여부를 제어합니다.',
      ],
      [
        'Credentials 추가',
        'Credential Name user-one, user-two, administrator. API Key 타입, Key x-demo-key, dummy Value demo-only. 역할은 Standard·Standard·Admin으로 저장합니다.',
      ],
      [
        'Header·일정 저장',
        'Custom Header api-lab, Frequency of Test Every Week(기본값). Apply 후 Save HTTP Load Balancer. 모의 시계로 예약 실행을 진행합니다.',
      ],
      [
        'Last Tested·Security Posture 확인',
        'Run API Testing (모의) → API Endpoints에서 Last Tested를 켜고 엔드포인트를 열어 Security Posture·Source API Testing·상세 로그를 확인합니다.',
      ],
    ],
  },
];
export function ApiWorkbench() {
  const core = useConsole(),
    s = useApiSecurity(),
    [course, setCourse] = useState(0),
    [step, setStep] = useState(0),
    [editor, setEditor] = useState(false),
    [guidedEditor, setGuidedEditor] = useState(false),
    [resource, setResource] = useState<'file' | 'definition' | 'integration' | null>(null),
    [error, err] = useState(''),
    [message, msg] = useState(''),
    [tab, setTab] = useState('API Endpoints'),
    [showTested, setShowTested] = useState(false),
    [detail, setDetail] = useState<Endpoint | null>(null),
    [path, setPath] = useState('/api/orders'),
    [method, setMethod] = useState('POST'),
    [body, setBody] = useState('{"quantity":"wrong"}'),
    [response, setResponse] = useState('{"id":"order-1"}'),
    [requestHeaders, setRequestHeaders] = useState('{}'),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('All'),
    [includeRedirect, setIncludeRedirect] = useState(false);
  const lbs = core.lbs.filter((l) => l.namespace === core.namespace),
    lb = lbs.find((l) => l.id === s.selectedLbId) ?? lbs[0],
    c = settingsFor(lb),
    spec = s.specFor(c.definitionId),
    logs = s.logs.filter((l) => l.lbId === lb?.id),
    run = s.runs.find((r) => r.lbId === lb?.id),
    active = courses[course];
  const act = (fn: () => void) => {
    try {
      fn();
      err('');
    } catch (e) {
      err(String(e));
      msg('');
    }
  };
  const fixture = () => {
    const ns = 'api-quickstart';
    const id = 'api-quickstart-lb';
    if (!core.lbs.some((l) => l.id === id)) {
      core.saveOrigin({
        id: 'api-quickstart-origin',
        namespace: ns,
        name: 'shop-origin',
        endpoint: '192.0.2.50',
        port: 80,
        healthy: true,
      });
      core.saveLb({
        id,
        namespace: ns,
        name: 'shop-lb',
        domains: ['shop.example.test'],
        protocol: 'HTTPS',
        originId: 'api-quickstart-origin',
        wafId: '',
        apiProtection: false,
        botDefense: false,
        ddosProtection: false,
        requests: 0,
        createdAt: new Date().toISOString(),
        config: { ...lbConfig(), apiDiscovery: false, apiSecurity: defaults() },
      });
    }
    useConsole.setState({
      namespaces: [...new Set([...useConsole.getState().namespaces, ns])],
      namespace: ns,
    });
    useApiSecurity.setState({ selectedLbId: id });
    msg('LB와 Origin만 준비했습니다. API 설정은 가이드대로 직접 입력하세요.');
  };
  const probe = (q: Probe) => {
    if (!lb) throw Error('Select HTTP Load Balancer.');
    const r = s.probe(lb, { ...q, domain: lb.domains[0] });
    const event = {
      id: r.id,
      namespace: lb.namespace,
      timestamp: new Date(r.at).toISOString(),
      scenario: 'API Schema Violation' as const,
      lbId: lb.id,
      source: '192.0.2.10',
      country: 'South Korea',
      path: q.path,
      method: q.method,
      severity: 'Info' as const,
      action: r.action,
      count: 1,
      responseCode: r.code,
      reason: r.reason,
      evaluationTrace: r.trace,
      generatedBy: 'console-request' as const,
    };
    useConsole.setState((state) => ({ events: [event, ...state.events].slice(0, 1000) }));
    msg(`${r.code} / ${r.action} · ${r.reason}`);
  };
  const endpoints = [...s.endpoints.filter((e) => e.lbId === lb?.id)];
  if (lb && spec)
    for (const [path, ops] of Object.entries(spec.paths))
      for (const method of Object.keys(ops))
        if (!endpoints.some((e) => e.path === path && e.method === method.toUpperCase()))
          endpoints.push({
            lbId: lb.id,
            path,
            method: method.toUpperCase(),
            sources: ['OpenAPI'],
            lastSeen: 0,
            calls: 0,
          });
  const isInventory = (e: Endpoint) =>
      Object.keys(spec?.paths ?? {}).some(
        (p) =>
          p.split('/').length === e.path.split('/').length &&
          p.split('/').every((seg, i) => /^\{.+\}$/.test(seg) || seg === e.path.split('/')[i]),
      ),
    filtered = endpoints.filter(
      (e) =>
        e.path.toLowerCase().includes(query.toLowerCase()) &&
        (category === 'All' || (category === 'Inventory' ? isInventory(e) : !isInventory(e))),
    );
  const stageChecks =
    course === 0
      ? [
          !!lb,
          c.discovery,
          !!c.integrationId && c.repositories.length > 0,
          c.crawling && c.crawlDomains.length > 0,
          endpoints.some((e) => e.sources.includes('Code')) &&
            endpoints.some((e) => e.sources.includes('API Crawling')),
        ]
      : course === 1
        ? [
            s.files.some((f) => f.namespace === core.namespace),
            !!spec,
            !!c.definitionId,
            c.validation !== 'Disabled' && logs.some((l) => l.action === 'Detected'),
            logs.some((l) => l.action === 'Blocked'),
          ]
        : [
            c.testing,
            c.environments.length > 0,
            c.environments.some((e) => e.credentials.length >= 3),
            !!c.customHeader,
            !!run,
          ];
  return (
    <div className="api-workbench">
      <header className="api-toolbar">
        <div>
          <h1>API Security Quickstarts</h1>
          <p>비공식 학습용 시뮬레이터 · 실제 F5 탐지 결과 아님 · 외부 요청 0</p>
        </div>
        <Button variant="outline" onClick={fixture}>
          실습 더미 환경 준비
        </Button>
      </header>
      <nav className="api-course-tabs" aria-label="API Quickstart courses">
        {courses.map((v, i) => (
          <Button
            key={v.slug}
            variant={course === i ? 'default' : 'outline'}
            onClick={() => {
              setCourse(i);
              setStep(0);
            }}
          >
            {v.title}
          </Button>
        ))}
      </nav>
      <section className="api-walkthrough">
        <nav aria-label="Quickstart steps">
          {active.steps.map(([title], i) => (
            <button key={title} className={step === i ? 'active' : ''} onClick={() => setStep(i)}>
              <span>{i + 1}</span>
              {title}
              {stageChecks[i] ? ' ✓' : ''}
            </button>
          ))}
        </nav>
        <div>
          <h2>
            {step + 1}. {active.steps[step][0]}
          </h2>
          <p>{active.steps[step][1]}</p>
          {course === 0 && <DiscoveryGuide step={step} ready={!!lb}
            locate={() => {
              if (step === 0) fixture();
              else if (step === 2) setResource('integration');
              else if (step === 4) {
                setTab('Request Lab');
                requestAnimationFrame(() => document.querySelector('[aria-label="Method"]')?.scrollIntoView({ block: 'center' }));
              } else { setGuidedEditor(true); setEditor(true); }
            }}
            repository={() => { setGuidedEditor(true); setEditor(true); }}
            sample={() => {
              setMethod('GET'); setPath('/api/discovery-check'); setBody('{}');
              setRequestHeaders('{}'); setResponse('{}'); setIncludeRedirect(false); setTab('Request Lab');
              requestAnimationFrame(() => document.querySelector('[aria-label="Method"]')?.scrollIntoView({ block: 'center' }));
            }} />}
          <p>
            저장된 설정 검사:{' '}
            <Badge tone={stageChecks[step] ? 'green' : 'amber'}>
              {stageChecks[step] ? '조건 충족' : '설정 또는 실행 필요'}
            </Badge>
          </p>
          <a href={active.source} target="_blank" rel="noreferrer">
            공식 원문 ↗
          </a>
          <div className="api-toolbar">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
              이전
            </Button>
            <Button disabled={step === 4} onClick={() => setStep(step + 1)}>
              다음 설정 위치 →
            </Button>
          </div>
          <details>
            <summary>
              공식 스크린샷 전체 비교 ({figures.filter((f) => f.guide === active.slug).length}장)
            </summary>
            <p>
              원문 정적 캡처입니다. 아래 실습 결과와 구분합니다. 필드 배치가 개정 시점에 따라 다를
              수 있습니다.
            </p>
            <div className="api-figure-list">
              {figures
                .filter((f) => f.guide === active.slug)
                .map((f) => (
                  <figure key={f.file}>
                    <a href={f.file} target="_blank" rel="noreferrer">
                      <img src={f.file} alt={f.alt} loading="lazy" />
                    </a>
                    <figcaption>
                      {f.figure}. {f.alt} ·{' '}
                      <a href={f.url} target="_blank" rel="noreferrer">
                        F5 원본
                      </a>
                    </figcaption>
                  </figure>
                ))}
            </div>
          </details>
        </div>
      </section>
      <section className="api-toolbar">
        <Field label="HTTP Load Balancer">
          <select
            value={lb?.id ?? ''}
            onChange={(e) => useApiSecurity.setState({ selectedLbId: e.target.value })}
          >
            <option value="">Select item</option>
            {lbs.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} · {l.namespace}
              </option>
            ))}
          </select>
        </Field>
        <Button disabled={!lb} onClick={() => { setGuidedEditor(false); setEditor(true); }}>
          Manage Configuration
        </Button>
        <Button variant="outline" onClick={() => setResource('integration')}>
          Add Code Base Integration
        </Button>
        <Button variant="outline" onClick={() => setResource('file')}>
          Add OpenAPI File
        </Button>
        <Button variant="outline" onClick={() => setResource('definition')}>
          Add API Definition
        </Button>
      </section>
      {error && (
        <div className="training-error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="training-message" role="status">
          {message}
        </div>
      )}
      {lb && (
        <>
          <div className="api-toolbar">
            <Button
              variant="outline"
              onClick={() =>
                act(() => {
                  s.discover(lb, 'Code');
                  msg('Code discovery completed · dummy organization repository fixture');
                })
              }
            >
              Run Code Discovery (모의)
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                act(() => {
                  s.discover(lb, 'API Crawling');
                  msg('API Crawling completed · dummy endpoint');
                })
              }
            >
              Run API Crawling (모의)
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                act(() => {
                  s.run(lb);
                  msg('API Testing 모의 실행 완료. Last Tested와 Security Posture를 확인하세요.');
                })
              }
            >
              Run API Testing (모의)
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                act(() => {
                  s.advance([lb], 7);
                  msg('모의 시계 +7일 · 예약 실행 평가');
                })
              }
            >
              모의 시계 +7일
            </Button>
            <Button variant="ghost" onClick={() => act(() => s.purge(lb))}>
              Purge Inactive APIs
            </Button>
            <small>Simulated clock: {new Date(s.clock).toLocaleString()}</small>
          </div>
          <div className="tabs">
            {['API Endpoints', 'Request Lab', 'Logs'].map((v) => (
              <button key={v} className={tab === v ? 'active' : ''} onClick={() => setTab(v)}>
                {v}
              </button>
            ))}
          </div>
          {tab === 'API Endpoints' && (
            <>
              <div className="api-metrics">
                <Card title="Risk Score">
                  <strong>
                    {run ? `${run.checks.filter((x) => x.outcome === 'Open').length} Open` : 'N/A'}
                  </strong>
                  <p>로컬 fixture 위험 수 · 실제 F5 risk score 아님</p>
                </Card>
                <Card title="API Classification">
                  <p>
                    Inventory {endpoints.filter(isInventory).length} · Discovered{' '}
                    {s.endpoints.filter((e) => e.lbId === lb.id).length} · Shadow{' '}
                    {endpoints.filter((e) => !isInventory(e)).length}
                  </p>
                </Card>
                <Card title="API Auth">
                  <p>
                    Standard{' '}
                    {c.environments[0]?.credentials.filter((x) => x.role === 'Standard').length ??
                      0}{' '}
                    · Admin{' '}
                    {c.environments[0]?.credentials.filter((x) => x.role === 'Admin').length ?? 0}
                  </p>
                  <p>더미 테스트 자격 증명</p>
                </Card>
              </div>
              <Card>
                <div className="api-toolbar">
                  <input
                    aria-label="Search API endpoints"
                    placeholder="Search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <select
                    aria-label="API Category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option>All</option>
                    <option>Inventory</option>
                    <option>Shadow</option>
                  </select>
                  <Field label="⚙ Last Tested">
                    <input
                      type="checkbox"
                      checked={showTested}
                      onChange={(e) => setShowTested(e.target.checked)}
                    />
                  </Field>
                  <span>
                    API Definition:{' '}
                    {s.definitions.find((d) => d.id === c.definitionId)?.name ?? 'Not configured'}
                  </span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>API Endpoint</th>
                        <th>Method</th>
                        <th>API Category</th>
                        <th>Discovery Source</th>
                        <th>API Calls</th>
                        {showTested && <th>Last Tested</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((e) => (
                        <tr key={e.method + e.path}>
                          <td>
                            <button className="resource-link" onClick={() => setDetail(e)}>
                              {e.path}
                            </button>
                          </td>
                          <td>{e.method}</td>
                          <td>{isInventory(e) ? 'Inventory' : 'Shadow'}</td>
                          <td>{e.sources.join(', ')}</td>
                          <td>{e.calls}</td>
                          {showTested && (
                            <td>
                              {run?.checks.some((x) => x.path === e.path && x.method === e.method)
                                ? new Date(run.at).toLocaleString()
                                : 'N/A'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!filtered.length && (
                  <p className="api-empty">
                    No API endpoints. Enable discovery, save, then send a local request.
                  </p>
                )}
              </Card>
            </>
          )}
          {tab === 'Request Lab' && (
            <Card title="Sample API Request · 모의 요청">
              <div className="api-probe-grid">
                <Field label="Method">
                  <select
                    aria-label="Method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  >
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Request Path">
                  <input value={path} onChange={(e) => setPath(e.target.value)} />
                </Field>
                <Field label="Request Headers JSON">
                  <textarea
                    value={requestHeaders}
                    onChange={(e) => setRequestHeaders(e.target.value)}
                  />
                </Field>
                <Field label="Request Body JSON">
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} />
                </Field>
                <Field label="Dummy Response Body JSON">
                  <textarea value={response} onChange={(e) => setResponse(e.target.value)} />
                </Field>
                <Field label="Redirect response 302">
                  <input
                    type="checkbox"
                    checked={includeRedirect}
                    onChange={(e) => setIncludeRedirect(e.target.checked)}
                  />
                </Field>
              </div>
              <Button
                onClick={() =>
                  act(() => {
                    if (!path.startsWith('/') || path.startsWith('//'))
                      throw Error('Local request path required.');
                    probe({
                      path,
                      method,
                      headers: JSON.parse(requestHeaders),
                      body: body ? JSON.parse(body) : undefined,
                      responseBody: response ? JSON.parse(response) : undefined,
                      responseCode: includeRedirect ? 302 : 200,
                    });
                  })
                }
              >
                Run Sample API Request
              </Button>
              <p>
                예제: POST /api/orders body {`{"quantity":"wrong"}`} → Report 200 Detected / Block
                403. 정상값 quantity:2 → 200. GET /api/orders?limit=wrong는 Query Parameters 검사
                예제입니다.
              </p>
              {logs[0] && <pre>{logs[0].trace.join('\n')}</pre>}
            </Card>
          )}
          {tab === 'Logs' && (
            <Card title="API evaluation logs / API Testing">
              <p>
                과거 로그는 당시 설정 스냅샷을 유지합니다. 현재 설정과 테스트 결과가 다르면 다시
                실행하세요.
              </p>
              {run && (
                <>
                  <p>
                    {run.fingerprint === JSON.stringify(c)
                      ? 'Current saved configuration'
                      : 'Stale result · 설정 변경 후 재실행 필요'}
                  </p>
                  <pre>{run.trace.join('\n')}</pre>
                </>
              )}
              {logs.map((l) => (
                <details key={l.id}>
                  <summary>
                    {new Date(l.at).toLocaleString()} · {l.method} {l.path} · {l.code} {l.action}
                  </summary>
                  <pre>{l.trace.join('\n')}</pre>
                </details>
              ))}
            </Card>
          )}
        </>
      )}
      {detail && (
        <aside
          className="api-endpoint-drawer"
          role="dialog"
          aria-modal="false"
          aria-label="Endpoint Details"
        >
          <header className="api-toolbar">
            <h2>Endpoint Details</h2>
            <Button variant="ghost" onClick={() => setDetail(null)}>
              Close Endpoint Details
            </Button>
          </header>
          <p>
            {detail.method} {detail.path}
          </p>
          <p>Discovery Source: {detail.sources.join(', ')}</p>
          <h3>Security Posture</h3>
          <p>Source: API Testing · 모의 테스트 결과</p>
          {run?.checks
            .filter((x) => x.path === detail.path && x.method === detail.method)
            .map((x, i) => (
              <article key={i}>
                <h4>{x.name}</h4>
                <Badge tone={x.outcome === 'Open' ? 'amber' : 'green'}>{x.outcome}</Badge>
                <p>{x.reason}</p>
                <p>
                  Remediation: 애플리케이션의 서버 측 권한 검사와 API 스키마를 검토하세요. WAF
                  스키마 차단만으로 권한 취약점 해결을 증명하지 않습니다.
                </p>
              </article>
            ))}
          {!run && <p>N/A · 저장한 설정으로 Run API Testing을 실행하세요.</p>}
        </aside>
      )}
      {editor && lb && <LBForm initial={lb} viewOnly={!guidedEditor} initialSection={guidedEditor ? 'api' : undefined} close={() => setEditor(false)} notify={msg} />}{' '}
      {resource && <ApiResourceEditor kind={resource} close={() => setResource(null)} />}
      <p className="api-limitations">
        공식 화면의 학습용 부분 재현입니다. OpenAPI 검증은 3.0.x JSON 인라인 schema의
        type/required/enum/range/length/object/array만 지원합니다. 실제 SCM·크롤러·F5 보안 엔진·예약
        서비스·Blindfold 암호화는 실행하지 않습니다. 실제 토큰을 입력하지 마세요.
      </p>
    </div>
  );
}
