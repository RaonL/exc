import { useConsole } from '../store';
import type { LB, Origin } from '../types';
import { lbConfig, originConfig } from '../lib/config';
import { consoleLab1Checks, sharedBaseWaf } from '../lib/console-lab';

export type GuideStep = 'origin' | 'lb' | 'baseline' | 'waf' | 'attacks' | 'inspect';
export interface GuideField {
  id: string;
  title: string;
  expected: string;
  pass: boolean;
  section?: string;
  label?: string;
  copyValue?: string;
}
export const guideSteps: { id: GuideStep; title: string; instruction: string }[] = [
  {
    id: 'origin',
    title: 'Origin Pool 만들기',
    instruction:
      'Manage → Load Balancers → Origin Pools → Add Origin Pool. 아래 값으로 입력하고 저장하세요.',
  },
  {
    id: 'lb',
    title: 'HTTP LB 만들기',
    instruction:
      'HTTP Load Balancers → Add HTTP Load Balancer. Origin Pool을 연결하세요. 처음 생성할 때는 WAF Disable로 두고 ④ 단계에서 연결합니다.',
  },
  {
    id: 'baseline',
    title: 'WAF 연결 전 정상 요청',
    instruction:
      'LB 목록의 Domains → Open Application → Home, HEADER를 누르세요. HTTP 200을 확인합니다.',
  },
  {
    id: 'waf',
    title: 'WAF 연결하기',
    instruction:
      'LB Actions → Manage Configuration → Edit Configuration → Web Application Firewall. Enable과 shared/base-appfw를 선택하고 저장하세요.',
  },
  {
    id: 'attacks',
    title: 'WAF 연결 후 요청 비교',
    instruction:
      'Open Application에서 Home은 200, SQL Injection·XSS·Command Injection은 각각 403인지 확인하세요.',
  },
  {
    id: 'inspect',
    title: '차단 이벤트 상세 확인',
    instruction:
      'Security Analytics에서 생성한 공격 이벤트를 열고 Support ID와 signature를 확인하세요.',
  },
];

export function openGuideStep(step: GuideStep) {
  const core = useConsole.getState();
  if (!core.consoleLab1) core.startConsoleLab1();
  const state = useConsole.getState(),
    lab = state.consoleLab1!;
  useConsole.setState({
    namespace: lab.namespace,
    consoleLab1: { ...lab, guideOpen: true, guideStep: step },
  });
  const lb = state.lbs.find(
    (l) => l.namespace === lab.namespace && l.name === `${lab.namespace}-lb`,
  );
  if ((step === 'baseline' || step === 'attacks') && lb) {
    state.navigate('Web App & API Protection', 'HTTP Load Balancers');
    state.openApplication(lb.id);
  } else {
    state.navigate(
      'Web App & API Protection',
      step === 'origin'
        ? 'Origin Pools'
        : step === 'inspect'
          ? 'Security Analytics'
          : 'HTTP Load Balancers',
    );
    if (step === 'inspect' && lb) useConsole.setState({ selectedLbId: lb.id });
  }
}

export function guideFields(
  kind: string,
  value: unknown,
  data: ReturnType<typeof useConsole.getState>,
  step: GuideStep,
): GuideField[] {
  const ns = data.consoleLab1?.namespace ?? data.namespace;
  const field = (
    id: string,
    title: string,
    expected: string,
    pass: boolean,
    section?: string,
    label?: string,
    copyValue = expected,
  ): GuideField => ({ id, title, expected, pass, section, label, copyValue });
  if (kind === 'Origin Pool') {
    const origin = value as Origin;
    return [
      field(
        'origin-name',
        'Name',
        `${ns}-pool`,
        origin.name === `${ns}-pool`,
        'metadata',
        'Name *',
      ),
      field(
        'origin-server',
        'Origin Servers → Add Item',
        'Public DNS · demo-app.amer.myedgedemo.com',
        origin.endpoint === 'demo-app.amer.myedgedemo.com' &&
          originConfig(origin).type === 'Public DNS',
        'servers',
        undefined,
        'demo-app.amer.myedgedemo.com',
      ),
      field('origin-port', 'Port', '80', origin.port === 80, 'servers', 'Port *'),
    ];
  }
  if (kind === 'Origin Server') {
    const server = value as { type: string; endpoint: string };
    return [
      field(
        'server-type',
        'Select Type of Origin Server',
        'Public DNS Name of Origin Server',
        server.type === 'Public DNS',
        'origin-server',
        'Select Type of Origin Server *',
      ),
      field(
        'server-dns',
        'DNS Name',
        'demo-app.amer.myedgedemo.com',
        server.endpoint === 'demo-app.amer.myedgedemo.com',
        'origin-server',
        'DNS Name *',
      ),
    ];
  }
  const pool = data.origins.find((o) => o.namespace === ns && o.name === `${ns}-pool`);
  if (kind === 'Origin Pool with Weight and Priority') {
    const item = value as { originId: string; weight: number; priority: number };
    return [
      field(
        'pool-reference',
        'Origin Pool',
        `${ns}/${ns}-pool`,
        !!pool && item.originId === pool.id,
        'pool-method',
        'Origin Pool *',
      ),
      field('pool-weight', 'Weight', '1', item.weight === 1, 'pool-method', 'Weight'),
      field('pool-priority', 'Priority', '1', item.priority === 1, 'pool-method', 'Priority'),
    ];
  }
  if (kind === 'HTTP Load Balancer') {
    const lb = value as LB,
      config = lbConfig(lb);
    if (step === 'waf')
      return [
        field(
          'waf-enable',
          'Web Application Firewall (WAF)',
          'Enable → App Firewall 선택',
          !!lb.wafId,
          'waf',
          'Web Application Firewall (WAF)',
        ),
        field(
          'waf-reference',
          'Enable',
          'shared/base-appfw',
          lb.wafId === sharedBaseWaf.id,
          'waf',
          'Enable *',
        ),
      ];
    return [
      field('lb-name', 'Name', `${ns}-lb`, lb.name === `${ns}-lb`, 'metadata', 'Name *'),
      field(
        'lb-domain',
        'Domains',
        `${ns}.lab-sec.f5demos.com`,
        lb.domains.includes(`${ns}.lab-sec.f5demos.com`),
        'domains',
      ),
      field(
        'lb-http',
        'Load Balancer Type',
        'HTTP',
        lb.protocol === 'HTTP',
        'domains',
        'Load Balancer Type',
      ),
      field(
        'lb-dns',
        'Automatically Manage DNS Records',
        '체크 ☑',
        config.manageDns === true,
        'domains',
      ),
      field(
        'lb-port-choice',
        'HTTP Listen Port Choice',
        'HTTP Listen Port',
        config.listenPortChoice === 'HTTP Listen Port' && lb.protocol === 'HTTP',
        'domains',
        'HTTP Listen Port Choice *',
      ),
      field(
        'lb-port',
        'HTTP Listen Port',
        '80',
        lb.protocol === 'HTTP' && config.listenPort === 80,
        'domains',
        'HTTP Listen Port *',
      ),
      field(
        'lb-origin',
        'Origins → Add Item',
        `${ns}/${ns}-pool`,
        !!pool && lb.originId === pool.id,
        'origins',
      ),
      field(
        'lb-vip',
        'VIP Advertisement',
        'Internet',
        config.vip === 'Internet',
        'other',
        'VIP Advertisement',
      ),
    ];
  }
  const lab = data.consoleLab1;
  if (!lab) return [];
  if (kind === 'Open Application' && step === 'attacks') {
    const lb = data.lbs.find((item) => item.namespace === ns && item.name === `${ns}-lb`);
    const events = data.events.filter(
      (event) =>
        event.lbId === lb?.id &&
        event.namespace === ns &&
        event.generatedBy === 'console-request' &&
        Date.parse(event.timestamp) >= Date.parse(lab.startedAt) &&
        event.evaluatedWafId === sharedBaseWaf.id,
    );
    return [
      field(
        'request-normal',
        'Home / HEADER',
        'HTTP 200 · Allowed',
        events.some((e) => e.scenario === 'Normal HTTP traffic' && e.responseCode === 200),
      ),
      ...(['SQL Injection', 'Cross-site Scripting', 'Command Injection'] as const).map(
        (attack, index) =>
          field(
            `request-attack-${index}`,
            attack === 'Cross-site Scripting' ? 'XSS' : attack,
            'HTTP 403 · Blocked',
            events.some(
              (e) => e.scenario === attack && e.responseCode === 403 && e.action === 'Blocked',
            ),
          ),
      ),
    ];
  }
  const checks = consoleLab1Checks(data, lab);
  return checks.filter((c) => c.id === step).map((c) => field(c.id, c.title, c.detail, c.pass));
}
