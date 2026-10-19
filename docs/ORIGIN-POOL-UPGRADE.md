# Origin Pool 화면 개선

검증일: 2026-10-19.

## 공식 화면 기준

[Class 1 Lab 1, Task 1](https://clouddocs.f5.com/training/community/f5xc/html/class1/lab1.html)의 [Origin Pool 캡처](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0033.png)와 [Origin Server 캡처](https://clouddocs.f5.com/training/community/f5xc/html/_images/lab1-0043.png)를 브라우저에서 직접 비교했다.

- 상단 Form/Documentation/JSON, 좌측 자원·섹션 탐색, 흰 설정 카드, 회색 배경, 고정 하단 작업 영역을 정돈했다.
- Metadata / Origin Servers / Health Checks / TLS / Other Settings 순서와 필드 너비·간격·색상·글자 크기를 맞췄다.
- Public DNS Name of Origin Server → DNS Name → Apply → 부모 Origin 서버 행 → Port 80 → Add Origin Pool 흐름을 유지했다. 새 폼의 기본 Port는 공식 캡처처럼 443이며 실습 중 80으로 바꾼다.
- 하위 폼에 Origin Pool 문맥과 Origin Servers → New Item 경로, 들여쓴 주소 입력, Back/Apply 배치를 적용했다.
- Reset All Fields, Metadata 초기화, 섹션 접기·펼치기를 구현했다. Reset은 이 시뮬레이터에서 **폼을 열었을 때의 값**을 복구한다. 새 폼은 빈 기본값, 편집 폼은 저장된 값으로 돌아가며 저장소에는 쓰지 않는다.
- Form/Documentation/JSON의 선택 상태와 방향키/Home/End 이동, 입력 id/name, 중첩 모달의 고유 설명 ID를 제공한다.
- 320px에서 페이지 가로 넘침을 없애고 Origin 서버 표만 내부 스크롤하도록 했다. Simulation Mode는 작은 화면에서도 표시한다.
- 목록의 검색·Namespace 입력 식별자와 favicon을 보완해 이번 브라우저 검증 경고/404 원인을 제거했다.

## 구조와 데이터 보존

- `src/components/OriginEditor.tsx`: 기존 SecurityEditors에서 Origin 편집 책임을 분리했다. WAF 편집은 기존 파일에 남는다.
- `src/components/OriginItems.tsx`: 하위 Origin Server 초안과 Apply/Back.
- `src/components/ConfigurationEditor.tsx`: 재사용 가능한 초기화·섹션 접기·탭·부모 자원 문맥 지원. 접기/초기화 기능은 Origin 화면에서 선택적으로 켠다.
- `src/components/form-fields.tsx`: 기존 제어 입력의 값·이벤트를 유지하며 식별자와 도움말 연결을 보강한다.
- `src/origin-editor.css`: Origin 화면 전용 스타일. LB/WAF 화면 전체 디자인은 재작성하지 않는다.
- 기존 `saveOrigin`, 저장 키·타입·Namespace 모델은 그대로 사용한다. 편집 시 Origin ID, 건강 상태, LB의 Origin 참조를 보존한다.
- 하위 Apply는 부모의 임시 값만 변경한다. 부모 Save 전에 Cancel하면 하위 Apply를 포함한 전체 초안이 폐기된다.
- 기존 데이터 포맷에 마이그레이션을 요구하지 않는다. 하나의 Pool에 endpoint 하나를 지원하는 모델도 유지한다.

## 브라우저 재현 순서

1. `npm run dev` → [로컬 콘솔](http://127.0.0.1:5173/) → WAAP → Manage → Load Balancers → Origin Pools.
2. 빈 Namespace에서 Add Origin Pool. Metadata를 접은 상태에서 빈 폼 저장을 시도하면 필수 입력 섹션이 다시 열린다.
3. Name 입력 → Add Item → DNS Name 입력 → Apply → Port 80 → Add Origin Pool. 목록과 새로고침 후 상태를 확인한다.
4. 새 폼에서 하위 Apply 후 Cancel and Exit: 목록에 추가되지 않아야 한다.
5. 생성된 Pool 이름 클릭 → Name/Port 수정 → Reset Metadata: 이름만 복구하고 Port 초안은 유지한다.
6. 서버 Edit → 주소 수정 → Back: 부모의 주소가 바뀌지 않아야 한다.
7. 서버 Edit → 주소 수정 → Apply → 부모 Cancel: 저장된 주소/Port는 유지돼야 한다.
8. Reset All Fields로 열린 시점 값 복구 → 서버·Port·Description 수정 → Save Origin Pool → 새로고침: 변경이 유지돼야 한다.
9. JSON과 Form 전환, 섹션 접기·좌측 탐색, 키보드 End/Home, 320/768/1024/1440px을 확인한다.
10. 기존 demo Pool을 Unhealthy로 바꿔 편집·저장해도 건강 상태와 LB 연결 수가 유지되는지 확인하고 Recover로 복구한다. Namespace를 바꾸면 해당 자원만 보여야 한다.

검증은 설치된 Chrome DevTools MCP를 격리된 Chrome에서 실제 click/fill/navigate/snapshot/screenshot/evaluate 도구로 수행했다. JavaScript 평가는 화면 크기·식별자 등 읽기 전용 검사에만 사용했다. 저장 데이터 주입으로 UI 조작을 대신하지 않았다.

## 자동 테스트와 품질 검토

`src/components/OriginEditor.test.ts`에 8개 회귀 테스트를 추가했다. Reset·접기·접근성 및 오래된 검증 오류의 테스트가 기존 코드에서 실패하는 것을 확인한 후 구현했다.

- 생성 전후 부모 Save 경계, 중첩 Back, 부모 Cancel.
- Reset 전체/Metadata 범위, 접기 중 초안 유지, 키보드 탭 이동.
- 기존 ID·건강 상태·LB 참조·localStorage 복원 보존.
- 잘못된 주소를 수정할 때 이전 오류 메시지 제거.
- 접기 조건을 일시적으로 뒤집으면 회귀 테스트가 실패하는 것도 확인하고 원래 소스로 복구했다.

최종 검증 결과:

- `npm test`: 7개 파일, **133개 테스트 모두 통과**.
- `npm run build`: TypeScript strict 및 Vite production build 성공. main gzip 148.82 kB, CSS gzip 17.50 kB. 500 kB 초과 chunk 경고 없음.
- 수정한 코드·스타일·HTML의 Prettier 검사 통과.
- DevTools MCP의 실제 UI 조작 및 읽기 전용 검사를 통해 **36개 확인 항목 통과**. [브라우저 검사 결과](origin-pool-browser-verification.json).
- 320/768/1024/1440px 모두 페이지 가로 넘침 없음. 320px의 표는 내부 스크롤로 작업 버튼을 표시하며 Simulation Mode를 유지한다.
- 최종 흐름에서 브라우저 console error/warn/field issue 없음. 콘솔 동작의 외부 API 요청 없음.

## 화면

- [저장 직전 Origin Pool 폼](screenshots/origin-pool-ready.png)
- [Public DNS 하위 폼](screenshots/origin-server-dns.png)
- [수정 화면](screenshots/origin-pool-edit-final.png)
- [320px 내부 스크롤 표](screenshots/origin-pool-mobile-320.png)

실제 DNS 조회, Origin 접속, Health Check/TLS 실행은 하지 않는다. 이 설정들은 기존 로컬 모델에서 저장·평가한다. 이번 범위는 Origin Pool 화면이며 Performance 집계와 다른 설정 화면의 세부 개선은 후속 단계다.
