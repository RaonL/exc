import { evaluateRequest, lbConfig, originConfig } from '../lib/config';
import type { Check, Environment, Lab, ProbeResult, RequestInput, Verification } from './types';

export const apiPaths = ['/api/customerlookup/getbyname', '/api/customerlookup/getbydob'];
export const defaultSource = JSON.stringify(
  {
    name: 'xc-training-app',
    routes: [
      { method: 'GET', path: '/', body: 'Hello XC' },
      { method: 'POST', path: '/login', body: 'Demo login' },
      { method: 'POST', path: '/contact', body: 'Demo contact' },
    ],
  },
  null,
  2,
);
export const emptyRuntime = () => ({
  now: Date.now(),
  buckets: {},
  identities: {},
  logs: [],
  discovered: [],
  explanation: '',
});
export function createEnvironment(lab: Lab): Environment {
  const ns = `training-${lab.id}`;
  const originId = `${ns}-aws`;
  const privateOrigin = ['private', 'edge', 'ce', 'segments', 'overlap'].includes(lab.exercise);
  return {
    lb: {
      id: `${ns}-lb`,
      namespace: ns,
      name: `${lab.id}-lb`,
      domains: [`${lab.id}.example.com`],
      protocol: 'HTTPS',
      originId,
      wafId: '',
      apiProtection: false,
      botDefense: false,
      ddosProtection: false,
      requests: 0,
      createdAt: new Date().toISOString(),
      config: { ...lbConfig(), apiDiscovery: false },
    },
    waf: { id: `${ns}-waf`, namespace: ns, name: `${lab.id}-appfw`, mode: 'Monitoring' },
    origins: [
      {
        id: originId,
        namespace: ns,
        name: 'aws-primary',
        endpoint: privateOrigin ? '10.0.5.253' : 'aws-origin.example.com',
        port: 80,
        healthy: true,
        config: {
          ...originConfig(),
          type: privateOrigin ? 'IP on Site' : 'Public DNS',
          siteId: privateOrigin ? `${ns}-ce` : '',
        },
      },
      {
        id: `${ns}-azure`,
        namespace: ns,
        name: 'azure-canary',
        endpoint: lab.exercise === 'overlap' ? '10.0.5.253' : 'azure-origin.example.com',
        port: 80,
        healthy: true,
        config: { ...originConfig(), type: 'Public DNS' },
      },
    ],
    ce: {
      id: `${ns}-ce`,
      namespace: ns,
      name: `${lab.id}-customer-edge`,
      kind: 'CE',
      region: 'AWS / ap-northeast-2 (demo)',
      online: true,
      address: '192.0.2.10',
    },
    controls: {
      policyMode: 'Disabled',
      headerName: 'x-f5-appworld',
      headerValue: 'RjUtQXBwd29ybGQ=',
      allowedCountry: 'South Korea',
      deniedCountry: 'Fiji',
      blockBadReputation: false,
      allowedPath: '/',
      canary: false,
      canaryHeader: 'X-App-Version',
      canaryValue: 'green',
      rewriteLogin: false,
      namespaceHeader: false,
      inventory: false,
      apiDeny: false,
      deniedEndpoint: '/api/customerlookup/getbydob',
      schemaValidation: false,
      apiDiscovery: false,
      connector: false,
      rateLimit: false,
      rate: 3,
      rateWindow: 60,
      ratePath: '/api/customerlookup/getbyname',
      rateMethod: 'GET',
      botMode: 'Disabled',
      botPath: '/user/vipsignin',
      botExtraPath: '',
      botMethod: 'POST',
      telemetry: false,
      maliciousDetection: false,
      maliciousMitigation: false,
      segment: false,
      segmentPeer: false,
      firewall: false,
      failover: false,
      overlapVip: false,
      scanProfile: false,
      scanSchedule: 'Manual',
      source: defaultSource,
      deployedSource: '',
      artifact: '',
      pipeline: [],
    },
    runtime: emptyRuntime(),
  };
}
export const request = (patch: Partial<RequestInput> = {}): RequestInput => ({
  method: 'GET',
  path: '/',
  headers: {},
  body: {},
  source: '198.51.100.42',
  country: 'South Korea',
  reputation: 'Clean',
  identity: 'human-ja4',
  attack: 'None',
  transport: 'HTTP',
  ...patch,
});
export function baselineRequests(lab: Lab): RequestInput[] {
  const x = lab.exercise;
  if (x === 'endpoint' || x === 'inventory')
    return [
      request({
        path:
          x === 'endpoint' ? '/api/customerlookup/getbydob' : '/api/customerlookup/getbyheroname',
      }),
      request({ path: apiPaths[0] }),
    ];
  if (x === 'rate' || x === 'zero-day')
    return Array.from({ length: 4 }, () =>
      request({ path: x === 'rate' ? apiPaths[0] : '/ratelimit.php' }),
    );
  if (x === 'header')
    return [
      request(),
      request({ headers: { 'x-f5-appworld': 'RjUtQXBwd29ybGQ=' } }),
      request({ headers: { 'x-f5-appworld': 'wrong' } }),
    ];
  if (x === 'negative' || x === 'positive')
    return [request(), request({ country: 'Fiji' }), request({ reputation: 'TOR' })];
  if (['bot', 'bot-baseline', 'bot-flag', 'human-bot', 'bot-block'].includes(x)) {
    const path = x === 'bot-block' ? '/flight' : '/user/vipsignin',
      method = x === 'bot-block' ? 'GET' : 'POST';
    return [
      request({ path, method }),
      request({ path, method, attack: 'Bot', identity: 'baseline-bot' }),
    ];
  }
  return [request(), request({ attack: 'SQL Injection' }), request({ attack: 'XSS' })];
}
export function fingerprint(e: Environment) {
  return JSON.stringify({
    lb: { ...e.lb, requests: 0, createdAt: '' },
    waf: e.waf,
    origins: e.origins,
    ce: e.ce,
    controls: e.controls,
  });
}
function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
function manifest(source: string) {
  const parsed = JSON.parse(source) as {
    name?: string;
    routes?: { method: string; path: string; body: string }[];
  };
  if (
    !parsed.name ||
    !Array.isArray(parsed.routes) ||
    !parsed.routes.length ||
    parsed.routes.some(
      (r) =>
        !r.path?.startsWith('/') ||
        !['GET', 'POST'].includes(r.method) ||
        typeof r.body !== 'string',
    )
  )
    throw new Error('name과 GET/POST route의 path·body가 필요합니다.');
  return parsed;
}
export function pipeline(e: Environment, action: 'Build' | 'Test' | 'Deploy'): Environment {
  const next = structuredClone(e),
    c = next.controls;
  const app = manifest(c.source);
  const artifact = `local-${hash(c.source)}`;
  if (action === 'Build') {
    c.artifact = artifact;
    c.pipeline = ['Build'];
  }
  if (action === 'Test') {
    if (c.artifact !== artifact || !c.pipeline.includes('Build'))
      throw new Error('현재 소스를 먼저 Build 하세요.');
    if (
      !app.routes!.some((r) => r.method === 'GET' && r.path === '/') ||
      !app.routes!.some((r) => r.method === 'POST' && r.path === '/login')
    )
      throw new Error('GET / 와 POST /login 계약 테스트가 실패했습니다.');
    c.pipeline = ['Build', 'Test'];
  }
  if (action === 'Deploy') {
    if (c.artifact !== artifact || !c.pipeline.includes('Test'))
      throw new Error('현재 소스의 Build와 Test를 완료하세요.');
    if (
      evaluateRequest(next.lb, [next.waf], next.origins, 'SQL Injection', {
        path: '/',
        method: 'GET',
        signatureState: 'Existing',
      }).responseCode !== 403
    )
      throw new Error('Security gate: WAF Blocking을 연결해야 Deploy할 수 있습니다.');
    c.deployedSource = c.source;
    c.pipeline = ['Build', 'Test', 'Deploy'];
  }
  return next;
}
export function sendRequest(
  environment: Environment,
  input: RequestInput,
  lab: Lab,
): { environment: Environment; result: ProbeResult } {
  const e = structuredClone(environment),
    c = e.controls;
  const path = input.path.split('?')[0];
  if (!path.startsWith('/') || input.path.includes('://'))
    throw new Error('로컬 경로 / 로 시작하는 요청만 입력하세요.');
  const headers = Object.fromEntries(
    Object.entries(input.headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const identity = `${input.source}|${input.identity}`;
  const n = (e.runtime.identities[identity] ?? 0) + 1;
  e.runtime.identities[identity] = n;
  let origin = e.origins.find((o) => o.id === e.lb.originId);
  const route = lbConfig(e.lb).routes.find(
    (r) =>
      r.enabled &&
      (r.method === 'ANY' || r.method === input.method) &&
      (r.match === 'Exact' ? path === r.path : path.startsWith(r.path)),
  );
  if (route?.originId) origin = e.origins.find((o) => o.id === route.originId);
  if (c.canary && headers[c.canaryHeader.toLowerCase()] === c.canaryValue) origin = e.origins[1];
  if (!origin?.healthy && c.failover) origin = e.origins.find((o) => o.healthy);
  const responseHeaders: Record<string, string> = {
    'x-demo-release': origin?.id === e.origins[1]?.id ? 'canary' : 'stable',
  };
  const upstreamPath =
    c.rewriteLogin && route?.path === '/login' ? path.replace(/^\/login/, '') || '/' : path;
  responseHeaders['x-demo-upstream-path'] = upstreamPath;
  if (c.namespaceHeader && route?.path === '/login')
    responseHeaders['xc-namespace'] = e.lb.namespace;
  let code = 200,
    action: ProbeResult['action'] = 'Allowed',
    reason = 'Local origin accepted request',
    body = 'Demo application response';
  const block = (status: number, why: string) => {
    code = status;
    action = 'Blocked';
    reason = why;
    body = 'Request rejected by local simulator';
  };
  const privateOrigin = origin && ['IP on Site', 'DNS on Site'].includes(originConfig(origin).type);
  if (
    lbConfig(e.lb).vip === 'Do Not Advertise' ||
    (lbConfig(e.lb).vip === 'Custom' && (lbConfig(e.lb).siteId !== e.ce.id || !e.ce.online))
  )
    block(503, 'VIP not advertised or selected CE unavailable');
  if (
    !origin ||
    !origin.healthy ||
    (privateOrigin && (!e.ce.online || originConfig(origin).siteId !== e.ce.id))
  )
    block(503, 'Origin / Customer Edge unavailable');
  if (code === 200 && ['segments', 'overlap'].includes(lab.exercise)) {
    if (lab.exercise === 'segments' && (!c.segment || !c.segmentPeer))
      block(503, 'DC and AWS segments are isolated');
    if (lab.exercise === 'overlap' && !c.overlapVip)
      block(503, 'Overlapping IPs need a CE VIP mapping');
    if (code === 200 && c.firewall && input.transport === 'SSH')
      block(403, 'Enhanced firewall: SSH denied (simulated L4 result)');
  }
  if (
    code === 200 &&
    c.policyMode === 'Header allowlist' &&
    headers[c.headerName.toLowerCase()] !== c.headerValue
  )
    block(403, 'Service policy: required header missing or invalid');
  if (
    code === 200 &&
    c.policyMode === 'Negative enforcement' &&
    (input.country === c.deniedCountry || (c.blockBadReputation && input.reputation !== 'Clean'))
  )
    block(403, 'Service policy: country or reputation deny');
  if (
    code === 200 &&
    c.policyMode === 'Positive enforcement' &&
    !(input.country === c.allowedCountry && path === c.allowedPath && input.method === 'GET')
  )
    block(403, 'Service policy: default deny; allowlist did not match');
  if (
    code === 200 &&
    c.policyMode === 'Exploit deny' &&
    headers['x-demo-exploit'] === 'true' &&
    input.method === 'POST' &&
    path === '/auth.php'
  )
    block(403, 'Custom service policy: exploit request pattern');
  if (code === 200 && c.inventory && path.startsWith('/api/') && !apiPaths.includes(path))
    block(403, 'API inventory: fall-through endpoint denied');
  if (code === 200 && e.lb.apiProtection && c.apiDeny && path === c.deniedEndpoint)
    block(403, 'API protection: endpoint Deny / ANY method');
  if (
    code === 200 &&
    e.lb.apiProtection &&
    c.schemaValidation &&
    path === '/api/orders' &&
    (typeof input.body !== 'object' ||
      input.body === null ||
      typeof (input.body as { quantity?: unknown }).quantity !== 'number')
  )
    block(403, 'Local schema: quantity must be a number');
  if (code === 200 && c.maliciousDetection && input.attack === 'Malicious user') {
    action = 'Detected';
    reason = `Malicious fingerprint ${input.identity}: ${n} requests on shared IP`;
    if (c.maliciousMitigation && n >= 3)
      block(
        403,
        `Temporary block for fingerprint ${input.identity}; shared IP is not globally blocked`,
      );
  }
  const botTarget =
    (c.botMethod === 'ANY' || c.botMethod === input.method) &&
    (path === c.botPath || (!!c.botExtraPath && path === c.botExtraPath));
  if (code === 200 && e.lb.botDefense && c.botMode !== 'Disabled' && botTarget) {
    const bot =
      input.attack === 'Bot' || (input.attack === 'Human-like bot' && c.telemetry && n > 10);
    responseHeaders['x-demo-bot'] = bot ? 'BadBot' : 'Human';
    if (bot) {
      action = 'Detected';
      reason = 'Bot profile: synthetic telemetry classified BadBot';
      if (c.botMode === 'Blocking') block(403, 'Bot profile Blocking: BadBot rejected');
    }
  }
  if (code === 200 && ['SQL Injection', 'XSS'].includes(input.attack)) {
    const evaluation = evaluateRequest(
      e.lb,
      [e.waf],
      e.origins.map((o) => ({ ...o, healthy: true })),
      input.attack === 'XSS' ? 'Cross-site Scripting' : 'SQL Injection',
      { path: input.path, method: input.method, signatureState: 'Existing' },
    );
    code = evaluation.responseCode;
    action = evaluation.action;
    reason = evaluation.reason;
    body = evaluation.responseBody ?? body;
  }
  const limited =
    lab.exercise === 'zero-day'
      ? (input.method === 'POST' && path.startsWith('/auth.php')) ||
        (input.method === 'GET' && path.startsWith('/ratelimit.php'))
      : (c.rateMethod === 'ANY' || c.rateMethod === input.method) && path === c.ratePath;
  if (code === 200 && c.rateLimit && limited) {
    const key = `${identity}|${input.method}|${path}`;
    let bucket = e.runtime.buckets[key];
    if (!bucket || e.runtime.now - bucket.start >= c.rateWindow * 1000)
      bucket = { start: e.runtime.now, count: 0 };
    bucket.count += 1;
    e.runtime.buckets[key] = bucket;
    if (bucket.count > c.rate)
      block(429, `Rate limiter: ${c.rate} requests / ${c.rateWindow}s exceeded`);
  }
  if (
    code === 200 &&
    c.apiDiscovery &&
    lbConfig(e.lb).apiDiscovery &&
    !apiPaths.includes(path) &&
    (path.startsWith('/api/') || (c.connector && path.startsWith('/qrcode/')))
  )
    e.runtime.discovered = [...new Set([...e.runtime.discovered, path])];
  if (code === 200 && c.deployedSource) {
    const route = manifest(c.deployedSource).routes!.find(
      (r) => r.path === upstreamPath && r.method === input.method,
    );
    if (route) body = route.body;
  }
  if (code === 200 && path === '/api/customerlookup/getbydob')
    body = '{"customer":"SYNTHETIC PERSON","ssn":"DEMO-NOT-REAL"}';
  const result: ProbeResult = {
    id: crypto.randomUUID(),
    at: e.runtime.now,
    request: input,
    code,
    action,
    reason,
    origin: origin?.name ?? 'none',
    headers: responseHeaders,
    body,
  };
  e.runtime.logs = [result, ...e.runtime.logs].slice(0, 250);
  e.lb.requests += 1;
  return { environment: e, result };
}
export function runScan(environment: Environment): Environment {
  if (!environment.controls.scanProfile) throw new Error('Scan Profile을 먼저 활성화하세요.');
  const e = structuredClone(environment);
  const wafBlocks =
    sendRequest(e, request({ attack: 'SQL Injection' }), { exercise: 'scan' } as Lab).result
      .code === 403;
  const botBlocks =
    e.lb.botDefense &&
    e.controls.botMode === 'Blocking' &&
    e.controls.botPath === (e.controls.deployedSource ? '/login' : '/user/vipsignin') &&
    e.controls.botMethod === 'POST';
  e.runtime.scan = {
    at: e.runtime.now,
    findings: [
      { name: 'SQL Injection', severity: 'High', resolved: wafBlocks },
      {
        name: 'Cross-site Scripting',
        severity: 'High',
        resolved:
          sendRequest(e, request({ attack: 'XSS' }), { exercise: 'scan' } as Lab).result.code ===
          403,
      },
      { name: 'Automated login abuse', severity: 'Medium', resolved: botBlocks },
    ],
  };
  e.runtime.scanHistory = [...(e.runtime.scanHistory ?? []), e.runtime.scan].slice(-10);
  return e;
}
export function explain(environment: Environment): Environment {
  const e = structuredClone(environment),
    logs = e.runtime.logs;
  e.runtime.explanation = logs.length
    ? `LOCAL TEMPLATE · ${logs.length}개 요청 중 ${logs.filter((l) => l.action === 'Blocked').length}개 차단. 최근 요청 ${logs[0].id}: HTTP ${logs[0].code}, ${logs[0].reason}. 정상 트래픽과 차단 원인을 함께 비교하고 의도하지 않은 차단 여부를 확인하세요.`
    : '먼저 요청을 생성하세요.';
  return e;
}
// A visible reference solution. Validation never calls this function.
export function referenceConfiguration(environment: Environment, lab: Lab): Environment {
  let e = structuredClone(environment);
  const c = e.controls,
    x = lab.exercise;
  if (x === 'public') {
    e.lb.protocol = 'HTTP';
    e.lb.config!.listenPort = 80;
  }
  if (x === 'edge') {
    e.lb.config!.vip = 'Custom';
    e.lb.config!.siteId = e.ce.id;
  }
  if (
    [
      'public',
      'private',
      'edge',
      'analytics',
      'waf',
      'assistant',
      'pipeline',
      'scan',
      'scan-compare',
    ].includes(x)
  ) {
    e.lb.wafId = e.waf.id;
    e.waf.mode = 'Blocking';
  }
  if (['bot', 'scan', 'scan-compare', 'bot-block', 'advanced'].includes(x)) {
    c.botMode = 'Blocking';
    e.lb.botDefense = true;
  }
  if (['bot-flag', 'human-bot'].includes(x)) {
    c.botMode = 'Flag';
    e.lb.botDefense = true;
  }
  if (x === 'human-bot') c.telemetry = true;
  if (x === 'bot-block') {
    c.botPath = '/flight';
    c.botMethod = 'GET';
  }
  if (['malicious'].includes(x)) {
    c.maliciousDetection = true;
    c.maliciousMitigation = true;
  }
  if (x === 'header') c.policyMode = 'Header allowlist';
  if (x === 'route') {
    c.canary = true;
    c.rewriteLogin = true;
    c.namespaceHeader = true;
    e.waf.mode = 'Blocking';
    e.lb.config!.routes = [
      {
        id: `${e.lb.id}-login-route`,
        name: 'login-green',
        type: 'Simple',
        method: 'ANY',
        match: 'Prefix',
        path: '/login',
        enabled: true,
        originId: e.origins[1].id,
        wafId: e.waf.id,
        responseCode: 200,
        responseBody: '',
        redirectUrl: '',
      },
    ];
  }
  if (x === 'inventory') c.inventory = true;
  if (x === 'endpoint') {
    c.apiDeny = true;
    e.lb.apiProtection = true;
  }
  if (['rate', 'zero-day'].includes(x)) {
    c.rateLimit = true;
    c.rate = 3;
    c.rateWindow = 60;
  }
  if (x === 'zero-day') c.policyMode = 'Exploit deny';
  if (['discovery', 'advanced'].includes(x)) {
    c.apiDiscovery = true;
    e.lb.config!.apiDiscovery = true;
  }
  if (x === 'discovery') c.connector = true;
  if (x === 'segments') {
    c.segment = true;
    c.segmentPeer = true;
    c.firewall = true;
  }
  if (x === 'overlap') {
    c.overlapVip = true;
    c.firewall = true;
  }
  if (x === 'failover') c.failover = true;
  if (['code', 'pipeline', 'advanced', 'scan-compare'].includes(x)) {
    if (x !== 'code') {
      e.lb.wafId = e.waf.id;
      e.waf.mode = 'Blocking';
    }
    e = pipeline(e, 'Build');
    e = pipeline(e, 'Test');
    if (x !== 'code') e = pipeline(e, 'Deploy');
  }
  if (['advanced', 'scan-compare'].includes(x)) e.controls.botPath = '/login';
  if (x === 'advanced') e.controls.botExtraPath = '/contact';
  if (['scan', 'scan-compare'].includes(x)) {
    e.controls.scanProfile = true;
    e = runScan(e);
  }
  if (x === 'negative') {
    c.policyMode = 'Negative enforcement';
    c.blockBadReputation = true;
  }
  if (x === 'positive') c.policyMode = 'Positive enforcement';
  return e;
}
export function verifyLab(
  environment: Environment,
  lab: Lab,
): { verification: Verification; environment: Environment } {
  const original = structuredClone(environment);
  let e = structuredClone(environment);
  e.runtime.buckets = {};
  e.runtime.identities = {};
  const c = e.controls,
    x = lab.exercise,
    checks: Check[] = [];
  const check = (name: string, pass: boolean, expected: string, actual: string) =>
    checks.push({ name, pass, expected, actual });
  const probe = (
    name: string,
    input: Partial<RequestInput>,
    expected: number,
    extra?: (r: ProbeResult) => boolean,
  ) => {
    const out = sendRequest(e, request(input), lab);
    e = out.environment;
    check(
      name,
      out.result.code === expected && (!extra || extra(out.result)),
      `HTTP ${expected}`,
      `HTTP ${out.result.code} · ${out.result.action} · ${out.result.origin} · ${out.result.reason}`,
    );
    return out.result;
  };
  check(
    'LB → Origin 연결',
    !!e.lb.name.trim() &&
      e.origins.some(
        (o) =>
          o.id === e.lb.originId &&
          o.namespace === e.lb.namespace &&
          !!o.endpoint.trim() &&
          o.port > 0 &&
          o.port <= 65535,
      ) &&
      e.lb.domains.some((d) => d.includes('.')),
    '유효한 Origin과 Domain',
    `${e.lb.domains.join(', ')} → ${e.lb.originId}`,
  );
  if (x === 'public')
    check(
      'HTTP / 80 / Internet',
      e.lb.protocol === 'HTTP' &&
        lbConfig(e.lb).listenPort === 80 &&
        lbConfig(e.lb).vip === 'Internet' &&
        originConfig(e.origins[0]).type === 'Public DNS',
      'HTTP :80 · Internet · Public DNS',
      `${e.lb.protocol} :${lbConfig(e.lb).listenPort} · ${lbConfig(e.lb).vip}`,
    );
  if (x === 'api-lb')
    check(
      'HTTPS API frontend',
      e.lb.protocol === 'HTTPS' &&
        lbConfig(e.lb).listenPort === 443 &&
        lbConfig(e.lb).vip === 'Internet' &&
        e.origins[0].port === 80,
      'HTTPS :443 → Origin :80',
      `${e.lb.protocol} :${lbConfig(e.lb).listenPort} → :${e.origins[0].port}`,
    );
  if (['private', 'edge', 'ce'].includes(x)) {
    check(
      'Private Origin / CE',
      ['IP on Site', 'DNS on Site'].includes(originConfig(e.origins[0]).type) &&
        originConfig(e.origins[0]).siteId === e.ce.id,
      'Private origin on CE',
      `${originConfig(e.origins[0]).type} / ${originConfig(e.origins[0]).siteId}`,
    );
    if (x === 'edge')
      check(
        'CE advertisement',
        lbConfig(e.lb).vip === 'Custom' && lbConfig(e.lb).siteId === e.ce.id,
        'Custom VIP on CE',
        lbConfig(e.lb).vip,
      );
    else
      check(
        'Regional Edge advertisement',
        lbConfig(e.lb).vip === 'Internet',
        'Internet',
        lbConfig(e.lb).vip,
      );
    probe('CE Online request', {}, 200);
    e.ce.online = false;
    probe('CE Offline request', {}, 503);
    e.ce.online = original.ce.online;
  }
  if (['public', 'private', 'edge', 'analytics', 'waf', 'assistant', 'pipeline'].includes(x)) {
    probe('정상 사용자 허용', {}, 200);
    probe('SQLi 차단', { attack: 'SQL Injection' }, 403);
    probe('XSS 차단', { attack: 'XSS' }, 403);
  }
  if (x === 'assistant') {
    const explanation = original.runtime.explanation;
    check(
      '실제 로그에 대한 Explain',
      original.runtime.logs.length > 0 && explanation.includes(original.runtime.logs[0].id),
      '최근 요청 ID를 포함한 설명',
      explanation || 'Explain 실행 필요',
    );
  }
  if (x === 'header') {
    probe('헤더 없음', {}, 403);
    probe('정확한 헤더', { headers: { 'x-f5-appworld': 'RjUtQXBwd29ybGQ=' } }, 200);
    probe('잘못된 헤더 값', { headers: { 'x-f5-appworld': 'wrong' } }, 403);
  }
  if (x === 'route') {
    probe(
      '기본 AWS 경로',
      {},
      200,
      (r) => r.origin === 'aws-primary' && r.headers['x-demo-release'] === 'stable',
    );
    probe(
      'Canary 헤더 경로',
      { headers: { 'X-App-Version': 'green' } },
      200,
      (r) => r.origin === 'azure-canary' && r.headers['x-demo-release'] === 'canary',
    );
    probe(
      '/login path → green + rewrite + namespace header',
      { path: '/login' },
      200,
      (r) =>
        r.origin === 'azure-canary' &&
        r.headers['xc-namespace'] === e.lb.namespace &&
        r.headers['x-demo-upstream-path'] === '/',
    );
    probe('Route WAF 차단', { path: '/login', attack: 'SQL Injection' }, 403);
    probe('기본 경로는 route WAF 대상 아님', { attack: 'SQL Injection' }, 200);
  }
  if (x === 'api-lb') {
    probe('Swagger', { path: '/swagger' }, 200);
    probe('Known API', { path: apiPaths[0] }, 200);
  }
  if (x === 'inventory') {
    probe('Known inventory API', { path: apiPaths[0] }, 200);
    probe('Shadow API denied', { path: '/api/customerlookup/getbyheroname' }, 403);
  }
  if (x === 'endpoint') {
    probe('민감 데이터 endpoint Deny', { path: '/api/customerlookup/getbydob' }, 403);
    probe('정상 endpoint 유지', { path: apiPaths[0] }, 200);
  }
  if (['rate', 'zero-day'].includes(x)) {
    check(
      '3 requests / minute',
      c.rateLimit && c.rate === 3 && c.rateWindow === 60,
      '3 / 60s',
      `${c.rateLimit ? c.rate : 'Disabled'} / ${c.rateWindow}s`,
    );
    const paths =
      x === 'zero-day'
        ? [
            { path: '/ratelimit.php', method: 'GET' },
            { path: '/auth.php', method: 'POST' },
          ]
        : [{ path: apiPaths[0], method: 'GET' }];
    for (const target of paths) {
      for (let i = 1; i <= 4; i++)
        probe(`${target.method} ${target.path} #${i}`, target, i <= 3 ? 200 : 429);
      probe('다른 클라이언트 허용', { ...target, source: '198.51.100.43' }, 200);
    }
    for (let i = 0; i < 5; i++) probe(`제한 제외 경로 #${i + 1}`, { path: '/health' }, 200);
    e.runtime.now += 61000;
    probe('시간 창 만료 후 재허용', paths[0], 200);
    if (x === 'zero-day') {
      probe(
        'Zero Day 패턴 차단',
        {
          path: '/auth.php',
          method: 'POST',
          headers: { 'x-demo-exploit': 'true' },
          attack: 'Exploit',
        },
        403,
      );
      probe(
        '정상 로그인 유지',
        { path: '/auth.php', method: 'POST', source: '198.51.100.44' },
        200,
      );
    }
  }
  if (x === 'discovery' || x === 'advanced') {
    const path = x === 'discovery' ? '/qrcode/form' : '/api/shadow/contact';
    probe('탐색 트래픽 생성', { path }, 200);
    check(
      'Discovered endpoint',
      c.apiDiscovery &&
        lbConfig(e.lb).apiDiscovery &&
        (x !== 'discovery' || c.connector) &&
        e.runtime.discovered.includes(path),
      path,
      e.runtime.discovered.join(', ') || 'No telemetry',
    );
  }
  if (['bot', 'bot-flag', 'bot-block', 'advanced'].includes(x)) {
    const path = x === 'bot-block' ? '/flight' : x === 'advanced' ? '/login' : '/user/vipsignin',
      method = x === 'bot-block' ? 'GET' : 'POST';
    probe('정상 사람 요청', { path, method }, 200, (r) => r.action === 'Allowed');
    probe(
      '봇 요청',
      { path, method, attack: 'Bot' },
      x === 'bot-flag' ? 200 : 403,
      (r) =>
        r.headers['x-demo-bot'] === 'BadBot' &&
        r.action === (x === 'bot-flag' ? 'Detected' : 'Blocked'),
    );
    probe('다른 endpoint는 제외', { path: '/health', attack: 'Bot' }, 200);
    if (x === 'advanced') {
      probe('Contact form bot 차단', { path: '/contact', method: 'POST', attack: 'Bot' }, 403);
      probe('Contact form 정상 허용', { path: '/contact', method: 'POST' }, 200);
    }
  }
  if (x === 'bot-baseline') {
    check(
      '보호 전 기준 상태',
      !e.lb.botDefense && c.botMode === 'Disabled',
      'Bot disabled',
      c.botMode,
    );
    probe('로그인 봇 기준 응답', { path: '/user/vipsignin', method: 'POST', attack: 'Bot' }, 200);
  }
  if (x === 'human-bot') {
    for (let i = 1; i <= 12; i++)
      probe(
        `Synthetic telemetry #${i}`,
        {
          path: '/user/vipsignin',
          method: 'POST',
          attack: 'Human-like bot',
          identity: 'automation-ja4',
        },
        200,
        (r) =>
          r.headers['x-demo-bot'] === (i <= 10 ? 'Human' : 'BadBot') &&
          (i <= 10 || r.action === 'Detected'),
      );
  }
  if (x === 'malicious') {
    for (let i = 1; i <= 3; i++)
      probe(
        `악성 fingerprint #${i}`,
        { attack: 'Malicious user', identity: 'bad-ja4' },
        i < 3 ? 200 : 403,
      );
    probe('공유 IP의 정상 fingerprint', { identity: 'good-ja4' }, 200);
  }
  if (x === 'segments' || x === 'overlap') {
    check('CE Online', e.ce.online, 'Online', String(e.ce.online));
    probe('HTTP 연결', {}, 200);
    probe('SSH 방화벽', { transport: 'SSH' }, 403);
    e.ce.online = false;
    probe('CE 단절 연결', {}, 503);
    e.ce.online = original.ce.online;
  }
  if (x === 'failover') {
    probe('AWS 우선', {}, 200, (r) => r.origin === 'aws-primary');
    e.origins[0].healthy = false;
    probe('AWS 장애 → Azure', {}, 200, (r) => r.origin === 'azure-canary');
    e.origins[1].healthy = false;
    probe('전체 Origin 장애', {}, 503);
    e.origins = structuredClone(original.origins);
    probe('AWS 복구', {}, 200, (r) => r.origin === 'aws-primary');
  }
  if (['code', 'pipeline', 'advanced', 'scan-compare'].includes(x)) {
    check(
      '현재 소스 artifact',
      c.artifact === `local-${hash(c.source)}` && c.pipeline.includes('Test'),
      'Current Build + Test',
      `${c.artifact} / ${c.pipeline.join(' → ')}`,
    );
    if (x !== 'code')
      check(
        '현재 소스 배포',
        c.deployedSource === c.source && c.pipeline.includes('Deploy'),
        'Current source deployed',
        c.pipeline.join(' → '),
      );
    if (x === 'code')
      check(
        '앱 route 계약',
        (() => {
          try {
            const app = manifest(c.source);
            return (
              app.routes!.some((r) => r.path === '/' && r.method === 'GET') &&
              app.routes!.some((r) => r.path === '/login' && r.method === 'POST')
            );
          } catch {
            return false;
          }
        })(),
        'GET / + POST /login',
        'Local manifest contract',
      );
  }
  if (x === 'scan' || x === 'scan-compare') {
    check(
      '스캔 보고서 존재',
      !!original.runtime.scan && c.scanProfile,
      'Local scan report',
      original.runtime.scan ? new Date(original.runtime.scan.at).toISOString() : 'Run Scan 필요',
    );
    const fresh = c.scanProfile ? runScan(e).runtime.scan : undefined;
    check(
      '현재 설정에서 보호 적용',
      !!fresh && fresh.findings.every((f) => f.resolved),
      'All 3 findings mitigated',
      fresh?.findings.map((f) => `${f.name}: ${f.resolved ? 'mitigated' : 'open'}`).join(', ') ||
        'No scan profile',
    );
    check(
      '보고서 최신성',
      !!fresh && JSON.stringify(fresh.findings) === JSON.stringify(original.runtime.scan?.findings),
      'Current controls reflected in report',
      '설정 변경 후 재스캔 필요',
    );
  }
  if (x === 'negative') {
    probe('정상 국가', {}, 200);
    probe('Fiji 거부', { country: 'Fiji' }, 403);
    probe('TOR 평판 거부', { reputation: 'TOR' }, 403);
    probe('Spam 평판 거부', { reputation: 'Spam' }, 403);
  }
  if (x === 'positive') {
    probe('허용 국가·경로', {}, 200);
    probe('다른 국가', { country: 'Fiji' }, 403);
    probe('다른 경로', { path: '/admin' }, 403);
    probe('다른 메서드', { method: 'POST' }, 403);
  }
  // Transient failure probes never change the learner's resource health or clock.
  e.ce = original.ce;
  e.origins = original.origins;
  e.runtime.now = original.runtime.now;
  e.runtime.buckets = original.runtime.buckets;
  e.runtime.identities = original.runtime.identities;
  return {
    environment: e,
    verification: { at: Date.now(), fingerprint: fingerprint(original), checks },
  };
}
