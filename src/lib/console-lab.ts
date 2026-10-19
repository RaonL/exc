import type { DemoData, LB, Scenario, SecurityEvent, Waf } from '../types';
import { lbConfig, originConfig } from './config';
export const class1Lab1Source =
  'https://clouddocs.f5.com/training/community/f5xc/html/class1/lab1.html';
export const sharedBaseWaf: Waf = {
  id: 'waf-shared-base-appfw',
  namespace: 'shared',
  name: 'base-appfw',
  mode: 'Blocking',
};
export interface ConsoleLab1 {
  namespace: string;
  startedAt: string;
  reviewedIds: string[];
  guideOpen: boolean;
}
export const lab1Samples = [
  { label: 'Home', path: '/' },
  { label: 'HEADER', path: '/headers' },
  { label: 'SQL Injection', path: '/product?id=4%20OR%201=1' },
  { label: 'XSS', path: '/cart?search=%3Cscript%3Ealert(1)%3C%2Fscript%3E' },
  { label: 'Command Injection', path: '/?cmd=cat%20/etc/passwd' },
];
// This intentionally recognizes only teaching patterns; it never evaluates the input.
export function classifyLocalPath(path: string): Scenario {
  let decoded = path;
  for (let i = 0; i < 2; i++) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      break;
    }
  }
  if (/<script\b|onerror\s*=/i.test(decoded)) return 'Cross-site Scripting';
  if (/[?&]cmd=.*\b(cat|whoami|id)\b/i.test(decoded)) return 'Command Injection';
  if (/\bor\s+['"]?\w+['"]?\s*=\s*['"]?\w+|union\s+select/i.test(decoded)) return 'SQL Injection';
  return 'Normal HTTP traffic';
}
export function localRequestPath(lb: LB, value: string): string {
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    !lb.domains.includes(url.hostname)
  )
    throw new Error('이 LB에 설정한 도메인 또는 / 로 시작하는 로컬 경로를 사용하세요.');
  if (
    url.protocol !== `${lb.protocol.toLowerCase()}:` ||
    Number(url.port || (url.protocol === 'http:' ? 80 : 443)) !== lbConfig(lb).listenPort
  )
    throw new Error('LB의 프로토콜과 Listen Port에 맞는 URL을 사용하세요.');
  return `${url.pathname}${url.search}`;
}
export function consoleLab1Checks(data: DemoData, lab: ConsoleLab1) {
  const pool = data.origins.find(
    (o) => o.namespace === lab.namespace && o.name === `${lab.namespace}-pool`,
  );
  const lb = data.lbs.find(
    (l) => l.namespace === lab.namespace && l.name === `${lab.namespace}-lb`,
  );
  const config = lbConfig(lb);
  const events = data.events.filter(
    (e) =>
      e.lbId === lb?.id &&
      e.generatedBy === 'console-request' &&
      e.namespace === lab.namespace &&
      Date.parse(e.timestamp) >= Date.parse(lab.startedAt),
  );
  const blocked = (scenario: Scenario) =>
    events.some(
      (e) =>
        e.scenario === scenario &&
        e.responseCode === 403 &&
        e.action === 'Blocked' &&
        e.evaluatedWafId === lb?.wafId,
    );
  return [
    {
      id: 'origin',
      title: 'Origin Pool',
      pass:
        !!pool &&
        originConfig(pool).type === 'Public DNS' &&
        pool.endpoint === 'demo-app.amer.myedgedemo.com' &&
        pool.port === 80,
      detail: `${lab.namespace}-pool · Public DNS · demo-app.amer.myedgedemo.com · :80`,
      page: 'Origin Pools' as const,
    },
    {
      id: 'lb',
      title: 'HTTP Load Balancer',
      pass:
        !!lb &&
        lb.originId === pool?.id &&
        lb.protocol === 'HTTP' &&
        config.listenPort === 80 &&
        config.manageDns === true &&
        config.listenPortChoice === 'HTTP Listen Port' &&
        config.vip === 'Internet' &&
        lb.domains.includes(`${lab.namespace}.lab-sec.f5demos.com`),
      detail: `${lab.namespace}-lb · HTTP/80 · DNS auto · Internet · Origin 연결`,
      page: 'HTTP Load Balancers' as const,
    },
    {
      id: 'baseline',
      title: '보호 전 앱 요청',
      pass: events.some(
        (e) => e.scenario === 'Normal HTTP traffic' && e.responseCode === 200 && !e.evaluatedWafId,
      ),
      detail: '목록의 도메인 → Open Application → Home / HEADER → HTTP 200',
      page: 'Overview' as const,
    },
    {
      id: 'waf',
      title: 'WAF 연결',
      pass:
        lb?.wafId === sharedBaseWaf.id &&
        data.wafs.some((w) => w.id === lb.wafId && w.mode === 'Blocking'),
      detail: 'Actions → Manage Configuration → Edit → WAF Enable → shared/base-appfw',
      page: 'HTTP Load Balancers' as const,
    },
    {
      id: 'attacks',
      title: '보호 후 테스트',
      pass:
        blocked('SQL Injection') &&
        blocked('Cross-site Scripting') &&
        blocked('Command Injection') &&
        events.some(
          (e) =>
            e.scenario === 'Normal HTTP traffic' &&
            e.responseCode === 200 &&
            e.evaluatedWafId === sharedBaseWaf.id,
        ),
      detail: '정상 200 · SQLi / XSS / Command Injection 403',
      page: 'Overview' as const,
    },
    {
      id: 'inspect',
      title: 'Requests / Security Analytics',
      pass: events.some((e) => e.action === 'Blocked' && lab.reviewedIds.includes(e.id)),
      detail: '요청 상세의 Information / Request / JSON에서 Support ID·signature 확인',
      page: 'Security Analytics' as const,
    },
  ];
}
export function explainConsoleEvent(event: SecurityEvent, wafs: Waf[]) {
  const waf = wafs.find((w) => w.id === event.evaluatedWafId);
  return `로컬 규칙 기반 설명 · req_id ${event.id}\n${event.method ?? 'GET'} ${event.path}\nHTTP ${event.responseCode ?? 200} · ${event.action}\n${event.reason ?? 'Seeded demo event'}\n적용 정책: ${waf ? `${waf.namespace}/${waf.name}` : '없음'}\n정상 요청과 비교하고, WAF 모드 및 의도한 경로의 예외 설정을 확인하세요. 실제 AI 서비스는 호출하지 않습니다.`;
}
