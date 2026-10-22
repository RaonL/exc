import type { ReactNode } from 'react';
import { useConsole } from '../store';
import type { LB, Origin, Waf } from '../types';
import { WafReadView } from './WafReadView';
import { lbConfig, originConfig } from '../lib/config';
import { settingsFor, useApiSecurity } from '../api-security/store';
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
  const api = useApiSecurity();
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
  if (kind === 'App Firewall') return <WafReadView waf={value as Waf} section={id} />;
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
        </>
      );
    if (id === 'origins')
      return (
        <div className="xc-read-table">
          <table>
            <thead>
              <tr>
                {['Type', 'Name', 'Weight', 'Priority', 'Endpoint Subsets'].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Origin Pool</td>
                <td>{s.origins.find((o) => o.id === l.originId)?.name || 'Not configured'}</td>
                <td>{c.originWeight ?? 1}</td>
                <td>{c.originPriority ?? 1}</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    if (id === 'tls')
      return (
        <>
          {row(
            'Load Balancer Type',
            l.protocol === 'HTTP' ? 'HTTP' : `HTTPS with ${c.certificate} Certificate`,
          )}
          {row('Listen Port', c.listenPort)}
          {l.protocol === 'HTTPS' && (
            <>
              {row('HTTP Redirect to HTTPS', c.redirectHttps ? 'Enable' : 'Disable')}
              {row('Add HSTS Header', c.hsts ? 'Enable' : 'Disable')}
              {row('TLS Security Level', c.tlsLevel)}
            </>
          )}
          {row('Automatically Manage DNS Records', c.manageDns ? 'Enable' : 'Disable')}
        </>
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
    if (id === 'api') {
      const a = {
        ...settingsFor(l),
        discovery: l.config?.apiSecurity?.discovery ?? c.apiDiscovery,
      };
      return (
        <>
          {row('API Definition', a.definitionId ? 'Enable' : 'Disable')}
          {a.definitionId &&
            row(
              'Select API Definition',
              api.definitions.find((d) => d.id === a.definitionId)?.name ?? a.definitionId,
            )}
          {row('API Discovery', a.discovery ? 'Enable' : 'Disable')}
          {a.discovery && (
            <div className="xc-read-nested">
              {row(
                'Learn From Traffic With Redirect Response',
                a.redirects
                  ? 'Enable Learning From Redirect Traffic'
                  : 'Disable Learning From Redirect Traffic',
              )}
              {row('Purge Duration for Inactive Discovered APIs from Traffic', `${a.purgeDays} d`)}
              {row('API Crawling', a.crawling ? 'Enable' : 'Disable')}
              {row('API Discovery Policy', a.discoveryPolicy ?? 'Built-in')}
              {row('Sensitive Data Discovery', a.sensitiveDataDiscovery ?? 'Default')}
            </div>
          )}
          {a.definitionId && (
            <>
              {row('Validation', a.validation)}
              {row('Request Processing', `${a.requestMode} / ${a.requestAction}`)}
              {row('Response Processing', `${a.responseMode} / ${a.responseAction}`)}
              {row('Fall Through Mode', a.fallMode)}
            </>
          )}
          {row('API Testing', a.testing ? 'Enable' : 'Disable')}
          {a.testing && row('Frequency of Test', a.frequency)}
        </>
      );
    }
    if (id === 'dos') return row('L7 DDoS Protection', l.ddosProtection ? 'Enable' : 'Disable');
    if (id === 'routes') return fallback;
    if (id === 'cdn') return row('CDN', c.cdn ? 'Enable' : 'Disable');
    if (id === 'delivery')
      return (
        <>
          {row('Route Timeout', `${c.timeout} s`)}
          {row('Path Normalization', c.pathNormalization === false ? 'Disable' : 'Enable')}
        </>
      );
    if (id === 'other') return row('VIP Advertisement', c.vip);
  }
  return <fieldset disabled>{fallback}</fieldset>;
}
