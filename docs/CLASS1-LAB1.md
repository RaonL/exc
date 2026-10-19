# Class 1 Lab 1 — 콘솔 메뉴에서 진행

2026-10-19에 [공식 Lab 1](https://clouddocs.f5.com/training/community/f5xc/html/class1/lab1.html)의 본문과 아래 실제 캡처를 비교했습니다. 화면 안의 실제 테넌트 접속·공격 명령은 실행하지 않았습니다.

| 비교한 공식 캡처                                                                                     | 이번에 반영한 항목                                                                                 |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [Origin Pool](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0033.png)           | Metadata, Origin Servers 항목 목록, Add Item, Origin server Port, Health Checks/TLS/Other Settings |
| [Origin Server 하위 폼](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0043.png) | Public DNS 기본 선택, DNS Name, Back/Apply. Apply 전에는 부모 설정에 반영하지 않음                 |
| [LB 생성](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0093.png)               | Domain 행과 Add Item, LB Type, DNS 자동 관리, HTTP 포트 선택/80, 섹션 탐색                         |
| [Origins 하위 폼](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0113.png)       | Origin Pool Method, namespace/pool 선택, Weight/Priority, Apply                                    |
| [WAF 연결](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0323.png)              | WAF Enable → shared/base-appfw, View Configuration, Save HTTP Load Balancer                        |
| [Security Analytics](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0393.png)    | 시간 범위 Apply, Hide/Show Chart, 요청 코드 차트, 상세/Support ID 검색                             |

상단 Form/Documentation/JSON, 좌측 자원/섹션 목록, 흰 설정 카드와 회색 작업 영역, 고정 저장 영역을 캡처에 가깝게 보정했습니다. 캡처의 빨간 강조 상자는 교육용 주석으로 판단해 앱에 넣지 않았습니다. 원문 본문과 캡처는 버전 차이가 있습니다. VIP Advertisement는 확인한 캡처처럼 **Other Settings** 안에 배치했습니다.

## 직접 진행하는 순서

`npm run dev` 후 [로컬 콘솔](http://127.0.0.1:5173/)에서:

1. Training Center → Class 1 → Lab 1 → **콘솔에서 실습 시작**.
2. 빈 `class1-lab1` Namespace의 WAAP / Origin Pools가 열립니다. 자동 생성되는 LB·Origin은 없습니다. `shared/base-appfw`만 공통 읽기 전용 정책으로 준비합니다. 이미 진행한 경우 기존 자원을 보존합니다.
3. **Manage → Load Balancers → Origin Pools → Add Origin Pool**.
   - Name: `class1-lab1-pool`.
   - Origin Servers → Add Item → Public DNS Name of Origin Server.
   - DNS Name: `demo-app.amer.myedgedemo.com` → Apply.
   - Origin server Port: Port → `80` → Add Origin Pool.
4. **Manage → Load Balancers → HTTP Load Balancers → Add HTTP Load Balancer**.
   - Name: `class1-lab1-lb`.
   - Domain: `class1-lab1.lab-sec.f5demos.com`.
   - Type: HTTP, Automatically Manage DNS Records 체크.
   - HTTP Listen Port Choice: HTTP Listen Port, Port: `80`.
   - Origins → Add Item → Origin Pool → `class1-lab1/class1-lab1-pool` → Apply.
   - Other Settings → VIP Advertisement: Internet.
   - WAF Disable 상태로 Add HTTP Load Balancer.
5. 목록의 **도메인**을 클릭하거나 Actions → **Open Application**.
   - Home/HEADER로 HTTP 200 확인. SQL Injection 샘플도 보호 전에는 200/Detected입니다.
   - Performance Monitoring → Last 1 hour → Apply → Requests.
   - Hide Chart와 요청 상세의 Information/Request/JSON을 확인합니다.
6. LB 목록 → Actions → **Manage Configuration → Edit Configuration**.
   - Web Application Firewall → Enable → `shared/base-appfw`.
   - View Configuration으로 읽기 전용 정책 내용을 확인할 수 있습니다.
   - Save HTTP Load Balancer.
7. 도메인을 다시 열고 Home은 200, SQLi/XSS/Command Injection 샘플은 403인지 확인합니다.
8. 차단 응답의 **Support ID** 확인 → Security → 해당 LB → Security Analytics, 또는 로컬 앱의 Security Analytics 버튼.
   - Support ID로 검색하고 이벤트를 엽니다.
   - req_id, signature 이름, 적용 WAF, 메서드·경로, 응답 코드, 모의 duration을 확인합니다.
   - Explain with AI는 해당 이벤트를 근거로 로컬 템플릿 설명을 표시합니다.

콘솔 위의 Lab 1 가이드는 실제 저장 자원과 요청 기록을 읽어 6개 항목을 자동 판정합니다. 수동 완료 체크는 없습니다. 기준 정상 요청, WAF 연결 후 정상 200과 세 공격의 403, 차단 이벤트 상세 확인이 필요합니다. 완료 상태는 Training Center의 Class 1 Lab 1 진도에도 반영됩니다. 기존 Class 1 Lab 1의 별도 설정/요청 탭은 새 진입 UI에서 숨겼습니다.

## 로컬 모델 경계

- 원문의 도메인/Origin 주소는 설정 데이터로 저장하며 DNS 조회나 외부 접속을 하지 않습니다. 앱 테스트 창의 주소 표시줄도 네트워크 이동이 아닙니다.
- 일반 콘솔에서 사용자가 만든 다른 LB도 도메인/Actions/Performance의 Open Application으로 테스트할 수 있습니다. Lab 1의 자동 단계 판정만 위 고정 자원 이름을 사용합니다.
- 요청 한 번당 실제 저장된 LB·Origin·WAF로 평가한 이벤트 한 건과 요청 수 1이 추가됩니다. 일반 Simulation Lab의 대량 시나리오와 별개입니다.
- SQLi/XSS/명령 삽입은 정해진 문자열 패턴으로만 분류합니다. 실제 WAF·명령 실행·스크립트 실행 엔진이 아닙니다. Duration도 모의 값입니다.
- 공통 shared 정책은 선택/조회만 지원합니다. 다른 Namespace의 일반 WAF는 연결할 수 없습니다.
- 콘솔 앱 테스트 로그는 당시의 응답을 보존합니다. WAF를 나중에 수정해도 과거 응답을 바꾸지 않습니다. 기존 Simulation Lab에서 생성한 집계용 시나리오 이벤트의 교육용 재평가는 유지합니다.
- Origin Pool은 endpoint 하나, LB 기본 pool 하나를 지원합니다. Weight/Priority는 저장/조회용입니다. 고급 다중 pool 전달, 전체 WAF 부가 기능, 실제 AI는 미구현입니다.
- 이번 직접 실습 전환의 범위는 Class 1 Lab 1입니다. 다른 단원의 전용 모델은 기존 Training Center에서 실행합니다.

## 코드와 검증

`src/lib/console-lab.ts`는 쿼리 분류·로컬 URL 검사·실습 판정을 담당합니다. 요청은 `src/store.ts`의 `requestApplication`에서 공통 WAF 평가기를 사용합니다. `ConsoleApplication.tsx`, `ConsoleLab1.tsx`, `OriginItems.tsx`, `RequestTelemetry.tsx`가 콘솔 입력/테스트/도움말/관측 UI입니다. 기존 LB·Origin·이벤트 편집 화면도 같은 자원을 사용합니다.

자동 테스트는 `src/lib/console-lab.test.ts`에 빈 환경 시작, 실제 자원 기반 완료, 공통 WAF, 과거 로그 보존, 외부 URL 거부, Origin 장애, Namespace 격리와 저장 복원을 포함합니다. 브라우저에서는 위 전체 순서를 직접 진행해 **6/6**과 새로고침 후 유지를 확인했습니다.
