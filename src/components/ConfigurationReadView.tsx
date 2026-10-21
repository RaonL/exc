import type { ReactNode } from 'react';
import { useConsole } from '../store';
import type { LB, Origin } from '../types';
import { lbConfig, originConfig } from '../lib/config';
const row = (label: string, value: ReactNode) => (
  <div className="xc-read-row">
    <span>
      {label}: <small>ⓘ</small>
    </span>
    <strong>{value}</strong>
  </div>
);
export function ConfigurationReadView({
  kind,
  id,
  value,
  fallback,
}: {
  kind: string;
  id: string;
  value: unknown;
  fallback: ReactNode;
}) {
  const s = useConsole();
  if (id === 'metadata') {
    const metadata = value as { name: string; config?: { labels?: string; description?: string } };
    return (
      <>
        {row('Name', metadata.name)}
        {kind === 'Origin Pool' && metadata.config?.labels && row('Labels', metadata.config.labels)}
        {kind === 'Origin Pool' &&
          metadata.config?.description &&
          row('Description', metadata.config.description)}
      </>
    );
  }
  if (kind === 'Origin Pool') {
    const o = value as Origin,
      c = originConfig(o);
    if (id === 'servers')
      return (
        <>
          <div className="xc-read-table">
            <h3>Origin Servers ⓘ</h3>
            <div className="xc-read-count">1 item</div>
            <table>
              <thead>
                <tr>
                  {['Type', 'Name/IP', 'Site/VSite', 'Network/Segment', 'Labels'].map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{c.type}</td>
                  <td>{o.endpoint}</td>
                  <td>
                    {c.type.includes('on Site')
                      ? s.sites.find((site) => site.id === c.siteId)?.name || '—'
                      : '—'}
                  </td>
                  <td>{c.type.includes('on Site') ? c.network : '—'}</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
          {row('Origin server Port', 'Port')}
          {row('Port', o.port)}
          {row('Port used for health check', 'Endpoint port')}
          {row('LoadBalancer Algorithm', c.algorithm)}
          {row('Endpoint Selection', 'Local Endpoints Preferred')}
        </>
      );
    if (id === 'tls')
      return (
        <>
          {row('TLS', c.tls ? 'Enable' : 'Disable')}
          {c.tls && (
            <div className="xc-read-nested">
              Enable<p>✓ Configured · SNI {c.sni || 'Automatic'}</p>
            </div>
          )}
        </>
      );
    if (id === 'health')
      return (
        <div className="origin-health-list">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Health Check object</th>
              </tr>
            </thead>
            <tbody>
              {c.healthCheck === 'None' ? (
                <tr>
                  <td colSpan={2}>No health checks configured</td>
                </tr>
              ) : (
                <tr>
                  <td>1</td>
                  <td>
                    {c.healthCheck}
                    {c.healthCheck === 'HTTP' ? ` · ${c.healthPath}` : ''}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    if (id === 'balancing') return row('Other Settings', 'Not configured');
  }
  if (kind === 'HTTP Load Balancer') {
    const l = value as LB,
      c = lbConfig(l);
    if (id === 'domains')
      return (
        <>
          <div className="xc-read-table">
            <h3>Domains ⓘ</h3>
            <div className="xc-read-count">{l.domains.length} item</div>
            {l.domains.map((d) => (
              <p key={d}>{d}</p>
            ))}
          </div>
          {row('Load Balancer Type', l.protocol)}
          {row('Listen Port', c.listenPort)}
          {row('Automatically Manage DNS Records', c.manageDns ? 'Enable' : 'Disable')}
        </>
      );
    if (id === 'origins')
      return row(
        'Origin Pool',
        s.origins.find((o) => o.id === l.originId)?.name || 'Not configured',
      );
    if (id === 'waf')
      return (
        <>
          {row('Web Application Firewall (WAF)', l.wafId ? 'Enable' : 'Disable')}
          {l.wafId && (
            <div className="xc-read-nested">
              {s.wafs.find((w) => w.id === l.wafId)?.name || l.wafId}
            </div>
          )}
          {row('WAF Exclusion Rules', `${c.exclusions.length} items`)}
        </>
      );
    if (id === 'bot') return row('Bot Defense', l.botDefense ? 'Enable' : 'Disable');
    if (id === 'api' && l.config?.apiSecurity)
      return (
        <>
          {row('API Discovery', l.config.apiSecurity.discovery ? 'Enable' : 'Disable')}
          {row('Validation', l.config.apiSecurity.validation)}
          {row('API Testing', l.config.apiSecurity.testing ? 'Enable' : 'Disable')}
          {row('Frequency of Test', l.config.apiSecurity.frequency)}
        </>
      );
    if (id === 'api')
      return (
        <>
          {row('API Discovery', c.apiDiscovery ? 'Enable' : 'Disable')}
          {row('API Protection', l.apiProtection ? 'Enable' : 'Disable')}
        </>
      );
    if (id === 'dos') return row('L7 DDoS Protection', l.ddosProtection ? 'Enable' : 'Disable');
    if (id === 'routes') return row('Routes', `${c.routes.length} items`);
    if (id === 'other') return row('VIP Advertisement', c.vip);
  }
  return <fieldset disabled>{fallback}</fieldset>;
}
