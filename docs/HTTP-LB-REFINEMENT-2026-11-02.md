# HTTP LB evidence-based refinement — 2026-11-02

## Sources and scope

- Historical live XC capture: `output/rea-live/lb-view.ax.txt`, `lb-view.png`; REA Evidence `ev_5f25d260ff1c0751cda57a655d9384725a4e8cb9c38412d016fc5ab2c472a72e`. The observed api-front object had HTTPS automatic certificates, mTLS disabled, idle timeout 120000 ms, HTTP/1.1 and HTTP/2, and Default Coalescing. These are observed object values, not proof of universal defaults.
- Origins/Routes distinction: `lb-petstore-view.ax.txt`, `lb-routes.ax.txt`. The existing nested routes table/order and Origin Pool Apply workflow remain in place.
- Official configuration supplement: https://docs.cloud.f5.com/docs-v2/multi-cloud-app-connect/how-to/load-balance/create-http-load-balancer (read 2026-11-02). This supplies Custom TLS versions/ciphers, CA PEM/Base64, optional client certificate, CRL reference, XFCC fields, and server-header choices. No fresh tenant access was used.
- Local REA scenario: `ev_64341ffae0bf040836997263ab6bc65cb14ef6da9a15401cf013e857f9d87bd9`. Declared menu → HTTP LB → View → Edit actions completed, no captured page errors. Export: `output/verification/lb-2026-11-02-rea.json`. This is local simulator evidence, not evidence that XC saved a policy.

## Implemented

SSL/TLS Type now exposes missing mTLS, server response header/value, path normalization, default LB, idle timeout in milliseconds, HTTP protocol and coalescing controls. Custom TLS exposes min/max versions and cipher input. mTLS has a nested Apply/cancel form with CA format/body, optional client certificate, CRL reference and selected XFCC fields. Parent Save is still required; nested Apply does not write the Zustand store. Existing Class resources and persistence key remain unchanged; absent new properties are hydrated with training defaults.

View displays the stored values. Invalid port/idle timeout, reversed TLS version bounds, missing enabled mTLS CA and invalid header values are rejected. Request events retain the saved connection settings in their evaluation trace alongside the WAF decision and an explicit TLS-handshake-not-executed notice. Old events are not rewritten.

## Limits

The actual tenant's edit controls were Locked in the historical captures. Exact dropdown population and nested editor geometry were not captured. Added choices are a documented training subset, not a complete replica of all XC versions. TLS cipher suites accept training text instead of a full vendor cipher catalog. CA/CRL/XFCC and protocol controls are stored reference configurations: no TLS handshake, certificate validation, upstream header transformation, idle-connection timer or coalescing engine is executed. Existing route/WAF simulations remain operative. Other uncaptured HTTP LB areas (including full Custom VIP advertising, Data Guard, CSRF, GraphQL, Malware and Client-Side Defense) are not claimed complete by this refinement.

## Verification

- New tests: nested mTLS Apply/parent Save/persistence/View; nested Cancel and invalid idle timeout; saved connection trace with Monitoring Detected / Blocking Blocked.
- Existing nested route Apply/save/rehydration/204 response test retained.
- Full suite: 31 files, 347 tests passed. Build passed with the existing bundle-size warning.
- Browser verified: mTLS Apply, parent Save, reload, View with 90000 ms and HTTP/1.1 retained, Direct Response /rea-check → 204, existing WAF XSS → 403 Blocked. Captures: output/playwright/http-lb-mtls-nested.png, http-lb-tls-reloaded.png, http-lb-route-result.png, http-lb-waf-result.png. Console contained React DevTools notices only. Also fixed the discovered 204 UI failure label and removed its response body, covered by an added regression test.
