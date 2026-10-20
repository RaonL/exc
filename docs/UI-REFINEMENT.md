# XC console UI refinement

## Design contract

- Preserve the existing XC console shell, compact navigation, white resource panels and section-based configuration forms. References: `REFERENCES.md`, the baseline dashboard and Class 1 LB form screenshots.
- Screen job: find the current namespace, inspect performance/security, then open the relevant resource configuration. Keep page actions and selected navigation visible.
- Improve readable secondary text, keyboard focus, narrow-screen navigation and persistent simulation identification. Use restrained blue accents, 4px spacing increments and thin borders.
- Keep loading, empty, error and saved states provided by existing components. Do not alter policies, seed data, persistence keys or training progression.
- At 320/768px use the existing collapsible navigation and horizontally scrollable tables/tabs; at 1024/1440px retain the desktop console layout. Do not remove metric panels on small screens.
- Reject decorative gradients, large hero sections, oversized rounded cards and claims that mock metrics are live F5 measurements.

## Scope

Shared shell and visual styles; no policy or data-model changes. TEST branding and an always-visible Korean unofficial learning label distinguish the local simulator.

## HTTP LB / App Firewall editor contract

Follow the existing Community Training form variant: Form/Documentation/JSON toolbar, resource/namespace context and section navigation on the left, Metadata first, bordered white sections, narrow scalar fields and full-width item tables, persistent Cancel/Save footer. The official WAF metadata/mode image was inspected again on 2026-10-20 alongside the local Class 1 LB form screenshot.

Keep English field names. Korean descriptions explain the configuration relationship without claiming to be official UI text. Preserve draft/cancel/reset, read-only and nested Apply flows. Mobile uses a compact resource context and horizontally scrollable section navigation, with reachable toolbar and footer controls at 320px.

Sources: [HTTP LB](https://docs.cloud.f5.com/docs-v2/multi-cloud-app-connect/how-to/load-balance/create-http-load-balancer), [WAF](https://docs.cloud.f5.com/docs-v2/web-app-and-api-protection/how-to/app-security/application-firewall), [WAF metadata/mode screenshot](https://docs.cloud.f5.com/docs-v2/images/05--how-tos/11--app-sec/01--waf/images/waf-meta-mode.png). The latest text places VIP advertisement earlier and describes additional controls; this pass retains the training screenshot's Domains/Origins/Routes structure and existing supported fields. This is not a claim of full feature parity with the latest XC release.

### Editor verification

- Build passed and all 166 existing tests passed. Fixed a duplicate ARIA attribute caught during verification.
- Isolated Playwright profile: created a Blocking/Custom WAF with High, Medium and Low accuracy, created an HTTP LB, applied an existing Origin Pool, enabled and linked the new WAF, saved and reloaded. Stored mode, accuracy, protocol and WAF reference all matched.
- Changed that WAF to Monitoring and canceled; reopening retained Blocking. Configuration tabs also switched with arrow keys and restored Form correctly.
- Both editor and inner panel widths matched their scroll widths at 320, 768, 1024 and 1440px. WAF metadata/default and custom-policy screenshots inspected. Save notifications are positioned above the fixed footer to avoid covering its controls.
- Final screenshots: `output/playwright/lb-editor-after.png`, `waf-editor-1440.png`, `waf-custom-after.png`, `waf-editor-320.png`. Test resources exist only in the isolated browser profile.
- No policy evaluation logic, validation rules, storage schema or dependencies changed. Korean helper copy and local namespace/simulator labels are simulator additions to the reference layout.

## Validation (2026-10-20)

- Production build passed; 11 test files / 166 existing tests passed.
- Playwright: dashboard document width matched viewport at 320, 768, 1024 and 1440px. Unofficial label remained present at each size.
- HTTP Load Balancers and App Firewall navigation rendered successfully. Mobile navigation closed after selection; Ctrl+K opened the search dialog and Escape dismissed it.
- Browser console contained React development informational messages only. Reviewed desktop/mobile screenshots; tables remain horizontally scrollable on narrow screens.
- Artifacts: `output/playwright/ui-after-desktop.png`, `ui-after-320.png`, `ui-load-balancers.png`, `ui-firewall.png` (local, ignored by Git).
- Review: changes are limited to presentation/accessibility attributes; no new dependencies, network calls or storage changes. This is a shared UI pass, not a full accessibility audit or a pixel-identical reproduction of every XC screen.
