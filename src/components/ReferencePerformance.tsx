import { useConsole } from '../store';
import { isLbHealthy, hasWaf } from '../lib/config';
import { Card } from './common';
export function ReferencePerformance({ range }: { range: string }) {
  const s = useConsole(),
    lbs = s.lbs.filter((l) => l.namespace === s.namespace),
    events = s.events.filter(
      (e) =>
        lbs.some((l) => l.id === e.lbId) &&
        Date.parse(e.timestamp) >= Date.now() - Number(range) * 60000,
    );
  const healthy = lbs.filter((l) => isLbHealthy(l, s.origins)).length;
  const total = events.reduce((n, e) => n + e.count, 0),
    errors = events.filter((e) => (e.responseCode ?? 200) >= 400).reduce((n, e) => n + e.count, 0);
  const bytes = events.reduce((n, e) => n + (e.responseBody?.length ?? 0) * e.count, 0);
  const samples = Array.from({ length: 6 }, (_, i) =>
    events
      .filter((e) => Date.parse(e.timestamp) <= Date.now() - (5 - i) * Number(range) * 12000)
      .reduce((n, e) => n + e.count, 0),
  );
  const graph = (
    <svg viewBox="0 0 600 190" role="img" aria-label="Stored local requests over time">
      <g stroke="#e1e5ee">
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={'h' + i} x1="35" x2="580" y1={20 + i * 36} y2={20 + i * 36} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={'v' + i} x1={35 + i * 109} x2={35 + i * 109} y1="20" y2="164" />
        ))}
      </g>
      <polyline
        fill="none"
        stroke="#8c82d7"
        strokeWidth="2.5"
        points={samples
          .map((v, i) => `${35 + i * 109},${164 - (v / Math.max(1, total)) * 144}`)
          .join(' ')}
      />
      <text x="35" y="188" fill="#68758d" fontSize="12">
        Selected time window · local stored events
      </text>
    </svg>
  );
  const legend = (rows: [string, number, string][]) => (
    <div className="xc-donut-legend">
      {rows.map(([label, count, color]) => (
        <div key={label}>
          <i style={{ background: color }}>✓</i>
          <span>{label}</span>
          <strong>{count}</strong>
        </div>
      ))}
    </div>
  );
  return (
    <div className="xc-performance">
      <div className="xc-performance-top">
        <Card title="Health ⓘ">
          <div
            className="xc-donut"
            style={{
              background: `conic-gradient(#40c463 ${(healthy / Math.max(1, lbs.length)) * 100}%, #e1e4ee 0)`,
            }}
          >
            <div>
              {lbs.length}
              <small>LB</small>
            </div>
          </div>
          {legend([
            ['Critical', lbs.length - healthy, '#ff4b33'],
            ['Moderate', 0, '#ffbd32'],
            ['Good', healthy, '#40c463'],
            ['Unknown', 0, '#98a1b2'],
          ])}
        </Card>
        <Card title="Active Alerts ⓘ">
          <div className="xc-donut">
            <div>{lbs.length - healthy}</div>
          </div>
          {legend([
            ['Critical', lbs.length - healthy, '#ff4b33'],
            ['Major', 0, '#ffbd32'],
            ['Minor', 0, '#4ca9f2'],
          ])}
        </Card>
        <Card title="Active Configuration ⓘ">
          <p className="xc-read-label">Total Load Balancers</p>
          <strong className="xc-big-value">{lbs.length}</strong>
          <table>
            <thead>
              <tr>
                <th>Security Configuration</th>
                <th>Protected Load Balancers</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['WAF', lbs.filter(hasWaf).length],
                ['Bot Defense', lbs.filter((l) => l.botDefense).length],
                ['API Discovery', lbs.filter((l) => l.config?.apiDiscovery).length],
                ['DDoS Detection and Auto Mitigation', lbs.filter((l) => l.ddosProtection).length],
              ].map(([label, count]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <div className="xc-performance-charts">
        <Card title="Traffic Overview">
          <div className="xc-traffic-values">
            {[
              ['Total Requests', total],
              ['Total Errors', errors],
              ['Requests to Origin', total - errors],
            ].map(([label, count]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{count}</strong>
                <small>Selected period</small>
              </div>
            ))}
          </div>
          {graph}
        </Card>
        <Card title="Throughput ⓘ">
          <div className="xc-traffic-values">
            <div>
              <span>Response · simulated</span>
              <strong>{((bytes * 8) / (Number(range) * 60) / 1000).toFixed(2)} kbps</strong>
              <small>Calculated from dummy response text</small>
            </div>
          </div>
          {graph}
        </Card>
      </div>
      <Card>
        <div className="xc-list-toolbar">
          <span>{lbs.length} item</span>
          <span>HTTP Load Balancers</span>
        </div>
        <table>
          <thead>
            <tr>
              {[
                'Name',
                'Health',
                'Avg Latency',
                'Request Rate',
                'Requests',
                'Requests to Origin',
                'Errors',
                'Response Throughput',
              ].map((t) => (
                <th key={t}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lbs.map((l) => (
              <tr key={l.id}>
                <td>
                  <button className="resource-link" onClick={() => s.selectLb(l.id)}>
                    {l.name}
                  </button>
                </td>
                <td>
                  <span className={'xc-validity ' + (isLbHealthy(l, s.origins) ? 'valid' : '')}>
                    {isLbHealthy(l, s.origins) ? 'Good' : 'Critical'}
                  </span>
                </td>
                <td>—</td>
                <td>
                  {(
                    events.filter((e) => e.lbId === l.id).reduce((n, e) => n + e.count, 0) /
                    (Number(range) * 60)
                  ).toFixed(2)}
                  /s
                </td>
                <td>{events.filter((e) => e.lbId === l.id).reduce((n, e) => n + e.count, 0)}</td>
                <td>—</td>
                <td>
                  {events.filter((e) => e.lbId === l.id && (e.responseCode ?? 200) >= 400).length}
                </td>
                <td>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
