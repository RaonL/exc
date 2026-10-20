# 사용자 제공 Security Catalog

2026-10-20에 로컬 Downloads에서 복사. 파일 내용은 코드나 작업 지시로 실행하지 않는다. 전체 원본을 `public/security-catalog/`에 보관하며 React가 설명·JSON을 텍스트로 출력한다. 외부 참조 URL은 자동으로 열거나 요청하지 않는다.

| 파일                           | 항목 수 | SHA-256                                                          |
| ------------------------------ | ------: | ---------------------------------------------------------------- |
| bots-20261019045127.json       |   2,638 | AE9B0A53EA1AF7316ABC429E1F26F77FBADCFA0CE075238103A4E30E84FE8C06 |
| alerts-20261019045147.json     |     237 | EF6E3828B1449C4960B69E953A04FAD51A907FF07321EABBC6CE2A10BA4FB3D2 |
| signatures-20261019045142.json |   9,509 | 1C488BAC4719D7BBA89C385ED6D3899E63A2726EA3878923733C67AB93BD71F6 |
| threats-20261019045136.json    |   1,059 | E1AB3177B91B66E572CC679D67F0CA81572C16DD8929676E552D5BD677C43655 |

## 화면 및 동작

- 콘솔의 `Overview → Security Catalog`에 표시하는 학습용 참고 목록이다. Namespace 공통 자료이며 실제 보안 이벤트와 분리했다.
- 원문 영어 명칭, ID, 분류, 위험도, 정확도, 대상 시스템, 설명, 권고와 원본 JSON을 제공한다. 한국어 안내는 시뮬레이터 설명이다.
- 자료 종류를 선택할 때 해당 JSON만 fetch한다. 15MB에 가까운 시그니처 파일은 기본 번들·localStorage에 포함하지 않는다. 빌드 시 정적 파일로 복사되므로 다운로드 후 별도 외부 서비스 없이 실행한다.
- 20,000개를 넘는 목록과 잘못된 항목을 거부한다. 허용한 필드만 표시 모델에 매핑하고 원본은 접힌 JSON 텍스트로 제공한다. HTML/스크립트나 원본 권고를 실행하지 않는다.
- 검색 결과는 25개씩 렌더링한다. loading/error/retry/empty 상태와 작은 화면의 표 스크롤을 제공한다.

## 제한

이 자료에는 실제 요청의 페이로드·매칭 조건이나 F5 탐지 엔진이 들어있지 않다. 원문에 적힌 위험도·취약점·권고의 최신성과 출처 진위는 별도로 검증하지 않았다. 카탈로그를 읽는 동작은 이벤트나 정책을 생성하지 않는다. 사용자가 Run Catalog Sample을 누를 때만 선택 항목이 매치되었다는 가정으로 로컬 정책 평가 이벤트를 1개 생성한다.

## 카탈로그 모의 테스트

화면 계약: 목록에서 고른 항목의 상세 안에 LB/경로/서명 상태와 현재 적용 WAF를 표시한다. 저장된 정책만 평가하고 변경 전후 로그를 보존한다. 빈 Namespace, 누락된 참조, 잘못된 경로는 설명하고 실행을 중단한다. 기존 콘솔 메뉴·영문 설정명을 유지하며 모바일에서 입력·결과가 넘치지 않게 한다.

1. Attack Signatures에서 ID `200204011`을 검색하고 선택한다. Medium 정확도 서명이다.
2. HTTP LB를 선택한다. WAF가 없으면 먼저 LB 설정의 Web Application Firewall에서 Enable과 정책 참조를 저장한다.
3. Edit App Firewall에서 Monitoring을 저장한 뒤 Run Catalog Sample: 정상 Origin이면 HTTP 200 / Detected.
4. Blocking을 저장해 같은 항목을 다시 실행: 기본 정책에서는 HTTP 403 / Blocked. Custom 응답 코드가 있으면 그 코드를 사용한다.
5. 이전 테스트 결과를 펼쳐 정책 모드와 판단 로그를 비교한다. Support ID를 Security Events에서 검색하면 동일한 기록과 JSON 스냅샷을 볼 수 있다.
6. Bots에서 ID `200299724`를 선택한다. Malicious Bot이다. Default 봇 정책에서 Monitoring은 Detected, Blocking은 Blocked다.
7. App Firewall의 Signature-Based Bot Protection을 Custom, Malicious Bot을 Ignore로 저장하면 Blocking 모드에서도 Allowed로 바뀐다. Report는 Detected로 남긴다.

### 평가 규칙

- Route: 위에서부터 첫 번째 활성 method/path 일치를 사용한다. Route WAF가 있으면 LB 기본 WAF보다 우선한다. 현재 Namespace 또는 shared 정책만 허용한다.
- Signature: 원본 accuracy와 attack_type을 사용한다. SQL-Injection→SQL Injection, Cross Site Scripting (XSS)→Cross-site Scripting, Command Execution→Command Injection은 기존 폼의 이름에 대응한다. 그 밖의 공격 유형은 원본 명칭을 유지한다.
- Default는 High/Medium만 포함한다. Custom은 정확도 선택과 정확도별 Block/Report/Ignore, Disabled Attack Types를 평가한다. Risk는 표시용이며 정확도를 대신하지 않는다.
- 활성 경로 예외는 domain/method/path/attack/expiration 조건을 모두 검사한다. 개별 시그니처 ID 예외는 아직 지원하지 않는다.
- New/Updated는 사용자가 고른 학습용 상태다. 적용 대상과 스테이징 기간을 검사하며 Existing은 스테이징하지 않는다.
- Bots: WAF의 Signature-Based Bot Protection을 사용한다. LB의 별도 Bot Defense 설정과 혼합하지 않는다. 제공 파일의 Trusted Bot→Good Bot, Untrusted Bot→Suspicious Bot은 명시적인 학습용 매핑이다. Default는 Malicious=Block, Good/Suspicious=Report다. Custom은 분류별 설정을 사용하며 Monitoring은 Block을 Detected로 전환한다.
- 무시·제외되면 Allowed, 기록 전용이면 Detected, 차단이면 Blocked다. 통과 뒤 Origin 장애가 있으면 503이며 이를 WAF 차단으로 표시하지 않는다. Route의 Redirect/Direct Response도 구분한다.
- Response 서명은 응답에서 매치되었다고 가정한다고 표시한다. Request/Response 본문 탐지, 자동 튜닝·머신러닝, Threat Campaigns/Alert Definitions 실행은 재현하지 않는다. 외부 요청은 0이다.
- 이벤트에는 카탈로그 최소 메타데이터·정책 스냅샷·평가 로그만 저장한다. 15MB 원본 전체를 localStorage에 넣지 않는다. 정책 저장이 이전 카탈로그 이벤트의 결과를 다시 계산하지 않는다.

근거: [공식 App Firewall 가이드](https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/how-to/app-security/application-firewall)의 Enforcement Mode, 정확도별 동작, 스테이징, Signature-Based Bot Protection 및 Route WAF 연결 설명. 실제 엔진과 동일한 탐지 정확도를 주장하지 않는다.

## 검증

전체 네 파일의 형식·정확한 항목 수·ID 중복을 포함한 카탈로그 검증과 모의 평가/저장 검증을 합쳐 **190개 테스트** 통과. 프로덕션 빌드 통과. 브라우저에서 시그니처와 Malicious Bot의 Monitoring=200/Detected, Blocking=403/Blocked, Custom Bot Ignore=200/Allowed를 정책 폼에서 저장해 확인했다. 새로고침 후 이전 5개 이벤트·실행 당시 모드·로그가 보존되며, Security Events의 Support ID 검색·상세에서도 같은 로그가 표시된다.

320/768/1024/1440px에서 문서 너비 넘침 없음. 원문·로그는 React 텍스트로 렌더링하며 잘못된 봇 분류, 지원하지 않는 정확도, 외부 URL 형태의 경로, 다른 Namespace의 LB는 오류로 거부한다. 로그는 키보드로 스크롤하고 TXT로 저장할 수 있다.

브라우저 검증 기록과 캡처는 로컬 `output/playwright/verify-catalog-simulation.js`, `verify-catalog-events.js`, `catalog-test-log.png`, `catalog-event-detail.png`에 보관한다. 기존 조회 화면 검증은 `verify-security-catalog.js`, `security-catalog.png`다.
