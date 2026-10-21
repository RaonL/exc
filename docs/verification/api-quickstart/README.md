# API Quickstarts verification — 2026-10-21

320 automated tests / 24 files passed; production build passed. Existing main bundle >500 kB warning remains. npm audit also reports pre-existing development test-tool vulnerabilities (vitest/tinypool/mocker); dependencies were not upgraded as part of this feature.

## Browser verification

- Official sequence 1: UI-created Code integration, uploaded actual dummy JSON file, created definition, connected repositories/crawling, saved and reloaded; Code and Crawling sources appeared.
- Official sequence 2: Report 200/Detected → Block 403/Blocked with same invalid request; saved Block restored after reload.
- Official sequence 3: API Key, Basic, Bearer and Login Endpoint credentials entered through nested forms; Standard 2+ / Admin 1; test execution, Last Tested, Security Posture, custom header, daily simulated schedule, and +7-day execution verified.
- Custom List / Fall Through: configured rules through UI; matching unknown path 403, unmatched path 200; persisted after reload.
- No page errors in the successful complete UI scenarios. Tests run in a separate temporary browser profile.

## Class regression

All 39 lab models passed their configured probes. Each of the 39 lab guide screens was opened in the real browser. This is model-probe plus screen-entry regression, not a claim that every older lab was manually reconfigured from scratch this run. Model self-test preserved existing learner progress.

| Class | Passed / total |
|---|---|
| 1 | 4/4 |
| 2 | 5/5 |
| 3 | 3/3 |
| 4 | 7/7 |
| 5 | 4/4 |
| 6 | 4/4 |
| 7 | 4/4 |
| 8 | 3/3 |
| 9 | 5/5 |

## Reference screenshot review

All 31 figure occurrences below were opened and visually inspected. Duplicate occurrences are retained. Source URLs, asset paths and SHA-256 digests are in public/references/api-quickstart/index.json. Reference images are static F5 documentation assets, not simulator test evidence. Some Discovery fields are documented in text without a dedicated screenshot. The local simulator reproduces a learning subset and does not claim pixel-identical or complete XC functionality.

| Guide | Figure | Observed structure used |
|---|---|---|
| api-security | [1](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/20--api-security/images/select-namespace.png) | Namespace selector / service context |
| api-security | [2](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/20--api-security/images/load-balancers-page.png) | HTTP LB list and Load Balancers flyout |
| api-security | [3](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/20--api-security/images/manage-lb-config.png) | Actions → Manage Configuration |
| api-security | [4](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/20--api-security/images/add-code-base.png) | API Management → Code Base Integration list/empty state |
| api-security | [5](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/20--api-security/images/code-base-form.png) | Metadata / Integration Data / provider choice form |
| api-security | [6](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/20--api-security/images/monitor-endpoints.png) | API Endpoints / Discovery Source table |
| api-security | [7](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/20--api-security/images/load-balancers-page.png) | Duplicate LB list for crawling step |
| api-security | [8](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/20--api-security/images/manage-lb-config.png) | Duplicate Manage Configuration for crawling step |
| api-security | [9](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/20--api-security/images/monitor-endpoint-source.png) | Traffic / Code / API Crawling multi-source inventory |
| api-protection | [1](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/21--api-protection/images/select-namespace.png) | Namespace selector |
| api-protection | [2](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/21--api-protection/images/openapi-files.png) | Files → OpenAPI Files list |
| api-protection | [3](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/21--api-protection/images/upload-openapi-file.png) | Metadata / OpenAPI Upload / file size instruction |
| api-protection | [4](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/21--api-protection/images/api-definitions.png) | API Definition list/empty state |
| api-protection | [5](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/21--api-protection/images/api-definition-form.png) | Metadata / file selection / endpoints management structure |
| api-protection | [6](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/21--api-protection/images/enable-api-definition.png) | LB API Protection → API Definition Disable/Enable |
| api-protection | [7](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/21--api-protection/images/select-api-definition.png) | Nested API Definition reference picker |
| api-protection | [8](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/21--api-protection/images/api-def-validation-choices.png) | Validation Disabled / API Inventory / Custom List |
| api-protection | [9](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/21--api-protection/images/api-inventory-validation-form.png) | Request Validate/Report/properties, Response Skip, Fall Through Allow |
| api-protection | [10](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/21--api-protection/images/custom-list-validation-form.png) | Custom List nested validation rules configuration |
| api-protection | [11](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/21--api-protection/images/custom-validation-form.png) | Validation Rule: name, request/response mode, domain, endpoint/path/method |
| api-protection | [12](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/21--api-protection/images/custom-fall-through.png) | Custom Fall Through: name, Action Skip/Report/Block, endpoint/method |
| automate-sec-test | [1](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/23--automate-api-sec-testing/images/enable-api-testing-menu.png) | API Testing Disable/Enable in API Protection |
| automate-sec-test | [2](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/23--automate-api-sec-testing/images/add-api-test.png) | Testing Environments / Frequency / Custom Header |
| automate-sec-test | [3](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/23--automate-api-sec-testing/images/add-domain-api-test.png) | Environment Details domain / destructive / Credentials Add Item |
| automate-sec-test | [4](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/23--automate-api-sec-testing/images/add-desct-api-methods.png) | Destructive methods checkbox |
| automate-sec-test | [5](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/23--automate-api-sec-testing/images/add-creds-api-test.png) | Credential General / type / User / Password Configure / Role |
| automate-sec-test | [6](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/23--automate-api-sec-testing/images/save-creds-api-test.png) | Credentials table (role screenshot inconsistency noted) |
| automate-sec-test | [7](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/23--automate-api-sec-testing/images/add-header-api-test.png) | Saved environment and x-f5-apitesting-identifier custom value |
| automate-sec-test | [8](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/23--automate-api-sec-testing/images/add-test-schedule.png) | Every Week default / Every Day / Every Month |
| automate-sec-test | [9](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/23--automate-api-sec-testing/images/view-test-results.png) | API Endpoints gear / Last Tested column |
| automate-sec-test | [10](https://docs.cloud.f5.com/docs-v2/images/04--quickstart/23--automate-api-sec-testing/images/view-test-scores.png) | Endpoint Details / Security Posture / vulnerability Source API Testing |

## Evidence and limits

REA official-document captures are in rea-evidence.json. REA local navigation/fixture capture is in rea-local-ui.json. Each retains provider identity, evidence ID and scope/limitations; these observations do not imply access to an authenticated F5 console. Other screenshots are under docs/screenshots/api-*.png.

Official prose requires two Standard and one Admin credential. The Save Credentials image displays Standard in all rows; the simulator follows the prose requirement. Local schedules run only when the learner advances the simulated clock; there is no real background scheduler. Native browser forms, skeleton UI, authentication, API request/schema evaluation and findings are a documented subset.

Final visual checks: desktop 1793×1100, mobile 390×844 (no page horizontal overflow). After Custom List edits, API Testing was rerun with the current configuration before capturing the final log. Additional captures: api-quickstart-overview.png, api-protection-settings.png, api-protection-validation.png, api-testing-posture.png, api-testing-logs.png, api-quickstart-mobile.png, api-regression-class9.png.

