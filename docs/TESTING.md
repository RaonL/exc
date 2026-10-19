# 검증 결과

최신 검증일: 2026-10-20 · Windows · Node 24.14.1 · Chromium 기반 앱 브라우저.

Security Events 개선: [상세 검증과 캡처](SECURITY-EVENTS-UPGRADE.md). 신규 UI 회귀 6개·예외 로직 8개와 Chrome DevTools MCP 브라우저 검사 41개를 통과했습니다. Support ID 필터·행 상세·예외 초안 취소·LB 저장·다른 공격 차단·만료·저장 복원을 확인했습니다.

App Firewall 개선: [상세 검증과 캡처](APP-FIREWALL-UPGRADE.md). 신규 UI 회귀 테스트 10개와 Chrome DevTools MCP 브라우저 검사 40개를 통과했습니다. 콘솔에서 정책 생성·수정·취소·Reset, Monitoring/Blocking과 LB 연결, 실제 요청 및 Security Events의 Support ID 검색·저장 복원을 검증했습니다.

HTTP LB 개선: [상세 검증과 캡처](HTTP-LB-UPGRADE.md). UI 회귀 테스트 9개를 추가했으며 Chrome DevTools MCP 브라우저 검사 46개를 통과했습니다. 콘솔에서 Origin 연결, LB 생성·수정·취소·저장 복원, shared WAF 적용과 정상/공격 요청 결과를 검증했습니다.

최신 Origin Pool 개선: [상세 검증 및 캡처](ORIGIN-POOL-UPGRADE.md). 신규 UI 회귀 테스트 8개와 Chrome DevTools MCP 브라우저 검사 36개를 통과했습니다. 실제 콘솔 메뉴의 생성·수정·취소·Reset·저장 복원과 4개 화면 폭을 검증했습니다.

## 자동 검증

- `npm run build`: TypeScript strict 검사 및 Vite 프로덕션 빌드.
- `npm test`: Vitest 166개 통과 (기존 152개 + Security Events UI 6개 + 예외 매칭·저장 로직 8개).
- 의존 상태 연동 검증: LB 생성/수정/삭제 및 persist 복원, 연결 WAF mode 변경, 보호 flag별 API/Bot/DDoS 결과, 요청 카운터, Origin 장애/복구, CE 상태, Shadow API 등록, namespace 분리, 초기화, 보관 기간.
- localStorage quota 오류에서도 메모리 상태가 유지되고 무한 재시도가 발생하지 않는지 검증.

## 브라우저에서 직접 확인한 흐름

| 항목                | 확인 결과                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| LB 입력 오류        | `https://invalid.example.com` 입력 시 안내 문구로 저장 차단                                              |
| LB 생성             | `training-test-lb` / `training.example.com` 생성, 목록에 4번째 항목으로 반영                             |
| LB 수정 및 새로고침 | `training-verified-lb`로 수정 후 reload해도 이름/설정 유지                                               |
| LB 상세             | LB 이름 클릭으로 해당 LB Performance Overview 이동                                                       |
| SQLi / WAF          | Blocking에서 48건 Blocked 생성; WAF를 Monitoring으로 전환한 후 연결 이벤트가 Detected로 변경             |
| Shadow API          | 시나리오 실행으로 `/api/internal/discovered-5` 생성, inventory 등록 후 Shadow 필터에서 제거              |
| CE / Connectivity   | `seoul-ce-01` Offline 후 Connectivity에 Disconnected 및 online CE 수 감소; Online으로 복구               |
| Namespace           | staging 전환 시 site/topology가 빈 상태로 표시, social-hawk 복귀 시 복원                                 |
| Origin 장애         | web origin pool 장애 시 Overview health 33/100, unhealthy origin 1, critical alert 1로 변경              |
| LB 삭제             | 테스트 LB 삭제 후 목록에서 제거                                                                          |
| 전역 검색           | System Settings 검색 결과로 Administration 설정 화면 이동                                                |
| Reset Demo Data     | 확인 모달 표시 후 초기화, WAAP Overview로 복귀, origin 모두 Healthy 복원                                 |
| Home                | Services 및 워크스페이스 카드, 활동 목록 표시                                                            |
| 반응형              | 390×844에서 모바일 메뉴/Workspace 선택, Home·WAAP 세로 레이아웃, 문서 가로 넘침 없음                     |
| 브라우저 로그       | 검증 탭에서 JavaScript error/warn 기록 없음                                                              |
| 프로덕션 실행       | `npm run preview`의 4173 포트에서 대시보드, Requests 탭 4개 이벤트, Home 이동 확인; error/warn 기록 없음 |

1차 검증의 테스트용 변경은 Reset Demo Data로 복원했습니다. 이후 가이드 기반 보강 검증에서는 별도 테스트 LB를 생성·삭제하고 기존 데이터는 초기화하지 않았습니다. 전체 기능의 모든 입력 조합이나 모든 브라우저 버전을 검증한 것은 아닙니다.

## 공식 가이드 기반 보강 검증

- Actions → Manage Configuration의 읽기 모드, JSON 조회, 상세 편집 진입.
- LB 상세 route/exclusion 저장 후 reload, `/health` exact Direct Response 204 + WAF 제외 결과 Allowed 확인.
- 동일 LB의 `/api/v1/products` SQLi는 Blocked / HTTP 403, 이벤트 Request 상세에서 상태·차단 본문 확인.
- 테스트 LB 삭제 후 연결 이벤트도 삭제. 기존 LB/WAF/Origin 내용은 변경하지 않음.
- LB 초안에서 Add Origin Pool을 열었다 취소해도 부모 LB 이름 보존.
- Origin health-check timeout이 interval보다 클 때 저장 오류 표시.
- WAF Custom action, staging 기간 입력 UI 및 취소 동작.
- Security resource 필터를 `social-hawk-api`로 제한했을 때 요청 합계 58 확인.
- source IP 드릴다운에서 해당 이벤트만 표시, 범례 토글, Malicious Users 및 교육용 Threat Campaigns 탭 동작.
- Line/Area 전환과 Delivery Resources CSV 다운로드 완료 확인.
- Manage Configuration의 Edit Configuration 버튼이 저장 없이 편집 모드로 전환되는지 회귀 테스트 추가.
- 자동 검증에 legacy 기본값, 상세 설정 persist, 신규/갱신 staging 차이·만료, WAF 예외·route override·route 순서·Direct Response·Redirect·503 및 route-level health/WAF 집계를 포함.

## 수동 재현 절차

1. `npm run dev`로 실행하고 namespace `social-hawk`를 선택합니다.
2. HTTP Load Balancers에서 새 LB를 만들고 web origin 및 blocking WAF를 선택합니다.
3. 이름을 수정한 뒤 새로고침해 저장된 이름을 확인합니다.
4. LB 상세에서 Simulation Lab → SQL Injection을 실행합니다.
5. App Firewall에서 Monitoring으로 전환하고 Security Events에서 대상 LB 이름으로 검색합니다.
6. Shadow API Discovery를 실행하고 API Discovery의 Shadow APIs 필터에서 inventory에 등록합니다.
7. Network Connect의 Site Management에서 CE를 Offline으로 전환하고 Connectivity를 확인합니다.
8. Origin Pools에서 장애를 발생시키고 Overview → Origin Servers에서 복구합니다.
9. LB 삭제 확인 모달을 통해 테스트 리소스를 삭제합니다.
10. Administration → System Settings → Reset Demo Data로 초기화합니다.

## 화면 기록

[WAAP 대시보드 스크린샷](screenshots/waap-dashboard.jpg)

[상세 LB 설정 화면](screenshots/lb-configuration.jpg) · [보강된 Security Overview](screenshots/security-overview.jpg)

상세 설정/보안 화면은 데스크톱 1440×900 레이아웃 검증 중 기록했습니다. 프로덕션 빌드에서도 편집 모드 전환 후 입력 가능 상태와 편집기 유지, error/warn 로그 없음까지 확인했습니다.

## Class 1–8 교육 실습 검증

- 자동 테스트: 117개 통과, TypeScript strict 및 production build 통과.
- 34개 단원 각각 정답 fixture에서 요청 조건을 평가하고, Origin 연결이 깨지면 전체 검증이 실패하는지 검사했습니다.
- 실제 시간 창 만료, 클라이언트별 counter 분리, 공유 IP의 fingerprint 격리, 10회 이후 봇 전환, endpoint Deny, connector 비활성, failover 복구, pipeline source 변경·WAF 배포 gate를 검사했습니다.
- 콘솔 WAF 변경 후 완료 상태 해제, LB 삭제 후 stale fixture로 통과하지 않음, 초기화 격리, localStorage 복원, self-test 무부작용을 검사했습니다.
- Class 7 manifest에 불완전한 JSON을 입력해도 편집 화면이 유지되는 렌더링 회귀를 검사했습니다.

| 브라우저 직접 조작     | 결과                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Class 1 LB/WAF         | 초기 3/6 FAIL → HTTP/80 + WAF Blocking 적용 후 6/6 PASS                              |
| Class 2 Scan           | 보호 전 3 Open → 보호 후 3 Mitigated, 보고서 2회 비교, 최종 PASS                     |
| Class 3 Header Policy  | 헤더 없음/오답 403, 정답 헤더 200, 5/5 PASS                                          |
| Class 4 Endpoint Deny  | getbydob 403, getbyname 200, 4/4 PASS                                                |
| Class 5 Human-like Bot | 첫 10회 Human/Allowed, 11·12회 BadBot/Detected/200, 14/14 PASS                       |
| Class 6 Failover       | AWS → AWS 장애 시 Azure → 전체 장애 503 → AWS 복구, 6/6 PASS                         |
| Class 7 Code           | 불완전 JSON 편집 후 복구·Build/Test, artifact·route 계약 4/4 PASS                    |
| Class 8 Zero Day       | Request Builder 반복 4회로 429 확인, 3/min 제한·bypass·exploit 규칙 21/21 PASS       |
| 콘솔 연동              | App Firewall 목록에서 Monitoring 전환 → 가이드의 완료 해제·FAIL → Blocking 복구·PASS |
| 새로고침               | 저장된 Class 1 완료 진도와 설정 복원                                                 |
| 증거 내보내기          | c1-lab1-evidence.json 다운로드 완료                                                  |
| 프로덕션 preview       | 앱의 34개 모델 자체 검증 34/34 PASS, JavaScript error/warn 없음                      |
| 반응형                 | 데스크톱 및 390×844에서 카드/단원/가이드 레이아웃 확인, 문서 가로 넘침 없음          |

학습 진도를 자동 완료시키는 테스트는 없습니다. 앱의 34개 모델 자체 검증은 격리된 메모리에서만 수행하며 learner progress를 변경하지 않습니다. 브라우저에서 직접 실행한 대표 단원의 환경·검증은 해당 training Namespace에 예시로 보존되어 있고, 각 실습 초기화로 처음부터 진행할 수 있습니다. 실서비스의 모든 옵션/실제 엔진 동등성까지 검증한 것은 아닙니다.

- [학습 센터 화면](screenshots/training-center.png)
- [실습 요청 검증 화면](screenshots/training-verification.png)
- [공식 원문별 구현 범위](TRAINING.md)

## Class 1 Lab 1 콘솔 직접 실습 검증

공식 본문과 실제 이미지 0033/0043/0093/0113/0323/0393을 비교했습니다. 자세한 필드 대응은 [CLASS1-LAB1.md](CLASS1-LAB1.md)에 기록했습니다.

브라우저에서 기존 데모를 초기화하지 않고 새 class1-lab1 Namespace에 다음을 직접 수행했습니다.

1. Origin Pools → Add → Name → Origin Servers Add Item → Public DNS / DNS Name → Apply → Port 80 → Add Origin Pool.
2. HTTP Load Balancers → Add → Domain 행 → HTTP → DNS 자동 관리 → HTTP Listen Port 80.
3. Origins Add Item → Origin Pool Method / pool 선택 / Weight·Priority 1 → Apply → Other Settings의 Internet → Add HTTP Load Balancer.
4. 도메인 Open Application → Home / HEADER 200, SQLi 200/Detected. 요청 한 번당 카운터 1 확인.
5. Performance → Last 1 hour / Apply → Requests → Hide Chart 확인.
6. LB Actions → Manage Configuration → Edit Configuration → WAF Enable / shared/base-appfw → Save HTTP Load Balancer.
7. Home 200, SQLi/XSS/Command Injection 403, 차단 페이지의 Support ID 확인.
8. 해당 LB Security Analytics → 이벤트 JSON의 req_id와 동일한 Support ID → Explain with AI 로컬 설명 확인.
9. 콘솔 가이드 6/6 및 새로고침 후 설정·완료 상태 유지 확인.
10. 목록에서 shared/base-appfw 조회 시 Namespace shared, 필드 읽기 전용, 편집/저장 버튼 없음 확인.

자동 검증에는 보호 전·후의 기록, 다른 Namespace 정책 거부, shared 정책 허용, 현재 자원과 단계 판정 일치, WAF 수정 후 과거 콘솔 로그 보존, 외부 URL 거부, Origin 장애, 기존 저장 데이터에 shared 정책 보강을 포함합니다. 전체 자동 테스트 125개와 TypeScript/production build가 통과했습니다. Training Center는 필요 시 로드하도록 분리해 500 kB 초과 번들 경고도 해소했습니다.

[콘솔 실습 화면](screenshots/class1-lab1-console.png) · [LB 설정 화면](screenshots/class1-lab1-lb-form.png)
