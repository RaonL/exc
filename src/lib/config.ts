import type {
  LB,
  LBConfig,
  Waf,
  WafConfig,
  Origin,
  OriginConfig,
  Scenario,
  SimulatedRequest,
  SecurityEvent,
} from '../types';
import { matchesExclusion } from './waf-exclusions';
export const guides = {
  lb: 'https://docs.cloud.f5.com/docs-v2/multi-cloud-app-connect/how-to/load-balance/create-http-load-balancer',
  waf: 'https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/how-to/app-security/application-firewall',
  origin:
    'https://docs.cloud.f5.com/docs-v2/multi-cloud-app-connect/how-to/app-networking/origin-pools',
  security:
    'https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/how-to/observe/monitor-waap',
};
export const lbConfig = (lb?: Partial<LB>): LBConfig => ({
  description: '',
  labels: '',
  vip: 'Internet',
  vipAddress: '',
  siteId: '',
  certificate: 'Automatic',
  certificateRef: '',
  listenPort: lb?.protocol === 'HTTP' ? 80 : 443,
  redirectHttps: true,
  hsts: false,
  tlsLevel: 'High',
  routes: [],
  exclusions: [],
  cdn: false,
  timeout: 30,
  apiDiscovery: true,
  manageDns: false,
  listenPortChoice: 'HTTP Listen Port',
  originWeight: 1,
  originPriority: 1,
  ...lb?.config,
});
export const wafConfig = (waf?: Partial<Waf>): WafConfig => ({
  description: '',
  labels: '',
  policy: 'Default',
  disabledAttacks: [],
  accuracy: 'High and Medium',
  highAction: 'Block',
  tuning: true,
  staging: 'Disabled',
  stagingDays: 7,
  threatCampaigns: true,
  maskLogs: true,
  responseCode: 403,
  responseBody: 'The requested URL was rejected. Please contact your administrator.',
  ...waf?.config,
});
export const originConfig = (origin?: Partial<Origin>): OriginConfig => ({
  labels: '',
  description: '',
  type: 'IP on Site',
  siteId: '',
  network: 'Inside Network',
  algorithm: 'Round Robin',
  tls: false,
  sni: '',
  healthCheck: 'HTTP',
  healthPath: '/health',
  interval: 15,
  timeout: 3,
  healthyThreshold: 2,
  unhealthyThreshold: 3,
  ...origin?.config,
});
export const hasWaf = (lb: LB) =>
  Boolean(lb.wafId || lbConfig(lb).routes.some((r) => r.enabled && r.wafId));
export const lbOriginIds = (lb: LB) => [
  ...new Set([
    lb.originId,
    ...lbConfig(lb)
      .routes.filter((r) => r.enabled && r.type === 'Simple')
      .map((r) => r.originId),
  ]),
];
export const isLbHealthy = (lb: LB, origins: Origin[]) =>
  lbOriginIds(lb).every((id) =>
    origins.some((o) => o.id === id && o.namespace === lb.namespace && o.healthy),
  );
export function evaluateRequest(
  lb: LB,
  wafs: Waf[],
  origins: Origin[],
  scenario: Scenario,
  request: SimulatedRequest,
): {
  action: SecurityEvent['action'];
  responseCode: number;
  responseBody?: string;
  reason: string;
  evaluatedWafId?: string;
} {
  const config = lbConfig(lb);
  const path = request.path.split('?')[0];
  const route = config.routes.find(
    (r) =>
      r.enabled &&
      (r.method === 'ANY' || r.method === request.method) &&
      (r.match === 'Exact' ? path === r.path : path.startsWith(r.path)),
  );
  const wafId = route?.wafId || lb.wafId;
  const waf = wafs.find(
    (w) => w.id === wafId && (w.namespace === lb.namespace || w.namespace === 'shared'),
  );
  const isWafAttack = ['SQL Injection', 'Cross-site Scripting', 'Command Injection'].includes(
    scenario,
  );
  let decision: SecurityEvent['action'] =
    scenario === 'Normal HTTP traffic' ? 'Allowed' : 'Detected';
  let reason =
    scenario === 'Normal HTTP traffic' ? 'Request accepted' : 'Protection is not enabled';
  if (isWafAttack && waf) {
    const policy = wafConfig(waf);
    const excluded = config.exclusions.some((e) => matchesExclusion(e, lb, scenario, request));
    const stagingActive =
      policy.policy === 'Custom' &&
      policy.staging !== 'Disabled' &&
      (request.signatureState === 'New' ||
        (policy.staging === 'New and updated signatures' &&
          request.signatureState === 'Updated')) &&
      (!policy.stagingStartedAt ||
        Date.now() < Date.parse(policy.stagingStartedAt) + policy.stagingDays * 86400000);
    if (excluded) {
      decision = 'Allowed';
      reason = 'Matched WAF exclusion';
    } else if (
      policy.policy === 'Custom' &&
      (policy.disabledAttacks.includes(scenario) || policy.highAction === 'Ignore')
    ) {
      decision = 'Allowed';
      reason = 'Attack type or signature disabled by Custom policy';
    } else if (
      waf.mode === 'Monitoring' ||
      stagingActive ||
      (policy.policy === 'Custom' && policy.highAction === 'Report')
    ) {
      decision = 'Detected';
      reason = stagingActive
        ? `${request.signatureState} signature is staged: report only`
        : 'WAF policy reports without blocking';
    } else {
      decision = 'Blocked';
      reason = 'WAF signature matched in Blocking mode';
    }
  } else if (!isWafAttack && scenario !== 'Normal HTTP traffic') {
    const enabled =
      scenario === 'Bot Detection'
        ? lb.botDefense
        : scenario === 'API Schema Violation'
          ? lb.apiProtection
          : scenario === 'L7 DDoS'
            ? lb.ddosProtection
            : false;
    decision = enabled ? 'Blocked' : 'Detected';
    reason = enabled
      ? `${scenario} protection applied`
      : 'Protection is not enabled; request detected';
  }
  if (decision === 'Blocked')
    return {
      action: decision,
      responseCode: isWafAttack && waf ? wafConfig(waf).responseCode : 403,
      responseBody:
        isWafAttack && waf
          ? wafConfig(waf).responseBody
          : 'Request blocked by simulated protection',
      reason,
      evaluatedWafId: isWafAttack ? waf?.id : undefined,
    };
  if (route?.type === 'Redirect')
    return {
      action: decision,
      responseCode: route.responseCode,
      reason: `${reason}; redirect to ${route.redirectUrl}`,
      evaluatedWafId: waf?.id,
    };
  if (route?.type === 'Direct Response')
    return {
      action: decision,
      responseCode: route.responseCode,
      responseBody: route.responseBody,
      reason: `${reason}; direct response: ${route.responseBody}`,
      evaluatedWafId: waf?.id,
    };
  const origin = origins.find((o) => o.id === (route?.originId || lb.originId));
  return {
    action: decision,
    responseCode: origin?.healthy ? 200 : 503,
    reason: `${reason}; ${origin?.healthy ? `forwarded to ${origin.name}` : 'origin unavailable'}`,
    evaluatedWafId: isWafAttack ? waf?.id : undefined,
  };
}
