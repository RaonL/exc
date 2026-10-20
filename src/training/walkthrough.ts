import {
  baselineRequests,
  createEnvironment,
  referenceConfiguration,
  request,
  sendRequest,
} from './engine';
import { lbConfig, originConfig } from '../lib/config';
import type { Environment, Lab, ProbeResult, RequestInput } from './types';

type Sample = {
  name: string;
  input: RequestInput;
  repeat: number;
  before: ProbeResult[];
  after: ProbeResult[];
};
const show = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value));
function repeatProbe(environment: Environment, lab: Lab, input: RequestInput, repeat: number) {
  let next = structuredClone(environment);
  const results: ProbeResult[] = [];
  for (let i = 0; i < repeat; i++) {
    const run = sendRequest(next, input, lab);
    next = run.environment;
    results.push(run.result);
  }
  return results;
}
function sampleInputs(lab: Lab): { input: RequestInput; repeat: number; name: string }[] {
  const x = lab.exercise;
  if (lab.id === 'c1-lab1')
    return [
      { name: '정상 앱 접근', repeat: 1, input: request() },
      {
        name: 'SQL Injection 샘플',
        repeat: 1,
        input: request({ path: '/product?id=4%20OR%201=1', attack: 'SQL Injection' }),
      },
      {
        name: 'XSS 샘플',
        repeat: 1,
        input: request({ path: '/cart?search=<script>sample</script>', attack: 'XSS' }),
      },
    ];
  if (x === 'human-bot')
    return [
      {
        name: '사람처럼 동작하는 봇 · 같은 식별자 12회',
        repeat: 12,
        input: request({
          path: '/user/vipsignin',
          method: 'POST',
          attack: 'Human-like bot',
          identity: 'demo-human-bot',
          body: { username: 'demo-traveler', password: 'dummy-only' },
        }),
      },
      {
        name: '정상 사용자 로그인',
        repeat: 1,
        input: request({
          path: '/user/vipsignin',
          method: 'POST',
          body: { username: 'demo-human', password: 'dummy-only' },
        }),
      },
    ];
  if (x === 'malicious')
    return [
      {
        name: '동일 악성 식별자 3회',
        repeat: 3,
        input: request({ attack: 'Malicious user', identity: 'demo-malicious' }),
      },
      { name: '동일 IP의 정상 식별자', repeat: 1, input: request({ identity: 'demo-normal' }) },
    ];
  if (x === 'rate' || x === 'zero-day')
    return [
      {
        name: '같은 클라이언트 연속 4회',
        repeat: 4,
        input: request({
          path: x === 'rate' ? '/api/customerlookup/getbyname' : '/ratelimit.php',
          identity: 'demo-rate-client',
        }),
      },
      { name: '정상 경로 bypass', repeat: 1, input: request({ path: '/health' }) },
      ...(x === 'zero-day'
        ? [
            {
              name: '합성 exploit 조건',
              repeat: 1,
              input: request({
                path: '/auth.php',
                method: 'POST',
                headers: { 'x-demo-exploit': 'true' },
                attack: 'Exploit',
              }),
            },
          ]
        : []),
    ];
  if (x === 'route')
    return [
      { name: '기본 경로', repeat: 1, input: request() },
      { name: 'Canary 헤더', repeat: 1, input: request({ headers: { 'X-App-Version': 'green' } }) },
      {
        name: '/login Route WAF',
        repeat: 1,
        input: request({ path: '/login', method: 'POST', attack: 'SQL Injection' }),
      },
    ];
  if (x === 'overlap')
    return [
      { name: '도메인으로 GET 허용', repeat: 1, input: request() },
      {
        name: 'Task 3 · IP만 접근: Host 불일치',
        repeat: 1,
        input: request({ headers: { host: '10.1.1.5' } }),
      },
      { name: 'Task 8 · GET-only 정책: HEAD 차단', repeat: 1, input: request({ method: 'HEAD' }) },
      { name: 'SSH 방화벽', repeat: 1, input: request({ transport: 'SSH' }) },
    ];
  if (x === 'segments')
    return [
      { name: 'HTTP 앱 접근', repeat: 1, input: request() },
      { name: 'SSH 접근 비교', repeat: 1, input: request({ transport: 'SSH' }) },
    ];
  const inputs = baselineRequests(lab);
  return inputs.map((input, index) => ({
    name: `예제 ${index + 1} · ${input.attack === 'None' ? '정상/조건 비교' : input.attack}`,
    repeat: 1,
    input:
      input.path === '/api/customerlookup/getbydob'
        ? { ...input, body: { dob: '1970/05/29' } }
        : input,
  }));
}
export function buildWalkthrough(lab: Lab) {
  const initial = createEnvironment(lab),
    target = referenceConfiguration(initial, lab);
  if (lab.id === 'c1-lab1') {
    initial.lb.namespace = 'class1-lab1';
    initial.lb.name = 'class1-lab1-lb';
    initial.lb.domains = ['class1-lab1.lab-sec.f5demos.com'];
    initial.origins[0].name = 'class1-lab1-origin';
    initial.origins[0].endpoint = 'demo-app.amer.myedgedemo.com';
    initial.waf.name = 'shared/base-appfw';
    target.waf.name = 'shared/base-appfw';
  }
  const fixtures = [
    { label: 'Namespace', value: initial.lb.namespace },
    { label: 'HTTP LB / Domain', value: `${initial.lb.name} / ${initial.lb.domains[0]}` },
    ...initial.origins
      .filter((_, index) => lab.id !== 'c1-lab1' || index === 0)
      .map((origin) => ({
        label: `Origin Pool · ${origin.name}`,
        value: `${origin.endpoint}:${origin.port}`,
      })),
    { label: 'App Firewall', value: initial.waf.name },
    ...(lab.id === 'c1-lab1'
      ? []
      : [{ label: 'Customer Edge', value: `${initial.ce.name} / ${initial.ce.address}` }]),
  ];
  const settings = [
    { label: 'Load Balancer Type', before: initial.lb.protocol, after: target.lb.protocol },
    {
      label: 'Listen Port',
      before: String(lbConfig(initial.lb).listenPort),
      after: String(lbConfig(target.lb).listenPort),
    },
    {
      label: 'VIP Advertisement',
      before: lbConfig(initial.lb).vip,
      after: lbConfig(target.lb).vip,
    },
    {
      label: 'Origin Server Type',
      before: originConfig(initial.origins[0]).type,
      after: originConfig(target.origins[0]).type,
    },
    {
      label: 'Web Application Firewall (WAF)',
      before: initial.lb.wafId ? 'Enable' : 'Disable',
      after: target.lb.wafId ? `Enable → ${target.waf.name}` : 'Disable',
    },
    { label: 'Enforcement Mode', before: initial.waf.mode, after: target.waf.mode },
  ];
  for (const key of ['botDefense', 'apiProtection'] as const)
    if (initial.lb[key] !== target.lb[key])
      settings.push({
        label: key === 'botDefense' ? 'Enable Bot Defense on LB' : 'Enable API Protection on LB',
        before: show(initial.lb[key]),
        after: show(target.lb[key]),
      });
  if (lbConfig(target.lb).routes.length)
    settings.push({
      label: 'Routes',
      before: '[]',
      after: JSON.stringify(lbConfig(target.lb).routes, null, 2),
    });
  const omitted = new Set(['source', 'deployedSource', 'artifact', 'pipeline']);
  const required = new Set([
    ...(['header'].includes(lab.exercise) ? ['headerName', 'headerValue'] : []),
    ...(['route'].includes(lab.exercise) ? ['canaryHeader', 'canaryValue'] : []),
    ...(['rate', 'zero-day'].includes(lab.exercise) ? ['rate', 'rateWindow'] : []),
    ...(['endpoint'].includes(lab.exercise) ? ['deniedEndpoint'] : []),
    ...(['bot', 'bot-baseline', 'bot-flag', 'human-bot', 'bot-block', 'advanced'].includes(
      lab.exercise,
    )
      ? ['botPath', 'botMethod']
      : []),
    ...(['negative'].includes(lab.exercise) ? ['deniedCountry'] : []),
    ...(['positive'].includes(lab.exercise) ? ['allowedCountry', 'allowedPath'] : []),
  ]);
  const labels: Record<string, string> = {
    policyMode: 'Service Policy Mode',
    headerName: 'Required Header Name',
    headerValue: 'Required Header Value',
    canary: 'Enable Header Canary',
    canaryHeader: 'Canary Header Name',
    canaryValue: 'Canary Header Value',
    rewriteLogin: 'Rewrite /login Prefix',
    namespaceHeader: 'Add XC-Namespace Response Header',
    inventory: 'Inventory Fall-through Deny',
    apiDeny: 'Endpoint Deny Rule',
    deniedEndpoint: 'Denied API Endpoint',
    apiDiscovery: 'API Discovery / LB',
    connector: 'BIG-IP Connector (synthetic telemetry)',
    rateLimit: 'Enable Rate Limiting',
    rate: 'Number of Requests',
    rateWindow: 'Period (seconds)',
    botMode: 'Bot Enforcement Mode',
    botPath: 'Protected Bot Endpoint',
    botMethod: 'Protected HTTP Method',
    botExtraPath: 'Additional Bot Endpoint',
    telemetry: 'JavaScript Telemetry (simulated)',
    maliciousDetection: 'Malicious User Detection',
    maliciousMitigation: 'Malicious User Mitigation',
    segment: 'DC Segment',
    segmentPeer: 'AWS Segment',
    firewall: 'Enhanced Firewall',
    failover: 'Enable Origin Failover',
    overlapVip: 'CE VIP Mapping',
    scanProfile: 'Scan Profile',
    deniedCountry: 'Denied Country',
    allowedCountry: 'Allowed Country',
    allowedPath: 'Allowed Exact Path',
    blockBadReputation: 'Block TOR / Spam Reputation',
  };
  for (const [key, value] of Object.entries(target.controls))
    if (
      !omitted.has(key) &&
      (required.has(key) ||
        show(initial.controls[key as keyof typeof initial.controls]) !== show(value))
    )
      settings.push({
        label: labels[key] ?? key,
        before: show(initial.controls[key as keyof typeof initial.controls]),
        after: show(value),
      });
  if (target.controls.pipeline.length)
    settings.push({
      label: 'Pipeline 순서',
      before: '미실행',
      after: target.controls.pipeline.join(' → '),
    });
  if (['rate', 'zero-day'].includes(lab.exercise))
    settings.push({
      label: 'Rate Limited Endpoints',
      before: '미적용',
      after:
        lab.exercise === 'zero-day'
          ? 'POST /auth.php · GET /ratelimit.php'
          : `${target.controls.rateMethod} ${target.controls.ratePath}`,
    });
  const samples: Sample[] = sampleInputs(lab).map((sample) => ({
    ...sample,
    before: repeatProbe(initial, lab, sample.input, sample.repeat),
    after: repeatProbe(target, lab, sample.input, sample.repeat),
  }));
  return { fixtures, settings, samples };
}
