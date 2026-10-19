# HTTP Load Balancer 생성·수정 화면 개선

검증일: 2026-10-19.

## 공식 가이드와 화면

[F5 Class 1 Lab 1](https://clouddocs.f5.com/training/community/f5xc/html/class1/lab1.html)의 Task 1과 Task 3을 기준으로 [LB 생성](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0093.png), [Origin Pool 연결](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0113.png), [WAF 설정](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0323.png) 캡처를 실제 브라우저로 비교했다. 실환경 테넌트에 접속하거나 외부 공격 요청을 실행하지 않았다.

- Form/Documentation/JSON, 좌측 섹션 탐색, Metadata, Domains and LB Type, Origins, Web Application Firewall, Other Settings의 폼 간격·너비·색상·글자 크기를 정돈했다.
- HTTP, Automatically Manage DNS Records, HTTP Listen Port Choice, Port 80을 콘솔에서 설정한다. 새 폼의 기존 HTTPS Automatic 기본 선택은 유지하며 실습에서 HTTP로 바꾼다.
- Origins → Add Item → Origin Pool Method → Namespace/Pool → Weight/Priority → Apply를 구현했다. 하위 폼에 HTTP Load Balancer / Origins / New Item 문맥과 Back/Apply 배치를 적용했다.
- VIP Advertisement는 확인한 최신 Lab1 본문·캡처처럼 Other Settings 아래에 있고 Internet을 기본으로 사용한다.
- WAF Enable과 정책 선택을 분리했다. Enable만으로 임의의 첫 정책을 연결하지 않고 `shared/base-appfw`를 직접 선택한다. 현재 Namespace와 shared의 정책만 허용하며 빈 정책·다른 Namespace의 참조는 Form과 JSON 보기 모두에서 저장을 막는다.
- 공유 정책의 View Configuration은 읽기 전용이다.
- Reset All Fields, Metadata Reset, 섹션 접기·탐색, 키보드 탭 이동을 적용했다. Reset은 폼을 열었을 때의 값을 복구하고 저장소에는 쓰지 않는다.
- 도메인 행은 독립된 배열 초안으로 관리한다. 추가·수정·삭제·취소가 저장된 배열을 직접 변경하지 않는다.
- 작은 화면에서 도메인·Origin 표는 내부 스크롤을 사용하고 Simulation Mode를 유지한다.

## 콘솔에서 직접 진행

1. `npm run dev` → [로컬 콘솔](http://127.0.0.1:5173/) → WAAP → Manage → Load Balancers → Origin Pools에서 Pool을 만든다.
2. HTTP Load Balancers → Add HTTP Load Balancer → Name·Domain 입력 → HTTP 선택 → DNS 자동 관리 → HTTP Listen Port / 80.
3. Origins → Add Item → 해당 Namespace의 Pool 선택 → Weight/Priority 확인 → Apply.
4. Other Settings → VIP Advertisement Internet → Add HTTP Load Balancer. 새로고침 후 목록과 도메인을 확인한다.
5. 도메인 또는 Open Application → Home/SQL Injection을 실행한다. WAF 연결 전에는 이 로컬 샘플이 200으로 통과한다.
6. LB Actions → Manage Configuration → Edit Configuration → Web Application Firewall → Enable → `shared/base-appfw` → View Configuration으로 공통 정책을 확인한다.
7. Save HTTP Load Balancer → 새로고침 후 base-appfw / Blocking 적용 표시 확인.
8. Open Application → Home은 200, SQLi/XSS/Command Injection은 403 및 Support ID인지 확인한다.
9. 수정 후 Cancel and Exit를 누르면 기존 도메인·WAF·Origin 연결을 보존한다. 하위 Origin의 Apply도 부모 Save 전까지는 초안이다.

별도 실습 화면의 설정 모델을 대신 사용하지 않는다. 위 모든 작업은 기본 콘솔의 `saveLb`와 요청 평가 모델을 사용한다.

## 구조와 데이터 호환성

- `LoadBalancerEditor.tsx`: 폼 초안, 검증, Save/Cancel/Reset, 하위 편집기 조합.
- `LoadBalancerBasics.tsx`: Metadata, 도메인/LB 타입, Origin 연결의 독립된 React 컴포넌트.
- `LoadBalancerFirewall.tsx`: 명시적인 WAF 정책 선택과 기존 WAF exclusion 설정.
- `OriginItems.tsx`: 같은 Namespace의 Pool 선택, Weight/Priority, Apply/Back.
- `load-balancer-editor.css`: LB 전용 표·연결 필드·하위 폼 스타일. 이미 검증한 reference 폼 스타일은 Origin과 공유한다.
- localStorage 키·저장 타입·Origin/WAF ID 참조는 그대로 유지한다. 기존 LB의 ID·생성 시각·요청 누적 수와 고급 설정도 보존한다.
- Routes, API/Bot/DoS 및 기존 사용자 정의 WAF/Origin 생성 기능은 유지한다. WAF Enable 여부의 임시 UI 상태는 저장된 wafId에서 복원하므로 저장 스키마 변경이 필요 없다.

## 검증

- 신규 UI 회귀 테스트 9개를 추가했다. 기존의 첫 정책 자동 선택, Reset 부재, 다른 Namespace 정책 참조, 오류 메시지 제거 등을 실패 테스트로 확인한 뒤 수정했다.
- 생성·저장 복원, 하위 Origin Back, 부모 Cancel, 도메인 배열 불변성·행 삭제, 기존 ID·요청 수·고급 설정 보존, 읽기 전용 → Edit 전환을 검사한다.
- WAF 검증 조건을 일시적으로 뒤집으면 JSON 보기의 빈 정책 저장 테스트가 실패하는 것을 확인한 뒤 원래 소스로 복구했다.
- 최종 `npm test`: **8개 파일, 142개 테스트 모두 통과**.
- 최종 `npm run build`: **TypeScript strict 검사와 production build 성공**. main gzip 149.39 kB, CSS gzip 17.78 kB. 500 kB 초과 chunk 경고 없음.
- Chrome DevTools MCP로 실제 click/fill/navigate/snapshot/screenshot을 사용했다. JavaScript 평가는 화면·표시 값·식별자를 읽는 검사에만 사용했고 저장 상태를 주입하지 않았다.
- 브라우저 확인 항목 **46개 통과**.
- 브라우저 검증: Pool 선행 생성, LB 생성 취소, Origin 연결, 생성·수정 저장 복원, WAF 연결 취소/저장, 읽기 전용 shared 정책 조회, 정상 200 / 세 공격 403, 도메인 추가·삭제·취소, Reset, 하위 Apply/Back/부모 Cancel, 320/768/1024/1440px, 키보드, Namespace 격리.
- 최종 흐름에서 browser error/warn/field issue 없음. 콘솔 설정과 로컬 요청 테스트에서 외부 API 호출 없음.
- 세부 통과 항목: [브라우저 검증 결과](lb-browser-verification.json).

## 최종 캡처

- [LB 설정](screenshots/lb-configuration-final.png)
- [HTTP·DNS·포트 설정](screenshots/lb-create-http-dns.png)
- [Origin Pool 연결](screenshots/lb-origin-pool-connection.png)
- [WAF Enable / shared/base-appfw](screenshots/lb-waf-shared-base-appfw.png)
- [차단 응답과 Support ID](screenshots/lb-protected-request.png)
- [320px 화면](screenshots/lb-mobile-320.png)

실제 DNS/VIP/TLS 발급과 네트워크 전달은 실행하지 않는다. 기본 Pool 하나와 endpoint 하나의 기존 모델을 유지하며 Weight/Priority는 저장·조회용이다. 공식 캡처의 모든 고급 보안 설정과 메뉴까지 구현한 것은 아니며 이번 범위는 Lab1의 LB 생성·Origin 연결·WAF 설정과 기존 기능 보존이다.
