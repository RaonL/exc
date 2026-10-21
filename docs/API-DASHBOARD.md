# API Endpoints 대시보드

메뉴 **API Security → API Endpoints** 또는 **API Quickstarts → API Endpoints** 탭을 엽니다. Namespace와 HTTP LB를 먼저 확인하세요. 사용자 제공 XC 캡처의 차트 4개·상세 테이블 구조를 참고했습니다. 로그인한 실제 콘솔의 완전한 복제는 아닙니다.

## 직접 결과 만들기

1. API Quickstarts → Request Lab에서 **Discovery 요청 예제 → Run Sample API Request**. `API Discovery Enable` 저장 시 Traffic 엔드포인트를 학습합니다.
2. API Definition을 연결하고 API Inventory의 Request Validate/Report를 저장합니다. **스키마 위반 예제**를 실행하면 Detected가 Top Attacked APIs와 요청 로그에 반영됩니다. Block 저장 후 다시 실행하면 403 / Blocked와 4XX 수가 증가합니다.
3. **민감정보·인증 예제**는 더미 email/ssn/card_number 필드와 x-demo-key 헤더로 POST /api/profile을 실행합니다. 기존 Fall Through 규칙에서 해당 경로를 차단하지 않는 한 통과합니다. Sensitive Data와 Authentication State를 확인합니다. 필드값은 이 분류 메타데이터에 저장하지 않습니다.
4. API Testing을 실행하면 같은 경로·메서드의 Last Tested, Security Posture, 로컬 위험 점수가 갱신됩니다. 설정 변경 전 결과에는 Stale 안내가 표시됩니다.
5. Table/Graph, 검색, Method, Category, Domains, 시간 범위, Last Tested, 항목 수·페이지 이동을 사용할 수 있습니다. 차트는 LB·도메인·시간 기준이고 검색·메서드·분류는 테이블/그래프에 적용됩니다.
6. 행 Actions → Archive/Restore 또는 체크 후 일괄 보관/복원. Current/Archived 상태는 LB별 localStorage에 저장됩니다. 삭제하지 않으며 보관한 행도 이력 집계에 포함됩니다.
7. Download CSV는 필터된 테이블 전체, Download API Spec은 연결된 정의 JSON을 받습니다. Update Schema는 연결된 첫 번째 OpenAPI 파일을 편집합니다. 파일이 없다면 새 파일을 저장하고 API Definition에 연결해야 합니다.

## 집계와 한계

- Total API Calls는 보관 중인 해당 LB의 Request Lab 로그(최대 1,000개)의 응답 코드만 집계합니다. Code/Crawling fixture와 API Testing 검사 수를 HTTP 호출 수로 꾸미지 않습니다.
- 시간 범위는 모의 시각 기준입니다. 기본 All time은 기존 실습 결과를 보여 줍니다. Refresh는 화면을 갱신하며 트래픽을 생성하지 않습니다.
- Top Attacked APIs = Detected/Blocked 요청 수. 탐지 엔진이 분석한 공격 순위가 아닙니다.
- Top Sensitive Data = OpenAPI property와 모의 요청·응답의 필드명 분류가 있는 엔드포인트 수. 실제 민감정보 검출이 아닙니다.
- Authenticated = 인증 헤더 존재. 인증 성공을 증명하지 않습니다. 이전 로그에는 메타데이터가 없어 Unknown입니다.
- Group은 경로 앞 두 구간입니다. 실제 XC의 그룹 식별자를 재현하지 않습니다.
- Risk Score는 Open 모의 검사 80 / Detected 60 / Blocked 40 / 정상 또는 Mitigated 0 / 근거 없으면 N/A입니다. F5 점수와 다릅니다. 동시 모의 시각의 여러 실행은 최신 실행을 우선합니다.
- Inventory는 경로와 메서드가 OpenAPI에 일치하는 항목입니다. Discovered는 학습된 항목, Shadow는 학습됐지만 정의 밖인 항목입니다. 학습 전 요청 로그만 있는 항목은 Observed입니다.
- Graph는 LB와 엔드포인트 관계를 보여 주는 로컬 학습용 표현입니다. 원본 XC 그래프의 미확인 내부 동작을 추정해 동일하다고 표시하지 않습니다.

## 검증

- `npm test`: 330개 통과 (28 파일). 집계·LB 격리·시간 필터·parameter 경로·최신 검사 선택·민감 값 미보관 회귀 테스트 포함.
- `npm run build`: 성공. 기존 500 KB 번들 경고는 남아 있습니다.
- 브라우저: Request Lab → 민감정보·인증 요청 → 200 / Allowed → 차트·테이블 반영, Table/Graph, 보관→새로고침→복원, CSV/OpenAPI 다운로드, Update Schema 열기, Security Posture 열기, 시간 필터, 390×844에서 가로 넘침 없음.
- 로그인 주소 REA 관찰: [rea-public-console.json](verification/api-quickstart/rea-public-console.json). 콘솔 루트에서 로그인으로 리디렉션됐으며 로그인용 main.js만 관찰됐습니다. 인증 후 화면·백엔드 분석은 수행하지 못했습니다.
