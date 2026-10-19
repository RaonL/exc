import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SecurityEvent } from '../types';
import { Card } from './common';
import { Button } from './ui/button';
const ranges = [
  { value: '5', label: 'Last 5 minutes' },
  { value: '15', label: 'Last 15 minutes' },
  { value: '60', label: 'Last 1 hour' },
  { value: '1440', label: 'Last 24 hours' },
];
export function MonitoringRange({
  value,
  onApply,
}: {
  value: string;
  onApply: (v: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(value);
  return (
    <div className="monitoring-range">
      <button
        type="button"
        aria-label="Time range"
        aria-expanded={open}
        onClick={() => {
          setDraft(value);
          setOpen(!open);
        }}
      >
        {ranges.find((r) => r.value === value)?.label} ▾
      </button>
      {open && (
        <div role="group" aria-label="Select time range">
          {ranges.map((r) => (
            <label key={r.value}>
              <input
                type="radio"
                name="monitoring-range"
                checked={draft === r.value}
                onChange={() => setDraft(r.value)}
              />
              {r.label}
            </label>
          ))}
          <Button
            size="sm"
            onClick={() => {
              onApply(draft);
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
export function RequestTelemetry({
  events,
  minutes = 60,
}: {
  events: SecurityEvent[];
  minutes?: number;
}) {
  const end = Date.now(),
    start = end - minutes * 60000;
  const interval = (minutes * 60000) / 12;
  const points = Array.from({ length: 12 }, (_, i) => ({
    time: new Date(start + (i + 1) * interval).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    '2xx': 0,
    '4xx': 0,
    '5xx': 0,
  }));
  for (const event of events) {
    const index = Math.max(
      0,
      Math.min(11, Math.floor((Date.parse(event.timestamp) - start) / interval)),
    );
    const code = event.responseCode ?? (event.action === 'Blocked' ? 403 : 200);
    const key = code >= 500 ? '5xx' : code >= 400 ? '4xx' : '2xx';
    points[index][key] += event.count;
  }
  return (
    <Card title="Requests by Response Code">
      <p className="chart-subtitle">
        Stored local request events · {minutes} minute window · 12 time buckets
      </p>
      <div className="console-response-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points}>
            <CartesianGrid vertical={false} stroke="#edf0f5" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#909aae' }} minTickGap={36} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#909aae' }} />
            <Tooltip />
            <Bar dataKey="2xx" stackId="responses" fill="#6d94ee" />
            <Bar dataKey="4xx" stackId="responses" fill="#a58acb" />
            <Bar dataKey="5xx" stackId="responses" fill="#e6a178" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
