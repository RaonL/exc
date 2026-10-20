import { useState } from 'react';
import {
  PlusCircle,
  RefreshCw,
  MoreHorizontal,
  ChevronRight,
  Pencil,
  Copy,
  Info,
  Settings,
} from 'lucide-react';
import { useConsole } from '../store';
import type { Origin } from '../types';
import { OriginEditor } from './OriginEditor';
import { Dialog } from './ui/dialog';
export function OriginPoolList({ notify }: { notify: (message: string) => void }) {
  const s = useConsole();
  const [query, setQuery] = useState(''),
    [form, setForm] = useState<Origin | 'new' | null>(null),
    [view, setView] = useState(false),
    [menu, setMenu] = useState(''),
    [info, setInfo] = useState('');
  const namespaceItems = s.origins.filter((o) => o.namespace === s.namespace);
  const items = s.origins.filter(
    (o) => o.namespace === s.namespace && o.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="xc-resource-page origin-pool-page">
      {!namespaceItems.length ? (
        <div className="origin-pool-empty">
          <svg viewBox="0 0 80 96" width="74" height="90" aria-hidden="true">
            <path
              d="M19 43 L26 85 Q40 94 55 85 L62 43"
              fill="white"
              stroke="#17234f"
              strokeWidth="1.3"
            />
            <path d="M23 61 Q40 70 59 61 L57 71 Q40 81 25 71Z" fill="#e40036" />
            <ellipse
              cx="40"
              cy="43"
              rx="22"
              ry="9"
              fill="#ccd7ff"
              stroke="#17234f"
              strokeWidth="1.3"
            />
            <path
              d="M34 43 Q25 26 41 18 Q39 29 47 32 Q51 37 45 45"
              fill="#ccd7ff"
              stroke="#17234f"
            />
            <path
              d="M40 5v8 M23 12l5 6 M16 26l9 2 M59 13l-6 7 M66 28l-9 2"
              stroke="#e40036"
              strokeWidth="1.5"
            />
          </svg>
          <h2>No Origin Pools added yet</h2>
          <button
            className="btn btn-primary"
            onClick={() => {
              setView(false);
              setForm('new');
            }}
          >
            Add Origin Pool
          </button>
        </div>
      ) : (
        <>
          <div className="xc-resource-bar">
            <button
              onClick={() => {
                setView(false);
                setForm('new');
              }}
            >
              <PlusCircle size={20} /> Add Origin Pool
            </button>
            <button onClick={() => notify('Refreshed local Origin Pools')}>
              <RefreshCw size={20} /> Refresh
            </button>
          </div>
          <div className="card xc-resource-list">
            <div className="xc-list-toolbar">
              <span>
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
              <input
                aria-label="Search Origin Pools"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Settings size={21} />
            </div>
            <table>
              <thead>
                <tr>
                  <th />
                  <th>
                    <input type="checkbox" aria-label="Select all Origin Pools" />
                  </th>
                  <th>Name</th>
                  <th>Namespace</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <button
                        aria-label={'View ' + o.name}
                        onClick={() => {
                          setView(true);
                          setForm(o);
                        }}
                      >
                        <ChevronRight size={19} />
                      </button>
                    </td>
                    <td>
                      <input type="checkbox" aria-label={'Select ' + o.name} />
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setView(true);
                          setForm(o);
                        }}
                      >
                        {o.name}
                      </button>
                    </td>
                    <td>{o.namespace}</td>
                    <td className="xc-actions-cell">
                      <button
                        className="xc-ellipsis"
                        aria-label={'Actions for ' + o.name}
                        aria-expanded={menu === o.id}
                        onClick={() => setMenu(menu === o.id ? '' : o.id)}
                      >
                        <MoreHorizontal size={24} />
                      </button>
                      {menu === o.id && (
                        <div className="xc-row-menu">
                          <button
                            onClick={() => {
                              setView(true);
                              setForm(o);
                              setMenu('');
                            }}
                          >
                            <Pencil size={19} /> Manage Configuration
                          </button>
                          <button
                            onClick={() => {
                              s.saveOrigin({
                                ...structuredClone(o),
                                id: crypto.randomUUID(),
                                name: o.name + '-copy-' + Date.now().toString().slice(-4),
                              });
                              setMenu('');
                              notify('Local Origin Pool cloned');
                            }}
                          >
                            <Copy size={19} /> Clone Object
                          </button>
                          <button
                            onClick={() => {
                              setInfo('Origin endpoint: ' + o.endpoint + ':' + o.port);
                              setMenu('');
                            }}
                          >
                            <Info size={19} /> Show Child Objects
                          </button>
                          <button
                            onClick={() => {
                              setInfo(
                                'Referring HTTP Load Balancers: ' +
                                  (s.lbs
                                    .filter(
                                      (l) =>
                                        l.originId === o.id ||
                                        l.config?.routes.some((r) => r.originId === o.id),
                                    )
                                    .map((l) => l.name)
                                    .join(', ') || 'None'),
                              );
                              setMenu('');
                            }}
                          >
                            <Info size={19} /> Show Referring Objects
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length && <p className="xc-empty-row">No resources found</p>}
          </div>
        </>
      )}
      {form && (
        <OriginEditor
          key={form === 'new' ? 'new' : form.id + String(view)}
          initial={form === 'new' ? undefined : form}
          viewOnly={view}
          close={() => setForm(null)}
          notify={notify}
        />
      )}
      {info && (
        <Dialog open title="Object References" onOpenChange={() => setInfo('')}>
          <p>{info}</p>
        </Dialog>
      )}
    </div>
  );
}
