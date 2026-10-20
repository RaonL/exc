# 사용자 XC 캡처 기준 화면 조정

2026-10-20에 제공된 캡처 15장을 화면 구조의 우선 기준으로 사용했습니다. 캡처의 Home / Security / Origin Pool / HTTP LB / WAF / Performance / Requests를 나누어 비교했습니다.

| 캡처 | 반영한 구조 | 수정 화면 |
|---|---|---|
| 1 | Home의 수평 헤더, 검색, Common workspaces 4열·12개 카드 | [Home](screenshots/xc-home.png) |
| 2–3 | 325px 좌측 메뉴, Workspace·Namespace, Overview, Load Balancers 플라이아웃 | [Security](screenshots/xc-security.png), [메뉴](screenshots/xc-load-balancer-menu.png) |
| 4–5 | Origin Pools의 Name·Namespace·Actions, Manage Configuration, 읽기 전용 View와 상단 Edit | [목록](screenshots/xc-origin-pools.png), [View](screenshots/xc-origin-view.png) |
| 6–7 | HTTP LB 목록의 DNS Info·Validity·Domains, View와 Edit 분리 | [목록](screenshots/xc-http-lbs.png), [View](screenshots/xc-http-lb-view.png) |
| 8–9 | WAF Disable/Enable 설명형 드롭다운과 정책 참조·Add Item 중첩 생성 | [WAF 선택](screenshots/xc-waf-enable.png) |
| 10–11 | App Firewall의 Metadata·Enforcement Mode·Security Policy·Attack Signatures·Accuracy | [Custom 정책](screenshots/xc-waf-custom.png) |
| 12–13 | Performance의 Health·Alerts 도넛, Active Configuration, Traffic·Throughput, LB 목록 | [Performance](screenshots/xc-performance.png) |
| 14 | LB별 Requests 탭과 시간 범위·응답 코드·요청 목록 | [Requests](screenshots/xc-requests.png) |
| 15 | Security 카드·국가 지도·구성 수·Application Delivery 열 | [국가별 이벤트](screenshots/xc-security-country.png) |

색상·글자 크기·여백·카드 크기·섹션 레일·하위 설정 연결선·고정 저장 바를 함께 조정했습니다. 이전 요청에 따라 파란 TEST 마크와 비공식 학습용 표시를 유지합니다. F5 전용 아이콘과 일부 세부 컨트롤은 자체 구현이며, 픽셀 단위의 완전한 복제나 실제 F5 서비스 제공을 의미하지 않습니다.

미구현 서비스 및 Data Guard / CSRF / GraphQL / Client-Side Defense / Common Security Controls는 설정 위치 참고용이라고 표시합니다. 해당 항목이 실제로 보호·평가된다고 표시하지 않습니다. 기존 정책 입력·모의 평가·Class 1–8 데이터는 유지합니다.

## 확인한 동작

- 홈의 12개 카드, Workspace/Namespace 선택, 플라이아웃, 목록 검색, View → Edit → 취소.
- HTTP LB 안에서 새 App Firewall 생성: Blocking → Custom → High, Medium and Low → 저장 → LB 연결 저장.
- 저장한 구성으로 정상 요청 200, SQL Injection/XSS 요청 403. 새로고침 후 Accuracy 값 보존.
- 열려 있는 WAF 드롭다운에서 Esc를 누르면 부모 설정 창을 보존합니다. 회귀 테스트를 추가했습니다.
- 1793×1100 데스크톱과 390×844 모바일 화면. 모바일 홈의 수평 넘침 없음.
- 201개 자동 테스트 통과, TypeScript·Vite build 통과. 최종 UI 시험의 새 런타임 오류 0개.
- main bundle 약 539 kB 경고는 남아 있습니다.

UI 재검증: `scripts/verification/xc-reference-ui.js`를 Playwright CLI의 `run-code --filename`으로 실행합니다. 기존 로컬 실습 자원이 있는 격리 검증 브라우저를 사용합니다. 결과는 `output/playwright/xc-reference-visual-result.txt`, 보존된 요약은 [xc-ui-reference-results.json](verification/xc-ui-reference-results.json)입니다.

## 지도 자료

지도는 로컬의 저장 이벤트로 국가를 강조합니다. 외부 위치 조회를 하지 않습니다. 정적 국가 경계 176개는 [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/)의 public-domain 자료를 사용했고, [원본 GeoJSON](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson)을 단순 좌표 경로로 변환해 `public/xc-world-map.json`에 저장했습니다.
