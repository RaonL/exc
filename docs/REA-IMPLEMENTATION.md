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
