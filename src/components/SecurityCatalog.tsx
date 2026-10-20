import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  catalogSources,
  filterCatalog,
  normalizeCatalog,
  type CatalogEntry,
  type CatalogKind,
} from '../lib/security-catalog';
import { PageHeading, SearchInput } from './common';
import { Button } from './ui/button';
import './security-catalog.css';
import { CatalogTestPanel } from './CatalogTestPanel';

export function SecurityCatalog() {
  const [kind, setKind] = useState<CatalogKind>('signatures');
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [selected, setSelected] = useState<CatalogEntry>();
  const [query, setQuery] = useState(''),
    [risk, setRisk] = useState('All'),
    [page, setPage] = useState(0);
  const [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  const term = useDeferredValue(query);
  const source = catalogSources[kind];
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setEntries([]);
    setSelected(undefined);
    fetch(`${import.meta.env.BASE_URL}security-catalog/${source.file}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((value) => {
        const data = normalizeCatalog(value, kind);
        setEntries(data);
        setSelected(data[0]);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : 'Unable to load catalog.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [kind, source.file, retry]);
  const filtered = useMemo(() => filterCatalog(entries, term, risk), [entries, term, risk]);
  const risks = useMemo(() => [...new Set(entries.map((entry) => entry.risk))].sort(), [entries]);
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const currentPage = Math.min(page, pages - 1);
  return (
    <>
      <PageHeading
        title="Security Catalog"
        description="사용자 제공 보안 정의 자료 · 발생 이벤트 및 실제 F5 탐지 엔진과 별도입니다."
      />
      <div className="catalog-note">
        비공식 학습용 자료입니다. 항목을 읽는 것만으로 정책이 설치되거나 요청이 차단되지는 않습니다.
        원문 설명은 제공 파일의 스냅샷이며 최신성은 검증하지 않았습니다.
      </div>
      <div className="catalog-kinds" aria-label="Catalog type">
        {(Object.keys(catalogSources) as CatalogKind[]).map((key) => (
          <button
            key={key}
            aria-pressed={kind === key}
            onClick={() => {
              setKind(key);
              setQuery('');
              setRisk('All');
              setPage(0);
            }}
          >
            {catalogSources[key].title} <span>{catalogSources[key].count.toLocaleString()}</span>
          </button>
        ))}
      </div>
      <p className="catalog-source">
        Source: {source.file} · Local file snapshot · Namespace 공통 참고 자료
      </p>
      {loading ? (
        <div className="catalog-loading" role="status" aria-busy="true">
          정의 자료를 불러오는 중…
        </div>
      ) : error ? (
        <div role="alert" className="catalog-note">
          자료를 읽지 못했습니다: {error}{' '}
          <Button onClick={() => setRetry((value) => value + 1)}>Retry</Button>
        </div>
      ) : (
        <>
          <div className="table-toolbar">
            <SearchInput
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(0);
              }}
              placeholder="Search ID, name or category…"
            />
            <label>
              Risk / Severity{' '}
              <select
                aria-label="Catalog risk or severity"
                value={risk}
                onChange={(event) => {
                  setRisk(event.target.value);
                  setPage(0);
                }}
              >
                <option>All</option>
                {risks.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <span role="status">
              {filtered.length.toLocaleString()} / {entries.length.toLocaleString()} items
            </span>
          </div>
          <div className="catalog-layout">
            <section className="catalog-list" aria-label="Catalog entries">
              <div
                className="catalog-table"
                role="region"
                aria-label="Security catalog table"
                tabIndex={0}
              >
                <table>
                  <thead>
                    <tr>
                      <th>ID / Name</th>
                      <th>Category</th>
                      <th>Risk / Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(currentPage * 25, currentPage * 25 + 25).map((entry, index) => (
                      <tr
                        key={`${entry.id}-${index}`}
                        className={selected === entry ? 'selected' : ''}
                      >
                        <td>
                          <button
                            aria-pressed={selected === entry}
                            onClick={() => setSelected(entry)}
                          >
                            {entry.name}
                          </button>
                          <small>{entry.id}</small>
                        </td>
                        <td>{entry.category || 'Not supplied'}</td>
                        <td>{entry.risk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filtered.length && (
                  <p className="catalog-empty">검색 결과가 없습니다. 검색어나 필터를 변경하세요.</p>
                )}
              </div>
              <div className="catalog-pagination">
                <Button
                  variant="outline"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <span>
                  {currentPage + 1} / {pages}
                </span>
                <Button
                  variant="outline"
                  disabled={currentPage + 1 === pages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </section>
            <section className="catalog-detail" aria-label="Catalog item details">
              {selected ? (
                <>
                  <p className="catalog-source">선택한 참고 항목 · 실제 탐지 이벤트 아님</p>
                  <h2>{selected.name}</h2>
                  <p>ID: {selected.id}</p>
                  {(kind === 'signatures' || kind === 'bots') && (
                    <CatalogTestPanel key={`${kind}-${selected.id}`} kind={kind} entry={selected} />
                  )}
                  <dl>
                    <dt>Category</dt>
                    <dd>{selected.category || 'Not supplied'}</dd>
                    <dt>Risk / Severity</dt>
                    <dd>{selected.risk}</dd>
                    {selected.accuracy && (
                      <>
                        <dt>Accuracy</dt>
                        <dd>{selected.accuracy}</dd>
                      </>
                    )}
                    {!!selected.systems.length && (
                      <>
                        <dt>Systems</dt>
                        <dd>{selected.systems.join(', ')}</dd>
                      </>
                    )}
                  </dl>
                  <h3>Description · 원문 설명</h3>
                  <p className="catalog-description">
                    {selected.description ||
                      '제공 파일에 설명이 없습니다. 분류·위험도와 원본 필드를 참고하세요.'}
                  </p>
                  {selected.action && (
                    <>
                      <h3>Suggested action · 원문 권고</h3>
                      <p className="catalog-description">{selected.action}</p>
                    </>
                  )}
                  <details>
                    <summary>Original JSON · 원본 항목</summary>
                    <pre>{JSON.stringify(selected.original, null, 2)}</pre>
                  </details>
                </>
              ) : (
                <p>항목을 선택하세요.</p>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
