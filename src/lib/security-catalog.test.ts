import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  normalizeCatalog,
  filterCatalog,
  catalogSources,
  type CatalogKind,
} from './security-catalog';

it.each(Object.keys(catalogSources) as CatalogKind[])(
  'validates the complete supplied %s snapshot',
  (kind) => {
    const source = catalogSources[kind];
    const raw: unknown = JSON.parse(readFileSync(`public/security-catalog/${source.file}`, 'utf8'));
    const entries = normalizeCatalog(raw, kind);
    expect(entries).toHaveLength(source.count);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
  },
);

it('preserves alert zero IDs and descriptive actions separately from event state', () => {
  const [entry] = normalizeCatalog(
    [
      {
        id: 0,
        name: 'API alert',
        severity: 'major',
        group: 'Security',
        description: 'Definition',
        action: 'Review configuration',
      },
    ],
    'alerts',
  );
  expect(entry.id).toBe('0');
  expect(entry.risk).toBe('major');
  expect(entry.action).toBe('Review configuration');
});
it('normalizes all four export schemas and searches ID, name and category', () => {
  const entries = normalizeCatalog(
    [
      {
        id: 2001,
        name: 'Example SQL',
        attack_type: 'SQL-Injection',
        risk: 'High',
        description: 'Summary:\\nText',
        systems: ['Linux'],
      },
    ],
    'signatures',
  );
  expect(entries[0].description).toBe('Summary:\nText');
  expect(filterCatalog(entries, '2001', 'High')).toHaveLength(1);
  expect(filterCatalog(entries, 'sql-injection', 'Low')).toHaveLength(0);
  expect(
    normalizeCatalog(
      [{ id: 1, bot_name: 'Crawler', bot_class: 'Untrusted Bot', category: 'Search Bot' }],
      'bots',
    )[0].name,
  ).toBe('Crawler');
  expect(
    normalizeCatalog([{ id: 'cmp1', name: 'Campaign', attack_type: 'Injection' }], 'threats')[0]
      .category,
  ).toBe('Injection');
});
it('rejects malformed and oversized catalogs without interpreting embedded markup', () => {
  expect(() => normalizeCatalog({}, 'bots')).toThrow();
  expect(() => normalizeCatalog([null], 'bots')).toThrow();
  expect(() => normalizeCatalog([{ id: 2 }], 'signatures')).toThrow();
  expect(() => normalizeCatalog(Array(20001).fill({}), 'alerts')).toThrow();
  expect(normalizeCatalog([{ id: 1, name: '<script>sample</script>' }], 'alerts')[0].name).toBe(
    '<script>sample</script>',
  );
});
