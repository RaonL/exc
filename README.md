# F5 Distributed Cloud Console Simulator

사용자 제공 XC 화면 캡처 15장 기준의 [UI 반영 내역과 수정 화면](docs/XC-SCREENSHOT-REFINEMENT.md).

Class 1–8의 UI 실습 검증 결과와 공식 Task 대조: [검증 보고서](docs/verification/README.md).

F5 XC 콘솔을 학습하기 위한 **브라우저 로컬 시뮬레이터**입니다. 제공된 Performance Monitoring 스크린샷의 레이아웃을 참고했으며, 모든 데이터와 보안 결과는 더미 데이터입니다. 실제 F5 API, CE/RE, 보안 엔진, 인증 서버에 연결하지 않습니다.

## 실행

Node.js **22.18 이상 또는 24 이상**을 권장합니다. `--configLoader native`를 사용하므로 Node의 TypeScript 설정 파일 실행 지원이 필요합니다. 검증 환경: Windows / Node 24.14.1.

```powershell
npm install
npm run dev
```

[http://127.0.0.1:5173](http://127.0.0.1:5173)에서 실행합니다. 개발 서버는 로컬 주소에만 바인딩됩니다.

```powershell
npm test          # 상태 연동 테스트
npm run build     # TypeScript 검사 + 배포용 dist 생성
npm run preview   # 빌드 결과 미리보기
npx prettier --write src vite.config.ts vitest.config.ts
```

패키지 캐시는 `.npmrc`에서 프로젝트 내부 `.npm-cache`로 지정했습니다. 잠금 파일을 기준으로 설치하려면 `npm ci`를 사용합니다.

## 구현된 기능

### Security Catalog · 사용자 제공 정의 자료

`Web App & API Protection → Overview → Security Catalog`에서 Attack Signatures 9,509개, Bots 2,638개, Threat Campaigns 1,059개, Alert Definitions 237개를 검색하고 상세 원문·원본 JSON을 확인할 수 있습니다. ID/이름/분류 검색, Risk/Severity 필터, 25개 단위 페이지를 제공합니다.

원본은 `public/security-catalog/`의 네 JSON이며 사용자 제공 파일을 그대로 복사했습니다. 각 자료는 해당 카탈로그를 열 때 로컬 서버에서 불러오며 localStorage에 넣지 않습니다. 앱 설정 초기화와 무관하게 유지됩니다. **실제 발생 이벤트나 탐지 엔진/정책 설치 파일이 아닙니다.** 원문 설명과 권고는 파일에 담긴 스냅샷으로 최신성을 검증하지 않았습니다.

시그니처나 봇을 선택한 뒤 상세 패널에서 HTTP LB·Method·Path·Signature State를 지정하고 **Run Catalog Sample · 모의 실행**을 누르세요. **Edit App Firewall**에서 연결 정책을 편집·저장한 후 재실행하면 변경 전후 결과를 비교할 수 있습니다. Monitoring은 매치를 Detected로 기록하고 통과시키며, Blocking은 정책의 정확도·Ignore/Report·스테이징·경로 예외·봇 분류 동작에 따라 결과가 달라집니다. 결과에는 Support ID와 단계별 로그가 생기며, **Security Events**에서도 ID나 카탈로그 이름으로 검색할 수 있습니다. 이전 결과와 실행 당시 정책은 새로고침해도 보존됩니다. [모의 평가 규칙·실습 예시](docs/SECURITY-CATALOG.md).

전체 항목 형식·건수·ID 중복과 잘못된 입력 처리를 테스트합니다. 파일 목록과 SHA-256은 [카탈로그 자료 기록](docs/SECURITY-CATALOG.md)에 남겼습니다.

### Class 1–8 공식 교육 실습

34개 단원 모두 **실습 가이드 → 더미 데이터로 따라하기**에서 예제 환경·입력할 설정값·요청 JSON·반복 횟수·설정 전후 예상 응답을 볼 수 있습니다. **이 예제를 요청 입력에 불러오기**로 Request Builder를 채운 후 직접 정책을 구성하고 실행하세요. 예제 불러오기는 정책이나 진도를 자동 완료하지 않습니다. Demo Bank 고객, 항공편, 로그인, QR 앱은 더미 응답을 반환합니다. [사용법과 검증 범위](docs/TRAINING.md).

**Class 1 Lab 1은 콘솔 직접 실습으로 보강했습니다.** Training Center의 해당 단원에서 `콘솔에서 실습 시작`을 누르면 빈 Namespace의 Origin Pools로 이동합니다. Origin/LB를 메뉴에서 직접 만들고, 도메인의 Open Application에서 요청을 생성하며, Requests/Security Analytics에서 결과를 확인합니다. [원본 캡처 대응·실행 절차](docs/CLASS1-LAB1.md)를 참고하세요.

Origin Pool 화면은 공식 Lab1 캡처를 기준으로 Reset·섹션 접기·하위 폼·접근성·반응형을 개선했습니다. 콘솔 메뉴에서 생성·수정·취소·저장 복원까지 Chrome DevTools MCP로 검증했습니다. [Origin Pool 개선 및 검증 기록](docs/ORIGIN-POOL-UPGRADE.md).

HTTP Load Balancer 생성·수정 화면도 공식 Lab1에 맞춰 개선했습니다. Origin 연결, WAF Enable/shared/base-appfw 선택, 변경 취소·저장 복원과 정상/차단 응답까지 기본 콘솔에서 검증했습니다. [HTTP LB 개선 및 검증 기록](docs/HTTP-LB-UPGRADE.md).

App Firewall 화면은 공식 Class2 Lab1 기준으로 네 구역과 Custom 정책·차단 응답 설정을 개선했습니다. 콘솔에서 Monitoring/Blocking 전환, LB 연결, 요청·보안 이벤트 및 저장 복원을 검증했습니다. [App Firewall 개선 및 검증 기록](docs/APP-FIREWALL-UPGRADE.md).

Security Events도 공식 가이드의 Support ID 필터·행 상세·WAF Exclusion 생성 흐름으로 개선했습니다. 예외를 LB에 저장해 해당 경로·메서드의 공격 유형만 허용하고 다른 공격 차단·저장 유지·만료를 검증했습니다. [Security Events 개선 및 검증 기록](docs/SECURITY-EVENTS-UPGRADE.md).

좌측 하단 **Training Center 1–8**에서 34개 단원을 실행할 수 있습니다. 단원별 한국어 가이드·공식 원문 링크, 독립 Namespace, 기준 요청, 편집 가능한 환경, Request Builder, PASS/FAIL 검증, 로그·모의 스캔·OpenAPI/증거 JSON 내보내기를 제공합니다. 설정을 변경하면 완료 상태가 해제되며 새로고침 후 환경과 진도를 복원합니다.

| Class | 단원 수 | 주요 로컬 실습                                                   |
| ----- | ------- | ---------------------------------------------------------------- |
| 1     | 4       | 공개/사설 LB, RE/CE 연결, WAF, Analytics                         |
| 2     | 5       | WAF, Bot, 악성 사용자, 모의 Scan/Explain                         |
| 3     | 3       | Header 정책, Canary/Route WAF/응답 헤더, 관측                    |
| 4     | 7       | API Inventory/Endpoint Deny, Rate Limit, Shadow API/Connector    |
| 5     | 4       | 항공 앱 기준 트래픽, Flag, 합성 사람형 봇, 스크래핑 차단         |
| 6     | 4       | CE, Segment, Firewall, AWS/Azure 장애 전환, IP Overlap           |
| 7     | 4       | 앱 manifest 편집, 모의 Build/Test/Deploy, WAF gate, Runtime/Scan |
| 8     | 3       | Negative/Positive 정책, 분당 3회 제한, Zero Day 패턴 차단        |

**LB·Origin·WAF·CE는 기본 콘솔과 공유**합니다. 나머지 교육용 정책/봇/네트워크/파이프라인은 Training Center의 별도 모델로 평가합니다. 실제 AI·공격 도구·F5 서비스는 호출하지 않습니다. 원문별 구현 범위·차이점·파일 구조는 [TRAINING.md](docs/TRAINING.md)에 정리했습니다.

### 공식 가이드 기반 상세 설정

2026-10-19에 F5의 LB/WAF/Origin/WAAP 가이드와 문서 내 실제 화면 캡처를 확인해 다음 항목을 보강했습니다. 근거와 재현 범위는 [REFERENCES](docs/REFERENCES.md)에 정리했습니다.

| 영역              | 상세 구현                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 설정 편집기       | 전체 화면, 좌측 섹션 탐색, Form / Documentation / JSON, 섹션 검색, Show Advanced Fields, Save and Exit                                            |
| LB 관리 흐름      | 행 Actions → Manage Configuration → 읽기 모드 → Edit Configuration                                                                                |
| LB 설정           | Metadata, HTTP/자동 인증서 HTTPS/사용자 인증서 HTTPS, listen port, VIP advertisement, 사이트 선택, Origin, Routes, WAF, API/Bot/DoS, CDN, timeout |
| Routes            | Simple/Redirect/Direct Response, method + exact/prefix path, 순서 변경, 활성화, route origin/WAF 선택; 로컬 요청 판정에 반영                      |
| WAF               | Custom 정책의 공격 유형 제외·Block/Report/Ignore, 신규/갱신 signature staging와 기간, 차단 응답 코드/본문, LB 경로·메서드별 WAF 예외              |
| Origin            | IP/DNS·사이트별 origin 유형, 사이트/네트워크, 포트, load balancing algorithm, HTTP/TCP health check 매개변수, upstream TLS/SNI                    |
| 인라인 생성       | LB 초안을 유지하면서 Origin Pool / App Firewall 생성 후 자동 연결                                                                                 |
| Security Overview | 공식 캡처를 참고한 4개 지표 카드, Line/Area 그래프·범례·chart zoom, source/path/country 드릴다운, Active Configuration, Delivery Resources 및 CSV |
| 이벤트            | HTTP 상태, 평가 이유, 적용 WAF, Request / JSON 상세; Simulation Lab에서 method/path/signature state 입력                                          |

TLS·VIP·CDN·timeout·health check·load balancing·자동 튜닝·log masking은 **설정 저장/조회 범위**입니다. 실제 네트워크 처리는 하지 않습니다. 보안 대시보드의 Threat Campaigns 탭은 **공격 시나리오별 교육용 그룹**으로 표시하며 실제 F5 threat intelligence나 위험도 계산 엔진을 재현하지 않습니다.

| Workspace                    | 화면 및 동작                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Home                         | Services, Tenant Dashboard, Recent Activity, 워크스페이스 이동                                                              |
| WAAP Overview                | Health/Alert/Origin/Request 지표, latency 흐름, Recharts 트래픽 그래프, 보안 적용 현황, 이벤트 및 LB 상세 이동              |
| Performance 탭               | Dashboard, Metrics, Traffic, Origin Servers, Alerts, Requests, Errors                                                       |
| HTTP Load Balancers          | 생성·조회·수정·삭제, 도메인/이름 중복 검사, Origin/WAF 연결, API/Bot/DDoS 토글, 검색·정렬·상태 필터, JSON 내보내기          |
| Origin Pools                 | 생성·수정, origin 주소·포트 설정, 장애·복구 토글, LB health 연동                                                            |
| App Firewall                 | 생성·수정, Blocking/Monitoring 전환, 연결된 LB 적용 표시, SQLi/XSS 데모 이벤트 재평가                                       |
| Service Policies             | 정책 인벤토리 생성·수정, Allow/Deny, 활성화 토글                                                                            |
| API Discovery                | endpoint 검색/필터, Shadow API 발견, API inventory 등록                                                                     |
| API Protection / Bot Defense | LB별 활성화 토글 및 신규 시뮬레이션 차단 결과 연동                                                                          |
| Security Analytics / Events  | 차단·탐지·허용 집계, req_id 필터, 행 상세, 이벤트 기반 WAF Exclusion·LB 저장, JSON 내보내기                                 |
| Network Connect              | Site Management, CE/RE 목록, CE Online/Offline, Connectivity 토폴로지 및 상태 연동, Virtual Networks 읽기 화면              |
| Administration               | Tenant 표시, Namespace 생성·전환, 사용자 생성·수정/역할 저장, Audit Logs, 설정 저장, Reset Demo Data                        |
| 공통                         | Sidebar, Workspace/Namespace selector, Breadcrumbs, 검색(Ctrl/Cmd+K), 알림, 모달, 토스트, 모바일 메뉴, Simulation Mode 표시 |

## 교육 시나리오

상단 `Simulation Mode` 또는 `Simulation Lab`에서 LB와 시나리오를 선택하고 `Run scenario`를 클릭합니다.

| 시나리오                             | 로컬 상태 변경                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| Normal HTTP traffic                  | 요청 1,200건 추가, Allowed 이벤트                                             |
| SQL Injection / Cross-site Scripting | 각 48건, 연결 WAF가 Blocking이면 Blocked, 그 외 Detected                      |
| API Schema Violation                 | 48건, LB의 API 보호 활성화 여부에 따라 Blocked/Detected                       |
| Shadow API Discovery                 | 대상 LB에 새 Shadow endpoint 추가                                             |
| Bot Detection                        | 48건, LB의 Bot Defense에 따라 Blocked/Detected                                |
| L7 DDoS                              | 8,400건, LB의 DDoS 보호에 따라 Blocked/Detected                               |
| Origin Server Failure                | 선택 LB의 Origin Pool을 unhealthy로 변경; 해당 pool을 사용하는 모든 LB에 반영 |
| CE Offline / Online                  | 현재 namespace의 첫 번째 CE를 변경; Site/Connectivity 양쪽에 반영             |

WAF 모드 전환은 교육 목적상 기존 SQLi/XSS 이벤트의 결과도 재평가합니다. 실제 서비스의 과거 로그 동작을 재현한 것은 아닙니다. 그 외 LB 보호 토글은 새로 생성되는 이벤트에 적용합니다.

## 저장 및 집계

- Zustand persist + localStorage 키: `f5-xc-simulator-v1`, 스키마 버전 1.
- 교육 실습은 별도 키 `f5-xc-training-v1`에 단원별 설정·진도·시간 창·로그·보고서를 저장합니다.
- 새로고침 시 리소스, 선택 Workspace/Namespace/Page, 이벤트, 설정이 복원됩니다.
- `social-hawk`에 기본 리소스가 있으며 `production`, `staging`은 비어 있습니다. Namespace마다 LB/Origin/WAF/CE/이벤트/API/정책을 분리합니다. 사용자와 tenant 설정은 tenant 전체에 적용합니다.
- 요청 총계는 LB의 **누적 값**, Blocked/Detected는 선택한 시간 범위의 이벤트 합계입니다. `Request rate`는 누적 요청을 선택 범위의 초로 나눈 **교육용 추정치**입니다.
- 트래픽 차트는 저장된 총계에 고정 분포를 적용한 예시입니다. Latency, 고유 방문자 추정, 장치 비중도 합성 지표이며 실제 측정값이 아닙니다.
- 이벤트는 새 요청 시나리오 실행 시 보관 기간을 적용하며 최대 1,000개, 활동은 요청 시나리오 실행 시 최대 500개로 제한합니다.
- 저장 공간을 사용할 수 없으면 경고를 표시하고 세션 메모리에서 계속 실행합니다.
- `Administration > System Settings > Reset Demo Data`에서 확인 후 모든 namespace의 기본 데이터와 설정을 복원합니다.

## 파일 구조

```text
src/
  main.tsx                     React 진입점
  App.tsx                      공통 레이아웃·탐색·Workspace 메뉴
  types.ts                     리소스·시나리오 타입
  store.ts                     로컬 상태·저장·시뮬레이션 액션
  store.test.ts                상태 연동 테스트
  data/seed.ts                 기본 더미 데이터
  styles.css                   스크린샷 기반 테마·반응형 스타일
  configuration.css            전체 화면 설정 편집기·Security 화면 스타일
  origin-editor.css            공식 Lab1 Origin 폼·반응형 스타일
  lib/utils.ts                 shadcn/ui 클래스 병합
  lib/config.ts                기존 데이터 기본값·라우팅/WAF 로컬 판정·리소스 상태 집계
  lib/config.test.ts           상세 정책·라우트 판정 테스트
  components/
    ui/                        shadcn/ui 패턴 Button·Dialog·Switch (Radix 기반)
    common.tsx                 Card·Badge·Table 유틸·Export
    forms.tsx                  Policy·User·Namespace 폼 및 폼 진입점
    form-fields.tsx            공통 필드·토글
    OriginEditor.tsx           Origin Pool 생성·수정·초안 초기화
    OriginEditor.test.ts       Origin 폼의 생성·취소·저장·접근성 회귀 테스트
    ConfigurationEditor.tsx    공통 Form/Documentation/JSON 설정 화면
    LoadBalancerEditor.tsx     상세 HTTP LB 설정
    LoadBalancerBasics.tsx     Metadata·도메인/타입·Origin 연결 컴포넌트
    LoadBalancerFirewall.tsx   WAF 정책 선택·기존 exclusion 설정
    LoadBalancerEditor.test.ts LB 생성·취소·참조 검증·저장 복원 회귀 테스트
    SecurityEditors.tsx        App Firewall 초안·검증·저장
    WafPolicyFields.tsx       Custom 서명·튜닝·스테이징 설정
    WafAdvancedFields.tsx     차단 응답·연결된 LB 표시
    SecurityDashboard.tsx      별도 Security Overview 및 드릴다운
    Dashboard.tsx              WAAP 성능 대시보드
    Home.tsx                   Services·Tenant Dashboard
    Resources.tsx              LB·보안 설정·API·네트워크 화면
    Events.tsx                 이벤트 범위·검색·집계
    EventsTable.tsx            이벤트 표·행 상세·Actions
    EventDetails.tsx           Information/Request/JSON
    EventFilters.tsx           req_id 등 정확한 값 필터
    WafExclusionRules.tsx      예외 목록 초안·Apply
    WafExclusionEditor.tsx     이벤트 예외 설정 폼
    Administration.tsx         사용자·namespace·감사·시스템 설정
    SimulationPanel.tsx        시나리오 실행 모달
docs/
  REFERENCES.md                공식 문서·화면 재현 기준·추가 캡처 목록
  TESTING.md                   검증 결과와 수동 재현 절차
```

## 미구현 및 재현 한계

- 실제 F5 클라우드 연동, 보안 엔진, 트래픽 발생, DNS/TLS 발급, 로그인/권한 강제는 구현하지 않습니다.
- 기본 콘솔의 Service Policies는 설정 인벤토리입니다. Training Center에서는 실습 전용 header/국가/평판/허용 목록/악용 패턴 규칙을 별도로 평가합니다.
- Virtual Networks는 고정 교육 토폴로지 표시이며 가상 네트워크 CRUD·라우팅 설정, CE/RE 프로비저닝은 미구현입니다.
- OpenAPI 파일 업로드/실제 schema parsing, API 학습 엔진, 봇 분류 엔진, 지리 지도, PDF 보고서, 대규모 로그 페이지네이션은 미구현입니다. 보고서는 JSON으로 내보냅니다.
- Origin/WAF/Policy/User/Namespace는 생성·수정 중심이며 LB 외 리소스의 삭제는 미구현입니다. Namespace 이름 수정도 미구현입니다.
- 실제 Console의 모든 메뉴·고급 설정·픽셀 단위 일치를 보장하지 않습니다. 제공된 캡처 외 화면은 공식 문서 흐름을 참고해 컴포넌트로 구성했습니다.
- 기본 콘솔은 Origin Pool당 endpoint 1개, 기본 pool 1개를 지원합니다. Training Center의 Class 6은 AWS 우선/Azure fallback을 별도 모델로 제공합니다. 일반 pool weight/priority, 정규식/도메인별 WAF 예외, medium/low signature별 액션, 서비스 발견과 실제 threat campaign feed는 미구현입니다.
- Custom signature 모드의 SQLi/XSS는 high-accuracy mock signature로 판정합니다. Threat Campaigns, accuracy selection, 자동 튜닝, log masking의 UI 설정은 저장되며 별도의 실시간 엔진은 없습니다.

React + TypeScript + Vite, Tailwind CSS v4, shadcn/ui 스타일의 로컬 Radix 컴포넌트, Recharts, Lucide React, Zustand를 사용합니다. 실행 시 CDN 폰트나 외부 이미지 요청 없이 동작하며 외부 문서 링크는 사용자 클릭 시 열립니다.

## Class 9 · Community supplement

Training Center includes five community-reference exercises for WAF, API endpoint protection, rate limiting, signature-based bots, and Bot Defense. See [Class 9 details](docs/CLASS9.md). All outcomes are local simulations. Current verification: 212 tests passed and production build passed.

## API Security Quickstarts

API Security → API Quickstarts에서 공식 문서 순서의 API Discovery, API Protection, API Testing을 연습할 수 있습니다. [입력값과 설정 순서](docs/API-QUICKSTARTS.md), [검증 결과](docs/verification/api-quickstart/README.md)를 참고하세요. 기존 Class 1–9는 유지됩니다.
# API 대시보드

API Security → API Endpoints에서 차트·테이블을 확인합니다. [실습과 집계 기준](docs/API-DASHBOARD.md).
