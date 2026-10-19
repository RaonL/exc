import { useId, useState } from 'react';
import type { SecurityEvent } from '../types';
import { useConsole } from '../store';
import { Badge, time } from './common';
import { Button } from './ui/button';
import { explainConsoleEvent } from '../lib/console-lab';
export function EventDetails({ event, onOpen }: { event: SecurityEvent; onOpen?: () => void }) {
  const s = useConsole();
  const id = useId(),
    tabs = ['Information', 'Request', 'JSON'];
  const [detailTab, setDetailTab] = useState('Information'),
    [explanation, setExplanation] = useState('');
  return (
    <>
      <div className="event-detail-tabs" role="tablist" aria-label="Event detail view">
        {tabs.map((tab) => (
          <button
            key={tab}
            role="tab"
            id={`${id}-${tab}`}
            aria-controls={`${id}-panel`}
            aria-selected={detailTab === tab}
            tabIndex={detailTab === tab ? 0 : -1}
            className={detailTab === tab ? 'active' : ''}
            onClick={() => setDetailTab(tab)}
            onKeyDown={(e) => {
              const index = tabs.indexOf(tab),
                next =
                  e.key === 'ArrowRight'
                    ? (index + 1) % 3
                    : e.key === 'ArrowLeft'
                      ? (index + 2) % 3
                      : e.key === 'Home'
                        ? 0
                        : e.key === 'End'
                          ? 2
                          : -1;
              if (next < 0) return;
              e.preventDefault();
              setDetailTab(tabs[next]);
              e.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                [next]?.focus();
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${detailTab}`}>
        {detailTab === 'Information' && (
          <div className="detail-grid">
            {Object.entries({
              'Event ID': event.id,
              Authority:
                event.authority ?? s.lbs.find((l) => l.id === event.lbId)?.domains[0] ?? 'Unknown',
              Method: event.method ?? 'GET',
              'Support ID / req_id': event.id,
              'Duration (simulated)': `${event.durationMs ?? 6} ms`,
              'Event type': event.scenario,
              'Signature (simulated)':
                event.scenario === 'Normal HTTP traffic' ? 'None' : event.scenario,
              Timestamp: time(event.timestamp),
              'Source IP': event.source,
              Country: event.country,
              'Request path': event.path,
              Severity: event.severity,
              Action: event.action,
              'HTTP Status': event.responseCode ?? (event.action === 'Blocked' ? 403 : 200),
              'Evaluation Reason': event.reason ?? 'Seeded demo security event',
              'App Firewall':
                s.wafs.find((w) => w.id === event.evaluatedWafId)?.name ?? 'Not recorded',
              Requests: event.count,
              Namespace: event.namespace,
            }).map(([key, value]) => (
              <div key={key}>
                <span>{key}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        )}
        {detailTab === 'Request' && (
          <div className="event-request">
            <span>Simulated HTTP request · no payload transmitted</span>
            <pre>{`${event.method ?? 'GET'} ${event.path} HTTP/1.1\nHost: ${event.authority ?? s.lbs.find((l) => l.id === event.lbId)?.domains[0]}\nX-Demo-Source-IP: ${event.source}\n\nSignature state: ${event.signatureState ?? 'Existing'}\nHTTP response: ${event.responseCode ?? (event.action === 'Blocked' ? 403 : 200)}\n${event.responseBody ?? ''}`}</pre>
          </div>
        )}
        {detailTab === 'JSON' && (
          <pre className="event-json">
            {JSON.stringify({ req_id: event.id, ...event }, null, 2)}
          </pre>
        )}
      </div>
      <div className="form-footer">
        <Button
          variant="outline"
          onClick={() => setExplanation(explainConsoleEvent(event, s.wafs))}
        >
          Explain with AI
        </Button>
        <Button
          onClick={() => {
            s.selectLb(event.lbId);
            onOpen?.();
          }}
        >
          Open load balancer
        </Button>
      </div>
      {explanation && (
        <div className="console-event-explanation">
          <Badge tone="blue">LOCAL TEMPLATE · AI SIMULATION</Badge>
          <pre>{explanation}</pre>
        </div>
      )}
    </>
  );
}
