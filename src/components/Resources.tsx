import { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Shield,
  Server,
  Globe2,
  Network,
  CheckCircle2,
  MoreHorizontal,
} from 'lucide-react';
import { useConsole } from '../store';
import { hasWaf, isLbHealthy } from '../lib/config';
import type { LB, Origin, Waf, Policy } from '../types';
import {
  Badge,
  Card,
  Empty,
  ExportButton,
  PageHeading,
  SearchInput,
  SectionNote,
  Stat,
  Status,
} from './common';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Dialog } from './ui/dialog';
import { LBForm, ResourceForm } from './forms';
import { WafEditor } from './SecurityEditors';
import { OriginEditor } from './OriginEditor';
import { OriginPoolList } from './OriginPoolList';
type Notify = (message: string) => void;
export function LoadBalancers({ notify }: { notify: Notify }) {
  const s = useConsole();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<LB | 'new' | null>(null);
  const [inspectWaf, setInspectWaf] = useState<Waf | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [actions, setActions] = useState('');
  const [menuTop, setMenuTop] = useState(180);
  const [removing, setRemoving] = useState<LB | null>(null);
  const [healthFilter, setHealthFilter] = useState('All health states');
  const [sort, setSort] = useState('Name A–Z');
  const lbs = s.lbs
    .filter(
      (l) =>
        l.namespace === s.namespace &&
        `${l.name} ${l.domains.join(' ')}`.toLowerCase().includes(search.toLowerCase()) &&
        (healthFilter === 'All health states' ||
          (isLbHealthy(l, s.origins) ? 'Healthy' : 'Unhealthy') === healthFilter),
    )
    .sort((a, b) => (sort === 'Name A–Z' ? a.name.localeCompare(b.name) : b.requests - a.requests));
  return (
    <>
      <PageHeading
        title="HTTP Load Balancers"
        description="Deliver and protect your applications across the F5 Distributed Cloud."
      >
        <ExportButton data={lbs} name="http-load-balancers" />
        <Button
          onClick={() => {
            setViewOnly(false);
            setForm('new');
          }}
        >
          <Plus size={16} />
          Add HTTP Load Balancer
        </Button>
      </PageHeading>
      <div className="resource-summary">
        <span>
          <Server size={17} />
          <b>{s.lbs.filter((l) => l.namespace === s.namespace).length}</b> load balancers
        </span>
        <span>
          <Shield size={17} />
          <b>{s.lbs.filter((l) => l.namespace === s.namespace && hasWaf(l)).length}</b> with App
          Firewall
        </span>
        <Badge tone="blue">Namespace: {s.namespace}</Badge>
      </div>
      <Card className="xc-lb-table">
        <div className="table-toolbar">
          <span className="xc-list-count">
            {lbs.length} item{lbs.length !== 1 ? 's' : ''}
          </span>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search load balancers or domains…"
          />
          <select
            aria-label="Health filter"
            name="lb-health-filter"
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
          >
            <option>All health states</option>
            <option>Healthy</option>
            <option>Unhealthy</option>
          </select>
          <select
            aria-label="Sort load balancers"
            name="lb-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option>Name A–Z</option>
            <option>Most requests</option>
          </select>
        </div>
        {lbs.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th />
                  <th>
                    <input type="checkbox" aria-label="Select all HTTP Load Balancers" />
                  </th>
                  <th>Name</th>
                  <th>Namespace</th>
                  <th>DNS Info</th>
                  <th>Validity</th>
                  <th>Certificate expirat…</th>
                  <th>Domains</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lbs.map((l) => {
                  return (
                    <tr key={l.id}>
                      <td>
                        <button
                          aria-label={`View configuration ${l.name}`}
                          onClick={() => {
                            setViewOnly(true);
                            setForm(l);
                          }}
                        >
                          ›
                        </button>
                      </td>
                      <td>
                        <input type="checkbox" aria-label={`Select ${l.name}`} />
                      </td>
                      <td>
                        <button className="resource-link" onClick={() => s.selectLb(l.id)}>
                          {l.name}
                          <ExternalLink size={12} />
                        </button>
                      </td>
                      <td>{l.namespace}</td>
                      <td>
                        <span className="xc-dns-state" title="Local simulated status">
                          {isLbHealthy(l, s.origins)
                            ? 'VIRTUAL_HOST_READY'
                            : 'VIRTUAL_HOST_NOT_READY'}
                        </span>
                      </td>
                      <td>
                        <span className={`xc-validity ${isLbHealthy(l, s.origins) ? 'valid' : ''}`}>
                          {isLbHealthy(l, s.origins) ? 'Valid' : 'Invalid'}
                        </span>
                      </td>
                      <td>—</td>
                      <td>
                        <button
                          className="cell-sub resource-link"
                          aria-label={`Open application ${l.name}`}
                          onClick={() => s.openApplication(l.id)}
                        >
                          {l.domains.join(', ')} <ExternalLink size={11} />
                        </button>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            aria-label={`Edit ${l.name}`}
                            onClick={() => {
                              setViewOnly(false);
                              setForm(l);
                            }}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-button danger"
                            aria-label={`Delete ${l.name}`}
                            onClick={() => setRemoving(l)}
                          >
                            <Trash2 size={15} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Actions for ${l.name}`}
                            onClick={(e) => {
                              setActions(l.id);
                              setMenuTop(
                                Math.min(
                                  e.currentTarget.getBoundingClientRect().bottom + 4,
                                  window.innerHeight - 160,
                                ),
                              );
                            }}
                          >
                            <MoreHorizontal size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>
            <Button
              onClick={() => {
                setViewOnly(false);
                setForm('new');
              }}
            >
              <Plus size={14} />
              Add HTTP Load Balancer
            </Button>
          </Empty>
        )}
        <div className="table-footer">
          {lbs.length} load balancers <span>All changes are stored locally</span>
        </div>
      </Card>
      <SectionNote>
        <Shield size={16} />A load balancer needs an origin pool. Attach an App Firewall to evaluate
        SQL Injection and XSS demo scenarios.
      </SectionNote>
      {form && (
        <LBForm
          initial={form === 'new' ? undefined : form}
          close={() => setForm(null)}
          notify={notify}
          viewOnly={viewOnly}
        />
      )}{' '}
      {inspectWaf && (
        <WafEditor
          initial={inspectWaf}
          viewOnly
          close={() => setInspectWaf(null)}
          notify={notify}
        />
      )}
      {actions && (
        <>
          <button
            className="resource-menu-scrim"
            aria-label="Close actions menu"
            onClick={() => setActions('')}
          />
          <div className="resource-context-menu" style={{ top: menuTop }}>
            <button
              onClick={() => {
                s.openApplication(actions);
                setActions('');
              }}
            >
              Open Application
            </button>
            <button
              onClick={() => {
                const lb = s.lbs.find((l) => l.id === actions);
                if (lb) {
                  setViewOnly(true);
                  setForm(lb);
                }
                setActions('');
              }}
            >
              Manage Configuration
            </button>
            <button
              onClick={() => {
                s.selectLb(actions);
                setActions('');
              }}
            >
              Performance Monitoring
            </button>
            <button
              onClick={() => {
                s.selectLb(actions, 'Security');
                setActions('');
              }}
            >
              Security Monitoring
            </button>
          </div>
        </>
      )}
      {removing && (
        <Dialog
          open
          onOpenChange={() => setRemoving(null)}
          title="Delete HTTP Load Balancer?"
          description={`Delete ${removing.name}, its demo request events, and discovered API inventory?`}
        >
          <div className="confirm-body">This action only affects your local simulation data.</div>
          <div className="form-footer">
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                s.deleteLb(removing.id);
                notify(`${removing.name} deleted`);
                setRemoving(null);
              }}
            >
              Delete load balancer
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
export function ConfigResources({
  kind,
  notify,
}: {
  kind: 'origin' | 'waf' | 'policy';
  notify: Notify;
}) {
  const s = useConsole();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Origin | Waf | Policy | 'new' | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [actions, setActions] = useState('');
  const [menuTop, setMenuTop] = useState(180);
  const title =
    kind === 'origin' ? 'Origin Pools' : kind === 'waf' ? 'App Firewall' : 'Service Policies';
  const single =
    kind === 'origin' ? 'Origin Pool' : kind === 'waf' ? 'App Firewall' : 'Service Policy';
  const items = (kind === 'origin' ? s.origins : kind === 'waf' ? s.wafs : s.policies).filter(
    (o) => (o.namespace === s.namespace || kind === 'waf' && o.namespace === 'shared') && o.name.toLowerCase().includes(search.toLowerCase()),
  );
  if (['origin'].includes(kind)) return <OriginPoolList notify={notify} />;
  return (
    <>
      <PageHeading
        title={title}
        description={
          kind === 'origin'
            ? 'Configure application backends and simulate origin health.'
            : kind === 'waf'
              ? 'Define web application firewall policies and enforcement modes.'
              : 'Manage a local inventory of allow and deny policy configurations.'
        }
      >
        <Button
          onClick={() => {
            setViewOnly(false);
            setForm('new');
          }}
        >
          <Plus size={16} />
          Add {single}
        </Button>
      </PageHeading>
      {kind === 'policy' && (
        <SectionNote>
          Service policies are editable configuration examples. Attaching and evaluating network
          policy rules is not implemented.
        </SectionNote>
      )}
      <Card>
        <div className="table-toolbar">
          <SearchInput value={search} onChange={setSearch} />
          <span className="muted">{items.length} resources</span>
        </div>
        {items.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>
                    {kind === 'origin'
                      ? 'Origin server'
                      : kind === 'waf'
                        ? 'Namespace'
                        : 'Action'}
                  </th>
                  {kind !== 'waf' && <th>{kind === 'policy' ? 'Enabled' : 'Applied to'}</th>}
                  <th>{kind === 'origin' ? 'Health / simulation' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button
                        className="resource-link"
                        onClick={() => {
                          setViewOnly(kind === 'waf');
                          setForm(item);
                        }}
                      >
                        {item.name}
                      </button>
                    </td>
                    <td>
                      {'endpoint' in item ? (
                        <span className="mono">
                          {item.endpoint}:{item.port}
                        </span>
                      ) : 'mode' in item ? (
                        item.namespace
                      ) : (
                        <Badge tone={item.action === 'Deny' ? 'red' : 'blue'}>{item.action}</Badge>
                      )}
                    </td>
                    {kind !== 'waf' && <td>
                      {'enabled' in item ? (
                        <Switch
                          aria-label={`Enable ${item.name}`}
                          checked={item.enabled}
                          onCheckedChange={(v) => s.savePolicy({ ...item, enabled: v })}
                        />
                      ) : (
                        <button
                          className="resource-link"
                          onClick={() =>
                            s.navigate('Web App & API Protection', 'HTTP Load Balancers')
                          }
                        >
                          {
                            s.lbs.filter(
                              (l) =>
                                l.originId === item.id ||
                                l.wafId === item.id ||
                                l.config?.routes.some((r) => r.wafId === item.id),
                            ).length
                          }{' '}
                          load balancers
                        </button>
                      )}
                    </td>}
                    <td>
                      <div className="row-actions">
                        {'healthy' in item && (
                          <>
                            <Status healthy={item.healthy} />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => s.setOriginHealth(item.id, !item.healthy)}
                            >
                              {item.healthy ? 'Simulate failure' : 'Recover'}
                            </Button>
                          </>
                        )}
                        {kind !== 'waf' && 'mode' in item && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              s.saveWaf({
                                ...item,
                                mode: item.mode === 'Blocking' ? 'Monitoring' : 'Blocking',
                              });
                              notify('WAF mode saved; future console requests use the new mode');
                            }}
                          >
                            Switch to {item.mode === 'Blocking' ? 'Monitoring' : 'Blocking'}
                          </Button>
                        )}
                        {kind !== 'waf' && <button
                          className="icon-button"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => {
                            setViewOnly(false);
                            setForm(item);
                          }}
                        >
                          <Pencil size={15} />
                        </button>}
                        {kind === 'waf' && (
                          <button
                            className="icon-button"
                            aria-label={`Actions for ${item.name}`}
                            aria-expanded={actions === item.id}
                            onClick={(e) => {
                              setMenuTop(
                                Math.min(
                                  e.currentTarget.getBoundingClientRect().bottom + 4,
                                  window.innerHeight - 110,
                                ),
                              );
                              setActions(actions === item.id ? '' : item.id);
                            }}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </Card>
      {actions && (
        <>
          <button
            className="resource-menu-scrim"
            aria-label="Close actions menu"
            onClick={() => setActions('')}
          />
          <div className="resource-context-menu" style={{ top: menuTop }}>
            <button
              onClick={() => {
                const item = s.wafs.find((w) => w.id === actions);
                if (item) {
                  setViewOnly(true);
                  setForm(item);
                }
                setActions('');
              }}
            >
              Manage Configuration
            </button>
          </div>
        </>
      )}
      {form &&
        (kind === 'waf' ? (
          <WafEditor
            initial={form === 'new' ? undefined : (form as Waf)}
            close={() => setForm(null)}
            notify={notify}
            viewOnly={viewOnly}
          />
        ) : kind === 'origin' ? (
          <OriginEditor
            initial={form === 'new' ? undefined : (form as Origin)}
            close={() => setForm(null)}
            notify={notify}
          />
        ) : (
          <ResourceForm
            type="policy"
            initial={form === 'new' ? undefined : (form as Policy)}
            close={() => setForm(null)}
            notify={notify}
          />
        ))}
    </>
  );
}
export function ApiPages({
  protection = false,
  bot = false,
  openLab,
  notify,
}: {
  protection?: boolean;
  bot?: boolean;
  openLab: () => void;
  notify: Notify;
}) {
  const s = useConsole();
  const [filter, setFilter] = useState('All endpoints');
  const [search, setSearch] = useState('');
  const endpoints = s.endpoints.filter(
    (e) =>
      e.namespace === s.namespace &&
      `${e.path} ${e.method}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'All endpoints' || (filter === 'Shadow APIs' ? e.shadow : !e.shadow)),
  );
  const lbs = s.lbs.filter((l) => l.namespace === s.namespace);
  const title = bot ? 'Bot Defense' : protection ? 'API Protection' : 'API Discovery';
  return (
    <>
      <PageHeading
        title={title}
        description={
          bot
            ? 'Manage bot mitigation for your applications and review automated traffic.'
            : protection
              ? 'Enforce simulated schema validation at the application edge.'
              : 'Discover, review, and inventory APIs across your applications.'
        }
      >
        <Button onClick={openLab}>
          <Plus size={15} />
          Run a simulation
        </Button>
      </PageHeading>
      {!protection && !bot ? (
        <>
          <div className="metric-cards">
            <Card>
              <Stat
                label="Discovered endpoints"
                value={s.endpoints.filter((e) => e.namespace === s.namespace).length}
              />
            </Card>
            <Card>
              <Stat
                label="Shadow APIs"
                value={s.endpoints.filter((e) => e.namespace === s.namespace && e.shadow).length}
              />
            </Card>
            <Card>
              <Stat
                label="In API inventory"
                value={s.endpoints.filter((e) => e.namespace === s.namespace && !e.shadow).length}
              />
            </Card>
          </div>
          <Card>
            <div className="table-toolbar">
              <SearchInput value={search} onChange={setSearch} placeholder="Search API paths…" />
              <select
                aria-label="API inventory filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option>All endpoints</option>
                <option>Shadow APIs</option>
                <option>In inventory</option>
              </select>
            </div>
            {endpoints.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th>API endpoint</th>
                      <th>Load balancer</th>
                      <th>Status</th>
                      <th className="numeric">Observed calls</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoints.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <Badge tone={e.method === 'GET' ? 'blue' : 'amber'}>{e.method}</Badge>
                        </td>
                        <td className="mono">{e.path}</td>
                        <td>{s.lbs.find((l) => l.id === e.lbId)?.name}</td>
                        <td>
                          <Badge tone={e.shadow ? 'amber' : 'green'}>
                            {e.shadow ? 'Shadow API' : 'In inventory'}
                          </Badge>
                        </td>
                        <td className="numeric">{e.calls.toLocaleString()}</td>
                        <td>
                          {e.shadow ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                s.adoptEndpoint(e.id);
                                notify('Endpoint added to API inventory');
                              }}
                            >
                              Add to inventory
                            </Button>
                          ) : (
                            <span className="status healthy">
                              <CheckCircle2 size={14} />
                              Reviewed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty />
            )}
          </Card>
        </>
      ) : (
        <>
          <Card title="Application protection settings">
            {lbs.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>HTTP Load Balancer</th>
                      <th>Domain</th>
                      <th>{bot ? 'Bot Defense' : 'API schema protection'}</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lbs.map((l) => {
                      const enabled = bot ? l.botDefense : l.apiProtection;
                      return (
                        <tr key={l.id}>
                          <td>
                            <button className="resource-link" onClick={() => s.selectLb(l.id)}>
                              {l.name}
                            </button>
                          </td>
                          <td>{l.domains[0]}</td>
                          <td>
                            <Switch
                              aria-label={`${title} for ${l.name}`}
                              checked={enabled}
                              onCheckedChange={(value) => {
                                s.saveLb({ ...l, [bot ? 'botDefense' : 'apiProtection']: value });
                                notify(`${title} ${value ? 'enabled' : 'disabled'}`);
                              }}
                            />
                          </td>
                          <td>
                            <Badge tone={enabled ? 'green' : 'neutral'}>
                              {enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
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
          </Card>
          <SectionNote>
            {bot
              ? 'Bot scenarios classify mock traffic as automated. Enabled protection blocks new Bot Detection events.'
              : 'API Schema Violation scenarios produce mock validation failures. Enabled protection blocks new violations; actual OpenAPI parsing is not implemented.'}
          </SectionNote>
        </>
      )}
    </>
  );
}
export function NetworkPages({ page, notify }: { page: string; notify: Notify }) {
  const s = useConsole();
  const sites = s.sites.filter(
    (site) =>
      site.namespace === s.namespace &&
      (page === 'Customer Edge'
        ? site.kind === 'CE'
        : page === 'Regional Edge'
          ? site.kind === 'RE'
          : true),
  );
  const ces = s.sites.filter((site) => site.namespace === s.namespace && site.kind === 'CE');
  return (
    <>
      <PageHeading
        title={page}
        description="Explore simulated edge sites and connectivity across your distributed network."
      >
        <ExportButton data={sites} name="network-sites" />
      </PageHeading>
      <div className="metric-cards">
        <Card>
          <Stat label="Customer Edge sites" value={ces.length} />
        </Card>
        <Card>
          <Stat label="Online customer edges" value={ces.filter((site) => site.online).length} />
        </Card>
        <Card>
          <Stat
            label="Regional Edge sites"
            value={
              s.sites.filter((site) => site.namespace === s.namespace && site.kind === 'RE').length
            }
          />
        </Card>
      </div>
      {page === 'Connectivity' || page === 'Virtual Networks' ? (
        <>
          <Card
            title={
              page === 'Connectivity' ? 'Site connectivity' : 'Virtual network · training-network'
            }
          >
            <div className="network-topology">
              <div className="network-cloud">
                <Globe2 size={35} />
                <strong>F5 Global Network</strong>
                <Badge tone="blue">Simulated backbone</Badge>
              </div>
              <div className="network-connections">
                {ces.map((site) => (
                  <div className={`network-edge ${site.online ? '' : 'offline'}`} key={site.id}>
                    <span className="connection-line" />
                    <Server size={22} />
                    <div>
                      <strong>{site.name}</strong>
                      <small>{site.region}</small>
                    </div>
                    <Status
                      healthy={site.online}
                      label={site.online ? 'Connected' : 'Disconnected'}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        s.setSiteStatus(site.id, !site.online);
                        notify('Edge connectivity updated');
                      }}
                    >
                      {site.online ? 'Take offline' : 'Bring online'}
                    </Button>
                  </div>
                ))}
                {!ces.length && (
                  <Empty
                    title="No CE sites in this namespace"
                    description="Switch to social-hawk to explore the seeded topology."
                  />
                )}
              </div>
            </div>
          </Card>
          {page === 'Virtual Networks' && (
            <SectionNote>
              <Network size={17} />
              Training topology: CE routes 10.10.0.0/16 and 10.20.0.0/16. Virtual network creation
              and routing configuration are not implemented.
            </SectionNote>
          )}
        </>
      ) : (
        <Card title="Sites">
          {sites.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Site name</th>
                    <th>Type</th>
                    <th>Region</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Simulation</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site) => (
                    <tr key={site.id}>
                      <td>
                        <span className="resource-name">
                          <Server size={15} />
                          {site.name}
                        </span>
                      </td>
                      <td>
                        <Badge tone="blue">{site.kind}</Badge>
                      </td>
                      <td>{site.region}</td>
                      <td className="mono">{site.address}</td>
                      <td>
                        <Status healthy={site.online} label={site.online ? 'Online' : 'Offline'} />
                      </td>
                      <td>
                        {site.kind === 'CE' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              s.setSiteStatus(site.id, !site.online);
                              notify(`${site.name} ${site.online ? 'offline' : 'online'}`);
                            }}
                          >
                            {site.online ? 'Take offline' : 'Bring online'}
                          </Button>
                        ) : (
                          <span className="muted">Regional Edge</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty />
          )}
        </Card>
      )}
    </>
  );
}
