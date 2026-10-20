import type { Exercise, Lab } from './types';
const base = 'https://clouddocs.f5.com/training/community/f5xc/html/';
export const classes = [
  {
    id: 1,
    title: 'Foundations of Delivery & Security',
    subtitle: '공개·비공개 앱 전달과 WAF',
    color: '#526de8',
  },
  {
    id: 2,
    title: 'Web Application Security & Scanning',
    subtitle: 'WAF · Bot · 사용자 분석 · 스캐닝',
    color: '#8b5ac7',
  },
  {
    id: 3,
    title: 'SaaS Happens, Control the Flow',
    subtitle: '서비스 정책과 요청 라우팅',
    color: '#178a9a',
  },
  {
    id: 4,
    title: 'Discovering & Securing APIs',
    subtitle: 'API 인벤토리 · 보호 · 탐색',
    color: '#477ac8',
  },
  {
    id: 5,
    title: 'Advanced Threat & Fraud Security',
    subtitle: '자격 증명 대입과 스크래핑 방어',
    color: '#bd6b34',
  },
  {
    id: 6,
    title: 'Policy Optimization in a Multicloud World',
    subtitle: 'CE · 세그먼트 · 장애 전환',
    color: '#238675',
  },
  { id: 7, title: 'Code, Secure, Repeat', subtitle: '모의 앱 개발과 DevSecOps', color: '#8a68a9' },
  {
    id: 8,
    title: 'Security Automation & Zero Day Mitigation',
    subtitle: '정책 허용·차단과 속도 제한',
    color: '#b74c64',
  },
];
classes.push({
  id: 9,
  title: 'WAAP, Rate Limiting & Bot Defense',
  subtitle: '커뮤니티 보충 실습 · Mettichi1',
  color: '#d52b35',
});
const labs: Lab[] = [];
function add(
  classId: number,
  unit: string,
  title: string,
  exercise: Exercise,
  objective: string,
  steps: string[],
  path?: string,
) {
  labs.push({
    id: `c${classId}-${unit.replaceAll('/', '-')}`,
    classId,
    unit,
    title,
    exercise,
    objective,
    steps,
    source: base + (path ?? `class${classId}/${unit}.html`),
  });
}
add(
  1,
  'lab1',
  'Public Endpoint',
  'public',
  '공개 Origin과 HTTP LB를 구성하고 WAF 연결 전후를 비교합니다.',
  [
    'Manage → Load Balancers → Origin Pools에서 Pool을 생성하고 Add Item → Public DNS → Apply 후 포트 80을 설정합니다.',
    'HTTP Load Balancers에서 Domain, HTTP/80, Automatically Manage DNS Records, Origins를 설정하고 저장합니다.',
    '정상 요청과 SQLi 요청을 보내 보호 전 응답을 기록합니다.',
    'Actions → Manage Configuration → Edit에서 shared/base-appfw를 연결하고 정상 200·공격 403과 Security Analytics의 Support ID를 확인합니다.',
  ],
);
add(
  1,
  'lab2',
  'Private Endpoint via Regional Edges',
  'private',
  'RE에서 CE를 거쳐 비공개 앱을 전달합니다.',
  [
    'Private Origin을 IP on Site로 설정하고 CE를 연결합니다.',
    'Internet VIP를 사용해 Client → RE → CE → Origin 경로를 구성합니다.',
    'CE Online/Offline을 바꿔 200/503 차이를 관찰합니다.',
    'WAF Blocking을 적용하고 공격 차단을 검증합니다.',
  ],
);
add(
  1,
  'lab3',
  'Protecting a Private Endpoint',
  'edge',
  'CE에서 광고하는 프라이빗 앱을 보호합니다.',
  [
    'CE와 사설 Origin을 확인합니다.',
    'VIP Advertisement를 Custom으로 변경해 CE에 연결합니다.',
    '정상 접근을 확인한 뒤 WAF를 연결합니다.',
    'CE 오프라인 시 연결 실패와 WAF 차단을 각각 검사합니다.',
  ],
);
add(
  1,
  'lab4',
  'Security Analytics',
  'analytics',
  '요청과 보안 이벤트를 생성하고 근거를 조사합니다.',
  [
    '보호 전 요청을 기록합니다.',
    'WAF Blocking 적용 후 SQLi·XSS·정상 요청을 생성합니다.',
    '결과의 요청 ID·메서드·응답 코드·차단 이유를 확인합니다.',
    'Security Events에서 동일 실습 Namespace의 이벤트를 확인합니다.',
  ],
);
add(
  2,
  'lab1',
  'Web Application Firewall Configuration',
  'waf',
  'WAF 연결·Monitoring·Blocking의 차이를 실험합니다.',
  [
    '연결되지 않은 WAF의 공격 통과를 확인합니다.',
    'WAF를 연결하고 Monitoring으로 변경해 탐지만 되는지 확인합니다.',
    'Blocking으로 변경하고 정상 요청과 공격을 함께 검증합니다.',
    '콘솔의 App Firewall에서 정책을 편집해 재검증할 수도 있습니다.',
  ],
);
add(
  2,
  'lab2',
  'Signature-based Bots & Bot Defense',
  'bot',
  '봇 탐지와 보호 대상 엔드포인트를 구분합니다.',
  [
    '로그인 POST 요청을 생성합니다.',
    'Bot Defense 프로필의 대상 경로·메서드를 설정합니다.',
    'Flag 모드의 200·탐지 결과를 확인합니다.',
    'Blocking으로 바꾸고 봇 403·사람 요청 200을 검증합니다.',
  ],
);
add(
  2,
  'lab3',
  'Malicious Users',
  'malicious',
  '공유 IP의 정상 사용자와 악성 식별자를 구분합니다.',
  [
    '서로 다른 fingerprint 식별자로 동일 IP 요청을 보냅니다.',
    'Malicious User Detection을 켭니다.',
    'Mitigation을 적용하고 반복 악성 요청의 차단을 확인합니다.',
    '동일 IP의 정상 fingerprint가 계속 허용되는지 확인합니다.',
  ],
);
add(
  2,
  'lab4',
  'Web App Scanning',
  'scan',
  '스캔 설정과 보호 전후의 모의 취약점 보고서를 비교합니다.',
  [
    'Scan Profile을 구성하고 로컬 스캔을 실행합니다.',
    'SQLi·XSS·봇 관련 미해결 항목을 확인합니다.',
    'WAF와 Bot Defense를 활성화합니다.',
    '다시 스캔하여 탐지 항목의 완화 상태를 검증합니다.',
  ],
);
add(
  2,
  'lab5',
  'AI Assistant & Security Operations',
  'assistant',
  '현재 이벤트를 근거로 보안 조사 설명을 확인합니다.',
  [
    'WAF를 연결하고 공격·정상 요청을 생성합니다.',
    '요청 로그에서 차단 정책과 응답 코드를 확인합니다.',
    'Explain을 눌러 현재 로그에 대한 로컬 설명을 생성합니다.',
    '설명에 포함된 요청 ID와 실제 이벤트를 비교합니다.',
  ],
);
add(3, 'lab1', 'Service Policy', 'header', '특정 HTTP 헤더가 있는 요청만 허용합니다.', [
  '기준 요청의 200 응답을 확인합니다.',
  'Header allowlist 정책을 선택합니다.',
  '헤더 이름 x-f5-appworld, 값 RjUtQXBwd29ybGQ= 를 설정합니다.',
  '헤더 없음 403·정확한 헤더 200·잘못된 값 403을 검사합니다.',
]);
add(3, 'lab2', 'Load Balancer Routes', 'route', '헤더 기반 canary 경로와 응답 헤더를 실험합니다.', [
  '기본 Origin으로 가는 요청을 확인합니다.',
  'Canary 라우팅을 활성화하고 X-App-Version: green 조건을 설정합니다.',
  '헤더가 일치하면 Azure canary Origin으로 이동하는지 확인합니다.',
  '/login Route WAF를 연결하고 Blocking, prefix rewrite /, XC-Namespace 응답 헤더를 적용해 검증합니다.',
]);
add(
  3,
  'lab3',
  'Dashboards & AI Assistant',
  'assistant',
  '트래픽·보안 로그·로컬 설명을 연결합니다.',
  [
    '정상·공격 요청으로 트래픽을 생성합니다.',
    'WAF Blocking 적용 후 차단 이벤트를 확인합니다.',
    'Performance와 Security로 이동해 실습 자원을 확인합니다.',
    'Explain에서 현재 로그의 요약을 검증합니다.',
  ],
);
add(
  4,
  'lab1',
  'Load Balancer and Origin',
  'api-lb',
  'API 앱의 HTTPS LB와 공개 Origin을 준비합니다.',
  [
    'HTTPS·443·Internet VIP를 설정합니다.',
    'Public DNS Origin의 80 포트를 확인합니다.',
    '/swagger 와 정상 API 요청의 200 응답을 확인합니다.',
    '초기 API 보호가 꺼진 상태와 후속 실습의 차이를 확인합니다.',
  ],
);
add(4, 'lab2', 'API Inventory', 'inventory', 'OpenAPI 목록에 없는 Shadow API를 구분합니다.', [
  'getbyheroname Shadow API가 보호 전 허용되는지 확인합니다.',
  '제공된 OpenAPI 모의 정의를 확인합니다.',
  'Inventory enforcement를 켜고 fall-through 차단을 적용합니다.',
  '알려진 경로 200·인벤토리 밖 경로 403을 확인합니다.',
]);
add(
  4,
  'lab3',
  'API Protection',
  'endpoint',
  '민감 정보가 노출되는 getbydob 엔드포인트를 Deny합니다.',
  [
    'getbydob 응답의 합성 민감 데이터 표기를 확인합니다.',
    'API Protection의 endpoint deny 규칙을 켭니다.',
    '대상을 /api/customerlookup/getbydob 로 지정합니다.',
    '해당 경로 403·정상 getbyname 경로 200을 검증합니다.',
  ],
);
add(4, 'lab4', 'Web Application Firewall', 'waf', 'API 앱의 악성 입력을 WAF로 차단합니다.', [
  '공격 요청의 보호 전 응답을 확인합니다.',
  'API LB에 WAF를 연결합니다.',
  'Blocking 모드로 저장합니다.',
  'SQLi·XSS 차단과 정상 API 허용을 비교합니다.',
]);
add(4, 'lab5', 'Rate Limiting', 'rate', 'API에 대한 반복 요청을 로컬 시간 창으로 제한합니다.', [
  '동일 클라이언트의 연속 4회 요청을 보냅니다.',
  'GET 대상 경로와 분당 3회 제한을 설정합니다.',
  '네 번째 요청이 429인지 확인합니다.',
  '다른 경로·클라이언트·시간 창의 요청도 비교합니다.',
]);
add(
  4,
  'lab6',
  'Security Analytics & Malicious Users',
  'malicious',
  'API 사용자의 반복 악성 동작을 조사하고 완화합니다.',
  [
    '동일 IP의 정상·악성 fingerprint를 준비합니다.',
    '악성 사용자 탐지와 완화를 활성화합니다.',
    '반복 요청의 fingerprint별 결과를 비교합니다.',
    'Security Events에 기록된 로컬 증거를 확인합니다.',
  ],
);
add(
  4,
  'lab7',
  'API Discovery / BIG-IP Connector',
  'discovery',
  '모의 BIG-IP 텔레메트리에서 Shadow API를 찾습니다.',
  [
    '로컬 BIG-IP Connector를 활성화합니다.',
    'API Discovery를 켜고 /qrcode/form 요청을 보냅니다.',
    'Discovered 목록의 Shadow 경로와 모의 위험도를 확인합니다.',
    'OpenAPI JSON을 내려받고 Inventory와 비교합니다.',
  ],
);
add(
  5,
  'lab1',
  'Load Balancer & Traffic Dashboards',
  'bot-baseline',
  '항공 앱의 봇 보호 전 로그인 트래픽을 관찰합니다.',
  [
    'POST /user/vipsignin 트래픽을 생성합니다.',
    '사람과 자격 증명 대입 봇의 200 응답을 비교합니다.',
    '보호를 끈 상태에서 기준 트래픽을 수집합니다.',
    '대시보드와 로컬 요청 로그를 확인합니다.',
  ],
);
add(
  5,
  'lab2',
  'Bot Protection Profile',
  'bot-flag',
  '로그인 대상의 Bot Defense Flag 동작을 확인합니다.',
  [
    '대상 POST /user/vipsignin 을 설정합니다.',
    'Bot Defense를 Flag로 활성화합니다.',
    '봇 요청이 탐지되지만 200인지 확인합니다.',
    'x-demo-bot 응답 헤더와 정상 사람 요청을 비교합니다.',
  ],
);
add(
  5,
  'lab3',
  'Human-Simulated Stuffing',
  'human-bot',
  '합성 텔레메트리의 초기 사람 분류에서 봇 분류로 변화를 봅니다.',
  [
    '로그인 보호를 Flag로 설정합니다.',
    'Client telemetry를 켭니다.',
    'Human-like bot 요청을 같은 fingerprint로 12회 보냅니다.',
    '처음 10회와 이후 봇 분류 결과를 비교합니다.',
  ],
);
add(
  5,
  'lab4',
  'Defend Against an Ongoing Attack',
  'bot-block',
  '/flight 스크래핑을 Flag에서 Blocking으로 전환합니다.',
  [
    'GET /flight 봇 요청의 기준 결과를 확인합니다.',
    'Bot 프로필의 대상 경로를 /flight 로 설정합니다.',
    'Flag 모드에서 탐지 결과를 확인합니다.',
    'Blocking으로 변경하고 봇 403·정상 사용자 200을 검증합니다.',
  ],
);
add(
  6,
  'module1/lab1',
  'Customer Edge Inspection',
  'ce',
  'CE 상태와 사설 앱 연결의 상관관계를 확인합니다.',
  [
    'CE의 주소·리전·상태를 확인합니다.',
    'CE Online 상태에서 사설 앱 200을 확인합니다.',
    'CE를 Offline으로 바꿔 503을 확인합니다.',
    'Online으로 복구한 뒤 Connectivity에서도 상태를 확인합니다.',
  ],
);
add(
  6,
  'module1/lab2',
  'Network Connect & Segments',
  'segments',
  '격리된 세그먼트를 연결하고 L3/L4 방화벽을 적용합니다.',
  [
    '연결 전의 격리 상태를 확인합니다.',
    'DC와 AWS CE 세그먼트를 각각 연결합니다.',
    'HTTP 허용·SSH 거부 방화벽을 켭니다.',
    'HTTP 200·SSH 거부·CE Offline 실패를 비교합니다.',
  ],
);
add(
  6,
  'module2/lab3',
  'Globally Available Frontend',
  'failover',
  'AWS 우선 Origin에서 Azure로 장애 전환합니다.',
  [
    'AWS 우선·Azure 대기 Origin을 확인합니다.',
    'Fallback을 켜고 정상 AWS 응답을 확인합니다.',
    'AWS Origin을 Unhealthy로 바꿔 Azure 응답을 확인합니다.',
    'AWS 복구 후 우선 경로 복귀와 전체 장애를 검사합니다.',
  ],
);
add(
  6,
  'module2/lab4',
  'Solving IP Overlap',
  'overlap',
  '중복 사설 주소를 CE VIP로 분리해 전달합니다.',
  [
    'AWS·Azure가 같은 사설 주소를 가진 모의 환경을 확인합니다.',
    'Azure CE VIP로 주소 중복 해소를 켭니다.',
    '사설 CE 연결을 Online으로 유지합니다.',
    '정상 서비스 허용과 SSH 거부를 확인합니다.',
  ],
);
add(
  7,
  'module1',
  'Vibe Coding a Simple Web App',
  'code',
  '로컬 코드 템플릿을 편집하고 빌드합니다.',
  [
    '코드 편집기에서 앱의 페이지와 로그인 API를 확인합니다.',
    '/ 와 /login 경로를 포함한 소스를 작성합니다.',
    'Build를 눌러 로컬 artifact를 생성합니다.',
    '소스가 바뀌면 기존 artifact가 유효하지 않음을 확인합니다.',
  ],
  'class7/module1/module1.html',
);
add(
  7,
  'module2',
  'CI/CD & Basic Runtime Security',
  'pipeline',
  '모의 파이프라인으로 앱을 배포하고 WAF를 연결합니다.',
  [
    '로컬 앱 소스를 준비합니다.',
    'WAF Blocking을 연결하고 Build → Test → Deploy를 실행합니다. WAF가 없으면 Deploy가 거부됩니다.',
    '배포된 소스와 artifact를 확인합니다.',
    'WAF Blocking 적용 후 정상·공격 요청을 검증합니다.',
  ],
  'class7/module2/module2.html',
);
add(
  7,
  'module3',
  'Advanced Runtime Security',
  'advanced',
  '앱의 API 탐색과 로그인 봇 방어를 추가합니다.',
  [
    '모의 앱을 빌드하고 배포합니다.',
    'API Discovery를 활성화합니다.',
    'POST /login 과 /contact 대상 Bot Blocking을 설정합니다.',
    'Shadow API 탐색과 사람·봇 로그인 요청을 검증합니다.',
  ],
  'class7/module3/module3.html',
);
add(
  7,
  'module4',
  'Web App Scanning & Conclusion',
  'scan-compare',
  '배포한 앱의 보호 전후 스캔을 비교합니다.',
  [
    '모의 앱을 빌드하고 배포합니다.',
    'Scan Profile을 구성하고 기준 보고서를 만듭니다.',
    'WAF와 로그인 Bot Blocking을 적용합니다.',
    '재스캔하여 미해결 항목이 줄어드는지 비교합니다.',
  ],
  'class7/module4/module4.html',
);
add(
  8,
  'lab1',
  'Negative Enforcement Policy',
  'negative',
  '국가·평판 기반 거부 규칙을 테스트합니다.',
  [
    '정상 국가와 Fiji 요청을 비교합니다.',
    'Negative enforcement에서 Fiji 거부를 설정합니다.',
    'TOR·Spam 모의 IP 평판 차단을 켭니다.',
    '정상 200·거부 국가 403·악성 평판 403을 검증합니다.',
  ],
);
add(
  8,
  'lab2',
  'Positive Application Security',
  'positive',
  '기본 거부 정책에서 국가·경로를 명시적으로 허용합니다.',
  [
    'Positive enforcement로 기본 거부를 설정합니다.',
    '허용 국가 South Korea와 경로 / 를 설정합니다.',
    '허용 국가의 GET / 요청을 검사합니다.',
    '다른 국가·다른 경로·POST 요청의 거부를 확인합니다.',
  ],
);
add(
  8,
  'lab3',
  'Zero Day: Rate Limiting & Policy',
  'zero-day',
  '요청 속도를 제한하고 사용자 정의 규칙으로 악용을 차단합니다.',
  [
    '보호 전 연속 요청을 확인합니다.',
    '분당 3회: POST /auth.php 와 GET /ratelimit.php 를 제한합니다.',
    '다른 경로의 요청은 제한 없이 허용되는지 확인합니다.',
    'Exploit deny 정책으로 x-demo-exploit: true 패턴을 차단합니다.',
  ],
);
const communitySource = 'https://github.com/Mettichi1/WAAP-Bot-Detection-with-F5-XC';
const additions: [string, string, Exercise, string[]][] = [
  [
    'lab1',
    'Publishing & WAF Protection',
    'waf',
    [
      '전용 환경을 준비하고 HTTP LB의 도메인과 Origin을 확인합니다.',
      '정상·SQL Injection 보호 전 응답을 기록합니다.',
      'App Firewall에서 Custom / High and Medium을 설정하고 LB의 WAF를 Enable로 연결합니다.',
      'Monitoring 통과·탐지와 Blocking 403을 비교하고 Support ID를 확인합니다.',
    ],
  ],
  [
    'lab2',
    'API Discovery & Endpoint Protection',
    'endpoint',
    [
      '더미 환경을 준비하고 보호 전 API 응답을 기록합니다.',
      '환경 / 설정에서 API 인벤토리를 활성화합니다.',
      'API 보호와 차단 대상 /api/customerlookup/getbydob를 설정합니다.',
      '대상 403과 다른 경로 200을 비교하고 정책 로그를 확인합니다.',
    ],
  ],
  [
    'lab3',
    'Service Policies & Rate Limiting',
    'zero-day',
    [
      'GET /ratelimit.php 보호 전 반복 요청을 기록합니다.',
      '환경 / 설정에서 60초에 3회로 Rate Limiting을 활성화합니다.',
      '동일 클라이언트 4회 요청으로 200·200·200·429를 확인합니다.',
      'Exploit deny 정책과 x-demo-exploit: true 모의 헤더를 비교합니다.',
    ],
  ],
  [
    'lab4',
    'Signature-Based Bot Protection',
    'waf',
    [
      '전용 환경을 준비하고 콘솔 App Firewall에서 정책을 엽니다.',
      'Custom → Signature-Based Bot Protection → Custom에서 Malicious Block, Suspicious Report, Good Report를 선택합니다.',
      'Security Catalog에서 봇과 전용 LB를 선택하고 Monitoring 모의 이벤트를 실행합니다.',
      'Blocking으로 변경해 Malicious 차단과 Report 통과를 비교합니다. 카탈로그 로그는 콘솔에서 확인하며 이 Lab의 일반 WAF 검증과 별개입니다.',
    ],
  ],
  [
    'lab5',
    'Bot Defense & Protected Endpoints',
    'bot',
    [
      '환경을 준비하고 POST /user/vipsignin 봇 요청의 초기 결과를 기록합니다.',
      'Bot Defense 대상 경로 /user/vipsignin과 POST 메서드를 설정합니다.',
      'Flag의 통과·탐지 후 Blocking 봇 403을 비교합니다.',
      '정상 사용자와 다른 경로의 통과를 확인합니다. 경로는 로컬 더미 앱용이며 실제 F5 텔레메트리는 재현하지 않습니다.',
    ],
  ],
];
for (const [unit, title, exercise, steps] of additions) {
  add(
    9,
    unit,
    title,
    exercise,
    '참고 캡처와 설정 위치를 비교하고 직접 변경 전후 모의 결과를 검증합니다.',
    steps,
  );
  labs[labs.length - 1].source = communitySource;
}
export const trainingLabs = labs;
export const labById = (id: string) => trainingLabs.find((l) => l.id === id) ?? trainingLabs[0];
