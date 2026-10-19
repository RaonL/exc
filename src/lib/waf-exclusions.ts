import type { LB, SecurityEvent, WafExclusion, Scenario, SimulatedRequest } from '../types';
export const exclusionGuide =
  'https://clouddocs.f5.com/training/community/f5xc/html/class2/lab1.html';
export const wafAttacks = ['SQL Injection', 'Cross-site Scripting', 'Command Injection'] as const;
export const exactPathRegex = (path: string) => `^${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
// Accept anchored literal paths only. Never execute user-provided regex in the browser.
export function literalPath(pattern: string): string | undefined {
  if (!pattern.startsWith('^/') || !pattern.endsWith('$')) return undefined;
  const path = pattern.slice(1, -1).replace(/\\([.*+?^${}()|[\]\\])/g, '$1');
  return exactPathRegex(path) === pattern ? path : undefined;
}
export function exclusionFromEvent(event: SecurityEvent, lb: LB): WafExclusion {
  return {
    id: crypto.randomUUID(),
    name: `waf-exclusion-${event.id.slice(0, 8)}`,
    description: `From Support ID ${event.id}`,
    path: event.path.split('?')[0],
    pathMatch: 'Exact',
    domain: event.authority ?? lb.domains[0],
    method: event.method ?? 'GET',
    attack: wafAttacks.find((a) => a === event.scenario) ?? 'All',
  };
}
export function exclusionError(rule: WafExclusion): string {
  if (!rule.name.trim()) return 'Enter an exclusion name.';
  if (!rule.path.startsWith('/') || /[?#\s]/.test(rule.path))
    return 'Enter a path beginning with /, without a query string.';
  if (rule.domain && !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(rule.domain))
    return 'Enter a domain hostname without protocol or path.';
  if (
    rule.expiresAt &&
    (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(rule.expiresAt) ||
      !Number.isFinite(Date.parse(rule.expiresAt)))
  )
    return 'Enter an ISO timestamp with a timezone, or leave expiration empty.';
  return '';
}
export function matchesExclusion(
  rule: WafExclusion,
  lb: LB,
  scenario: Scenario,
  request: SimulatedRequest,
): boolean {
  const path = request.path.split('?')[0];
  return (
    (!rule.expiresAt || Date.parse(rule.expiresAt) > Date.now()) &&
    (!rule.domain ||
      rule.domain.toLowerCase() === (request.authority ?? lb.domains[0]).toLowerCase()) &&
    (rule.method === 'ANY' || rule.method === request.method) &&
    (rule.pathMatch === 'Exact' ? path === rule.path : path.startsWith(rule.path)) &&
    (rule.attack === 'All' || rule.attack === scenario)
  );
}
