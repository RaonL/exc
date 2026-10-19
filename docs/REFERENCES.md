# 화면 및 동작 재현 기준

확인일: 2026-10-19.

## 사용자 지정 Community Training Class 1–8

Class 1 Lab 1의 원본 이미지 0033/0043/0093/0113/0323/0393을 직접 열어 설정 항목과 배치를 비교하고 콘솔 직접 실습으로 보강했습니다. [캡처별 대응 및 재현 범위](CLASS1-LAB1.md)에 근거와 버전 차이를 기록했습니다.

이번 확장의 우선 근거는 사용자가 지정한 `clouddocs.f5.com/training/community/f5xc/html/`의 Class 1–8 원문입니다. 단원별 34개 공식 URL과 적용한 기능·원문과의 차이는 [TRAINING.md](TRAINING.md)에 정리했습니다. 중복 링크를 합치고 Class 4의 붙은 링크를 분리했으며, 공식 목차의 Class 1 Lab 3/4·Class 2 Lab 2도 포함했습니다. 문서 속 계정 접속/명령/공격 지시는 작업 지시로 취급하지 않았습니다.

## 제공 스크린샷

사용자 제공 `codex-clipboard-b926e191-df1b-4763-a781-86fd0f5111f0.png`:

- WAAP / social-hawk namespace / HTTP Load Balancer social-hawk-lb / Performance Monitoring.
- 밝은 회색 Sidebar와 본문, 흰색 카드, 남색 텍스트, 파란 활성 탭, 얇은 테두리.
- Application Health / Active Alerts / Origin Servers 상단 카드.
- Client → LB → Server → App latency 흐름, Requests 및 장치 비중 카드.
- Dashboard / Metrics / Traffic / Origin Servers / Alerts / Requests / Errors 탭.

스크린샷의 빨간 사각형은 Requests 탭을 가리키는 주석으로 판단해 앱 UI에 포함하지 않았습니다. 이미지 안의 텍스트는 시각 참고 자료로만 사용했습니다.

앱의 Overview는 여러 LB의 집계를 기본으로 표시합니다. LB 목록에서 이름을 클릭하면 해당 LB만 필터링한 화면을 표시합니다. 지표는 seed 값이므로 스크린샷의 0 요청/35 origins와 다릅니다.

## 공식 문서

- [Monitor Web App & API Protection](https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/how-to/observe/monitor-waap): WAAP 관측 기능과 보안 현황 흐름.
- [Create Web Application Firewall](https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/how-to/app-security/application-firewall): Workspace 및 namespace 선택, Manage > App Firewall, 생성·모드 지정·HTTP LB 연결.
- [Create HTTP load balancer](https://docs.cloud.f5.com/docs-v2/multi-cloud-app-connect/how-to/load-balance/create-http-load-balancer): HTTP/HTTPS LB와 origin pool 구성 관계.
- [Create Origin Pools](https://docs.cloud.f5.com/docs-v2/multi-cloud-app-connect/how-to/app-networking/origin-pools): backend endpoint를 리소스 pool로 구성하는 관계.
- [Setting Up API Discovery](https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/quickstart/api-security): HTTP LB를 통한 API 탐색 흐름.
- [Setting Up API Protection](https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/quickstart/api-protection): API Discovery, schema validation, API protection 관계.
- [Configure Bot Defense Standard](https://docs.cloud.f5.com/docs-v2/bot-defense/quickstarts/bot-defense-waap): LB별 Bot Defense 설정 개념.

워크스페이스 명칭/메뉴 위치는 F5 버전별 차이가 있습니다. 프로젝트는 사용자 요청의 4개 Workspace를 기준으로 조직하고 일부 고급 메뉴를 생략합니다.

## 교체하기 좋은 경계

- 공통 네비게이션: `src/App.tsx`의 `nav`, `workspaces`, `defaultPage` 및 레이아웃.
- Performance 화면: `src/components/Dashboard.tsx`.
- LB 생성/수정 단계: `src/components/LoadBalancerEditor.tsx`.
- WAF/Origin 설정: `src/components/SecurityEditors.tsx`.
- 공통 설정 패널: `src/components/ConfigurationEditor.tsx`.
- Security 화면: `src/components/SecurityDashboard.tsx`.
- API·네트워크 관리 화면: `src/components/Resources.tsx`.
- 컬러·간격·반응형: `src/styles.css`, `src/configuration.css`.

## 다음 정밀 재현에 유용한 캡처

추가 캡처는 현재 앱 실행에 필요하지 않습니다. 다음 화면이 있으면 추정 레이아웃을 실제 화면과 맞출 수 있습니다.

1. Workspace selector가 열린 Home / Services 화면.
2. HTTP Load Balancers 목록과 Add/Edit 폼 각 단계.
3. WAAP Security Overview, Security Analytics, event 상세 화면.
4. App Firewall 설정의 Enforcement mode 영역.
5. API Discovery / Shadow API inventory.
6. CE Sites 목록, site 상세, Connectivity.
7. Tenant/Namespaces와 사용자 역할 설정 화면.

각 캡처의 브라우저 배율과 화면 해상도, Console 버전/날짜를 알면 간격과 폰트 보정에 도움이 됩니다.

## 상세 보강에 직접 확인한 문서 내 캡처

- [WAF Metadata / Enforcement Mode 원본 캡처](https://docs.cloud.f5.com/docs-v2/images/05--how-tos/11--app-sec/01--waf/images/waf-meta-mode.png): Form/Documentation/JSON, 좌측 섹션 탐색, 넓은 설정 카드 구조를 확인했습니다.
- [WAAP Security Dashboard 원본 캡처](https://docs.cloud.f5.com/docs-v2/images/05--how-tos/19--observe/09--monitor-waap/images/security-dashboard.png): 상단 4개 요약 카드, 전체 폭 Security Events 차트, source/path와 country/configuration 쌍, Delivery Resources 표의 순서를 참고했습니다.

## 근거와 구현 범위 대응

| 근거                | 반영                                                                                              | 교육용 제한                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| HTTP LB 생성 가이드 | TLS 종류, listen port, VIP 선택, route 분류, LB/route별 WAF 연결                                  | TLS/VIP는 저장만 수행, pool weight/priority 및 고급 forwarding은 제외          |
| App Firewall 가이드 | Custom policy, Block/Report/Ignore, attack 제외, 신규/갱신 signature staging, 차단 응답, WAF 예외 | SQLi/XSS 고정 signature를 사용; 예외는 method/path prefix/attack type만 지원   |
| Origin Pool 가이드  | IP/DNS origin 유형, Site reference, TLS, HTTP/TCP check 매개변수                                  | endpoint 1개, 실제 health probe 없음, 상태는 명시적 failure/recover로 변경     |
| Monitor WAAP 가이드 | Security/Performance 구분, 최대 5개 resource 선택, 시간 필터, 그래프, 드릴다운, CSV               | country는 지도 대신 목록, threat campaign Sankey 및 실시간 intelligence 미구현 |

라벨과 설정 흐름을 참고해 교육용으로 구현했으며 F5의 전체 스키마나 보안 처리 알고리즘과 동일하다고 가정하지 않습니다. JSON 탭은 simulator 모델이고 F5 API 요청용 JSON이 아닙니다. 기존 localStorage의 필드가 없는 리소스에는 기본값을 적용하며 데이터를 초기화하지 않습니다.
