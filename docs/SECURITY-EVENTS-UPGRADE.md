# Security Events / WAF Exclusion 개선

검증일: 2026-10-20 · Windows · 격리된 Chrome · Chrome DevTools MCP 1.11.0.

## 공식 가이드와 비교

[공식 Class2 Lab1](https://clouddocs.f5.com/training/community/f5xc/html/class2/lab1.html)의 Task4~5와 실제 캡처를 열어 비교했다. Class1 Lab1의 요청·보안 이벤트 관찰 흐름도 유지했다.

- [req_id 필터](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-039b1.png), [In 연산자](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0404.png), [값 선택·Apply](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0414.png)
- [이벤트 Actions](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0424.png)
- [Simple WAF Exclusion Rule](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0434.png), [만료 시각](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0452.png), [규칙 목록 Apply](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0462.png)

표의 시간·국가/소스·메서드·응답 코드·이벤트·도메인·경로와 Actions 배치를 정돈했다. Security Events와 Security Analytics에서 행을 펼쳐 Information/Request/JSON을 확인한다. 기존 Dashboard의 간단한 이벤트 표는 모달 상세를 유지한다.

## 직접 설정하는 흐름

1. [로컬 콘솔](http://127.0.0.1:5173/) → HTTP Load Balancers → `social-hawk-lb` → Open Application → SQL Injection. 기본 Blocking 정책에서 403과 Support ID가 나온다.
2. Security Events → Add Filter → Select Key `req_id` → Select Operator `In` → Support ID 입력 → Apply.
3. 행 왼쪽 화살표로 펼쳐 Information의 ID·공격 유형·정책·응답을 확인한다. Request와 JSON으로 원본 요청 기록을 확인한다.
4. Actions → Create WAF Exclusion rule. 도메인, `^/product$`, GET, SQL Injection이 자동 채워진다.
5. Name·Description·Domain·Path·Methods·Action·Expiration Timestamp를 검토한다. 필요하면 만료를 `2099-01-01T00:00:00Z`처럼 입력한다.
6. 규칙 Apply → 규칙 목록 Apply → 부모의 Web Application Firewall에서 초안 확인 → Save HTTP Load Balancer.
7. 새로고침 후 같은 SQLi 요청은 Allowed/200 및 `Matched WAF exclusion`이다. XSS와 Command Injection은 여전히 403이다.
8. 같은 `/product`의 XSS, `/product/other`의 SQLi, POST SQLi도 403이다. 예외는 해당 LB의 도메인·정확한 경로·메서드·공격 유형에만 적용된다.
9. 원래 Support ID는 여전히 Blocked/403이다. 새 Allowed 이벤트의 Support ID로 검색하면 예외 적용 이유가 나온다.
10. HTTP LB 편집 → Web Application Firewall → Configure WAF Exclusion Rules → Edit에서 만료를 과거로 저장하면 SQLi가 다시 403이 된다. 미래 시각으로 저장하면 다시 200이다.

규칙 Back은 해당 규칙 초안을 버린다. 두 번 Apply해도 부모 LB에서 Cancel and Exit를 누르면 저장하지 않는다. 공유 WAF 정책은 변경하지 않으며 같은 정책을 쓰는 다른 LB에는 예외가 전파되지 않는다.

## 필터·상세·데이터

- Add Filter는 `req_id`, `req_path`, `src_ip`에 대해 `In`/`Not in` 정확한 값 비교를 지원한다. 쉼표·줄바꿈으로 여러 값을 입력할 수 있다. 한 번에 한 조건을 적용하며 새 조건은 이전 조건을 교체한다.
- 기존 Support ID·IP·경로 검색, 액션·시간 범위·LB 범위, 차트 표시/숨기기 및 JSON 내보내기를 유지했다. Clear All은 구조화 필터를 지운다.
- Information/Request/JSON 탭은 방향키·Home·End로 이동한다. 지원 ID, 요청 당시 상태·사유, 실제 요청 도메인을 기록한다.
- 예외 저장 위치는 LB의 `config.exclusions`이다. WAF 정책을 복제하거나 Monitoring으로 바꾸지 않는다.
- `pathMatch`, `domain`, `description`, `expiresAt`, 이벤트의 `authority`를 선택적 속성으로 추가했다. 과거 Prefix/ANY/All 예외는 이전 의미를 유지한다.
- 실제 콘솔에서 생성한 요청 이력은 이후 정책 변경에도 원래 결과를 보존한다. 기존 Simulation Lab의 예시 이벤트 재평가는 유지한다.

## 구현 구조

- `Events.tsx`: 이벤트 범위·필터·차트·집계.
- `EventsTable.tsx`: 표·행 펼치기·Actions·LB 편집 진입.
- `EventDetails.tsx`: Information/Request/JSON 및 기존 로컬 설명.
- `EventFilters.tsx`: 구조화 필터의 초안·Apply·Cancel.
- `WafExclusionRules.tsx`: 목록 초안·추가·수정·삭제·Apply.
- `WafExclusionEditor.tsx`: 이벤트 자동 채움·검증·Back·Reset·Apply.
- `lib/waf-exclusions.ts`: 안전한 경로 변환, 유효성 검사, 만료·도메인·경로·메서드·공격 유형 매칭.
- `LoadBalancerEditor.tsx`: 예외 목록을 LB 초안에 병합하고 최종 Save로 저장.

다중 모달의 포커스/접근성 충돌을 피하려고 예외 생성 중에는 각 단계를 하나씩 표시한다. 부모 React 상태는 유지하므로 규칙/목록/부모의 저장·취소 경계가 분리된다.

## 검증 결과

- `npm test`: **11개 파일, 166개 테스트 통과**. 신규 UI 회귀 6개, 예외·요청·저장 로직 8개.
- `npm run build`: TypeScript strict와 Vite 프로덕션 빌드 통과.
- Chrome DevTools MCP: **41개 체크포인트 통과**. [검증 기록](security-events-browser-verification.json).
- 새로고침 후 예외와 이벤트 유지, 예외 전후 403/200, 다른 공격·경로·메서드·LB 차단 유지, 만료·복원 확인.
- 320/768/1024/1440px에서 페이지 넘침 없이 표 내부 스크롤. 320px 필터·예외 편집기와 Simulation Mode 확인.
- 최종 브라우저 오류·경고·issue 없음. 클라우드 API·실제 공격 HTTP 요청 없음.
- 정확한 경로 비교를 반대로 바꾼 변이 테스트가 실패하는 것을 확인한 뒤 원복했다.
- 코드 리뷰에서 초안의 불변성, 기존 저장 데이터 호환, 공유 정책 분리, HTML/정규식 실행 방지와 요청 이력 보존을 확인했다.

빌드 중 초기 JS 500KB 경고가 발생해 예외 편집기를 필요한 시점에 불러오도록 분리했다. 최종 빌드 기준 초기 JS가 502.36KB → 496.62KB, 별도 예외 청크 6.42KB가 됐으며 경고가 없어졌다. 이는 번들 크기 측정이며 실제 사용자 Web Vitals 개선을 주장하지 않는다.

## 캡처

| 화면             | 캡처                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 수정 전          | [기존 화면](screenshots/events-before.png)                                                                               |
| Support ID 상세  | [Information](screenshots/events-support-id-information.png), [JSON](screenshots/events-support-id-json.png)             |
| 이벤트 기반 예외 | [자동 채움](screenshots/events-exclusion-autofill.png), [목록 Apply](screenshots/events-exclusion-summary.png)           |
| LB 적용          | [저장 전 초안](screenshots/events-lb-exclusion-draft.png), [저장 복원](screenshots/events-lb-exclusion-saved.png)        |
| 예외 적용 요청   | [Allowed/200](screenshots/events-excluded-request.png), [새 이벤트 상세](screenshots/events-allowed-event.png)           |
| 모바일           | [Security Events 320px](screenshots/events-mobile-320.png), [예외 폼 320px](screenshots/events-exclusion-mobile-320.png) |
| 최종 화면        | [필터와 행 상세](screenshots/events-configuration-final.png)                                                             |

## 구현 범위

공식 가이드의 핵심 콘솔 흐름을 재현한 화면 단위 개선이다. 모든 SaaS 메뉴·필드·버전별 화면을 완전히 복제하지 않는다. Signature ID/Parameter context 단위 예외, 전체 Forensics·Incidents, 일반 정규식·도메인 suffix 매칭은 구현하지 않았다.

`Path Regex`는 `^/product$` 같은 **앵커로 둘러싼 리터럴 경로만** 지원하고 사용자 정규식을 실행하지 않는다. 새 이벤트 예외는 공격 유형 단위이며 동일 도메인·메서드·경로의 해당 공격 유형 전체에 적용된다. Query 값 하나나 특정 Support ID 한 건에만 적용되는 예외가 아니다. Prefix와 All은 사용자가 명시적으로 선택할 수 있다.

모든 테스트는 임시 Chrome 프로필에서 수행했다. 브라우저 조작은 MCP click/fill/navigation/keyboard를 사용했으며 JavaScript는 DOM·레이아웃 읽기에만 사용했다. 실제 F5·보안 엔진·클라우드 API는 사용하지 않는다.
