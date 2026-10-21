import { useState } from 'react';
import { useConsole } from '../store';
import { useApiSecurity, type FileResource, type Definition, type Integration } from './store';
import { demoText } from './model';
import { Choice, SecretField, sources } from './ApiSettingsFields';
import { ConfigurationEditor } from '../components/ConfigurationEditor';
import { Field } from '../components/form-fields';
import { Button } from '../components/ui/button';
export function ApiResourceEditor({
  kind,
  initial,
  close,
}: {
  kind: 'file' | 'definition' | 'integration';
  initial?: FileResource | Definition | Integration;
  close: () => void;
}) {
  const core = useConsole(),
    s = useApiSecurity(),
    [name, setName] = useState(initial?.name ?? ''),
    [description, desc] = useState(initial?.description ?? ''),
    [text, setText] = useState((initial as FileResource)?.text ?? ''),
    [fileIds, setFiles] = useState((initial as Definition)?.fileIds ?? []),
    [data, setData] = useState({
      provider: (initial as Integration)?.provider ?? 'Github Integration',
      username: (initial as Integration)?.username ?? '',
      hostname: (initial as Integration)?.hostname ?? '',
      secret: (initial as Integration)?.secret ?? '',
    }),
    [error, err] = useState('');
  const title =
    kind === 'file'
      ? 'OpenAPI File'
      : kind === 'definition'
        ? 'API Definition'
        : 'Code Base Integration';
  return (
    <ConfigurationEditor
      kind={title}
      className="api-resource-editor reference-editor"
      name={initial?.name ?? ''}
      namespace={core.namespace}
      guide={kind === 'integration' ? sources.discovery : sources.protection}
      close={close}
      error={error}
      value={{
        name,
        description,
        fileIds,
        provider: data.provider,
        secretConfigured: !!data.secret,
      }}
      submitLabel="Save and Exit"
      onSave={(e) => {
        e.preventDefault();
        try {
          const base = {
            id: initial?.id,
            name,
            description,
            namespace: initial?.namespace ?? core.namespace,
          };
          if (kind === 'file') s.saveFile({ ...base, text });
          else if (kind === 'definition') s.saveDefinition({ ...base, fileIds });
          else s.saveIntegration({ ...base, ...data });
          close();
        } catch (e) {
          err(String(e));
        }
      }}
      sections={[
        {
          id: 'metadata',
          title: 'Metadata',
          content: (
            <>
              <Field label="Name">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    kind === 'file'
                      ? 'shop-openapi'
                      : kind === 'definition'
                        ? 'shop-definition'
                        : 'shop-code'
                  }
                />
              </Field>
              <Field label="Description">
                <textarea value={description} onChange={(e) => desc(e.target.value)} />
              </Field>
            </>
          ),
        },
        ...(kind === 'file'
          ? [
              {
                id: 'upload',
                title: 'OpenAPI Upload',
                content: (
                  <>
                    <p>
                      로컬 검증 지원 범위: OpenAPI 3.0.x JSON, 인라인 스키마. YAML·$ref·조합
                      스키마는 미지원이며 오류를 표시합니다. 업로드 제한 2 MB.
                    </p>
                    <Field label="Upload File">
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (f.size > 2 * 1024 * 1024) return err('OpenAPI file exceeds 2 MB.');
                          setText(await f.text());
                        }}
                      />
                    </Field>
                    <Field label="OpenAPI JSON">
                      <textarea rows={15} value={text} onChange={(e) => setText(e.target.value)} />
                    </Field>
                    <Button type="button" variant="outline" onClick={() => setText(demoText)}>
                      Load dummy OpenAPI
                    </Button>
                    <a href="/fixtures/shop-openapi.json" download>
                      Download shop-openapi.json
                    </a>
                  </>
                ),
              },
            ]
          : kind === 'definition'
            ? [
                {
                  id: 'files',
                  title: 'OpenAPI Specification Files',
                  content: (
                    <>
                      <p>Add Item · 먼저 저장한 OpenAPI 파일을 선택합니다.</p>
                      {s.files
                        .filter((f) => f.namespace === core.namespace || f.namespace === 'shared')
                        .map((f) => (
                          <Field key={f.id} label={f.name}>
                            <input
                              type="checkbox"
                              checked={fileIds.includes(f.id)}
                              onChange={(e) =>
                                setFiles(
                                  e.target.checked
                                    ? [...fileIds, f.id]
                                    : fileIds.filter((id) => id !== f.id),
                                )
                              }
                            />
                          </Field>
                        ))}
                      {!s.files.length && (
                        <p>
                          No OpenAPI files. Manage → Files → OpenAPI Files에서 먼저 업로드하세요.
                        </p>
                      )}
                    </>
                  ),
                },
              ]
            : [
                {
                  id: 'integration',
                  title: 'Integration Data',
                  content: (
                    <>
                      <Choice
                        label="Code Base"
                        value={data.provider}
                        values={[
                          'Github Integration',
                          'Github Enterprise Integration',
                          'GitLab Cloud Integration',
                          'GitLab Enterprise Integration',
                          'Azure Repos Integration',
                        ]}
                        change={(provider) => setData({ ...data, provider })}
                      />
                      <Field label="Username (dummy)">
                        <input
                          required
                          value={data.username}
                          onChange={(e) => setData({ ...data, username: e.target.value })}
                        />
                      </Field>
                      {data.provider.includes('Enterprise') && (
                        <Field label="Hostname (display only)">
                          <input
                            value={data.hostname}
                            onChange={(e) => setData({ ...data, hostname: e.target.value })}
                          />
                        </Field>
                      )}
                      <SecretField
                        label="API Key"
                        value={data.secret}
                        change={(secret) => setData({ ...data, secret })}
                      />
                      <p>
                        외부 SCM 접속 없이 더미 Code 검색을 생성합니다. 실제 토큰을 넣지 마세요.
                      </p>
                    </>
                  ),
                },
              ]),
      ]}
    />
  );
}
export function ApiResources({ kind }: { kind: 'file' | 'definition' | 'integration' }) {
  const core = useConsole(),
    s = useApiSecurity(),
    [edit, setEdit] = useState<FileResource | Definition | Integration | null | undefined>(),
    [error, err] = useState(''),
    [query, setQuery] = useState('');
  const title =
      kind === 'file'
        ? 'OpenAPI File'
        : kind === 'definition'
          ? 'API Definition'
          : 'Code Base Integration',
    items = (
      kind === 'file' ? s.files : kind === 'definition' ? s.definitions : s.integrations
    ).filter((i) => i.namespace === core.namespace && i.name.includes(query));
  return (
    <div className="api-resources">
      <div className="api-toolbar">
        <Button variant="ghost" onClick={() => setEdit(null)}>
          ＋ Add {title}
        </Button>
        <Button
          variant="ghost"
          onClick={() => core.navigate('Web App & API Protection', 'API Quickstarts')}
        >
          API Quickstart 실습으로 돌아가기
        </Button>
      </div>
      {error && <p role="alert">{error}</p>}
      <section className="card">
        <div className="api-toolbar">
          <span>{items.length} items</span>
          <input
            aria-label="Search resources"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Namespace</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td>{i.namespace}</td>
                <td>{i.description}</td>
                <td>
                  <Button variant="ghost" onClick={() => setEdit(i)}>
                    Manage Configuration {i.name}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      try {
                        s.deleteResource(kind, i.id, core.lbs);
                      } catch (e) {
                        err(String(e));
                      }
                    }}
                  >
                    Delete {i.name}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && (
          <div className="api-empty">
            <h2>No {title}s added yet</h2>
            <Button onClick={() => setEdit(null)}>Add {title}</Button>
          </div>
        )}
      </section>
      {edit !== undefined && (
        <ApiResourceEditor
          kind={kind}
          initial={edit ?? undefined}
          close={() => setEdit(undefined)}
        />
      )}
    </div>
  );
}
