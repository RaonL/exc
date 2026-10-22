# 실제 F5 XC 콘솔 관찰 보고서 — 2026-10-22

사용자가 직접 로그인한 분석 전용 Chrome의 loopback CDP 9222에 연결했다. 대상은 `f5-xc-lab-sec.console.ves.volterra.io`, 시작 Namespace는 `api-service-discovery`이다. 실제 저장·삭제·설정값 변경·외부 모의 공격은 수행하지 않았다. 관찰 자료는 로컬 `output/rea-live`에 두며 Git 저장소의 무시 경로이다.

## 결론

로그인 후 실제 화면을 확인했다. 현재 시뮬레이터는 예전 공식 문서·사용자 캡처를 기반으로 하므로 현재 콘솔과 메뉴·필드명·그래프·객체 연결 방식에 차이가 있다. 아래는 관찰한 사실이며, 전체 XC 제품 또는 백엔드 소스의 완전한 역공학을 의미하지 않는다.

현재 계정 화면에서 Add HTTP Load Balancer, Add App Firewall, Edit Configuration, Update Schema, DNS Add/Import가 Locked로 표시됐다. 조회 화면은 열 수 있지만 생성/편집/저장 순서와 저장 후 적용 동작은 검증하지 않았다. 권한을 변경하거나 잠금을 우회하지 않았다.

## 1. Home·공통 프레임

- 현재 제목은 Welcome to Distributed Cloud. Your Workspaces / Go to Catalog / More Workspaces로 구성된다. 예전 Common workspaces 캡처와 다르다.
- 실제 1920×1080 캡처의 좌측 영역은 약 264px이며 상단 breadcrumb와 페이지 제목, Workspace·Namespace 선택을 분리한다.
- Security 화면에는 Distributed Cloud Delivery Resources / All Delivery Resources 전환이 추가돼 있다.
- WAAP 좌측 메뉴는 Overview / Manage / Notifications / References / Workspace Info이다. API Security는 Manage 아래의 하위 메뉴이다. 기존 시뮬레이터의 독립 API Security 그룹과 위치가 다르다.

## 2. 실제 조회 경로

1. Overview → Security → Delivery Resources 목록 → 기존 HTTP LB 이름 → Security Monitoring.
2. LB Security Monitoring → Manage Configuration → Form 조회 창.
3. App Firewall 목록 → 행 Actions → Manage Configuration → Form 조회 창.
4. LB Security Monitoring → API Endpoints → Table / Graph.
5. Security의 View API Classification은 별도 요약 dialog를 연다. Shadow APIs / Sensitive Data / API Incidents 탭으로 나뉜다.
6. Home → DNS Management → Overview → DNS Zones → Zone 이름 → Resource Record Sets / Manage Configuration.

모든 경로는 실제 화면 링크·메뉴를 관찰해 이동했다. 화면상 Locked 때문에 Edit 이후 단계는 수행하지 않았다.

## 3. HTTP Load Balancer 조회 설정

관찰한 섹션 순서는 Metadata → Domains → VIP Advertisement → SSL/TLS Type → Routes → CDN → Common Delivery Controls → Web Application Firewall → Common Security Controls → L7 Denial of Service (DoS) → API Protection → Bot Protection → Malware Protection → Client-Side Defense → 인증서·Virtual Host 상태이다.

- 위 순서는 api-front 객체에서 관찰했다. petstore3-api-lb에서는 Routes 대신 Origins가 표시됐다. Origins가 제거된 것이 아니라 객체 구성에 따라 두 형태가 존재한다.
- petstore3-api-lb의 Origins 표는 Type / Name / Weight / Priority / Endpoint Subsets이며, Origin Pool petstore3-api, Weight 1, Priority 1을 확인했다. 풀 이름 클릭으로 풀 상세가 열리지는 않았으므로 Origin Pool 세부 폼을 검증한 것으로 계산하지 않는다.
- Routes → View Configuration은 별도 중첩 조회 화면이다. 테이블 열은 Order / Type / Caching / State / Parameters이다.
- 관찰한 기본 Simple Route는 ANY method, Path Prefix `/`, 별도 Origin Pool 참조를 가진다. Origin Pool 이름까지 확인했지만 Origin Pool과 Health Check의 세부 폼은 아직 직접 열어 확인하지 않았다.
- WAF는 Enable 후 별도 App Firewall 객체를 참조한다. 객체 이름을 누를 수 있고 WAF Exclusion도 별도로 표시된다.
- HTTPS 자동 인증서, HTTP Redirect to HTTPS, HSTS, 포트, TLS Security Level, mTLS, Path Normalization, HTTP 프로토콜과 인증서 상태가 조회 화면에 표시된다. 실제 인증서 발급은 실행하지 않았다.

### API Protection에서 실제 확인한 항목

- API Definition
- API Discovery
- Learn From Traffic With Redirect Response
- Purge Duration for Inactive Discovered APIs from Traffic (`2 d`가 현재 값으로 표시됨)
- API Crawling
- API Discovery Policy: Built-in
- Sensitive Data Discovery: Default
- API Testing

시뮬레이터의 Direct Response 문구는 Redirect Response로 정합성을 맞춰야 한다. 기간도 단위가 표시되는 형태가 필요하다. `2 d`는 관찰한 객체의 저장값이지 제품 전체 기본값이라고 확인한 것은 아니다.

선택한 실제 LB는 API Definition Disable, API Discovery Enable, API Crawling Disable, API Testing Disable이다. 따라서 이 객체만으로 API Inventory 검증·API Testing 환경/자격 증명 설정 폼을 확인했다고 주장할 수 없다.

## 4. App Firewall

- 공통 Form / Documentation / JSON 탭, View 표시, Metadata / Enforcement Mode / Security Policy Settings / Advanced configuration 앵커와 Close 버튼을 확인했다.
- 관찰한 정책은 Blocking, Security Policy Custom이다.
- Attack Types, Signature Settings by Accuracy: Custom, High/Medium/Low Accuracy별 Block, Automatic Attack Signatures Tuning, Attack Signatures Staging, Threat Campaigns, Signature-Based Bot Protection, Violations 중첩 설정이 표시된다.
- Enhance with AI, Action By Risk Score, Allowed Response Status Codes, Mask Sensitive Parameters in Logs, Blocking Response Page도 표시된다.
- 시뮬레이터의 단일 정확도 선택만으로 이 구성을 재현했다고 할 수 없다. 모드별 개별 동작과 AI 관련 필드는 추가 설계가 필요하다.

## 5. API Endpoints

이 화면은 Namespace 전체 독립 목록보다 **개별 LB의 Security Monitoring 아래**에 위치한다.

### 차트·탭

- Top Attacked APIs / Top Sensitive Data / Total API Calls / Most Active APIs.
- Inventory / Discovered / Shadow 체크 필터.
- Domains / Last 5 minutes / Refresh / Hide Summary.
- Table / Graph, Search, Update Schema, Download API Spec, Add Filter, Current / Archived.
- Graph는 Segment 1~6 경로 계층을 보여 주는 표현이다. 시뮬레이터의 LB→endpoint 카드 관계 그래프와 다르다.

### 관찰된 현재 표 열

API Endpoint / Method / Sensitive Data / Threat Level / Authentication State / API Category / Discovery Source / Risk Score / Schema Status / Last Updated / Actions.

이 계정에서 기본 관찰된 열에는 예전 캡처의 Group이 없으며 Threat Level, Schema Status, Last Updated가 있다. Group 기능이 제품 전체에서 제거됐는지까지 확인한 것은 아니다. 일부 열은 가로 스크롤 밖에 있어 접근성 트리로 함께 확인했다.

### 데이터 의미

- 관찰 당시 Discovered 42, Inventory 0, Shadow 0이었다. API Definition Disable과 함께 표시된다.
- Sensitive Data 태그는 credit-card / url-link / location-data / authorization 등의 이름을 쓴다. 기존 시뮬레이터의 Email/SSN 표시와 태그 체계가 다르다.
- 같은 화면에서 최근 5분 Total API Calls는 0이고 누적 학습 endpoint는 42다. **학습 목록과 선택 시간창의 호출 집계를 같은 수로 만들면 안 된다.**
- Risk Score에 60/90이 보이지만 계산 공식은 노출되지 않았다. 시뮬레이터의 80/60/40 규칙은 학습용이고 실제 계산식으로 설명하면 안 된다.
- 현재 API Testing이 Disable인 객체이므로 실제 Last Tested·Security Posture의 실행 결과까지 검증하지 못했다.
- endpoint 셀/행 작업 클릭으로 상세 UI를 여는 시도는 별도로 기록했다. 화면 전환이 확인되지 않은 경우 이를 성공한 상세 조회로 계산하지 않는다.

## 6. DNS

- 별도 DNS Management Workspace이다. 관찰한 DNS URL·화면에는 WAAP와 같은 Namespace 선택이 없었다. 이 UI 관찰만으로 백엔드 객체의 전체 scope를 단정하지 않는다.
- Performance: Traffic Distribution, Top Requests, Total Queries, Query Type, Response Type(by RCODE), DNS Query Rate.
- DNS Zones: Overview, Zone Types(Primary/Secondary), Deployment Statuses(Active/Pending/Failed), Primary/Secondary 목록.
- Zone 상세: Deployment Status, DNSSEC Mode, Zone Type, Server Names.
- Resource Record Sets와 F5-Managed Resource Record Set 탭을 분리한다.
- 레코드 표: Record Name / Set Group Name / Type / Record Value(s) / Time to live(s) / Comment.
- 관찰한 Zone의 기본 NS 레코드는 복수 값과 TTL 86400을 한 RRset으로 표시한다. 단순히 레코드 한 행당 값 하나로만 모델링하면 차이가 생긴다.
- 선택한 Zone의 Manage Configuration 조회 URL에는 namespace=system이 표시됐다. 조회 섹션은 Metadata / DNS Zone Configuration / Number of DNS records이다. 이를 모든 DNS 객체의 scope로 일반화하지 않는다.
- DNS LB 메뉴는 HTTP LB와 별도이다. 현재 객체는 0개이고 Add DNS Load Balancer도 Locked였다. Health, Pools Overview, Pool Members(All/Unhealthy)와 IP Endpoint / Status / Pool Name / Health Monitor / Reason / Reason Explanation / DNS Load Balancer 열을 확인했다. 생성 폼과 Pool·Health Monitor 설정 흐름은 확인하지 못했다.

## 7. 우선 수정 제안

| 우선순위 | 항목 | 이유 |
|---|---|---|
| 1 | 조회/편집/권한 상태 분리 | 실제 View와 Locked Edit를 혼동하면 학습자가 저장 가능 여부를 잘못 이해한다. |
| 1 | LB의 API Protection 명칭·단위·추가 항목 | Redirect, 기간 단위, Discovery Policy, Sensitive Data Discovery가 현재 화면과 다르다. |
| 1 | API Endpoints 실제 열과 Graph | Threat Level / Schema Status / Last Updated, Segment 계층이 빠져 있다. |
| 2 | WAF 정확도별 동작·AI 위험도 필드 | 단일 High/Medium/Low 범위 선택과 별개 구성이 있다. |
| 2 | LB Origins/Routes와 Origin 참조 흐름 | 실제 두 구성 형태와 Routes의 중첩 조회를 함께 지원해야 한다. |
| 2 | DNS RRset·F5-managed 분리 | 다중 값·TTL·Set Group·Managed 레코드를 구분해야 한다. |
| 3 | Home와 Workspace·메뉴 재배치 | 오래된 캡처와 최신 실제 콘솔의 버전을 섞지 않도록 한다. |

## 8. 수집 방법과 한계

- REA 6.7.0, Chrome 155.0.8059.85의 CDP에 연결했다.
- REA MCP의 수동 관찰과 스크린샷은 동작했다. 메뉴 탐색 기본 설정에서는 Service Worker의 invalid document state 오류가 발생해 전용 연결에 `service_workers: allow`를 사용했다.
- 전체 로드 JS 번들 분석은 transport closed로 끝났다. 전체 클라이언트 소스 복구·백엔드 역공학을 완료한 것이 아니다.
- 이후 REA CLI의 capture-browser-scenario로 실제 조회·탭 이동을 수행했다. 성공한 화면의 action 상태·accessibility·screenshot·URL을 보존했다.
- 성공한 캡처에도 completeness에 missing events가 표시된다. 네트워크 이벤트 전체나 HTTP write 부재를 이 도구 기록만으로 증명한다고 표현하지 않는다. 선언한 action은 navigation/click/wait에 한정했고 Save/Delete/공격 실행 버튼은 누르지 않았다.
- 실제 로그인 쿠키·비밀번호·토큰을 추출하거나 복사하지 않았다. 민감값을 드러내는 버튼이나 원본 계정 저장소를 읽지 않았다.
- 제품 설정/데이터와 시뮬레이터 소스는 이번 분석에서 수정하지 않았다. 실제 저장 전후 검증은 권한과 별도 승인 범위를 확인한 뒤에만 가능하다.

## 캡처 보관

실제 테넌트 캡처와 REA 원본 증거는 로컬의 Git 무시 경로 output/rea-live에 보관한다. 로그인 세션 자료와 원본 캡처는 저장소에 포함하지 않는다.
