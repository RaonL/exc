import type { Environment, Lab, Controls } from './types';
import type { GuideField } from './console-guide';
import type { LB, Origin, Waf } from '../types';
import { createEnvironment, referenceConfiguration } from './engine';
import { lbConfig, originConfig } from '../lib/config';

const targets = new Map<string, Environment>();
function targetFor(lab: Lab) {
  if (!targets.has(lab.id))
    targets.set(lab.id, referenceConfiguration(createEnvironment(lab), lab));
  return targets.get(lab.id)!;
}
const display = (value: unknown): string =>
  typeof value === 'boolean' ? (value ? '켜기 ☑' : '끄기 ☐') : String(value);
const field = (
  id: string,
  label: string,
  actual: unknown,
  expected: unknown,
  section?: string,
): GuideField => ({
  id,
  title: label.replace(/ \*$/, ''),
  label,
  section,
  expected: display(expected),
  copyValue: String(expected),
  pass: actual === expected,
});
// These labels match the real inputs in the simulator, not invented Console menu names.
const controls: Partial<Record<keyof Controls, string>> = {
  policyMode: 'Policy Mode',
  headerName: 'Required Header Name',
  headerValue: 'Required Header Value',
  allowedCountry: 'Allowed Country',
  deniedCountry: 'Denied Country',
  blockBadReputation: 'Block TOR / Spam reputation',
  allowedPath: 'Allowed Exact Path (GET)',
  canary: 'Enable Canary Route',
  canaryHeader: 'Canary Header',
  canaryValue: 'Canary Value',
  rewriteLogin: 'Rewrite /login to /',
  namespaceHeader: 'Add XC-Namespace Response Header',
  inventory: 'Inventory Fall-through Deny',
  apiDeny: 'Endpoint Deny Rule',
  deniedEndpoint: 'Denied API Endpoint',
  apiDiscovery: 'API Discovery / LB',
  connector: 'BIG-IP Connector (synthetic telemetry)',
  rateLimit: 'Enable Rate Limiting',
  rate: 'Number of Requests',
  rateWindow: 'Period (seconds)',
  ratePath: 'Limited Exact Path',
  rateMethod: 'Limited Method',
  botMode: 'Bot Mitigation Mode',
  botPath: 'Protected Endpoint',
  botExtraPath: 'Contact Protected Endpoint',
  botMethod: 'Protected Method',
  telemetry: 'Client Telemetry (synthetic)',
  maliciousDetection: 'Malicious User Detection',
  maliciousMitigation: 'Temporary Block Mitigation',
  segment: 'Attach DC Segment',
  segmentPeer: 'Attach AWS Segment',
  firewall: 'HTTP Allow / SSH Deny Firewall',
  failover: 'AWS Priority / Azure Fallback',
  overlapVip: 'Azure CE VIP for Overlapping IPs',
  scanProfile: 'Scan Profile Configured',
  scanSchedule: 'Schedule (local model only)',
};
function requiredControls(lab: Lab): (keyof Controls)[] {
  const x = lab.exercise;
  return [
    ...(['header'].includes(x) ? (['headerName', 'headerValue'] as const) : []),
    ...(['route'].includes(x) ? (['canaryHeader', 'canaryValue'] as const) : []),
    ...(['rate', 'zero-day'].includes(x) ? (['rate', 'rateWindow'] as const) : []),
    ...(x === 'rate' ? (['ratePath', 'rateMethod'] as const) : []),
    ...(x === 'endpoint' ? (['deniedEndpoint'] as const) : []),
    ...([
      'bot',
      'bot-baseline',
      'bot-flag',
      'human-bot',
      'bot-block',
      'scan',
      'scan-compare',
      'advanced',
    ].includes(x)
      ? (['botMode', 'botPath', 'botMethod'] as const)
      : []),
    ...(x === 'negative' ? (['deniedCountry'] as const) : []),
    ...(x === 'positive' ? (['allowedCountry', 'allowedPath'] as const) : []),
    ...(['scan', 'scan-compare'].includes(x) ? (['scanSchedule'] as const) : []),
  ];
}
export function labGuideFields(lab: Lab, environment?: Environment): GuideField[] {
  const target = targetFor(lab),
    e = environment ?? createEnvironment(lab);
  const fields = [
    field('env-protocol', 'Load Balancer Type', e.lb.protocol, target.lb.protocol),
    field('env-vip', 'VIP Advertisement', lbConfig(e.lb).vip, lbConfig(target.lb).vip),
    field(
      'env-origin-type',
      'Origin Server Type',
      originConfig(e.origins[0]).type,
      originConfig(target.origins[0]).type,
    ),
    field(
      'env-origin-endpoint',
      'Origin Endpoint',
      e.origins[0].endpoint,
      target.origins[0].endpoint,
    ),
    field('env-origin-port', 'Origin Port', e.origins[0].port, target.origins[0].port),
    field(
      'env-waf',
      'Attach Application Firewall',
      e.lb.wafId === e.waf.id,
      target.lb.wafId === target.waf.id,
    ),
    field('env-mode', 'WAF Enforcement Mode', e.waf.mode, target.waf.mode),
    field('env-ce', 'Customer Edge Online', e.ce.online, true),
  ];
  const initial = createEnvironment(lab),
    required = requiredControls(lab);
  for (const key of Object.keys(controls) as (keyof Controls)[]) {
    if (!required.includes(key) && initial.controls[key] === target.controls[key]) continue;
    const actual =
      key === 'apiDiscovery'
        ? e.controls.apiDiscovery && lbConfig(e.lb).apiDiscovery
        : e.controls[key];
    fields.push(field(`control-${key}`, controls[key]!, actual, target.controls[key]));
  }
  for (const [key, label] of [
    ['botDefense', 'Enable Bot Defense on LB'],
    ['apiProtection', 'Enable API Protection on LB'],
  ] as const)
    if (initial.lb[key] !== target.lb[key])
      fields.push(field(`env-${key}`, label, e.lb[key], target.lb[key]));
  if (lab.exercise === 'route')
    fields.push(
      field(
        'env-route-waf',
        'Attach WAF to /login Route',
        e.lb.config?.routes.some((r) => r.path === '/login' && r.enabled && r.wafId === e.waf.id) ??
          false,
        true,
      ),
    );
  // Put the lab-specific policy before already-prepared infrastructure settings.
  const priority = (f: GuideField) =>
    f.id.startsWith('control-') ||
    ['env-botDefense', 'env-apiProtection'].includes(f.id) ||
    (['env-waf', 'env-mode'].includes(f.id) && !!target.lb.wafId)
      ? 0
      : 1;
  fields.sort((a, b) => priority(a) - priority(b));
  if (!environment) return fields.map((f) => ({ ...f, pass: false }));
  return fields;
}

export function resourceGuideFields(
  lab: Lab,
  e: Environment,
  kind: string,
  value: unknown,
): GuideField[] {
  const t = targetFor(lab);
  if (kind === 'HTTP Load Balancer') {
    const lb = value as LB,
      config = lbConfig(lb),
      expected = lbConfig(t.lb);
    return [
      field('lb-name', 'Name *', lb.name, t.lb.name, 'metadata'),
      {
        ...field('lb-domain', 'Domains', lb.domains.includes(t.lb.domains[0]), true, 'domains'),
        expected: t.lb.domains[0],
      },
      field('lb-http', 'Load Balancer Type', lb.protocol, t.lb.protocol, 'domains'),
      field(
        'lb-port',
        `${t.lb.protocol} Listen Port *`,
        config.listenPort,
        expected.listenPort,
        'domains',
      ),
      {
        ...field('lb-origin', 'Origins → Add Item', lb.originId, e.origins[0].id, 'origins'),
        expected: `${e.lb.namespace}/${e.origins[0].name}`,
      },
      field('lb-vip', 'VIP Advertisement', config.vip, expected.vip, 'other'),
      {
        ...field('waf-enable', 'Web Application Firewall (WAF)', !!lb.wafId, !!t.lb.wafId, 'waf'),
        expected: t.lb.wafId ? 'Enable' : 'Disable',
      },
      ...(t.lb.wafId
        ? [
            {
              ...field('waf-reference', 'Enable *', lb.wafId, e.waf.id, 'waf'),
              expected: `${e.waf.namespace}/${e.waf.name}`,
            },
          ]
        : []),
    ];
  }
  if (kind === 'App Firewall') {
    const waf = value as Waf;
    return [
      field('waf-name', 'Name *', waf.name, t.waf.name, 'metadata'),
      field('waf-mode', 'Enforcement Mode', waf.mode, t.waf.mode, 'mode'),
    ];
  }
  const origin =
    e.origins.find((o) => o.id === (value as Origin)?.id || o.name === (value as Origin)?.name) ??
    e.origins[0];
  const target = t.origins.find((o) => o.id === origin.id) ?? t.origins[0];
  if (kind === 'Origin Pool') {
    const draft = value as Origin;
    return [
      field('origin-name', 'Name *', draft.name, target.name, 'metadata'),
      {
        ...field(
          'origin-server',
          'Origin Servers → Add Item',
          draft.endpoint === target.endpoint &&
            originConfig(draft).type === originConfig(target).type &&
            (!originConfig(target).type.includes('on Site') ||
              originConfig(draft).siteId === e.ce.id),
          true,
          'servers',
        ),
        expected: `${originConfig(target).type} · ${target.endpoint}`,
      },
      field('origin-port', 'Port *', draft.port, target.port, 'servers'),
    ];
  }
  if (kind === 'Origin Server') {
    const server = value as { type: string; endpoint: string; siteId?: string };
    return [
      field(
        'server-type',
        'Select Type of Origin Server *',
        server.type,
        originConfig(target).type,
        'origin-server',
      ),
      field(
        'server-dns',
        server.type.includes('DNS') ? 'DNS Name *' : 'IP Address *',
        server.endpoint,
        target.endpoint,
        'origin-server',
      ),
      ...(originConfig(target).type.includes('on Site')
        ? [
            {
              ...field('server-site', 'Site Reference', server.siteId, e.ce.id, 'origin-server'),
              expected: e.ce.name,
            },
          ]
        : []),
    ];
  }
  if (kind === 'Origin Pool with Weight and Priority') {
    const item = value as { originId: string; weight: number; priority: number };
    return [
      {
        ...field('pool-reference', 'Origin Pool *', item.originId, e.origins[0].id, 'pool-method'),
        expected: `${e.lb.namespace}/${e.origins[0].name}`,
      },
      field('pool-weight', 'Weight', item.weight, 1, 'pool-method'),
      field('pool-priority', 'Priority', item.priority, 1, 'pool-method'),
    ];
  }
  return [];
}
