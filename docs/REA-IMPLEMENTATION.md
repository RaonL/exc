# REA 화면 반영 계약

근거: 2026-10-22 실제 XC 조회 캡처와 REA-LIVE-XC-ANALYSIS-2026-10-22.md.

- 기존 Class 1~9, 저장 키, 필드 식별자, 학습 체크리스트를 유지한다.
- API Endpoints는 개별 LB Security Monitoring에서 열고, 기존 API Quickstarts/직접 메뉴도 유지한다. 4개 요약 차트, 실제 관찰 열, Current/Archived, Segment 경로 탐색을 제공한다. 시간창은 호출 집계만 제한하며 학습 목록과 분류는 보존한다.
- LB의 Metadata, Domains, VIP Advertisement, SSL/TLS Type, Origins/Routes, CDN, Common Delivery Controls, WAF, Common Security Controls, L7 DoS, API, Bot, Malware, Client-Side 순서를 따른다. 기존 실습이 쓰는 section ID와 필드명을 호환한다.
- WAF View → Edit → Save와 정확도별 동작을 보존한다. 새로운 Custom 정확도 설정은 이전 정확도 범위와 호환한다. AI 필드는 실제 엔진이 확인되지 않았으므로 저장용 설정임을 명시한다.
- 화면 크기가 줄어들면 차트는 2열/1열로 전환하고 넓은 표와 그래프는 내부에서 스크롤한다. 검색·탭·설정·행 작업은 키보드로 조작할 수 있어야 한다.
- 실제 tenant의 Locked 권한을 로컬 앱 전체에 강제하지 않는다. 로컬 리소스는 편집하고 shared 정책은 조회만 한다.
- 실제 서비스 호출·F5 위험도 계산·AI 판정 엔진을 재현했다고 표현하지 않는다. 모의 테스트는 저장된 정책과 연결하고 로그를 보존한다.

검증: 대시보드 시간창/경로 탐색, LB 순서/중첩 조회/저장·재수화, WAF Custom 동작/저장·재수화/공격 전후, 전체 Class 회귀 테스트, 빌드, 로컬 브라우저 화면 확인.

## 반영 결과

- API Endpoints: LB Security Monitoring 탭, Threat Level / Schema Status / Last Updated 열, 실제 경로 문맥을 유지하는 Segment 탐색, 최근 5분 기본 집계. Definition이 없으면 Shadow로 단정하지 않는다. 기존 직접 메뉴와 Request Lab/Logs는 유지한다.
- API Request Lab을 UI에서 2회 실행해 호출 차트·민감 필드 차트·목록·그래프 반영을 확인했다. 실제 F5 트래픽이나 탐지 엔진을 호출하지 않는다.
- HTTP LB: Domains와 SSL/TLS Type을 분리하고 VIP/CDN/Delivery/DoS 섹션 순서를 반영했다. 조회는 설정에 따라 Origins 또는 Routes를 표시한다. Routes는 중첩 Apply 후 부모 LB 저장이 필요하며 새로고침 후 요청 분기에도 적용된다.
- API Protection: Redirect Response 명칭, 기간 단위, Built-in Discovery Policy와 Sensitive Data Discovery 설정을 반영했다. 관찰값 2일을 전체 제품 기본값으로 강제하지 않는다.
- WAF: Name / Namespace / Actions 목록, shared 정책 조회, View/Edit 분리, Custom 정확도별 동작, AI 참조용 저장 필드를 반영했다. 기존 Class의 정확도 범위 방식은 그대로 읽는다. AI 옵션은 저장·조회만 하며 실제 판정에 적용하지 않는다는 안내와 로그를 표시한다.
- 브라우저에서 WAF Monitoring + Custom 저장·새로고침·재조회, LB 설정 조회, API 요청·대시보드 연동을 확인했다. 1920 / 1024 / 768 / 320px에서 그래프 페이지 전체 가로 넘침을 확인했다.
- 로컬 캡처는 Git 무시 경로 output/playwright/xc-*.png에 보관한다. 실제 tenant 캡처·로그인 세션 자료는 포함하지 않는다.

회귀 범위: 기존 Class 1~9의 자동 검사와 추가 UI/정책 테스트. 모든 Class를 실제 XC에서 수동 실행했다는 뜻은 아니다. 현재 실제 tenant의 Locked 편집 권한으로 확인하지 못했던 생성/저장 절차는 기존 공식 실습 동작과 로컬 저장 테스트로 보완한다.

최종 검사: npm test 29개 파일·338개 테스트 통과, npm run build 성공. 기존 500KB 초과 번들 경고는 남아 있다. 브라우저 console에는 React 개발 도구 안내만 있었고 실행 오류는 관찰되지 않았다.
