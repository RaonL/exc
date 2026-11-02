# 서버 로그인 및 계정별 저장

이 앱의 로그인은 F5 계정과 별개인 시뮬레이터 계정이다. 계정 이름에 root가 있어도 서버 관리자 권한은 없다. 사용자명·비밀번호 회원가입이며 이메일 인증/메일 발송이나 비밀번호 재설정은 이번 범위에 포함하지 않는다.

## 로컬 실행

Node.js 24 이상이 필요하다. Node 24.14.1 내장 SQLite로 검증했으며 이 버전에서 experimental 경고가 출력된다. 새 npm 런타임 의존성을 추가하지 않았다.

1. `npm ci`로 기존 의존성을 설치한다.
2. 새 설치라면 `.env.example`을 `.env.server.local`로 복사한다. 이미 있는 파일을 덮어쓰지 않는다.
3. 첫 실행 전에 `DEMO_ACCOUNT_PASSWORD`를 정한다. `ete_root1`, `ete_root2`, `ete_root3`를 같은 비밀번호로 최초 생성한다. 이미 있는 사용자의 비밀번호나 데이터는 재시작 시 덮어쓰지 않는다. 이 작업 PC에는 사용자가 지정한 값으로 생성했다.
4. `npm run dev`는 인증 API(127.0.0.1:3001)와 Vite(127.0.0.1:5173)를 함께 실행한다. 브라우저는 http://127.0.0.1:5173 을 사용한다.
5. 로그인 후 상단의 **서버 저장됨**을 확인한다. 프로필 메뉴에서 로그아웃한다. 새 계정은 로그인 화면의 **새 계정 만들기**를 사용한다.

`.env.server.local`, `server-data/xc.sqlite` 및 WAL/SHM 파일은 Git에 포함하지 않는다. 비밀번호 원문은 환경 파일에만 있고 DB에는 사용자별 salt를 사용한 scrypt hash만 저장한다. 세션은 무작위 토큰의 SHA-256을 DB에 저장하고 브라우저에는 HttpOnly/SameSite=Strict 쿠키만 발급한다. 로그인 시 기존 세션 토큰을 교체하고 로그아웃 시 삭제한다. 세션 유효 기간은 7일이다. 공유 예시 계정은 같은 이름으로 로그인한 사람끼리 데이터가 공유되므로 실습 데이터만 사용한다.

## 저장 범위

서버가 세션으로 확인한 user ID를 DB 조회·저장 조건에 사용한다. API가 클라이언트 지정 user ID를 받지 않는다. 다른 탭의 계정으로 쿠키가 바뀌는 경우도 X-XC-Account 헤더와 서버 세션을 대조해 잘못된 계정 저장을 차단한다.

한 사용자에게 다음 네 저장소를 묶어 보관한다.

- Console: Namespace, HTTP LB/Origin/WAF/정책/설정, 이벤트·활동 로그
- Training: Class 1–9 실습 환경, 진행·검증·기준 요청과 런타임 로그
- API Security: OpenAPI/Definition/Integration, endpoint, 모의 요청 로그·테스트 실행
- Navigation: 추가 로컬 구성 리소스

화면 변경은 약 600ms 후 서버로 직렬 저장한다. 저장 중에는 상단에 **서버 저장 중…**이 표시되며, 로그아웃은 진행 중인 저장을 마친 후 실행한다. 저장 실패는 숨기지 않고 재시도/서버 값 다시 불러오기를 표시한다. 미저장 상태에서 페이지를 떠나면 브라우저가 확인을 요구한다. 동시에 열린 탭이나 다른 기기의 저장 충돌은 revision을 비교해 409로 차단한다. 충돌 후에는 서버 값을 다시 읽고 변경을 재적용한다. 한 계정 저장 데이터 상한은 요청 JSON 기준 8MiB다.

로그아웃·계정 전환 때 콘솔을 내려 네 Zustand 저장소와 계정 메모리 캐시를 모두 초기화한다. 토큰·비밀번호는 localStorage/sessionStorage에 저장하지 않는다. 다른 탭의 로그인/로그아웃은 BroadcastChannel로 전달해 기존 화면을 잠근다. 기존 익명 브라우저 저장값은 삭제하지 않지만 새 계정으로 자동 수입하지 않는다. 기존 실습 기능과 공식/모의 결과 구분은 유지한다.

## 인터넷 배포

1. `npm run build`로 dist를 만든다.
2. `NODE_ENV=production`, `APP_ORIGIN=https://실제호스트`, `PORT`, 영구 저장소의 `DATABASE_PATH`를 설정한다. 예: `/var/data/xc.sqlite`.
3. 첫 배포에서 예시 계정이 필요하면 `DEMO_ACCOUNT_PASSWORD`를 서버 환경 변수로 설정한다. 실제 값을 Git에 올리지 않는다.
4. `npm start`로 Node 서버 하나에서 dist와 `/api`를 함께 서비스한다. 정적 사이트 호스팅만으로는 인증/저장 API가 동작하지 않는다.
5. 호스팅/역방향 프록시에서 HTTPS를 종료하고 Node로 연결한다. production은 HTTPS APP_ORIGIN을 요구하며 Secure 쿠키/HSTS를 사용한다. 외부 Origin 변경 요청은 차단한다.
6. 실제 프록시가 X-Forwarded-For를 덮어쓰는 구성이 확인된 경우에만 TRUST_PROXY=true로 설정한다. 인증은 IP당 15분에 20회로 제한한다. 여러 인스턴스로 수평 확장하는 구성은 지원하지 않으며 단일 인스턴스+영구 디스크가 전제다.
7. DB는 dist 밖에 보관하고 정기 백업한다. SQLite WAL 사용 중에는 DB 파일 한 개만 임의 복사하지 말고, 서버를 정지한 상태에서 디렉터리를 백업하거나 SQLite의 일관된 백업 기능을 사용한다.

이 작업에서 공개 호스트 생성이나 인터넷 배포는 하지 않았다. 현재 로컬 API/UI에서 검증했다.

## 검증

- 서버: 예시 계정 3개, hash, signup/login/logout, 세션 교체/만료/재시작, 소유권 분리, CSRF, stale account/revision, rate limit, production HTTPS/Secure 쿠키.
- 클라이언트: 익명 데이터 격리, 네 저장소 초기화/복원, Class 1–9 전체 세션·baseline 로그 보존, 직렬 저장, 충돌 실패 노출, 잘못된 데이터/버전 거부, 탭 알림.
- 실제 브라우저: 세 계정 로그인, root1 설정·Class 9 baseline 생성 및 재조회, root2/root3 격리, root1 복원, 신규 회원가입·새로고침·로그아웃, 서버 재시작 후 세션 유지, root3 API 모의 로그 저장·재조회. 테스트 회원가입 계정은 로그아웃 후 삭제했다.
- 캡처: output/playwright/auth-login.png, auth-root1-class9.png, auth-root2-isolated.png, auth-root1-restored.png, auth-signup.png, auth-api-logs-restored.png.
- 실행 서버 의존성 감사는 0건. 기존 개발용 Vitest 감사 결과와 보류 사유는 작업 계획서에 기록했다.

최종 결과(2026-11-02): `npm test` 프런트엔드 33개 파일·355개 테스트와 서버 10개 테스트 모두 통과, `npm run build` 성공(기존 500KB 번들 경고). 실제 배포용 dist를 Node 서버에서 열어 로그인·HttpOnly 쿠키 비노출·브라우저 localStorage에 계정 상태 미저장·탭 간 로그아웃을 확인했다. 정상 비로그인 조회의 401 외에 브라우저 실행/CSP 오류는 없었다. 추가 캡처: auth-production-build.png, auth-cross-tab-logout.png.
