# WAAP 메뉴 반영 범위

2026-10-22 사용자 캡처 및 로컬 REA 접근성 트리(endpoints.ax.txt)의 Manage 17개 이름·순서를 전사했다. Overview, Notifications, References, Workspace Info도 REA 트리의 구성을 따른다. 실제 테넌트 메뉴를 다시 조작하거나 설정을 변경하지 않았다.

기존 Class 1–9, API Quickstarts, Simulation Lab 및 학습용 보안 도구는 Learning Lab에 모았다. 기존 page 식별자와 저장 키는 유지한다. API Definition과 Code Base Integration도 원래 화면으로 연결되며, 캡처에 없는 API Management 최상위 항목을 중복 표시하지 않는다.

## 하위 메뉴의 증거 한계

Load Balancers의 HTTP Load Balancers / Origin Pools / Health Checks는 이전 사용자 제공 실제 캡처에서 확인했다. 나머지 상위 메뉴가 펼쳐진 캡처는 제공되지 않았다. 따라서 그 하위 목록은 아래 공식 문서와 기존 실습에서 확인한 항목으로 구성하고, 펼침 패널에 문서 기반 항목이 포함됐음을 표시한다. 전체 하위 항목·순서가 특정 테넌트와 완전히 같다고 주장하지 않는다. 역할·릴리스별 메뉴 차이를 임의로 사실로 단정하지 않는다.

- [API Definition의 공식 설정 경로](https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/quickstart/api-protection): 문서는 이전 API Management 명칭을 사용한다. 현재 캡처의 API Security 아래에 기존 화면 접근을 유지했다.
- [Alerts Management](https://docs.cloud.f5.com/docs-v2/shared-configuration/how-tos/alerting/alerts-email-sms): Active Alert Policies, Alert Policies, Alert Receivers.
- [Bot Defense Management](https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/how-to/adv-security/configure-bot-defense): Bot Infrastructure, Bot Policies.
- [Mobile Base Configurations](https://docs.cloud.f5.com/docs-v2/bot-defense/how-tos/plan-bot-defense).
- [TLS Certificates](https://docs.cloud.f5.com/docs-v2/multi-cloud-app-connect/how-to/manage-multiple-custom-certificates).
- [CDN Distributions](https://docs.cloud.f5.com/docs-v2/content-delivery-network/how-to/configure-cdn-distribution).
- [IP Prefix Sets](https://docs.cloud.f5.com/docs-v2/shared-configuration/how-to/adv-security/configure-ip-prefix).
- [App Settings](https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/how-to/app-security/user-behavior-analysis).
- [Report Configuration API](https://docs.cloud.f5.com/docs-v2/api/report-config).

## 추가 화면

빠진 리소스는 목록·검색·추가·View/Edit·저장·재조회·삭제 확인 화면을 제공한다. 값은 f5-xc-navigation-resources-v1에 Namespace 및 리소스 종류별로 저장한다. 기존 LB/WAF/Origin이나 Class 검증 엔진에 자동 연결하지 않는다. TLS 키·실제 인증값을 요구하지 않으며, Alert Receiver도 외부 알림을 전송하지 않는다.

Health Checks의 새 독립 목록은 로컬 참조 구성이다. Class 1~9의 기존 Origin Pool 내 Health Check 입력과 검증 흐름은 유지한다. Notifications의 Alerts는 저장된 모의 이벤트를, Audit Logs는 기존 변경 이력을 표시한다.

검증: 상위 17개 이름·순서, 하위 항목 이동, 학습 영역 분리, 신규 페이지 연결, 로컬 저장·재수화, Namespace 분리, 기존 Class 데이터 무변경, 전체 회귀 검사와 브라우저 이동 확인.

2026-10-22 결과: `npm test` 31개 파일·343개 테스트 통과, `npm run build` 통과(기존 번들 크기 경고). 브라우저에서 Health Checks 이동, API Security 펼침/Escape, Learning Lab 및 Class 1–9 진입, Third-Party Application 생성·저장·새로고침·View 재조회를 확인했다. 캡처는 `output/playwright/xc-navigation-*.png`에 보관했다.
