import { useState, type FormEvent } from 'react';
import { Plus, Pencil, RotateCcw, Save, Building2, Layers, Users, ShieldCheck } from 'lucide-react';
import { useConsole } from '../store';
import type { User } from '../types';
import {
  Badge,
  Card,
  Empty,
  ExportButton,
  PageHeading,
  SearchInput,
  SectionNote,
  time,
} from './common';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { Field, ResourceForm } from './forms';
export function ActivityPage({ audit = false }: { audit?: boolean }) {
  const s = useConsole();
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('Current namespace');
  const items = s.activity.filter(
    (a) =>
      (scope === 'All namespaces' || a.namespace === s.namespace) &&
      `${a.message} ${a.actor} ${a.namespace}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title={audit ? 'Audit Logs' : 'Recent Activity'}
        description="A local history of configuration changes and simulation actions."
      >
        <ExportButton data={items} name="audit-log" />
      </PageHeading>
      <Card>
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search actions or actors…"
          />
          <select
            aria-label="Activity scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option>Current namespace</option>
            <option>All namespaces</option>
          </select>
        </div>
        {items.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Activity</th>
                  <th>Namespace</th>
                  <th>Actor</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td className="muted nowrap">{time(a.timestamp)}</td>
                    <td>{a.message}</td>
                    <td>
                      <Badge>{a.namespace}</Badge>
                    </td>
                    <td>{a.actor}</td>
                    <td>
                      <Badge tone="green">Success</Badge>
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
  );
}
export function Administration({
  page,
  notify,
}: {
  page: string;
  notify: (message: string) => void;
}) {
  const s = useConsole();
  const [form, setForm] = useState<User | 'new-user' | 'namespace' | null>(null);
  const [settings, setSettings] = useState(s.settings);
  const [confirm, setConfirm] = useState(false);
  const [search, setSearch] = useState('');
  const saveSettings = (e: FormEvent) => {
    e.preventDefault();
    s.saveSettings(settings);
    notify('System settings saved');
  };
  if (page === 'Audit Logs') return <ActivityPage audit />;
  return (
    <>
      <PageHeading
        title={page}
        description={
          page === 'System Settings'
            ? 'Manage your local training environment and demo data.'
            : 'Manage your simulated tenant, namespaces, and user directory.'
        }
      >
        {page !== 'System Settings' && (
          <Button onClick={() => setForm(page === 'Users / Roles' ? 'new-user' : 'namespace')}>
            <Plus size={16} />
            Add {page === 'Users / Roles' ? 'User' : 'namespace'}
          </Button>
        )}
      </PageHeading>
      {page === 'Tenant / Namespace' && (
        <>
          <Card title="Tenant information">
            <div className="tenant-information">
              <div className="tenant-icon">
                <Building2 size={29} />
              </div>
              <div>
                <h3>{s.settings.tenant}</h3>
                <p>Distributed Cloud Services · Training tenant</p>
              </div>
              <Badge tone="blue">Simulation Mode</Badge>
            </div>
          </Card>
          <Card title="Namespaces">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Namespace</th>
                    <th>HTTP Load Balancers</th>
                    <th>Origin Pools</th>
                    <th>Selection</th>
                  </tr>
                </thead>
                <tbody>
                  {s.namespaces.map((ns) => (
                    <tr key={ns}>
                      <td>
                        <span className="resource-name">
                          <Layers size={15} />
                          {ns}
                        </span>
                      </td>
                      <td>{s.lbs.filter((l) => l.namespace === ns).length}</td>
                      <td>{s.origins.filter((o) => o.namespace === ns).length}</td>
                      <td>
                        {s.namespace === ns ? (
                          <Badge tone="green">Current namespace</Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              s.setNamespace(ns);
                              notify(`Switched to ${ns}`);
                            }}
                          >
                            Switch namespace
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
      {page === 'Users / Roles' && (
        <>
          <SectionNote>
            <Users size={16} />
            Local demo directory. Role selection is saved for training; sign-in, invitations, and
            access enforcement are not implemented.
          </SectionNote>
          <Card>
            <div className="table-toolbar">
              <SearchInput value={search} onChange={setSearch} placeholder="Search users…" />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {s.users
                    .filter((u) =>
                      `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((u) => (
                      <tr key={u.id}>
                        <td>
                          <span className="resource-name">
                            <div className="avatar">{u.name[0]}</div>
                            {u.name}
                          </span>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <Badge tone={u.role === 'Admin' ? 'blue' : 'neutral'}>{u.role}</Badge>
                        </td>
                        <td>
                          <Badge tone="green">Active (demo)</Badge>
                        </td>
                        <td>
                          <button
                            className="icon-button"
                            aria-label={`Edit ${u.name}`}
                            onClick={() => setForm(u)}
                          >
                            <Pencil size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
      {page === 'System Settings' && (
        <>
          <Card title="General settings">
            <form className="settings-form" onSubmit={saveSettings}>
              <Field label="Tenant display name">
                <input
                  required
                  maxLength={80}
                  value={settings.tenant}
                  onChange={(e) => setSettings((v) => ({ ...v, tenant: e.target.value }))}
                />
              </Field>
              <Field label="Contact email">
                <input
                  type="email"
                  required
                  value={settings.email}
                  onChange={(e) => setSettings((v) => ({ ...v, email: e.target.value }))}
                />
              </Field>
              <Field
                label="Simulated event retention"
                hint="Applied when generating new request events."
              >
                <select
                  value={settings.retention}
                  onChange={(e) =>
                    setSettings((v) => ({ ...v, retention: Number(e.target.value) }))
                  }
                >
                  <option value={1}>1 day</option>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                </select>
              </Field>
              <Button type="submit">
                <Save size={15} />
                Save settings
              </Button>
            </form>
          </Card>
          <Card title="Demo data">
            <div className="reset-row">
              <div>
                <h3>Reset your training environment</h3>
                <p>
                  Restore seed resources, request counters, events, and settings. All local edits
                  will be removed.
                </p>
              </div>
              <Button variant="destructive" onClick={() => setConfirm(true)}>
                <RotateCcw size={14} />
                Reset Demo Data
              </Button>
            </div>
          </Card>
          <SectionNote>
            <ShieldCheck size={16} />
            Data is saved under localStorage key <code>f5-xc-simulator-v1</code>. Browser profiles
            and devices do not share state.
          </SectionNote>
        </>
      )}
      {form && (
        <ResourceForm
          type={form === 'namespace' ? 'namespace' : 'user'}
          initial={typeof form === 'object' ? form : undefined}
          close={() => setForm(null)}
          notify={notify}
        />
      )}
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Reset all demo data?"
        description="This restores every namespace, resource, user, event, and setting to the original seed data."
      >
        <div className="confirm-body">
          Your current simulation changes will be removed from this browser.
        </div>
        <div className="form-footer">
          <Button variant="outline" onClick={() => setConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              s.reset();
              setSettings(useConsole.getState().settings);
              setConfirm(false);
              notify('Demo data restored');
            }}
          >
            Reset Demo Data
          </Button>
        </div>
      </Dialog>
    </>
  );
}
