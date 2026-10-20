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
  const items = s.origins.filter(
    (o) => o.namespace === s.namespace && o.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="xc-resource-page">
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
