import { useState } from 'react';
import type { LB } from '../types';
import { useConsole } from '../store';
import { useApiSecurity, settingsFor } from './store';
import { buildApiDashboard, sensitiveTag, type DashboardRow } from './dashboard';
import { Card } from '../components/common';
import { Button } from '../components/ui/button';
import { ApiResourceEditor } from './ApiResources';
import { EndpointGraph } from './EndpointGraph';
import { LBForm } from '../components/LoadBalancerEditor';

function download(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Ranking({
  title,
  items,
  empty,
}: {
  title: string;
  items: { name: string; count: number }[];
  empty: string;
}) {
  const max = Math.max(1, ...items.map((x) => x.count));
  return (
    <Card title={title} className="api-summary-card">
      {items.length ? (
        items.slice(0, 4).map((item) => (
          <div className="api-ranking" key={item.name}>
            <div>
              <span title={item.name}>{item.name}</span>
              <strong>{item.count}</strong>
            </div>
            <div className="api-ranking-track">
              <i style={{ width: `${(100 * item.count) / max}%` }} />
            </div>
          </div>
        ))
      ) : (
        <p className="api-no-data">{empty}</p>
      )}
    </Card>
  );
}
const colors = ['#5b8cff', '#1cc58b', '#ffc64c', '#ff922d', '#ff5151'];

export function ApiDashboardPage() {
  const core = useConsole(),
    s = useApiSecurity();
  const lbs = core.lbs.filter((l) => l.namespace === core.namespace);
  const lb = lbs.find((l) => l.id === s.selectedLbId) ?? lbs[0];
  return (
    <div className="api-dashboard-page">
      <div className="api-toolbar">
        <h1>API Endpoints</h1>
        <label>
          HTTP Load Balancer{' '}
          <select
            aria-label="Dashboard HTTP Load Balancer"
            value={lb?.id ?? ''}
            onChange={(e) => useApiSecurity.setState({ selectedLbId: e.target.value })}
          >
            {lbs.map((l) => (
              <option value={l.id} key={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          onClick={() => core.navigate('Web App & API Protection', 'API Quickstarts')}
        >
          실습·모의 요청으로 이동
        </Button>
      </div>
      {lb ? (
        <ApiDashboard key={lb.id} lb={lb} />
      ) : (
        <p>현재 Namespace에 HTTP LB가 없습니다. API Quickstarts에서 실습 환경을 준비하세요.</p>
      )}
    </div>
  );
}

export function ApiDashboard({ lb }: { lb: LB }) {
  const s = useApiSecurity();
  const [range, setRange] = useState('0.08333333333333333'),
    [domain, setDomain] = useState('All Domains');
  const [summary, showSummary] = useState(true),
    [filters, showFilters] = useState(true);
  const [view, setView] = useState('Table'),
    [query, setQuery] = useState(''),
    [method, setMethod] = useState('All');
  const [categories, setCategories] = useState(['Inventory', 'Discovered', 'Shadow', 'Observed']);
  const [archiveView, setArchiveView] = useState(false),
    [page, setPage] = useState(0),
    [size, setSize] = useState(10);
  const [showTested, setShowTested] = useState(false),
    [detail, setDetail] = useState<DashboardRow | null>(null);
  const [schemaEditor, setSchemaEditor] = useState(false),
    [configEditor, setConfigEditor] = useState(false);
  const [updated, setUpdated] = useState(Date.now());
  const [selected, setSelected] = useState<string[]>([]);
  const archiveKey = `f5-xc-api-dashboard-archive:${lb.id}`;
  const [archived, setArchived] = useState<Record<string, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(archiveKey) ?? '{}');
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch {
      return {};
    }
  });
  const c = settingsFor(lb),
    spec = s.specFor(c.definitionId);
  const since = range === 'All time' ? 0 : s.clock - Number(range) * 3600000;
  const definition = s.definitions.find((d) => d.id === c.definitionId);
  const file = s.files.find((f) => f.id === definition?.fileIds[0]);
  const logs = s.logs.filter(
    (l) => domain === 'All Domains' || (l.domain ?? lb.domains[0]) === domain,
  );
  const data = buildApiDashboard(lb.id, spec, s.endpoints, logs, s.runs, since);
  const filtered = data.rows.filter(
    (r) =>
      !!archived[r.key] === archiveView &&
      r.categories.some((v) => categories.includes(v)) &&
      (method === 'All' || r.method === method) &&
      `${r.path} ${r.method} ${r.sources.join(' ')} ${r.sensitive.join(' ')} ${r.auth}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / size)),
    current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * size, (current + 1) * size);
  const rank = (rows: DashboardRow[], value: (r: DashboardRow) => number) =>
    rows
      .map((r) => ({ name: `${r.method} ${r.path}`, count: value(r) }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);
  const sensitivity = new Map<string, number>();
    data.rows.forEach((r) =>
    r.sensitive.map(sensitiveTag).forEach((v) => sensitivity.set(v, (sensitivity.get(v) ?? 0) + 1)),
  );
  let angle = 0;
  const segments = data.statuses.map((x, i) => {
    const start = angle;
    angle += data.total ? (x.count / data.total) * 360 : 0;
    return `${colors[i]} ${start}deg ${angle}deg`;
  });
  const archive = (row: DashboardRow) => {
    const next = { ...archived, [row.key]: !archived[row.key] };
    setArchived(next);
    localStorage.setItem(archiveKey, JSON.stringify(next));
  };
  const csv = () => {
    const cols = [
      'API Endpoint',
      'Method',
      'Sensitive Data',
      'Threat Level',
      'Authentication State',
      'API Category',
      'Discovery Source',
      'Risk Score',
      'Schema Status',
      'Last Updated',
      'API Calls',
      'Last Tested',
    ];
    const values = filtered.map((r) => [
      r.path,
      r.method,
      r.sensitive.join(';'),
      r.threat,
      r.auth,
      r.categories.join(';'),
      r.sources.join(';'),
      r.risk ?? '',
      r.schemaStatus,
      r.lastActivity ? new Date(r.lastActivity).toISOString() : '',
      r.calls,
      r.lastTested ? new Date(r.lastTested).toISOString() : '',
    ]);
    const cell = (x: unknown) =>
      '"' +
      String(x)
        .replace(/^([=+@-])/, '\t$1')
        .replaceAll('"', '""') +
      '"';
    download(
      'api-endpoints.csv',
      [cols, ...values].map((row) => row.map(cell).join(',')).join('\r\n'),
      'text/csv;charset=utf-8',
    );
  };
  return (
    <section className="api-console-dashboard" aria-label="API Endpoints 대시보드">
      <div className="api-dash-heading">
        <Button variant="ghost" onClick={() => setConfigEditor(true)}>
          Manage Configuration
        </Button>
        <div className="api-toolbar">
          <select
            aria-label="Dashboard Domains"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          >
            <option>All Domains</option>
            {lb.domains.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="Dashboard time range"
            value={range}
            onChange={(e) => {
              setRange(e.target.value);
              setPage(0);
            }}
          >
            <option value="0.08333333333333333">Last 5 minutes</option>
            <option value="All time">All time</option>
            <option value="1">Last 1 hr</option>
            <option value="24">Last 24 hr</option>
            <option value="168">Last 7 days</option>
          </select>
          <Button variant="ghost" onClick={() => setUpdated(Date.now())}>
            ↻ Refresh
          </Button>
          <Button variant="ghost" onClick={() => showSummary(!summary)}>
            {summary ? 'Hide Summary' : 'Show Summary'}
          </Button>
        </div>
      </div>
      <div className="api-category-legend">
        {['Inventory', 'Discovered', 'Shadow', ...(data.rows.some(r=>r.categories.includes('Observed'))?['Observed']:[])].map((name) => (
          <label key={name}>
            <input
              type="checkbox"
              checked={categories.includes(name)}
              onChange={(e) => {
                setCategories(
                  e.target.checked ? [...categories, name] : categories.filter((x) => x !== name),
                );
                setPage(0);
              }}
            />
            {name}: {data.rows.filter((r) => r.categories.includes(name)).length}
          </label>
        ))}
      </div>
      {summary && (
        <div className="api-summary-grid">
          <Ranking
            title="Top Attacked APIs ⓘ"
            items={rank(data.rows, (r) => r.attacks)}
            empty="No detected / blocked requests"
          />
          <Ranking
            title="Top Sensitive Data ⓘ"
            items={[...sensitivity]
              .map(([name, count]) => ({ name, count }))
              .sort((a, b) => b.count - a.count)}
            empty="No classified fields"
          />
          <Card title="Total API Calls ⓘ" className="api-summary-card">
            <div className="api-call-summary">
              <ul>
                {data.statuses.map((x, i) => (
                  <li key={x.name}>
                    <i style={{ background: colors[i] }} />
                    {x.name}
                    <strong>{x.count}</strong>
                  </li>
                ))}
              </ul>
              <div
                className="api-donut"
                role="img"
                aria-label={`Total API Calls ${data.total}; ${data.statuses.map((x) => `${x.name}: ${x.count}`).join(', ')}`}
                style={{
                  background: data.total ? `conic-gradient(${segments.join(',')})` : '#e5e9f2',
                }}
              >
                <strong>{data.total}</strong>
              </div>
            </div>
          </Card>
          <Ranking
            title="Most Active APIs ⓘ"
            items={rank(data.rows, (r) => r.calls)}
            empty="Run a sample API request"
          />
        </div>
      )}
      <div className="api-dash-actions">
        <div className="api-view-toggle">
          {['Table', 'Graph'].map((v) => (
            <Button variant={view === v ? 'default' : 'outline'} key={v} onClick={() => setView(v)}>
              {v}
            </Button>
          ))}
        </div>
        <div className="api-toolbar">
          <input
            aria-label="Search API endpoints"
            placeholder="Search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
          <Button variant="outline" onClick={() => setSchemaEditor(true)}>
            Update Schema
          </Button>
          <Button
            variant="outline"
            disabled={!spec}
            onClick={() => download('api-spec.json', JSON.stringify(spec, null, 2))}
          >
            Download API Spec
          </Button>
          <Button variant="ghost" onClick={() => showFilters(!filters)}>
            {filters ? 'Hide Filter' : 'Show Filter'}
          </Button>
        </div>
      </div>
      {filters && (
        <div className="api-dash-filter">
          <label>
            Method{' '}
            <select
              aria-label="Dashboard Method"
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setPage(0);
              }}
            >
              {['All', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            API Category{' '}
            <select
              aria-label="API Category"
              value={categories.length === 1 ? categories[0] : 'All'}
              onChange={(e) => {
                setCategories(
                  e.target.value === 'All'
                    ? ['Inventory', 'Discovered', 'Shadow', 'Observed']
                    : [e.target.value],
                );
                setPage(0);
              }}
            >
              {['All', 'Inventory', 'Discovered', 'Shadow', 'Observed'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              aria-label="⚙ Last Tested"
              checked={showTested}
              onChange={(e) => setShowTested(e.target.checked)}
            />{' '}
            Last Tested
          </label>
          <Button
            variant="ghost"
            onClick={() => {
              setQuery('');
              setCategories(['Inventory', 'Discovered', 'Shadow', 'Observed']);
              setMethod('All');
              setPage(0);
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
      <Card className="api-endpoint-table">
        <div className="api-table-bar">
          <span>{filtered.length} items</span>
          <Button
            variant={!archiveView ? 'default' : 'outline'}
            onClick={() => {
              setArchiveView(false);
              setPage(0);
            }}
          >
            Current
          </Button>
          <Button
            variant={archiveView ? 'default' : 'outline'}
            onClick={() => {
              setArchiveView(true);
              setPage(0);
            }}
          >
            Archived
          </Button>
          <span className="api-definition-name">
            API Definition: {definition ? `✓ ${definition.name}` : '⊗ Disabled'}{' '}
            {!definition && (
              <Button variant="ghost" onClick={() => setConfigEditor(true)}>
                Enable
              </Button>
            )}
          </span>
          <Button variant="ghost" onClick={csv}>
            Download CSV
          </Button>
          {selected.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                const next = { ...archived };
                selected.forEach((key) => {
                  next[key] = !archiveView;
                });
                setArchived(next);
                localStorage.setItem(archiveKey, JSON.stringify(next));
                setSelected([]);
              }}
            >
              {archiveView ? 'Restore' : 'Archive'} Selected ({selected.length})
            </Button>
          )}
        </div>
        {view === 'Table' ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Select visible endpoints"
                      checked={visible.length > 0 && visible.every((r) => selected.includes(r.key))}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...new Set([...selected, ...visible.map((r) => r.key)])]
                            : selected.filter((key) => !visible.some((r) => r.key === key)),
                        )
                      }
                    />
                  </th>
                  {[
                    'API Endpoint',
                    'Method',
                    'Sensitive Data',
                    'Threat Level',
                    'Authentication State',
                    'API Category',
                    'Discovery Source',
                    'Risk Score',
                    'Schema Status',
                    'Last Updated',
                    ...(showTested ? ['Last Tested'] : []),
                    'Actions',
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.key}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.method} ${row.path}`}
                        checked={selected.includes(row.key)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, row.key]
                              : selected.filter((k) => k !== row.key),
                          )
                        }
                      />
                    </td>
                    <td>
                      <button className="resource-link" onClick={() => setDetail(row)}>
                        {row.path}
                      </button>
                    </td>
                    <td>{row.method}</td>
                    <td>{row.sensitive.map(sensitiveTag).join(', ') || '—'}</td>
                    <td>
                      <span className={`api-threat threat-${row.threat.toLowerCase()}`}>
                        {row.threat}
                      </span>
                    </td>
                    <td>{row.auth}</td>
                    <td>
                      {row.categories.map((v) => (
                        <span className={`api-category-chip cat-${v.toLowerCase()}`} key={v}>
                          {v}
                        </span>
                      ))}
                    </td>
                    <td>{row.sources.join(', ') || '—'}</td>
                    <td>
                      <span
                        className={`api-risk ${(row.risk ?? 0) >= 60 ? 'high' : (row.risk ?? 0) > 0 ? 'medium' : 'low'}`}
                      >
                        {row.risk ?? 'N/A'}
                      </span>
                    </td>
                    <td>{row.schemaStatus}</td>
                    <td>{row.lastActivity ? new Date(row.lastActivity).toLocaleString() : '—'}</td>
                    {showTested && (
                      <td>{row.lastTested ? new Date(row.lastTested).toLocaleString() : 'N/A'}</td>
                    )}
                    <td>
                      <details>
                        <summary aria-label={`Actions ${row.method} ${row.path}`}>•••</summary>
                        <Button variant="ghost" onClick={() => setDetail(row)}>
                          Details / Security Posture
                        </Button>
                        <Button variant="ghost" onClick={() => archive(row)}>
                          {archiveView ? 'Restore' : 'Archive'}
                        </Button>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EndpointGraph rows={filtered} onSelect={setDetail} />
        )}
        {!filtered.length && (
          <p className="api-no-data">
            No API endpoints. 필터·Current/Archived를 확인하거나 실습 요청을 실행하세요.
          </p>
        )}
        <div className="api-pagination">
          <label>
            Items per page{' '}
            <select
              aria-label="Items per page"
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(0);
              }}
            >
              {[10, 50, 100].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <span>
            {filtered.length ? current * size + 1 : 0}–
            {Math.min((current + 1) * size, filtered.length)} of {filtered.length}
          </span>
          <Button variant="outline" disabled={current === 0} onClick={() => setPage(current - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={current + 1 >= pages}
            onClick={() => setPage(current + 1)}
          >
            Next
          </Button>
        </div>
      </Card>
      <details className="api-dashboard-explanation">
        <summary>집계 기준 · 학습용 분류 설명</summary>
        <p>
          선택한 LB의 보관 중인 Request Lab 로그(최대 1,000개)를 집계합니다. 학습 목록·민감 필드
          분류·Last Updated는 시간 필터 밖에도 유지됩니다. Code/Crawling fixture의 calls 값과 API
          Testing 검사 건수를 HTTP 호출 수로 더하지 않습니다. 시간 필터는 모의 시계를 사용합니다.
          Refresh는 재집계하며 새 요청을 생성하지 않습니다.
        </p>
        <p>
          Top Sensitive Data는 OpenAPI 및 요청·응답 필드명 기반 분류의 엔드포인트 수입니다. 실제 PII
          검출이 아닙니다. Authenticated는 인증 헤더 존재만 뜻하며 유효성을 검증하지 않습니다. 이전
          로그는 Unknown입니다. Threat Level은 선택 시간창의 로컬 탐지 로그 기준이며 Schema Status는
          Inventory/학습 여부입니다. 실제 F5 위협 등급 계산식이 아닙니다.
        </p>
        <p>
          Risk Score는 학습용 규칙: Open API Testing 결과 80, Detected 로그 60, Blocked 로그 40,
          정상 실행/완화 결과 0, 데이터 없으면 N/A. 실제 F5 위험 점수가 아닙니다. Archived는 수동
          보관이며 삭제가 아닙니다. Inventory 밖의 관측 경로는 보안 학습이 확인되기 전까지
          Observed로 표시합니다.
        </p>
        <p>
          마지막 화면 갱신: {new Date(updated).toLocaleTimeString()} · 현재 모의 시각:{' '}
          {new Date(s.clock).toLocaleString()} · 비공식 학습용 시뮬레이터
        </p>
      </details>
      {detail && (
        <aside className="api-endpoint-drawer" role="dialog" aria-label="Endpoint Details">
          <Button variant="outline" onClick={() => setDetail(null)}>
            Close Endpoint Details
          </Button>
          <h2>
            {detail.method} {detail.path}
          </h2>
          <p>Discovery Source: {detail.sources.join(', ') || '—'}</p>
          <p>
            Authentication State: {detail.auth} · Sensitive Data:{' '}
            {detail.sensitive.map(sensitiveTag).join(', ') || '—'}
          </p>
          <h3>Security Posture</h3>
          <p>Risk Score: {detail.risk ?? 'N/A'} · 로컬 학습용 점수</p>
          <p>
            Last Tested: {detail.lastTested ? new Date(detail.lastTested).toLocaleString() : 'N/A'}
          </p>
          {detail.testFingerprint && (
            <p>
              {detail.testFingerprint === JSON.stringify(c)
                ? 'Current saved configuration'
                : 'Stale result · 설정 변경 후 API Testing을 다시 실행하세요.'}
            </p>
          )}
          {detail.findings.map((finding, i) => (
            <article key={i}>
              <strong>
                {finding.outcome} · {finding.name}
              </strong>
              <p>Source: API Testing</p>
              <p>{finding.reason}</p>
              <p>
                완화 방안: 서버의 인증·인가와 스키마 검증을 확인하고 설정 변경 후 다시 테스트하세요.
              </p>
            </article>
          ))}
          {!detail.findings.length && (
            <p>
              API Testing 결과가 없습니다. 테스트 환경과 자격 증명을 저장한 뒤 Run API Testing을
              실행하세요.
            </p>
          )}
          <h3>Request Logs · {detail.calls}</h3>
          {detail.logs.map((log) => (
            <details key={log.id}>
              <summary>
                {new Date(log.at).toLocaleString()} · {log.code} / {log.action}
              </summary>
              <p>{log.reason}</p>
              <pre>{log.trace.join('\n')}</pre>
            </details>
          ))}
          <Button
            variant="outline"
            onClick={() => {
              setConfigEditor(true);
              setDetail(null);
            }}
          >
            Manage Configuration
          </Button>
        </aside>
      )}
      {schemaEditor && (
        <ApiResourceEditor
          kind="file"
          initial={file}
          initialSection="upload"
          close={() => setSchemaEditor(false)}
        />
      )}
      {configEditor && (
        <LBForm
          initial={lb}
          viewOnly
          initialSection="api"
          close={() => setConfigEditor(false)}
          notify={() => {}}
        />
      )}
    </section>
  );
}
