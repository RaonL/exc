export type CatalogKind = 'signatures' | 'bots' | 'threats' | 'alerts';
export const catalogSources: Record<CatalogKind, { file: string; title: string; count: number }> = {
  signatures: { file: 'signatures-20261019045142.json', title: 'Attack Signatures', count: 9509 },
  bots: { file: 'bots-20261019045127.json', title: 'Bots', count: 2638 },
  threats: { file: 'threats-20261019045136.json', title: 'Threat Campaigns', count: 1059 },
  alerts: { file: 'alerts-20261019045147.json', title: 'Alert Definitions', count: 237 },
};
export interface CatalogEntry {
  id: string;
  name: string;
  category: string;
  risk: string;
  accuracy: string;
  description: string;
  action: string;
  systems: string[];
  original: Record<string, unknown>;
}
const text = (value: unknown): string => (typeof value === 'string' ? value : '');
export function normalizeCatalog(value: unknown, kind: CatalogKind): CatalogEntry[] {
  if (!Array.isArray(value) || value.length > 20000)
    throw new Error('Expected a catalog array with at most 20,000 entries.');
  return value.map((row: unknown) => {
    if (!row || typeof row !== 'object' || Array.isArray(row))
      throw new Error('Invalid catalog entry.');
    const item = row as Record<string, unknown>;
    const name = text(kind === 'bots' ? item.bot_name : item.name);
    if (!name || !['number', 'string'].includes(typeof item.id) || String(item.id).length === 0)
      throw new Error('Catalog entries require an ID and name.');
    return {
      id: String(item.id),
      name,
      category:
        kind === 'bots'
          ? [text(item.bot_class), text(item.category)].filter(Boolean).join(' / ')
          : text(item.attack_type) || text(item.group),
      risk: text(item.risk) || text(item.severity) || 'Not supplied',
      accuracy: text(item.accuracy),
      description: text(item.description).replace(/\\n/g, '\n'),
      action: text(item.action),
      systems: Array.isArray(item.systems)
        ? item.systems.filter((s): s is string => typeof s === 'string')
        : [],
      original: item,
    };
  });
}
export function filterCatalog(entries: CatalogEntry[], query: string, risk: string) {
  const term = query.trim().toLowerCase();
  return entries.filter(
    (entry) =>
      (risk === 'All' || entry.risk === risk) &&
      `${entry.id} ${entry.name} ${entry.category}`.toLowerCase().includes(term),
  );
}
