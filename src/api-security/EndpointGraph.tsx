import { useState } from 'react';
import { pathSegments, type DashboardRow } from './dashboard';

/** Prefix selection preserves the path context when identical segment names recur. */
export function EndpointGraph({
  rows,
  onSelect,
}: {
  rows: DashboardRow[];
  onSelect: (row: DashboardRow) => void;
}) {
  const [prefix, setPrefix] = useState<string[]>([]);
  const depth = Math.max(1, ...rows.map((r) => pathSegments(r.path).length));
  return (
    <div className="api-segment-graph" aria-label="API path segment graph">
      <div className="api-segment-toolbar">
        <button type="button" onClick={() => setPrefix([])}>
          All paths
        </button>
        <span>{prefix.length ? '/' + prefix.join('/') : 'Select a segment to explore paths'}</span>
      </div>
      <div className="api-segment-columns">
        {Array.from({ length: depth }, (_, i) => {
          const matching = rows.filter((r) =>
            prefix.slice(0, i).every((p, n) => pathSegments(r.path)[n] === p),
          );
          const segments = [
            ...new Map(
              matching
                .filter((r) => pathSegments(r.path).length > i)
                .map((r) => {
                  const path = pathSegments(r.path).slice(0, i + 1);
                  return [JSON.stringify(path), path] as const;
                }),
            ).values(),
          ];
          return (
            <section key={i} className="api-segment-column">
              <h3>Segment {i + 1}</h3>
              {segments.map((path) => (
                <button
                  type="button"
                  aria-pressed={path.every((p, n) => prefix[n] === p)}
                  key={JSON.stringify(path)}
                  title={'/' + path.join('/')}
                  onClick={() => setPrefix(path)}
                >
                  <span>{path[i]}</span>
                  <small>
                    {
                      matching.filter((r) => path.every((p, n) => pathSegments(r.path)[n] === p))
                        .length
                    }{' '}
                    endpoints
                  </small>
                </button>
              ))}
            </section>
          );
        })}
      </div>
      <div className="api-segment-results" aria-label="Endpoints in selected path">
        {rows
          .filter((r) => prefix.every((p, n) => pathSegments(r.path)[n] === p))
          .map((r) => (
            <button type="button" key={r.key} onClick={() => onSelect(r)}>
              {r.method} {r.path}
            </button>
          ))}
      </div>
    </div>
  );
}
