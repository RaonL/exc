import { Fragment, useState } from 'react';
import { ExternalLink, ChevronDown, MoreHorizontal } from 'lucide-react';
import type { SecurityEvent } from '../types';
import { useConsole } from '../store';
import { Badge, Empty, time } from './common';
import { Dialog } from './ui/dialog';
import { EventDetails } from './EventDetails';
import { LBForm } from './LoadBalancerEditor';
import { wafAttacks } from '../lib/waf-exclusions';
export function EventsTable({
  events,
  compact = false,
  inline = false,
}: {
  events: SecurityEvent[];
  compact?: boolean;
  inline?: boolean;
}) {
  const s = useConsole();
  const [selected, setSelected] = useState<SecurityEvent | null>(null),
    [actions, setActions] = useState<SecurityEvent | null>(null),
    [exclusionEvent, setExclusionEvent] = useState<SecurityEvent | null>(null),
    [message, setMessage] = useState(''),
    [menuTop, setMenuTop] = useState(180);
  const inspect = (event: SecurityEvent) => {
    setSelected(selected?.id === event.id && inline ? null : event);
    s.inspectRequest(event.id);
  };
  const lb =
    exclusionEvent &&
    s.lbs.find((l) => l.id === exclusionEvent.lbId && l.namespace === s.namespace);
  return (
    <>
      {message && (
        <p className="events-save-message" role="status">
          {message}
        </p>
      )}
      {events.length ? (
        <div
          className="table-wrap event-table-scroll"
          role="region"
          aria-label="Security event records"
          tabIndex={0}
        >
          <table className={inline ? 'event-reference-table' : ''}>
            <thead>
              <tr>
                {inline && <th aria-label="Expand" />}
                <th>Time</th>
                <th>Country / Source IP</th>
                {!compact && (
                  <>
                    <th>Method</th>
                    <th>Rsp Code</th>
                  </>
                )}
                <th>Event Type</th>
                <th>Action</th>
                {!compact && (
                  <>
                    <th>Authority / Load Balancer</th>
                    <th>Request Path / Support ID</th>
                  </>
                )}
                <th>Requests</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <Fragment key={e.id}>
                  <tr data-event-id={e.id}>
                    {inline && (
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`${selected?.id === e.id ? 'Collapse' : 'Expand'} event ${e.id}`}
                          aria-expanded={selected?.id === e.id}
                          onClick={() => inspect(e)}
                        >
                          <ChevronDown size={15} />
                        </button>
                      </td>
                    )}
                    <td className="nowrap muted">{time(e.timestamp)}</td>
                    <td>
                      <span>{e.country}</span>
                      <small className="cell-sub mono">{e.source}</small>
                    </td>
                    {!compact && (
                      <>
                        <td>{e.method ?? 'GET'}</td>
                        <td>
                          <Badge
                            tone={
                              (e.responseCode ?? (e.action === 'Blocked' ? 403 : 200)) >= 400
                                ? 'red'
                                : 'green'
                            }
                          >
                            {e.responseCode ?? (e.action === 'Blocked' ? 403 : 200)}
                          </Badge>
                        </td>
                      </>
                    )}
                    <td>
                      <button className="resource-link" onClick={() => inspect(e)}>
                        {e.scenario}
                      </button>
                    </td>
                    <td>
                      <Badge
                        tone={
                          e.action === 'Blocked'
                            ? 'red'
                            : e.action === 'Detected'
                              ? 'amber'
                              : 'green'
                        }
                      >
                        {e.action}
                      </Badge>
                    </td>
                    {!compact && (
                      <>
                        <td>
                          <span>
                            {e.authority ?? s.lbs.find((l) => l.id === e.lbId)?.domains[0]}
                          </span>
                          <button
                            className="resource-link cell-sub"
                            onClick={() => s.selectLb(e.lbId)}
                          >
                            {s.lbs.find((l) => l.id === e.lbId)?.name ?? 'Deleted LB'}
                          </button>
                        </td>
                        <td>
                          <span>{e.path}</span>
                          <small className="cell-sub mono">{e.id}</small>
                        </td>
                      </>
                    )}
                    <td className="numeric">{e.count.toLocaleString()}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label={`View event ${e.scenario}`}
                          onClick={() => inspect(e)}
                        >
                          <ExternalLink size={14} />
                        </button>
                        {!compact && (
                          <button
                            className="icon-button"
                            aria-label={`Actions for event ${e.id}`}
                            aria-expanded={actions?.id === e.id}
                            onClick={(ev) => {
                              setActions(e);
                              setMenuTop(
                                Math.min(
                                  ev.currentTarget.getBoundingClientRect().bottom + 4,
                                  window.innerHeight - 150,
                                ),
                              );
                            }}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {inline && selected?.id === e.id && (
                    <tr>
                      <td colSpan={11} className="event-inline-detail">
                        <EventDetails key={e.id} event={e} onOpen={() => setSelected(null)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="No events in this view"
          description="Generate requests from Open Application or adjust your filters."
        />
      )}
      {!inline && selected && (
        <Dialog
          open
          onOpenChange={() => setSelected(null)}
          title="Request event details"
          description="Simulated security event · no actual request was sent"
        >
          <EventDetails key={selected.id} event={selected} onOpen={() => setSelected(null)} />
        </Dialog>
      )}
      {actions && (
        <>
          <button
            className="resource-menu-scrim"
            aria-label="Close event actions"
            onClick={() => setActions(null)}
          />
          <div className="resource-context-menu" style={{ top: menuTop }}>
            <button
              onClick={() => {
                inspect(actions);
                setActions(null);
              }}
            >
              View Details
            </button>
            <button
              disabled={
                !wafAttacks.some((a) => a === actions.scenario) ||
                !s.lbs.some((l) => l.id === actions.lbId && l.namespace === s.namespace)
              }
              onClick={() => {
                setExclusionEvent(actions);
                setActions(null);
              }}
            >
              Create WAF Exclusion rule
            </button>
          </div>
        </>
      )}
      {lb && exclusionEvent && (
        <LBForm
          key={lb.id}
          initial={lb}
          exclusionEvent={exclusionEvent}
          close={() => setExclusionEvent(null)}
          notify={setMessage}
        />
      )}
    </>
  );
}
