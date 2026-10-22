import { useState } from 'react';
import { MoreHorizontal, PlusCircle, RefreshCw } from 'lucide-react';
import { useConsole } from '../store';
import { ConfigurationEditor } from '../components/ConfigurationEditor';
import { Field } from '../components/form-fields';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { resourceDefinitions, type ResourcePage } from './resource-catalog';
import { useNavigationResources, type LocalResource } from './store';

function ResourceEditor({
  page,
  initial,
  close,
}: {
  page: ResourcePage;
  initial?: LocalResource;
  close: () => void;
}) {
  const namespace = useConsole((s) => s.namespace),
    save = useNavigationResources((s) => s.save),
    definition = resourceDefinitions[page];
  const [draft, setDraft] = useState<LocalResource>(() =>
    structuredClone(
      initial ?? {
        id: crypto.randomUUID(),
        page,
        namespace,
        name: '',
        description: '',
        values: Object.fromEntries(definition.fields.map((f) => [f.name, f.initial ?? ''])),
        updatedAt: '',
      },
    ),
  );
  const [view, setView] = useState(!!initial),
    [error, setError] = useState('');
  const change = (name: string, value: string) =>
    setDraft((d) => ({ ...d, values: { ...d.values, [name]: value } }));
  return (
    <ConfigurationEditor
      kind={definition.singular}
      className="reference-editor"
      name={initial?.name ?? ''}
      namespace={namespace}
      readOnly={view}
      onEdit={() => setView(false)}
      value={draft}
      close={close}
      guide="https://docs.cloud.f5.com/docs-v2"
      error={error}
      submitLabel={`Save ${definition.singular}`}
      onSave={(e) => {
        e.preventDefault();
        try {
          save({ ...draft, updatedAt: new Date().toISOString() });
          close();
        } catch (e) {
          setError(String(e instanceof Error ? e.message : e));
        }
      }}
      sections={[
        {
          id: 'metadata',
          title: 'Metadata',
          content: (
            <>
              <Field label="Name *">
                <input
                  required
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                />
              </Field>
            </>
          ),
        },
        {
          id: 'configuration',
          title: `${definition.singular} Configuration`,
          content: (
            <>
              {definition.fields.map((f) => (
                <Field label={f.name} key={f.name}>
                  {f.options ? (
                    <select
                      value={draft.values[f.name] ?? f.initial ?? ''}
                      onChange={(e) => change(f.name, e.target.value)}
                    >
                      {f.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type ?? 'text'}
                      min={f.type === 'number' ? 1 : undefined}
                      maxLength={f.type ? undefined : 4000}
                      value={draft.values[f.name] ?? ''}
                      onChange={(e) => change(f.name, e.target.value)}
                    />
                  )}
                </Field>
              ))}
              <p className="configuration-help">
                로컬 구성·조회용 폼입니다. 이 추가 리소스는 실제 서비스나 기존 Class 정책 엔진에
                자동 적용되지 않습니다.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
export function LocalResourcePage({ page }: { page: ResourcePage }) {
  const namespace = useConsole((s) => s.namespace),
    s = useNavigationResources(),
    definition = resourceDefinitions[page];
  const [query, setQuery] = useState(''),
    [form, setForm] = useState<LocalResource | 'new' | null>(null),
    [remove, setRemove] = useState<LocalResource | null>(null),
    [menu, setMenu] = useState(''),
    [refreshed, setRefreshed] = useState(false);
  const rows = s.resources.filter(
    (r) =>
      r.page === page &&
      r.namespace === namespace &&
      r.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="xc-resource-page waap-resource-page">
      <div className="waap-resource-toolbar">
        <Button variant="ghost" onClick={() => setForm('new')}>
          <PlusCircle size={16} />
          Add {definition.singular}
        </Button>
        <Button variant="ghost" onClick={() => setRefreshed(true)}>
          <RefreshCw size={15} />
          Refresh
        </Button>
      </div>
      <p className="waap-local-caption">
        Local configuration · 로컬 저장 및 조회 · 실제 배포 없음{refreshed && ' · Updated just now'}
      </p>
      <section className="waap-resource-table">
        <div className="table-toolbar">
          <span>{rows.length} items</span>
          <input
            aria-label={`Search ${page}`}
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  'Name',
                  'Namespace',
                  definition.fields[0]?.name ?? 'Description',
                  'Updated',
                  'Actions',
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <button className="resource-link" onClick={() => setForm(r)}>
                      {r.name}
                    </button>
                  </td>
                  <td>{r.namespace}</td>
                  <td>{r.values[definition.fields[0]?.name] || '—'}</td>
                  <td>{new Date(r.updatedAt).toLocaleString()}</td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`Actions for ${r.name}`}
                      aria-expanded={menu === r.id}
                      onClick={() => setMenu(menu === r.id ? '' : r.id)}
                    >
                      <MoreHorizontal size={17} />
                    </button>
                    {menu === r.id && (
                      <div className="waap-row-menu">
                        <button
                          onClick={() => {
                            setForm(r);
                            setMenu('');
                          }}
                        >
                          Manage Configuration
                        </button>
                        <button
                          onClick={() => {
                            setRemove(r);
                            setMenu('');
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="waap-resource-empty">
            No {page.toLowerCase()} found. Add {definition.singular} to configure a local example.
          </p>
        )}
      </section>
      {form && (
        <ResourceEditor
          page={page}
          initial={form === 'new' ? undefined : form}
          close={() => setForm(null)}
        />
      )}
      {remove && (
        <Dialog
          open
          onOpenChange={() => setRemove(null)}
          title={`Delete ${remove.name}?`}
          description="Delete this local reference configuration only."
        >
          <Button variant="outline" onClick={() => setRemove(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              s.remove(remove.id);
              setRemove(null);
            }}
          >
            Delete
          </Button>
        </Dialog>
      )}
    </div>
  );
}
