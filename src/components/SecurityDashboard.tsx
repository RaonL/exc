import { useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  ShieldCheck,
  ShieldAlert,
  Code2,
  Download,
  RefreshCw,
  ArrowRight,
  Filter,
  Globe2,
} from 'lucide-react';
import {
  Area,
  ComposedChart,
  Line,
  Brush,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useConsole } from '../store';
import type { SecurityEvent } from '../types';
import { lbConfig, hasWaf } from '../lib/config';
import { Badge, Card, Empty, PageHeading, SearchInput, download } from './common';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { EventsTable } from './EventsTable';
import { WorldEventsMap } from './WorldEventsMap';
import { ApiDashboard } from '../api-security/ApiDashboard';
import { LBForm } from './LoadBalancerEditor';
const category = (e: SecurityEvent) =>
  e.scenario === 'L7 DDoS'
    ? 'DDoS'
    : e.scenario === 'Bot Detection'
      ? 'Bot'
      : e.scenario === 'API Schema Violation'
        ? 'API'
        : 'WAF';
const colors: Record<string, string> = {
  WAF: '#7186dd',
  Bot: '#8cbaac',
  API: '#b49bd3',
  DDoS: '#e8ac86',
};
const counts = (events: SecurityEvent[], key: (e: SecurityEvent) => string) =>
  Object.entries(
    events.reduce<Record<string, number>>((all, e) => {
      const name = key(e);
      all[name] = (all[name] ?? 0) + e.count;
      return all;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
export function SecurityDashboard({ openLab }: { openLab: () => void }) {
  const s = useConsole();
  const [tab, setTab] = useState('Dashboard');
  const [configuration, setConfiguration] = useState(false);
  const [range, setRange] = useState('60');
  const [selected, setSelected] = useState<string[]>(s.selectedLbId ? [s.selectedLbId] : []);
  const [search, setSearch] = useState('');
  const [refresh, setRefresh] = useState(Date.now());
  const [enabled, setEnabled] = useState(['WAF', 'Bot', 'API', 'DDoS']);
  const [chartType, setChartType] = useState<'Line' | 'Area'>('Line');
  const [detail, setDetail] = useState<{ title: string; events: SecurityEvent[] } | null>(null);
  const allLbs = s.lbs.filter((l) => l.namespace === s.namespace);
  const lbs = allLbs.filter((l) => !selected.length || selected.includes(l.id));
  const now = Math.max(Date.now(), refresh);
  const start = now - Number(range) * 60000;
  const events = s.events.filter(
    (e) =>
      e.namespace === s.namespace &&
      lbs.some((l) => l.id === e.lbId) &&
      Date.parse(e.timestamp) >= start &&
      e.scenario !== 'Normal HTTP traffic',
  );
  const endpoints = s.endpoints.filter(
    (e) => e.namespace === s.namespace && lbs.some((l) => l.id === e.lbId),
  );
  const requestTotal = s.events
    .filter(
      (e) =>
        e.namespace === s.namespace &&
        lbs.some((l) => l.id === e.lbId) &&
        Date.parse(e.timestamp) >= start,
    )
    .reduce((n, e) => n + e.count, 0);
  const sources = counts(events, (e) => e.source);
  const paths = counts(events, (e) => e.path);
  const countries = counts(events, (e) => e.country);
  const groups = counts(events, (e) => e.scenario);
  const chart = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => ({
      time: new Date(start + ((i + 1) * (now - start)) / 12).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      WAF: 0,
      Bot: 0,
      API: 0,
      DDoS: 0,
    }));
    events.forEach((e) => {
      const index = Math.max(
        0,
        Math.min(11, Math.floor(((Date.parse(e.timestamp) - start) / (now - start)) * 12)),
      );
      data[index][category(e)] += e.count;
    });
    return data;
  }, [s.events, s.namespace, range, selected.join(','), refresh]);
  const drill = (title: string, subset: SecurityEvent[]) => setDetail({ title, events: subset });
  const exportCsv = () => {
    const rows = [
      ['Name', 'Domains', 'WAF', 'Bot Defense', 'API Discovery', 'DDoS Protection'],
      ...allLbs.map((l) => [
        l.name,
        l.domains.join(';'),
        s.wafs.find((w) => w.id === l.wafId)?.name ?? (hasWaf(l) ? 'Route-level WAF' : 'Disabled'),
        String(l.botDefense),
        String(lbConfig(l).apiDiscovery),
        String(l.ddosProtection),
      ]),
    ];
    download(
      'delivery-resources.csv',
      rows
        .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','))
        .join('\r\n'),
      'text/csv;charset=utf-8',
    );
  };
  return (
    <>
      <PageHeading
        title={
          s.selectedLbId
            ? `Security Monitoring: ${allLbs.find((l) => l.id === s.selectedLbId)?.name ?? 'Application'}`
            : 'Security Overview'
        }
        description="Application protection, attack activity, and your current delivery configuration."
      >
        <Button variant="outline" onClick={openLab}>
          <Activity size={14} />
          Simulation Lab
        </Button>
      </PageHeading>
      <div className="tabs" role="tablist" aria-label="Security monitoring">
        {(s.selectedLbId ? ['Dashboard', 'API Endpoints', 'Malicious Users', 'Security Analytics', 'DDoS', 'Alerts', 'Requests', 'Bot Defense'] : ['Dashboard', 'Malicious Users', 'Threat Campaigns']).map((t) => (
          <button
            role="tab"
            aria-selected={tab === t}
            key={t}
            className={tab === t ? 'active' : ''}
            onClick={() => {
              if (t === 'Security Analytics') {
                const id = s.selectedLbId;
                s.navigate('Web App & API Protection', 'Security Analytics');
                useConsole.setState({ selectedLbId: id });
                return;
              }
              setTab(t);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'API Endpoints' && allLbs.find(l => l.id === s.selectedLbId) && <ApiDashboard key={s.selectedLbId} lb={allLbs.find(l => l.id === s.selectedLbId)!} />}
      {s.selectedLbId && tab !== 'API Endpoints' && <Button variant="ghost" onClick={() => setConfiguration(true)}>Manage Configuration</Button>}
      {configuration && allLbs.find(l => l.id === s.selectedLbId) && <LBForm initial={allLbs.find(l => l.id === s.selectedLbId)} viewOnly close={() => setConfiguration(false)} notify={() => {}} />}
      {['DDoS', 'Alerts', 'Requests', 'Bot Defense'].includes(tab) && <Card title={`${tab} · Local simulation`}><EventsTable events={s.events.filter(e => e.lbId === s.selectedLbId && (tab === 'Requests' || tab === 'Alerts' && e.action !== 'Allowed' || tab === 'DDoS' && e.scenario === 'L7 DDoS' || tab === 'Bot Defense' && e.scenario === 'Bot Detection'))} /></Card>}
      {tab !== 'API Endpoints' && <>
      <div className="security-controls">
        <details className="resource-picker">
          <summary>
            <Filter size={13} />
            {selected.length ? `${selected.length} delivery resource(s)` : 'All Delivery Resources'}
          </summary>
          <div>
            <button onClick={() => setSelected([])}>All HTTP Load Balancers</button>
            {allLbs.map((l) => (
              <label key={l.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(l.id)}
                  disabled={selected.length >= 5 && !selected.includes(l.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked ? [...selected, l.id] : selected.filter((id) => id !== l.id),
                    )
                  }
                />
                {l.name}
              </label>
            ))}
            {!allLbs.length && <small>No load balancers in this namespace.</small>}
          </div>
        </details>
        <span className="muted small">HTTP LB resources · up to 5 selected</span>
        <select
          aria-label="Security time range"
          value={range}
          onChange={(e) => setRange(e.target.value)}
        >
          <option value="15">Last 15 minutes</option>
          <option value="60">Last 1 hour</option>
          <option value="1440">Last 24 hours</option>
        </select>
        <button className="security-refresh" onClick={() => setRefresh(Date.now())}>
          <RefreshCw size={13} />
          Refresh
        </button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            download(
              'security-overview.json',
              JSON.stringify(
                { namespace: s.namespace, rangeMinutes: Number(range), resources: lbs, events },
                null,
                2,
              ),
            )
          }
        >
          <Download size={12} />
          Export report
        </Button>
      </div>
      {tab === 'Dashboard' && (
        <>
          <div className="security-kpis">
            {[
              {
                label: 'Threat Intelligence',
                icon: ShieldAlert,
                value: '0',
                sub: 'Threat Campaigns',
                secondaryLabel: 'IP Reputation',
                secondaryValue: String(
                  events
                    .filter((e) => /reputation/i.test(e.reason ?? ''))
                    .reduce((n, e) => n + e.count, 0),
                ),
                page: 'Security Analytics' as const,
              },
              {
                label: 'Bot Traffic',
                icon: Bot,
                value: `${requestTotal ? Math.round((events.filter((e) => e.scenario === 'Bot Detection').reduce((n, e) => n + e.count, 0) / requestTotal) * 100) : 0}%`,
                sub: 'Traffic that comes from Bots',
                secondaryLabel: 'Traffic that comes from Malicious Bots',
                secondaryValue: `${requestTotal ? Math.round((events.filter((e) => e.scenario === 'Bot Detection' && e.action === 'Blocked').reduce((n, e) => n + e.count, 0) / requestTotal) * 100) : 0}%`,
                page: 'Bot Defense' as const,
              },
              {
                label: 'API Classification',
                icon: Code2,
                value: String(endpoints.length),
                sub: 'API Endpoints',
                secondaryLabel: 'Shadow Endpoints',
                secondaryValue: String(endpoints.filter((e) => e.shadow).length),
                page: 'API Discovery' as const,
              },
              {
                label: 'DDoS Attack Activity',
                icon: ShieldCheck,
                value: String(
                  new Set(events.filter((e) => e.scenario === 'L7 DDoS').map((e) => e.lbId)).size,
                ),
                sub: 'Load balancers with L7 DDoS events',
                secondaryLabel: 'Mitigated Requests',
                secondaryValue: String(
                  events
                    .filter((e) => e.scenario === 'L7 DDoS' && e.action === 'Blocked')
                    .reduce((n, e) => n + e.count, 0),
                ),
                page: 'Security Events' as const,
              },
            ].map((kpi) => (
              <button
                className="security-kpi card"
                key={kpi.label}
                onClick={() => s.navigate('Web App & API Protection', kpi.page)}
              >
                <span>
                  <kpi.icon size={18} />
                  {kpi.label}
                  <ArrowRight size={12} />
                </span>
                <small>{kpi.sub}</small>
                <strong>
                  {kpi.value} {(kpi.value === '0' || kpi.value === '0%') && <em>No Data</em>}
                </strong>
                <small className="xc-kpi-secondary">{kpi.secondaryLabel}</small>
                <strong>
                  {kpi.secondaryValue}{' '}
                  {(kpi.secondaryValue === '0' || kpi.secondaryValue === '0%') && <em>No Data</em>}
                </strong>
              </button>
            ))}
          </div>
          <div className="security-chart-grid">
            <Card
              title="Security Events"
              action={
                <div className="chart-type-toggle">
                  {(['Line', 'Area'] as const).map((type) => (
                    <button
                      key={type}
                      className={chartType === type ? 'active' : ''}
                      onClick={() => setChartType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="security-chart-legend">
                {Object.keys(colors).map((key) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={enabled.includes(key)}
                      onChange={(e) =>
                        setEnabled(
                          e.target.checked ? [...enabled, key] : enabled.filter((v) => v !== key),
                        )
                      }
                    />
                    <i style={{ background: colors[key] }} />
                    {key}
                  </label>
                ))}
              </div>
              <div className="security-event-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chart} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#e9edf4" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 10, fill: '#929bb0' }}
                      minTickGap={30}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#929bb0' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={{ fontSize: 11, border: '1px solid #e2e7f1' }} />
                    {enabled.map((key) =>
                      chartType === 'Line' ? (
                        <Line
                          key={key}
                          isAnimationActive={false}
                          dataKey={key}
                          dot={false}
                          stroke={colors[key]}
                          strokeWidth={1.5}
                        />
                      ) : (
                        <Area
                          key={key}
                          isAnimationActive={false}
                          dataKey={key}
                          stroke={colors[key]}
                          fill={colors[key]}
                          fillOpacity={0.15}
                        />
                      ),
                    )}
                    <Brush
                      ariaLabel="Security chart time range"
                      dataKey="time"
                      height={18}
                      stroke="#cbd5ee"
                      travellerWidth={5}
                      tickFormatter={() => ''}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          <div className="security-ranking-grid">
            <Card title="Top Attack Sources" action={<Badge>Source IP</Badge>}>
              {sources.length ? (
                sources.slice(0, 5).map(([source, count]) => (
                  <button
                    className="ranking-row"
                    key={source}
                    onClick={() =>
                      drill(
                        `Source IP: ${source}`,
                        events.filter((e) => e.source === source),
                      )
                    }
                  >
                    <span className="mono">{source}</span>
                    <i>
                      <b style={{ width: `${(count / (sources[0]?.[1] || 1)) * 100}%` }} />
                    </i>
                    <strong>{count.toLocaleString()}</strong>
                  </button>
                ))
              ) : (
                <Empty title="No attack sources" />
              )}
            </Card>
            <Card title="Top Attacked Paths">
              {paths.length ? (
                paths.slice(0, 5).map(([path, count]) => (
                  <button
                    className="ranking-row path-row"
                    key={path}
                    onClick={() =>
                      drill(
                        `Path: ${path}`,
                        events.filter((e) => e.path === path),
                      )
                    }
                  >
                    <span className="mono">{path}</span>
                    <strong>{count.toLocaleString()}</strong>
                    <ArrowRight size={12} />
                  </button>
                ))
              ) : (
                <Empty title="No attacked paths" />
              )}
            </Card>
            <Card title="Events by Country" action={<Globe2 size={15} color="#8b9bbd" />}>
              <WorldEventsMap
                countries={countries}
                onSelect={(country) =>
                  drill(
                    country,
                    events.filter((e) => e.country === country),
                  )
                }
              />
              <details className="xc-country-breakdown">
                <summary>Country breakdown</summary>
                {countries.length ? (
                  countries.slice(0, 5).map(([country, count]) => (
                    <button
                      className="ranking-row"
                      key={country}
                      onClick={() =>
                        drill(
                          country,
                          events.filter((e) => e.country === country),
                        )
                      }
                    >
                      <span>{country}</span>
                      <strong>{count.toLocaleString()}</strong>
                    </button>
                  ))
                ) : (
                  <Empty title="No country data" />
                )}
              </details>
            </Card>
            <Card title="Active Configuration" action={<Badge tone="blue">Current state</Badge>}>
              <div className="active-resource-count">
                {lbs.length}
                <span>HTTP Load Balancers</span>
              </div>
              {[
                { name: 'Web App Firewall', count: lbs.filter(hasWaf).length },
                { name: 'Bot Defense', count: lbs.filter((l) => l.botDefense).length },
                {
                  name: 'API Discovery',
                  count: lbs.filter((l) => lbConfig(l).apiDiscovery).length,
                },
                { name: 'DDoS Protection', count: lbs.filter((l) => l.ddosProtection).length },
              ].map((row) => (
                <div className="active-configuration-row" key={row.name}>
                  <span>{row.name}</span>
                  <div>
                    <i style={{ width: `${lbs.length ? (row.count / lbs.length) * 100 : 0}%` }} />
                  </div>
                  <strong>
                    {row.count}/{lbs.length}
                  </strong>
                </div>
              ))}
            </Card>
          </div>
          <Card
            title="Application Delivery"
            action={
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download size={12} />
                Download CSV
              </Button>
            }
          >
            <div className="table-toolbar">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search delivery resources…"
              />
              <span className="muted">{lbs.length} HTTP Load Balancers</span>
            </div>
            {lbs.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Threat Level</th>
                      <th>Bot Traffic</th>
                      <th>Security Events</th>
                      <th>Malicious Users</th>
                      <th>DDoS Events</th>
                      <th>WAF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lbs
                      .filter((l) =>
                        `${l.name} ${l.domains.join(' ')}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )
                      .map((l) => (
                        <tr key={l.id}>
                          <td>
                            <button
                              className="resource-link"
                              onClick={() => s.selectLb(l.id, 'Security')}
                            >
                              {l.name}
                            </button>
                            <small className="cell-sub">{l.domains[0]}</small>
                          </td>
                          <td>
                            <span>
                              {events.some((e) => e.lbId === l.id && e.severity === 'High')
                                ? 'High'
                                : events.some((e) => e.lbId === l.id)
                                  ? 'Medium'
                                  : 'No Data'}
                            </span>
                          </td>
                          <td>
                            {(() => {
                              const all = s.events.filter(
                                  (e) => e.lbId === l.id && Date.parse(e.timestamp) >= start,
                                ),
                                count = all.reduce((n, e) => n + e.count, 0);
                              return `${count ? Math.round((all.filter((e) => e.scenario === 'Bot Detection').reduce((n, e) => n + e.count, 0) / count) * 100) : 0}%`;
                            })()}
                          </td>
                          <td>
                            <button
                              className="resource-link"
                              onClick={() =>
                                drill(
                                  l.name,
                                  events.filter((e) => e.lbId === l.id),
                                )
                              }
                            >
                              {events
                                .filter((e) => e.lbId === l.id)
                                .reduce((sum, e) => sum + e.count, 0)
                                .toLocaleString()}
                            </button>
                          </td>
                          <td>
                            {new Set(
                              events
                                .filter(
                                  (e) =>
                                    e.lbId === l.id &&
                                    /fingerprint|malicious/i.test(e.reason ?? ''),
                                )
                                .map((e) => e.source),
                            ).size || '—'}
                          </td>
                          <td>
                            {events
                              .filter((e) => e.lbId === l.id && e.scenario === 'L7 DDoS')
                              .reduce((n, e) => n + e.count, 0) || '—'}
                          </td>
                          <td>{hasWaf(l) ? 'Enabled' : 'Disabled'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty />
            )}
            <div className="table-footer">
              CSV includes all HTTP LB resources in this namespace.
              <span>Configuration counts are independent of the time filter.</span>
            </div>
          </Card>
        </>
      )}
      {tab === 'Malicious Users' && (
        <Card
          title="Malicious Users"
          action={<Badge tone="amber">Illustrative risk scoring</Badge>}
        >
          {sources.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User identifier / Source IP</th>
                    <th>Country</th>
                    <th>Observed requests</th>
                    <th>Mitigated</th>
                    <th>Risk level</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sources.map(([source, count]) => {
                    const sourceEvents = events.filter((e) => e.source === source);
                    const risk = sourceEvents.some(
                      (e) => e.severity === 'Critical' || e.severity === 'High',
                    )
                      ? 'High'
                      : 'Medium';
                    return (
                      <tr key={source}>
                        <td className="mono">{source}</td>
                        <td>{sourceEvents[0].country}</td>
                        <td>{count.toLocaleString()}</td>
                        <td>
                          {sourceEvents
                            .filter((e) => e.action === 'Blocked')
                            .reduce((v, e) => v + e.count, 0)}
                        </td>
                        <td>
                          <Badge tone={risk === 'High' ? 'red' : 'amber'}>{risk}</Badge>
                        </td>
                        <td>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => drill(`User ${source}`, sourceEvents)}
                          >
                            View activity
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty />
          )}
          <p className="configuration-help">
            Training view groups mock events by source IP. It does not reproduce F5's malicious-user
            risk algorithm or user blocking workflow.
          </p>
        </Card>
      )}
      {tab === 'Threat Campaigns' && (
        <Card title="Attack Activity Groups" action={<Badge tone="amber">Demo grouping</Badge>}>
          <p className="configuration-help">
            These are grouped training scenarios, not F5 threat campaign intelligence. Campaign
            feeds and the official Sankey view are not implemented.
          </p>
          {groups.length ? (
            groups.map(([name, count]) => (
              <button
                className="campaign-group"
                key={name}
                onClick={() =>
                  drill(
                    name,
                    events.filter((e) => e.scenario === name),
                  )
                }
              >
                <ShieldAlert size={21} />
                <span>
                  <strong>{name}</strong>
                  <small>
                    {new Set(events.filter((e) => e.scenario === name).map((e) => e.source)).size}{' '}
                    source IP(s)
                  </small>
                </span>
                <Badge tone="blue">{count.toLocaleString()} requests</Badge>
                <ArrowRight size={15} />
              </button>
            ))
          ) : (
            <Empty />
          )}
        </Card>
      )}
      </>}
      {detail && (
        <Dialog
          open
          wide
          onOpenChange={() => setDetail(null)}
          title={detail.title}
          description="Filtered simulated security events for the current dashboard scope."
        >
          <div className="security-drill">
            <EventsTable events={detail.events} />
          </div>
          <div className="form-footer">
            <Button variant="outline" onClick={() => setDetail(null)}>
              Close
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
