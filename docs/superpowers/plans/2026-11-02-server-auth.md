# Server authentication implementation plan

Goal: username signup/login/logout; three operator-requested sample accounts; per-account console, API, training Class 1–9 and navigation-resource persistence.
Architecture: same-origin Node HTTP API + SQLite (Node 24), scrypt password hashes, hashed opaque session tokens in HttpOnly/SameSite cookies. Browser mounts the simulator only after loading authenticated server state. No passwords/tokens in browser storage, no automatic import of legacy anonymous state.

- [x] Write failing server tests: seeds, signup/login, cookies/logout/restart, user isolation, CSRF, expiry, stale revision rejection and rate limits.
- [x] Implement server storage/auth/API and production SPA serving. Seed password comes from ignored server env, not source. Public production requires explicit HTTPS origin and secure cookies; DB is outside static root.
- [x] Write failing client tests for account-scoped stores, switch/reset, server autosave and conflict/error handling.
- [x] Implement in-memory authenticated persistence for four Zustand stores, serialized autosave with revision checks, fail-closed session gate, username signup/login UI, save status and logout. Retain old local storage as a separate offline backup only.
- [x] Add npm scripts, development API proxy, environment template and single-server deployment documentation (persistent DB volume, HTTPS proxy).
- [x] Seed the requested three accounts locally. Test actual UI signup/logout, refresh, A→B→A isolation, Class 1–9 state/logs; run all tests/build/audit. Do not publish or push without request.

Threat boundaries: untrusted HTTP/JSON, cookie auth, SQLite ownership, browser cache/account switching. Enforce authenticated user ownership in every state query; never accept a user ID in state API. Check Origin on mutations, JSON content type, size limits, parameterized SQL, CSP/no-store headers, generic credential errors, rate limiting, password length bounds and bounded sessions. Stale-tab writes return 409 instead of overwriting another device's state. Root-named demo users have no elevated privileges.

## 운영 의존성 점검 — 2026-11-02

새 인증 서버는 Node 내장 모듈만 사용한다. `npm audit --omit=dev`는 0건이었다. 전체 감사에는 기존 개발 의존성 Vitest 3.2.7 계열 및 @vitest/mocker/tinypool의 moderate 1, critical 2가 보고됐다. 이 도구는 CLI/jsdom 테스트에서만 실행하고 공개 Node 서버나 dist 런타임에서 로드하지 않는다. 저장소에는 Vitest UI/browser API를 공개하는 실행 경로가 없다. 공개 서버에서는 `npm start`만 사용하며 개발/테스트 서버를 외부에 노출하지 않는다. 상위 버전 5.x로의 변경은 별도 호환성 검증이 필요한 major migration이므로 이번 인증 변경에서 강제 업그레이드하지 않았다. 재검토일: 2026-11-09. 상세 로컬 결과: output/verification/auth-full-audit.json. 취약점이 없다는 전체 프로젝트 보증이 아니다.
