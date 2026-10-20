import { useState } from 'react';
import { Filter, ShieldAlert } from 'lucide-react';
import { useConsole } from '../store';
import { Card, ExportButton, PageHeading, SearchInput } from './common';
import { Button } from './ui/button';
import { RequestTelemetry, MonitoringRange } from './RequestTelemetry';
import { EventFilters, matchesEventFilter, type EventFilter } from './EventFilters';
import { EventsTable } from './EventsTable';
export function SecurityEvents({
  analytics = false,
  openLab,
}: {
  analytics?: boolean;
  openLab: () => void;
}) {
  const s = useConsole();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EventFilter | null>(null);
  const [action, setAction] = useState('All actions');
  const [range, setRange] = useState('60'),
    [hideChart, setHideChart] = useState(false);
  const events = s.events.filter(
    (e) =>
      e.namespace === s.namespace &&
      (!s.selectedLbId || e.lbId === s.selectedLbId) &&
      Date.parse(e.timestamp) >= Date.now() - Number(range) * 60000 &&
      (!analytics || e.scenario !== 'Normal HTTP traffic') &&
      (action === 'All actions' || e.action === action) &&
      matchesEventFilter(e, filter) &&
      `${e.id} ${e.scenario} ${e.catalogMatch?.id ?? ''} ${e.catalogMatch?.name ?? ''} ${e.source} ${e.path} ${s.lbs.find((l) => l.id === e.lbId)?.name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="security-events-page">
      <PageHeading
        title={analytics ? 'Security Analytics' : 'Security Events'}
        description="Investigate requests, understand threats, and review mitigation outcomes."
      >
        <ExportButton data={events} name="security-events" />
        <Button onClick={openLab}>
          <ShieldAlert size={15} />
          Simulate event
        </Button>
      </PageHeading>
      <div className="console-telemetry-toolbar">
        <span>
          {s.selectedLbId
            ? s.lbs.find((l) => l.id === s.selectedLbId)?.name
            : 'All delivery resources'}
        </span>
        <MonitoringRange value={range} onApply={setRange} />
        <Button variant="ghost" onClick={() => setHideChart((v) => !v)}>
          {hideChart ? 'Show Chart' : 'Hide Chart'}
        </Button>
      </div>
      <EventFilters value={filter} onApply={setFilter} />
      {!hideChart && <RequestTelemetry minutes={Number(range)} events={events} />}
      {analytics && (
        <div className="metric-cards">
          {['Blocked', 'Detected', 'Allowed'].map((a) => (
            <Card key={a} title={`${a} requests`}>
              <div className="big-number">
                {events
                  .filter((e) => e.action === a)
                  .reduce((v, e) => v + e.count, 0)
                  .toLocaleString()}
              </div>
              <span className="muted">Across the stored demo events</span>
            </Card>
          ))}
        </div>
      )}
      <Card>
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search Support ID, IP addresses, paths…"
          />
          <div className="filter-control">
            <Filter size={14} />
            <select
              aria-label="Filter actions"
              id="security-event-action"
              name="security-event-action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              <option>All actions</option>
              <option>Blocked</option>
              <option>Detected</option>
              <option>Allowed</option>
            </select>
          </div>
          <span className="muted">{events.length} events</span>
        </div>
        <EventsTable events={events} inline />
      </Card>
    </div>
  );
}
