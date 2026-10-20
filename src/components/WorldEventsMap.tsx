import { useEffect, useState } from 'react';
type Country = { name: string; code: string; paths: string };
const aliases: Record<string, string> = {
  'South Korea': 'KR',
  'United States': 'US',
  'United States of America': 'US',
  Japan: 'JP',
  Fiji: 'FJ',
  Germany: 'DE',
  Singapore: 'SG',
  Australia: 'AU',
  India: 'IN',
  'United Kingdom': 'GB',
  France: 'FR',
};
export function WorldEventsMap({
  countries,
  onSelect,
}: {
  countries: [string, number][];
  onSelect: (country: string) => void;
}) {
  const [map, setMap] = useState<Country[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}xc-world-map.json`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error('Map unavailable');
        return r.json();
      })
      .then((value) => {
        if (
          Array.isArray(value) &&
          value.length < 300 &&
          value.every(
            (c) =>
              typeof c.name === 'string' &&
              typeof c.code === 'string' &&
              typeof c.paths === 'string',
          )
        )
          setMap(value);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const total = countries.reduce((n, [, count]) => n + count, 0);
  return (
    <div className="xc-world-map">
      <div>
        <span className="xc-map-legend">■ {total}</span>
        <svg viewBox="0 0 720 320" role="img" aria-label="Events by country, local stored events">
          {map.map((c) => {
            const match = countries.find(
              ([country]) => (aliases[country] ?? country) === c.code || country === c.name,
            );
            return (
              <path
                key={c.name}
                d={c.paths}
                fill={match ? '#125dff' : '#d8e0e8'}
                stroke="#fff"
                strokeWidth=".7"
                role={match ? 'button' : undefined}
                tabIndex={match ? 0 : undefined}
                aria-label={match ? `${match[0]}: ${match[1]} security events` : undefined}
                onClick={() => match && onSelect(match[0])}
                onKeyDown={(e) => {
                  if (match && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onSelect(match[0]);
                  }
                }}
              >
                <title>
                  {c.name}
                  {match ? `: ${match[1]} events` : ''}
                </title>
              </path>
            );
          })}
        </svg>
      </div>
      <div className="xc-map-count">
        <span>Security Events</span>
        <strong>{total}</strong>
        <small>Local stored events</small>
      </div>
    </div>
  );
}
