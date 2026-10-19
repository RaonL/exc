# Class 1 Lab 1: 콘솔 개선 분석과 실행 계획

분석일: 2026-10-19. 이번 단계는 현황 분석, Chrome DevTools MCP 연결, 개선 전 검증이다. 애플리케이션 소스와 저장 데이터 형식은 변경하지 않았다.

후속 진행: 첫 번째 Origin Pool 화면 개선을 구현했다. 변경 내용·테스트·캡처는 [Origin Pool 개선 결과](ORIGIN-POOL-UPGRADE.md)를 참고한다. 아래는 개선 전 분석 기록이다.

두 번째 HTTP Load Balancer 화면 개선도 구현했다. [HTTP LB 개선 결과](HTTP-LB-UPGRADE.md)에 Origin 연결·shared WAF 적용·생성/수정/취소와 저장 복원 검증을 기록했다.

## 기준과 적용 스킬

- [F5 공식 Class 1 Lab 1](https://clouddocs.f5.com/training/community/f5xc/html/class1/lab1.html)의 Task 1–4와 포함된 콘솔 캡처를 기준으로 한다. 문서의 실환경 접속·공격 명령은 실행하지 않았다.
- frontend-ui-engineering: 화면별 책임 분리, 기존 디자인 정돈, 접근성·반응형 검증.
- browser-testing-with-devtools: 실제 MCP의 click/fill/snapshot/screenshot/console/network/performance 도구로 확인.
- test-driven-development: 동작 변경이나 버그 수정 전에 재현 테스트를 작성한다. 이번 분석 단계에서는 동작 변경이 없어 테스트를 새로 추가하지 않았다.
- code-review-and-quality: 정확성·가독성·구조·보안·성능을 검토하고 아래 확인된 문제와 개선 후보를 구분한다.
- performance-optimization: 기준 측정 후 병목이 확인된 부분만 수정한다. 추정만으로 memoization이나 전체 상태 구조 개편을 하지 않는다.

## Chrome DevTools MCP 연결 결과

- `chrome-devtools-mcp` 1.11.0, 연결 검증용 `@modelcontextprotocol/sdk` 1.32.1 설치.
- 사용자 도구 위치: `C:/Users/yunwo/.codex/tools/chrome-devtools`.
- 사용자 `C:/Users/yunwo/.codex/config.toml`에 `chrome-devtools` 서버 등록. `codex mcp get chrome-devtools --json`에서 enabled 확인.
- 설치된 Chrome을 `--isolated --headless`로 실행한다. 사용 통계와 CrUX 전송은 끈다. 개인 Chrome 세션에 연결하지 않는다.
- 현재 대화의 도구 목록에는 새 서버가 즉시 추가되지 않아 공식 MCP SDK 클라이언트로 같은 서버를 호출해 연결과 브라우저 동작을 검증했다. CLI 등록 확인과 실제 MCP 호출 성공은 별도로 확인했다.
- 일반 샌드박스 실행에서는 Chrome 시작이 시간 초과됐다. 승인된 권한 확장 실행에서는 정상 연결됐다. 브라우저 sandbox를 비활성화하는 옵션은 사용하지 않았다.

## 현재 구현

- React 19 / TypeScript / Vite / Zustand persist 기반. 실제 F5 API와 네트워크 보안 엔진은 사용하지 않는다.
- `App.tsx`: Workspace, Namespace, Sidebar, 라우팅 역할과 화면 조합. 529줄.
- `ConfigurationEditor.tsx`: 전체 화면 설정 편집기, 섹션 이동, Form/Documentation/JSON, 고정 저장 영역.
- `LoadBalancerEditor.tsx`: LB 설정, 검증, Origin/WAF 하위 설정. 906줄.
- `SecurityEditors.tsx`: WAF 및 Origin Pool 편집. 650줄.
- `Resources.tsx`: LB·정책·API·네트워크 목록 등 여러 화면. 831줄.
- `store.ts`, `lib/config.ts`, `lib/console-lab.ts`: 저장, 요청 평가, Namespace 격리, Lab1 판정.
- 콘솔 메뉴에서 Origin/LB 생성 → WAF 연결 → Open Application → Requests/Security Analytics 조회가 이미 구현되어 있다. Lab1은 실제 콘솔 상태를 읽어 진도를 판정한다.
- 다른 Class의 Training Center는 별도 모델을 유지하고 있어 이번 첫 수정 범위에 포함하지 않는다.

## 공식 화면과의 차이 및 코드 검토

| 우선순위 | 확인한 차이/문제                             | 근거 및 영향                                                                                                                                                                                                        | 개선 방향                                                                                                               |
| -------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| P1       | 선택 시간 구간과 요청률 집계가 일치하지 않음 | Dashboard는 구간별 이벤트를 필터링하지만 total은 LB의 누적 requests를 사용한다. 요청률은 이 누적 수를 선택 시간으로 나눈다. 현재 UI에 Lifetime이라고 표기되어 있으나 가이드의 시간 구간 분석을 학습하기에 혼동된다. | 구간 요청 합계·요청률·오류·차단을 같은 이벤트 집합에서 산출하고 누적 수는 별도 표시한다. 집계 회귀 테스트부터 추가한다. |
| P2       | 모니터링 기본 시간이 1시간                   | 공식 Task 2는 Last 5 minutes에서 Last 1 hour를 선택하고 Apply하는 순서다. Dashboard 초기 상태는 60이다.                                                                                                             | 기본 5분, 선택 초안/Apply 동작을 분리해 가이드와 맞춘다.                                                                |
| P2       | 320px에서 Origin 행 내용이 겹침              | MCP viewport 320px에서 body scrollWidth 360px. 주소·Edit·Remove가 같은 행에서 겹친다. 768/1024px의 페이지 가로 넘침은 없었다.                                                                                       | 페이지 최소 폭을 정리하고 표 자체의 스크롤 또는 작은 화면 행 구조를 적용한다.                                           |
| P2       | 입력 속성과 탭 상태 정보 부족                | Chrome에서 폼 id/name 누락 issue 10건. Form/Documentation/JSON 버튼에 role/선택 상태가 없다.                                                                                                                        | Field에 안정적인 id/name, 도움말·오류 연결을 제공한다. 탭 역할·선택 상태·키보드 이동을 적용한다.                        |
| P2       | 설정 폼의 세부 표현 차이                     | 공식 Origin/LB 캡처와 큰 골격은 유사하다. Reset All Fields, 섹션 접기, 필수 항목·도움말, 표 동작, 글자 크기와 여백은 차이가 있다.                                                                                   | Origin 화면부터 실제 조작 가능한 Reset/접기와 일관된 필드·표 표현을 적용한다.                                           |
| P2       | Requests/보안 이벤트 표와 상세 방식 차이     | 공식 Security Analytics 캡처는 시간·국가·도시·Src IP·Method·Rsp Code·Event Type·Mode 등의 열과 행 확장을 사용한다. 현재 공통 EventsTable은 다른 열 구성과 모달 상세를 사용한다.                                     | 요청/보안 표의 목적을 나누고 공유 상세 컴포넌트를 사용한다. 행 확장, 필터, 차트 숨김과 Support ID 조회를 연동한다.      |
| P3       | 큰 파일과 전체 store 구독                    | LBForm의 여러 섹션과 검증이 한 파일에 섞여 있다. App/LBForm 등이 `useConsole()` 전체를 구독한다.                                                                                                                    | 수정하는 화면의 Metadata/Domain/Origin/WAF 섹션부터 분리한다. 구독 최적화는 실제 렌더 측정 후 결정한다.                 |
| P3       | favicon 404                                  | DevTools Network에서 `/favicon.ico` 404 확인. 검사한 로컬 화면에서 다른 JS 오류는 관찰하지 않았다.                                                                                                                  | 시뮬레이터 아이콘을 명시하고 동일 흐름에서 오류가 없는지 재검증한다.                                                    |

공식 비교 캡처: [Origin Pool](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0033.png), [HTTP LB](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0093.png), [Security Analytics](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0393.png). 공식 문서 본문의 VIP Advertisement 항목 위치와 캡처의 Other Settings 배치는 버전 차이로 기록하고, 확인한 화면을 기준으로 정리한다. 캡처의 빨간 사각형은 교육용 강조 표시이므로 UI에 넣지 않는다.

## 화면 단위 수정 순서

1. **Origin Pool 생성·편집**: 공통 Field와 설정 편집기 접근성, Origin 행, Add Item 하위 폼, Apply/Back/Cancel, Reset/접기를 정리한다. 공식 Metadata/Origin Servers/Port 표현을 비교한다. 입력 취소가 저장된 pool에 반영되지 않는지 검사한다.
2. **HTTP Load Balancer 생성·편집**: 기존 LBForm에서 Metadata·Domains and LB Type·Origins·WAF 섹션을 차례로 분리한다. HTTP 선택, DNS 자동 관리, Port 80, pool Weight/Priority, VIP Internet, WAF Enable/shared/base-appfw를 직접 설정한다. 전체 편집기를 재작성하지 않는다.
3. **Performance Monitoring / Requests**: 시간 구간 집계와 기본 5분을 수정하고 1시간 Apply, 응답 코드 차트, Hide Chart, Duration 상세를 가이드와 맞춘다.
4. **Security Analytics**: 공식 표의 열·필터·행 확장을 구현한다. 정상/SQLi/XSS/Command Injection을 같은 콘솔 요청 기록으로 추적하고 Support ID와 이벤트 상세를 일치시킨다.
5. **공통 메뉴 마무리**: 위 화면에서 확인된 Sidebar, Breadcrumb, 작업 도구, 테이블 밀도·색상·폰트를 정돈한다. Simulation Mode는 계속 보인다.

각 단계는 변경한 화면과 관련 테스트만 우선 실행하고 마지막에 전체 `npm test`, `npm run build`, 코드 리뷰를 완료한다. localStorage 키·기존 데이터·Namespace 구분·과거 요청 기록을 보존한다. 타입 확장이 필요한 경우 기존 저장 자료를 읽는 기본값/마이그레이션을 함께 검증한다.

## 완료 기준과 테스트 계획

- 빈 Lab1 Namespace에서 **Manage → Load Balancers → Origin Pools**로 pool을 직접 만든다.
- **HTTP Load Balancers**에서 HTTP/80, DNS 자동 관리, pool, VIP Internet을 직접 저장한다.
- WAF 연결 전 Home/HEADER 200, 설정 수정 후 정상 200 및 SQLi/XSS/Command Injection 403을 확인한다.
- Last 1 hour → Apply → Requests → Hide Chart → 요청 행 확장 → Duration 확인.
- Actions → Manage Configuration → Edit Configuration → WAF Enable/shared/base-appfw → Save 흐름을 확인한다.
- 차단 페이지 Support ID로 Security Analytics에서 같은 이벤트를 찾고 요청·응답·signature를 확인한다.
- 새로고침 후 설정·진도가 유지되고 다른 Namespace 자원은 섞이지 않는다. Lab1 완료는 자동 판정한다.
- 동작 테스트: 시간 범위 경계, Apply 전후, 취소/뒤로가기, 중첩 Apply, 유효성 오류, 기존 localStorage 복원을 추가한다.
- 브라우저 테스트: 키보드 포커스·탭, 320/768/1024/1440px, 폼과 표, 콘솔 오류, 실제 외부 F5 요청 부재를 확인한다.
- 별도 Training Center 모델만 통과하는 것으로 콘솔 실습의 성공을 대신하지 않는다.

## 이번 단계에서 실행한 검증

- `npm test`: **6개 파일, 125개 테스트 통과**.
- `npm run build`: **TypeScript 검사 및 Vite 프로덕션 빌드 성공**.
- gzip 기준 번들: main 147.72 kB, charts 122.35 kB, TrainingCenter 10.02 kB, CSS 16.66 kB. TrainingCenter 지연 로딩 유지.
- MCP: 로컬 콘솔 접근, Sidebar의 Origin Pools → Add Origin Pool → Add Item → Public DNS 선택 확인 → DNS 입력 → Apply → 부모 행 반영 → Cancel 확인. 이번 검증에서는 실제 저장하지 않았다.
- 뷰포트: 320px 문제 재현, 768/1024px 페이지 가로 폭 확인, 1440px 화면 캡처. 작은 화면 전체 흐름과 모든 화면의 접근성 검사가 완료된 것은 아니다.
- 프로덕션 `http://127.0.0.1:4173/`에서 DevTools reload trace: **LCP 491ms, CLS 0.00**, CPU 1x, 네트워크 제한 없음, 캐시 무시. 로컬 단일 측정값이며 실제 사용자 성능이나 INP 결과가 아니다. 현재는 성능 최적화보다 정확성과 UI 차이를 우선한다.
- 전체 Lab1 콘솔 시나리오는 화면 수정 후 다시 E2E로 검증할 계획이다. 이번 단계에서 새로 전체 성공을 확인했다고 주장하지 않는다.

개선 전 화면: [Dashboard](screenshots/baseline-dashboard-2026-10-19.png), [Origin 폼](screenshots/baseline-origin-2026-10-19.png), [320px 겹침](screenshots/baseline-origin-320-2026-10-19.png).
