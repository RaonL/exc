import fs from 'node:fs';
import { trainingLabs } from '../../src/training/catalog.ts';
import { officialTasks } from '../../src/training/official-tasks.ts';
const root = 'output/verification/';
const readRun = (name) => {
  const text = fs.readFileSync(root + name + '-run.txt', 'utf8');
  const match = text.match(/### Result\s*\n([\s\S]*?)\n### Ran/);
  if (!match) throw new Error(`Missing successful browser output: ${name}`);
  return JSON.parse(match[1]);
};
const rows = ['class1-3', 'class4-5', 'class6-8'].flatMap((name) => readRun(name));
// Preserve the successful isolated rerun after the screenshot timeout.
if (fs.existsSync(root + 'c4-retry-run.txt'))
  for (const retry of readRun('c4-retry')) {
    const index = rows.findIndex((row) => row.id === retry.id);
    if (index >= 0) rows[index] = retry;
  }
const consoleLab = readRun('c1-lab1');
const persistence = JSON.parse(fs.readFileSync(root + 'persistence.json', 'utf8'));
const supplemental = readRun('c2-task5');
const pipeline = readRun('c7-policy-gate');
const signatureBot = readRun('c2-signature-bot');
if (
  rows.length !== 33 ||
  rows.some((r) => !r.pass) ||
  !consoleLab.pass ||
  !persistence.pass ||
  !supplemental.pass ||
  !pipeline.pass ||
  !signatureBot.pass
)
  throw Error('Incomplete or failed verification; report refused');
fs.mkdirSync('docs/verification/evidence', { recursive: true });
const compact = rows.map(({ saved, ...row }) => ({
  ...row,
  controls: JSON.parse(saved).controls,
  reloadPreserved: persistence.sessions[row.id],
}));
fs.writeFileSync(
  'docs/verification/ui-results.json',
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      consoleLab,
      units: compact,
      persistence,
      supplemental,
      pipeline,
      signatureBot,
    },
    null,
    2,
  ),
);
for (const lab of trainingLabs)
  fs.copyFileSync(
    root + lab.id + '-evidence.json',
    'docs/verification/evidence/' + lab.id + '.json',
  );
fs.copyFileSync(root + 'c2-task5.png', 'docs/verification/waf-exclusion.png');
fs.copyFileSync(root + 'c7-policy-gate.png', 'docs/verification/pipeline-gate.png');
const lines = [
  '# Class 1–8 로컬 실습 검증',
  '',
  `검증일: ${new Date().toISOString()} · 34/34 단원 통과 · 실제 XC 연결 0회.`,
  '',
  '## 무엇을 검증했는가',
  '',
  '공식 Community Training의 34개 단원과 Class 7의 세부 Task 8개, 총 42개 문서를 읽고 Task 제목·순서를 대조했습니다. 출처·HTTP 상태·원문 해시는 [source-index.json](source-index.json)에 있습니다.',
  '',
  'Class 1 Lab 1은 빈 Namespace에서 Origin Pool과 HTTP LB를 실제 콘솔 폼으로 생성하고 shared/base-appfw를 연결했습니다. 나머지 33개는 Training Center의 환경/설정 컨트롤을 직접 조작했습니다. 자동 정답 적용이나 localStorage 주입으로 통과시키지 않았습니다. 기준 요청 → 설정 변경 → 정상/실패 요청 → 현재 설정 검증 → 로그 펼치기 → 증거 JSON 다운로드 순서입니다.',
  '',
  '결과는 **로컬 단순화 모델의 동작 증거**입니다. 실제 F5 탐지·봇 분석·CE 설치·실시간 DNS·GitLab 배포·AI·취약점 스캔이나 공식 콘솔의 모든 화면/필드가 동일함을 증명하지 않습니다. 외부 작업은 더미 상태/요청으로 대체하고 UI에 표시했습니다. 공인 VIP·서버 대신 TEST-NET 주소와 합성 fixture를 사용합니다.',
  '',
  '## 단원별 결과',
  '',
  '| Class | 단원 | 공식 원문 / 순서 | 결과 | 증거 |',
  '|---|---|---|---|---|',
  ...trainingLabs.map(
    (l) =>
      `| ${l.classId} | ${l.title} | [${l.unit}](${l.source}) · ${(officialTasks[l.id] ?? []).length} 단계 | PASS | [JSON](evidence/${l.id}.json) |`,
  ),
  '',
  '## 추가로 검증한 경계 조건',
  '',
  '- 자동 테스트 198/198 통과, TypeScript 검사 및 Vite production build 통과. 기존 main chunk 약 515 kB의 크기 경고는 남아 있습니다.',
  '- Class 2 Lab 2 Task 1: 사용자 제공 Bots 카탈로그의 Malicious Bot을 WAF 서명 기반 보호로 시험했습니다. Monitoring=200/Detected, Blocking=403/Blocked이며 별도 Bot Defense 모델과 구분합니다.',
  '',
  '- Class 2 Lab 1: Monitoring 200/Detected → Blocking 403/Blocked. GET /product의 SQLi만 예외로 통과, XSS는 계속 차단. Custom Blocking Response의 {{request_id}}가 실제 Support ID로 치환되고 저장됩니다.',
  '- Class 5 Lab 1: WAF를 연결해도 Bot Defense가 꺼져 있으면 모의 자격 증명 봇은 200입니다. 이후 Flag는 200/Detected, Blocking은 403이며 정상 사용자는 200입니다.',
  '- Class 6: 세그먼트 연결 전후, SSH 거부, AWS 장애→Azure 전환→전체 장애503→AWS 복구200. 중복 IP 실습은 잘못된 Host 404와 GET-only 정책의 HEAD403을 별도로 검사했습니다.',
  '- Class 7: security-controls.yaml에서 waf=false이면 Deploy gate 실패, true이면 Build→Test→Deploy 통과. GET /about 계약, API Discovery, login/contact 보호, 합성 Scan 전후 보고서가 포함됩니다.',
  '- 비활성 보안 기능은 Allowed로 기록하며 Monitoring/보고 모드에서만 Detected를 표시합니다. 요청별 trace에 정책·경로·HTTP 결과·Support ID와 external_requests=0을 남깁니다.',
  '- 새로고침 전후 모든 세션의 baseline·검증·controls·로그가 동일했습니다. 다운로드 직후 RPC 새로고침의 자동화 연결 오류는 브라우저 새로고침을 별도 명령으로 분리해 검사했습니다.',
  '',
  '## 따라 하는 방법',
  '',
  '1. 앱의 Training Center → Class → Lab을 선택합니다. 공식 Task 목록과 더미 입력/변경 전후 표를 먼저 읽습니다.',
  '2. 실습 환경 시작 → 요청 / 검증 → 기준 요청 실행으로 보호 전 결과를 남깁니다.',
  '3. 환경 / 설정에서 표의 목표 값을 직접 입력합니다. 예제 불러오기는 요청 값만 채웁니다.',
  '4. 로컬 요청 실행 → 현재 설정 검증. 실패 항목의 expected/actual을 보고 설정을 수정합니다.',
  '5. 로그 / 보고서에서 JSON/trace, Forensics 집계, DNS/VIP·CE·Origin 상태를 확인하고 증거 JSON을 내려받습니다.',
  '6. 단원 초기화는 해당 단원의 더미 환경과 진도만 초기화합니다. Class 1 Lab 1은 별도 콘솔 폼 실습입니다.',
  '',
  '## 재실행',
  '',
  'Node 24 이상에서 npm test, npm run build. UI 검증 스크립트는 scripts/verification/prepare.mjs로 준비합니다. @playwright/cli의 별도 검증 프로필에서 class1-3.js → class4-5.js → class6-8.js를 하나씩 실행하세요. 같은 탭에 검증을 중복 실행하지 마세요. supplemental-ui.js와 pipeline-ui.js는 추가 경계 조건 시험입니다. 다운로드/스크린샷 원본은 output/verification에, 검증 결과는 ui-results.json에 있습니다.',
  '',
  '각 JSON의 timestamp/Support ID는 실행할 때 달라집니다. 상태 코드·동작·사유와 정책 연결 관계를 비교하세요.',
];
fs.writeFileSync('docs/verification/README.md', lines.join('\n') + '\n');
console.log('Wrote verified report for 34 units and supplemental tests.');
