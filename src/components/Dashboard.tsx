import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Check,
  Download,
  Globe2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Server,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useConsole } from '../store';
import { hasWaf, isLbHealthy, lbOriginIds } from '../lib/config';
import { Badge, Card, Empty, Stat, Status, TextLink, download } from './common';
import { Button } from './ui/button';
import { EventsTable } from './EventsTable';
import { RequestTelemetry, MonitoringRange } from './RequestTelemetry';
const tabs = ['Dashboard', 'Metrics', 'Traffic', 'Origin Servers', 'Alerts', 'Requests', 'Errors'];
export function Dashboard({ openLab }: { openLab: () => void }) {
  const s = useConsole();
  const [tab, setTab] = useState('Dashboard');
  const [range, setRange] = useState('60');
  const [hideRequestChart, setHideRequestChart] = useState(false);
  const [refreshed, setRefreshed] = useState('Updated just now');
  const lbs = s.lbs.filter(
    (l) => l.namespace === s.namespace && (!s.selectedLbId || l.id === s.selectedLbId),
  );
  const events = s.events.filter(
    (e) =>
      lbs.some((l) => l.id === e.lbId) &&
      Date.parse(e.timestamp) >= Date.now() - Number(range) * 60000,
  );
  const origins = s.origins.filter(
    (o) => o.namespace === s.namespace && lbs.some((l) => lbOriginIds(l).includes(o.id)),
  );
  const unhealthy = origins.filter((o) => !o.healthy).length;
  const total = lbs.reduce((v, l) => v + l.requests, 0);
  const blocked = events.filter((e) => e.action === 'Blocked').reduce((v, e) => v + e.count, 0);
  const detected = events.filter((e) => e.action === 'Detected').reduce((v, e) => v + e.count, 0);
  const health = !lbs.length
    ? 0
    : Math.round((lbs.filter((l) => isLbHealthy(l, origins)).length / lbs.length) * 100);
  const navigate = (page: Parameters<typeof s.navigate>[1]) =>
    s.navigate('Web App & API Protection', page);
  const chart = useMemo(() => {
    const factors = [
      0.28, 0.35, 0.31, 0.45, 0.38, 0.49, 0.6, 0.43, 0.57, 0.52, 0.72, 0.66, 0.8, 0.71, 0.92, 0.77,
      0.88, 1, 0.83, 0.9, 0.82, 0.96, 0.78, 0.86,
    ];
    const now = Date.now();
    return factors.map((factor, i) => ({
      time: new Date(now - ((23 - i) / 23) * Number(range) * 60000).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      requests: Math.round((total / (Number(range) * 60)) * factor),
      blocked: Math.round((blocked / (Number(range) * 60)) * factor * 100) / 100,
    }));
  }, [total, blocked, range, refreshed]);
  const chartCard = (
    <Card
      title="Request traffic"
      action={
        <span className="chart-legend">
          <i />
          All requests <i className="purple" />
          Blocked requests
        </span>
      }
    >
      <div className="chart-subtitle">
        Illustrative distribution of stored totals · requests / second
      </div>
      <div className="traffic-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chart} margin={{ top: 14, right: 20, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="request-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6485ef" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#6485ef" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#e9edf4" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#8b92a5', fontSize: 11 }}
              minTickGap={55}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fill: '#8b92a5', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 5, border: '1px solid #e3e7ee', fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="requests"
              stroke="#6485ef"
              strokeWidth={2}
              fill="url(#request-fill)"
              name="All requests/s"
            />
            <Area
              type="monotone"
              dataKey="blocked"
              stroke="#a089cf"
              fill="transparent"
              strokeWidth={1.5}
              name="Blocked requests/s"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
  return (
    <>
      <div className="overview-title">
        <div>
          <span className="eyebrow">APPLICATION DELIVERY & SECURITY</span>
          <h1>
            {s.selectedLbId
              ? `HTTP Load Balancer: ${lbs[0]?.name ?? 'Not found'}`
              : 'Performance Overview'}
            <Badge tone="green">
              <i className="tiny-dot" />
              Live demo
            </Badge>
          </h1>
          <p>Visibility across your applications, APIs, and distributed infrastructure.</p>
        </div>
        <Button variant="outline" onClick={openLab}>
          <Activity size={15} />
          Simulation Lab
          <ArrowRight size={14} />
        </Button>
        {s.selectedLbId && (
          <Button variant="outline" onClick={() => s.openApplication(s.selectedLbId)}>
            Open Application
          </Button>
        )}
      </div>
      <div className="tabs" role="tablist" aria-label="Performance monitoring">
        {tabs.map((t) => (
          <button
            role="tab"
            aria-selected={t === tab}
            key={t}
            className={t === tab ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="dashboard-toolbar">
        <div className="scope-pill">
          <Globe2 size={14} />
          {s.selectedLbId ? 'Selected application' : 'All applications'}
          <span>{lbs.length}</span>
        </div>
        <div className="toolbar-right">
          <button
            onClick={() =>
              download(
                'performance-report.json',
                JSON.stringify(
                  {
                    namespace: s.namespace,
                    rangeMinutes: Number(range),
                    lifetimeRequests: total,
                    windowBlockedRequests: blocked,
                    health,
                    loadBalancers: lbs,
                    events,
                  },
                  null,
                  2,
                ),
              )
            }
          >
            <Download size={15} />
            Export report
          </button>
          <MonitoringRange value={range} onApply={setRange} />

          <button
            onClick={() => {
              setRefreshed(`Updated ${new Date().toLocaleTimeString('en-GB')}`);
              setRange((r) => `${Number(r)}`);
            }}
          >
            <RefreshCw size={14} />
            Refresh: <span>{refreshed}</span>
          </button>
        </div>
      </div>
      {!lbs.length ? (
        <Card>
          <Empty
            title="Your application overview starts here"
            description="Create a load balancer in this namespace to begin your simulation."
          >
            <Button onClick={() => navigate('HTTP Load Balancers')}>
              Manage HTTP Load Balancers
            </Button>
          </Empty>
        </Card>
      ) : (
        <>
          {tab === 'Dashboard' && (
            <>
              <div className="dashboard-top">
                <Card title="Application Health" className="health-card">
                  <div className="health-number">
                    <ShieldCheck size={37} />
                    <strong>
                      {health}
                      <small>/100</small>
                    </strong>
                    <Badge tone={health === 100 ? 'green' : 'red'}>
                      {health === 100 ? 'Excellent' : 'Degraded'}
                    </Badge>
                  </div>
                  <div className="health-track">
                    <span
                      style={{
                        width: `${health}%`,
                        background: health === 100 ? '#36b879' : '#e47868',
                      }}
                    />
                  </div>
                  <div className="card-foot">
                    <span>Health score</span>
                    <span>{lbs.length} applications monitored</span>
                  </div>
                </Card>
                <Card
                  title={
                    <button className="card-link" onClick={() => setTab('Alerts')}>
                      Active Alerts
                    </button>
                  }
                  action={<Badge tone="neutral">{unhealthy + (detected > 0 ? 1 : 0)} active</Badge>}
                >
                  <div className="inline-stats">
                    <Stat label="Critical" value={unhealthy} onClick={() => setTab('Alerts')} />
                    <Stat
                      label="Major"
                      value={detected > 0 ? 1 : 0}
                      onClick={() => setTab('Alerts')}
                    />
                    <Stat label="Minor" value={0} onClick={() => setTab('Alerts')} />
                    <Stat
                      label="Total"
                      value={unhealthy + (detected > 0 ? 1 : 0)}
                      onClick={() => setTab('Alerts')}
                    />
                  </div>
                </Card>
                <Card
                  title={
                    <button className="card-link" onClick={() => setTab('Origin Servers')}>
                      Origin Servers
                    </button>
                  }
                >
                  <div className="inline-stats">
                    <Stat
                      label="Unhealthy"
                      value={<span className={unhealthy ? 'text-red' : ''}>{unhealthy}</span>}
                    />
                    <Stat label="Healthy" value={origins.length - unhealthy} />
                    <Stat label="Total" value={origins.length} />
                  </div>
                  <div className="origin-foot">
                    <Check size={13} />
                    {unhealthy ? 'Origin attention required' : 'All origins are operational'}
                  </div>
                </Card>
              </div>
              <div className="dashboard-middle">
                <Card
                  title="End to end Latency"
                  action={<span className="muted small">Simulated measurement</span>}
                >
                  <div className="latency-flow">
                    <div className="flow-node">
                      <Globe2 size={18} />
                      <span>Client</span>
                    </div>
                    <div className="flow-line">
                      <strong>
                        &lt;10 <small>ms</small>
                      </strong>
                      <span>Client latency</span>
                    </div>
                    <div className="flow-node">
                      <span className="mini-f5">f5</span>
                      <span>LB</span>
                    </div>
                    <div className="flow-line">
                      <strong>
                        {unhealthy ? '—' : '<10'} <small>ms</small>
                      </strong>
                      <span>Server latency</span>
                    </div>
                    <div className="flow-node">
                      <Server size={18} />
                      <span>Server</span>
                    </div>
                    <div className="flow-line">
                      <strong>
                        {unhealthy ? '—' : '<1'} <small>ms</small>
                      </strong>
                      <span>App latency</span>
                    </div>
                    <div className="flow-node">
                      <span className="app-symbol">▦</span>
                      <span>App</span>
                    </div>
                    <div className="upstream">
                      <span>Total upstream latency</span>
                      <strong>{unhealthy ? 'Unavailable' : '<10 ms'}</strong>
                    </div>
                  </div>
                </Card>
                <Card title="Unique Visitors">
                  <div className="visitor-number">
                    {total ? Math.round(total / 24).toLocaleString() : '0'}
                    <span>
                      <TrendingUp size={13} />
                      Illustrative
                    </span>
                  </div>
                  <div className="spark-bars">
                    {[
                      25, 40, 31, 53, 41, 66, 57, 75, 63, 83, 72, 94, 86, 100, 91, 110, 99, 122,
                      111, 133, 121, 145,
                    ].map((h, i) => (
                      <i key={i} style={{ height: `${h / 3.8}px` }} />
                    ))}
                  </div>
                </Card>
              </div>
              <div className="dashboard-bottom">
                <Card
                  title={
                    <button className="card-link" onClick={() => setTab('Requests')}>
                      Requests
                    </button>
                  }
                  action={<Badge tone="blue">Lifetime totals</Badge>}
                >
                  <div className="inline-stats request-stats">
                    <Stat
                      label="Request rate¹"
                      value={`${(total / (Number(range) * 60)).toFixed(1)}/s`}
                    />
                    <Stat label="Total requests" value={total.toLocaleString()} />
                    <Stat
                      label="Detected²"
                      value={detected.toLocaleString()}
                      onClick={() => navigate('Security Events')}
                    />
                    <Stat
                      label="Blocked²"
                      value={blocked.toLocaleString()}
                      onClick={() => navigate('Security Events')}
                    />
                    <Stat
                      label="Drop rate²"
                      value={`${(total ? (blocked / total) * 100 : 0).toFixed(2)}%`}
                    />
                  </div>
                  <div className="request-note">
                    ¹ Lifetime requests ÷ selected window · ² Events within selected window
                  </div>
                </Card>
                <Card title="Top Device Types">
                  <div className="device-label">
                    <span>
                      <i />
                      Desktop
                    </span>
                    <strong>68%</strong>
                  </div>
                  <div className="device-track">
                    <span />
                  </div>
                  <div className="device-types">
                    <span>
                      <i />
                      Mobile <b>26%</b>
                    </span>
                    <span>
                      <i />
                      Tablet <b>6%</b>
                    </span>
                  </div>
                  <small className="muted">Illustrative device mix</small>
                </Card>
              </div>
              <div className="dashboard-charts">
                {chartCard}
                <Card title="Security posture" action={<ShieldCheck size={18} color="#7a86a1" />}>
                  <div className="posture-count">
                    <strong>
                      {lbs.filter(hasWaf).length}
                      <span> / {lbs.length}</span>
                    </strong>
                    <p>applications with WAF attached</p>
                  </div>
                  {[
                    {
                      name: 'Web Application Firewall',
                      count: lbs.filter(hasWaf).length,
                      page: 'App Firewall' as const,
                    },
                    {
                      name: 'API Protection',
                      count: lbs.filter((l) => l.apiProtection).length,
                      page: 'API Protection' as const,
                    },
                    {
                      name: 'Bot Defense',
                      count: lbs.filter((l) => l.botDefense).length,
                      page: 'Bot Defense' as const,
                    },
                  ].map((item) => (
                    <button
                      className="posture-row"
                      key={item.name}
                      onClick={() => navigate(item.page)}
                    >
                      <span>{item.name}</span>
                      <Badge tone={item.count === lbs.length ? 'green' : 'blue'}>
                        {item.count} enabled
                      </Badge>
                      <ArrowRight size={13} />
                    </button>
                  ))}
                </Card>
              </div>
              <Card
                title="Recent Security Events"
                action={
                  <TextLink onClick={() => navigate('Security Events')}>View all events</TextLink>
                }
              >
                <EventsTable
                  events={events.filter((e) => e.action !== 'Allowed').slice(0, 4)}
                  compact
                />
              </Card>
            </>
          )}
          {(tab === 'Metrics' || tab === 'Traffic') && (
            <>
              {chartCard}
              <div className="metric-cards">
                <Card title="Requests">
                  <div className="big-number">{total.toLocaleString()}</div>
                  <span className="muted">Lifetime requests</span>
                </Card>
                <Card title="Blocked in window">
                  <div className="big-number">{blocked.toLocaleString()}</div>
                </Card>
                <Card title="Application health">
                  <div className="big-number">{health}%</div>
                </Card>
              </div>
              {tab === 'Traffic' && (
                <Card title="Request samples">
                  <EventsTable events={events} />
                </Card>
              )}
            </>
          )}
          {tab === 'Origin Servers' && (
            <Card title="Origin Servers">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Endpoint</th>
                      <th>Health</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {origins.map((o) => (
                      <tr key={o.id}>
                        <td>{o.name}</td>
                        <td className="mono">
                          {o.endpoint}:{o.port}
                        </td>
                        <td>
                          <Status healthy={o.healthy} />
                        </td>
                        <td>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => s.setOriginHealth(o.id, !o.healthy)}
                          >
                            {o.healthy ? 'Simulate failure' : 'Recover origin'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          {tab === 'Alerts' && (
            <Card title="Active Alerts">
              {!unhealthy && !detected ? (
                <Empty
                  title="No active alerts"
                  description="Your application origins are healthy and no unmitigated attacks were detected in this time window."
                />
              ) : (
                <div className="alert-list">
                  {origins
                    .filter((o) => !o.healthy)
                    .map((o) => (
                      <div key={o.id}>
                        <AlertTriangle size={20} />
                        <span>
                          <strong>Origin server unavailable</strong>
                          <p>{o.name} · critical availability alert</p>
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => s.setOriginHealth(o.id, true)}
                        >
                          Recover origin
                        </Button>
                      </div>
                    ))}
                  {detected > 0 && (
                    <div>
                      <AlertTriangle size={20} />
                      <span>
                        <strong>Attacks detected in monitoring mode</strong>
                        <p>{detected} requests detected. Review your protection settings.</p>
                      </span>
                      <Button variant="outline" size="sm" onClick={() => navigate('App Firewall')}>
                        Review WAF
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
          {tab === 'Requests' && (
            <>
              <Button variant="ghost" onClick={() => setHideRequestChart((v) => !v)}>
                {hideRequestChart ? 'Show Chart' : 'Hide Chart'}
              </Button>
              {!hideRequestChart && <RequestTelemetry minutes={Number(range)} events={events} />}
              <Card title="Request Events">
                <EventsTable events={events} />
              </Card>
            </>
          )}
          {tab === 'Errors' && (
            <Card title="Errors & unmitigated requests">
              {unhealthy > 0 && (
                <div className="section-note">
                  {unhealthy} origin pool(s) unavailable. Open Origin Servers to recover.
                </div>
              )}
              <EventsTable
                events={events.filter(
                  (e) => e.action === 'Detected' || (e.responseCode ?? 0) >= 500,
                )}
              />
            </Card>
          )}
        </>
      )}
    </>
  );
}
