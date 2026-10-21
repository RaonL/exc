# API Security Quickstarts — 로컬 실습

실행: `npm ci` → `npm run dev` → `http://127.0.0.1:5173/`.

좌측 **API Security → API Quickstarts**, 또는 Training Center의 **공식 API Quickstarts** 버튼으로 엽니다. 기존 Class 1–9는 그대로 유지됩니다. **실습 더미 환경 준비**는 `api-quickstart` Namespace의 `shop-lb`와 `shop-origin`만 준비합니다. 설정 정답은 자동 입력하지 않습니다.

## 1. Setting Up API Discovery

각 단계에는 **설정 위치 찾기**와 입력값 표·저장 순서·예상 결과가 있습니다. 이 버튼은 LB의 API Protection 편집 화면을 열지만 설정을 자동 저장하지 않습니다. Code Scanning 단계는 Integration 생성 버튼과 LB API Repositories 바로가기를 따로 제공합니다. 마지막 단계의 **요청 예제값 넣기**는 `GET /api/discovery-check`, headers/body/response `{}`, redirect 끄기를 Request Lab 입력란에 채웁니다. **Run Sample API Request**를 직접 누른 뒤 200/Allowed, Traffic Source와 로그를 확인하세요. 기존 정책에서 차단되면 로그의 차단 사유를 먼저 확인합니다.

1. `Manage Configuration → Edit Configuration → API Protection`에서 **API Discovery: Enable**을 저장합니다. 기본은 2xx만 학습합니다. `Learn From Traffic With Direct Response: Enable`은 로컬 3xx 학습도 허용합니다. `Purge Duration for Inactive Discovered APIs`: 30일.
2. `Manage → API Management → Code Base Integration → Add Code Base Integration`: Name `shop-code`, Code Base `Github Integration`, Username `demo-user`, API Key Configure → Secret `demo-only` → Apply → Save and Exit.
3. LB 편집에서 API Repositories의 `Code Base Integration: api-quickstart/shop-code`, repository `demo-org/shop`을 입력합니다.
4. `API Crawling: Enable → Add Crawl Domain`: Domain `shop.example.test`, User `demo-user`, Password Configure → `demo-only` → Apply → domain Apply → **Save HTTP Load Balancer**.
5. **Run Code Discovery (모의)**, **Run API Crawling (모의)** 실행 후 API Endpoints의 Discovery Source에서 Code/API Crawling을 비교합니다. Request Lab에서 GET/POST 요청을 실행하면 Traffic도 학습합니다. Purge는 모의 시계 기준입니다.

## 2. Setting Up API Protection

1. `Manage → Files → OpenAPI Files → Add OpenAPI File`: Name `shop-openapi`. [더미 파일](../public/fixtures/shop-openapi.json)을 내려받아 Upload File로 선택하고 Save and Exit. 편의를 위한 Load dummy OpenAPI도 제공됩니다.
2. `Manage → API Management → API Definition → Add API Definition`: Name `shop-definition`, OpenAPI Specification Files에서 `shop-openapi` 선택 → Save and Exit.
3. LB 편집 → API Protection → **API Definition: Enable** → `api-quickstart/shop-definition`. Validation은 초기 Disabled입니다.
4. **Validation: API Inventory → Configure**: Request Processing `Validate`, Enforcement `Report`, 검사 항목 Request Body 포함. Response Processing은 `Skip`. Apply → **LB 저장**.
5. Request Lab에서 `POST /api/orders`, body `{"quantity":"wrong"}`, dummy response `{"id":"order-1"}` → **200 / Detected**. quantity를 `2`로 변경하면 **200 / Allowed**.
6. 같은 폼에서 Request Enforcement를 **Block**으로 바꾸고 Apply → LB 저장. 잘못된 quantity는 **403 / Blocked**, 정상 quantity는 **200 / Allowed**. GET `/api/orders?limit=wrong`는 Query Parameters 검사입니다. Response Validate/Block과 response `{"id":12}`는 응답 검증 예제입니다.
7. 대안: Validation `Custom List` → Configure → Add Validation Rule: name `orders-only`, path `/api/orders`, methods POST, Action Block. Fall Through Mode Custom → Add Fall Through Rule: `unknown-block`, `/api/unknown`, GET, Block. Apply → Apply → LB 저장. GET `/api/unknown`은 403, `/api/else`는 Allow 200입니다. 규칙에 없는 경로의 기본값은 Allow입니다.

## 3. Automate API Security Testing

1. LB 편집 → API Protection → **API Testing: Enable** → **Add Testing Environment**. Domain `shop.example.test` (해당 LB 도메인만 선택).
2. Credentials에서 각각 직접 추가: `user-one` API Key / Standard, `user-two` Basic Authentication / Standard, `administrator` Bearer Token / Admin. Key `x-demo-key`, User `demo-user`, secret `demo-only`. 최소 Standard 2개·Admin 1개를 검사합니다.
3. Login Endpoint 유형도 제공됩니다: path `/api/login`, method POST, payload `{"user":"demo"}`, token response key `token`, secret `demo-only`. 실제 로그인은 실행하지 않습니다.
4. Use Destructive Methods는 더미 DELETE/PUT/PATCH 평가 여부만 바꿉니다. 실제 데이터를 삭제하거나 HTTP 요청을 보내지 않습니다.
5. Environment **Apply** → Frequency of Test `Every Week`(기본), Custom Header `api-lab` → **Save HTTP Load Balancer**. 헤더 키는 `x-f5-apitesting-identifier`입니다.
6. **Run API Testing (모의)** → API Endpoints → ⚙ Last Tested 켜기 → endpoint 클릭 → **Security Posture**, Source `API Testing`, 설명·완화 방안 확인. Logs에서 역할 구성·정책·응답 판정·external_requests=0 확인.
7. **모의 시계 +7일**은 주기 도래 시 저장한 설정으로 새 모의 테스트를 실행합니다. 실제 백그라운드 스케줄러는 설치하지 않습니다. 브라우저를 닫아 둔 동안 실행되지 않습니다. 설정 변경 후 과거 테스트는 Stale 표시됩니다.

## 원문과 차이

- [API Discovery](https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/quickstart/api-security), [API Protection](https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/quickstart/api-protection), [API Testing](https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/quickstart/automate-sec-test)를 2026-10-21 확인했습니다.
- REA로 공식 페이지의 DOM/접근성 구조와 로컬 신규 메뉴 동작을 관찰했습니다. 콘솔 로그인 뒤 실제 제품을 분석한 결과가 아닙니다. 원문 스크린샷 31개(중복 포함)를 모두 직접 확인하고 비교 보기에 보존했습니다.
- API Testing의 Save Credentials 캡처에는 adminRole 행도 Standard로 보이지만, 본문은 Standard 2개와 Admin 1개를 요구합니다. 검증은 본문을 따릅니다.
- OpenAPI 로컬 지원은 **3.0.x JSON 인라인 스키마**의 type/required/enum/범위/길이/object/array입니다. YAML, $ref, 조합 스키마와 전체 OpenAPI 보안 엔진은 미구현이며 오류를 표시합니다. Request Body 선택 항목은 본문 검증을 연습하기 위한 로컬 확장입니다.
- Code/Crawl은 지정된 fixture endpoint를 만들며 SCM, 로그인, 크롤링, Blindfold 암호화, 실제 API 공격은 수행하지 않습니다. 모든 자격 증명은 더미 문자열만 입력해야 하며 localStorage에 저장됩니다.
- 권한 관련 취약점은 의도적으로 취약한 더미 백엔드의 고정 시나리오입니다. 스키마 차단만으로 서버 권한 취약점이 해결되었다고 표시하지 않습니다. 실제 F5 탐지 성능·결과를 증명하지 않습니다.
- 신규 데이터 키는 `f5-xc-api-security-v1`, LB에 적용한 설정은 기존 콘솔 저장소의 `config.apiSecurity`입니다. 기존 Class 진행 키와 리소스를 초기화하거나 마이그레이션하지 않습니다.

검증 결과와 그림별 대응은 [검증 보고서](verification/api-quickstart/README.md)를 참고하세요.
