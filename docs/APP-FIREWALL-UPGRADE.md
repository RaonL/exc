# App Firewall 생성·수정 화면 개선

검증일: 2026-10-19~20 · Windows · Chrome DevTools MCP의 격리된 Chrome.

## 공식 가이드와 비교

[Class2 Lab1](https://clouddocs.f5.com/training/community/f5xc/html/class2/lab1.html)의 Task3·Task5와 [Create Web Application Firewall](https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/how-to/app-security/application-firewall)을 확인했다. 아래 실제 가이드 캡처를 열어 섹션 순서, 필드 너비, Custom 종속 필드, 폼 탐색과 하단 저장 버튼을 비교했다.

- [Metadata·Blocking·Custom](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0174.png)
- [서명 정확도 선택](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0194.png)
- [Advanced Configuration의 차단 응답](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0541.png)

Class1 Lab1은 기존 `shared/base-appfw` 연결을 다루므로 그대로 유지했다. 새 정책 생성과 편집은 Class2 Lab1의 화면을 기준으로 삼았다.

## 변경 내용

- 네 구역: Metadata, Enforcement Mode, Security Policy Settings, Advanced Configuration.
- Metadata의 Name, Labels, Description 및 Monitoring/Blocking 선택을 공식 폼의 배치와 너비에 맞춰 정돈했다.
- Custom 아래에 Attack Signatures, Attack Types, 정확도 세 단계, 서명 동작, 튜닝, 스테이징, Threat Campaigns를 배치했다. 실습의 `High, Medium and Low`를 직접 선택할 수 있다.
- Advanced Configuration에 Blocking Response Page의 Default/Custom 선택과 응답 코드·본문 편집을 넣었다.
- 기존 사용자 응답 데이터는 Custom으로 표시한다. Default를 저장하면 기본 403·본문으로 복구한다.
- Reset All Fields 및 네 구역별 Reset은 폼을 열었을 때의 값으로 돌아간다. Cancel은 저장소·LB 연결·요청 이력을 바꾸지 않는다.
- App Firewall 목록에서 Actions → Manage Configuration → Edit Configuration으로 편집한다. 공유 정책은 계속 읽기 전용이다.
- 연결된 LB 수와 이름을 표시하며, 라우트에 연결한 정책도 포함한다.
- 차단 테스트 앱에서 저장한 사용자 응답 본문을 표시하고 `{{request_id}}`를 Support ID로 치환한다. 본문은 React 텍스트로 출력해 HTML·스크립트를 실행하지 않는다.

## 콘솔에서 재현

1. [로컬 콘솔](http://127.0.0.1:5173/) → WAAP → Namespace `social-hawk` → Manage → App Firewall → Add App Firewall.
2. Name `social-hawk-appfw`, Mode Monitoring, Policy Custom, Accuracy `High, Medium and Low` → Add App Firewall.
3. 새로고침 → Actions → Manage Configuration에서 저장한 값을 확인한다.
4. HTTP Load Balancers → `social-hawk-lb` Actions → Manage Configuration → Edit Configuration → Web Application Firewall → Enable → `social-hawk/social-hawk-appfw` → Save HTTP Load Balancer.
5. Open Application의 Home과 SQL Injection/XSS/Command Injection 실행. 정상은 Allowed/200, 공격은 Detected/200이다.
6. App Firewall → Actions → Manage Configuration → Edit Configuration → Blocking 선택 후 Cancel and Exit. SQLi가 여전히 Detected/200인지 확인한다.
7. 다시 Blocking을 선택해 Save App Firewall → 새로고침. 정상은 Allowed/200, 세 공격은 Blocked/403과 Support ID를 반환한다.
8. Security Events에서 각 Support ID를 검색하고 Information·JSON으로 정책, 요청 경로, 액션, 상태를 확인한다. Monitoring 때 생성한 기록도 여전히 Detected/200이다.
9. Advanced Configuration → Blocking Response Page Custom → Response Code 429 → 본문 `Training blocked {{request_id}}` → Save App Firewall. 새로고침 후 공격 응답에 429와 치환된 본문이 나온다.
10. Default를 저장하면 새 공격은 다시 403이다. 기존 429 이벤트는 그 결과를 보존한다.

## 구조와 호환성

- `SecurityEditors.tsx`: 정책 초안, 읽기 전용, 검증, 저장·취소·Reset.
- `WafPolicyFields.tsx`: Custom 정책과 서명·스테이징 설정.
- `WafAdvancedFields.tsx`: 차단 응답, 로그 마스킹과 연결된 LB 표시.
- `SecurityEditors.test.ts`: 실제 Zustand 저장소·요청 평가기를 사용하는 UI 회귀 테스트 10개.
- `waf-editor.css`: 종속 필드, 서명 박스와 모바일 배치. 기존 Origin/LB 폼의 공통 참조 스타일을 재사용한다.

기존 `saveWaf`, `saveLb`, `requestApplication`과 localStorage 키를 유지했다. `accuracy` 선택값을 확장하고 `attackTypes`, `responsePage`를 선택적 속성으로 추가해 이전 데이터도 읽는다. 요청 평가 엔진은 변경하지 않았다. 실제 콘솔 요청 이력은 저장 당시의 결과를 보존하고, 기존 Simulation Lab의 데모 이벤트 재평가 동작도 유지한다.

## 검증

- `npm test`: 9개 파일, **152개 테스트 통과**.
- `npm run build`: TypeScript strict 및 Vite 프로덕션 빌드 통과.
- 스테이징 검증 조건을 의도적으로 반대로 바꾼 변이 테스트가 실패하는 것을 확인하고 원복했다.
- 브라우저 검증: **40개 체크포인트 통과**. [검증 기록](waf-browser-verification.json).
- 브라우저 조작은 DevTools MCP의 click/fill/navigate/keyboard로 수행했다. JavaScript는 DOM·레이아웃 읽기에만 사용했다. 테스트 데이터는 격리된 임시 프로필에만 생성했다.

## 화면 캡처

| 화면                  | 캡처                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| 수정 전 폼            | [Before](screenshots/waf-before.png)                                                                      |
| 기본 생성 폼          | [Metadata와 네 구역](screenshots/waf-create-default.png)                                                  |
| Custom 정책           | [서명·튜닝·스테이징](screenshots/waf-custom-policy.png)                                                   |
| Monitoring 요청       | [Detected/200](screenshots/waf-monitoring-request.png)                                                    |
| Blocking 요청         | [Blocked/403](screenshots/waf-blocking-request.png)                                                       |
| 이벤트 상세           | [Detected JSON](screenshots/waf-event-detected.png), [Blocked JSON](screenshots/waf-event-blocked.png)    |
| 사용자 응답 설정·결과 | [Custom 폼](screenshots/waf-custom-response.png), [429 응답](screenshots/waf-custom-response-request.png) |
| 모바일·최종 폼        | [320px](screenshots/waf-mobile-320.png), [최종 폼](screenshots/waf-configuration-final.png)               |

## 구현 범위

이 작업은 공식 가이드의 핵심 정책 편집 흐름을 재현한 화면 단위 개선이다. 실제 SaaS의 모든 필드·버전별 화면을 완전히 복제하지는 않는다. 미구현 항목은 AI 위험 점수, 전체 Violations·Signature-Based Bot Protection 설정, 민감 정보 마스킹 엔진, 응답 본문 Base64·HTML 렌더링 등이다.

세 공격 샘플은 모두 high-accuracy mock 서명이다. 정확도 세 선택값이 모두 이 샘플을 포함하며, 실제 서명 DB나 자동 오탐 학습을 실행하지 않는다. 튜닝·Threat Campaigns·로그 마스킹은 저장 가능한 설정 예제다. 실습 앱에서는 기존 서명을 사용하며 신규·갱신 서명 스테이징은 기존 Simulation Lab에서 시험할 수 있다.
