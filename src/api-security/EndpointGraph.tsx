import { useState } from 'react';
import { pathSegments, type DashboardRow } from './dashboard';

/** Prefix selection preserves the path context when identical segment names recur. */
export function EndpointGraph({ rows, onSelect }: { rows: DashboardRow[]; onSelect: (row: DashboardRow) => void }) {
  const [prefix, setPrefix] = useState<string[]>([]);
  const depth = Math.max(1, ...rows.map(r => pathSegments(r.path).length));
  return <div className="api-segment-graph" aria-label="API path segment graph">
    <div className="api-segment-toolbar"><button type="button" onClick={() => setPrefix([])}>All paths</button><span>{prefix.length ? '/' + prefix.join('/') : 'Select a segment to explore paths'}</span></div>
    <div className="api-segment-columns">
      {Array.from({length: depth}, (_, i) => {
        const matching = rows.filter(r => prefix.slice(0,i).every((p,n) => pathSegments(r.path)[n] === p));
        const segments = [...new Set(matching.map(r => pathSegments(r.path)[i]).filter(Boolean))];
        return <section key={i} className="api-segment-column"><h3>Segment {i+1}</h3>
          {segments.map(segment => <button type="button" aria-pressed={prefix[i] === segment} key={segment} onClick={() => setPrefix([...prefix.slice(0,i),segment])}>
            <span>{segment}</span><small>{matching.filter(r => pathSegments(r.path)[i] === segment).length} endpoints</small>
          </button>)}
        </section>;
      })}
    </div>
    <div className="api-segment-results" aria-label="Endpoints in selected path">
      {rows.filter(r => prefix.every((p,n) => pathSegments(r.path)[n] === p)).map(r => <button type="button" key={r.key} onClick={() => onSelect(r)}>{r.method} {r.path}</button>)}
    </div>
  </div>;
}
