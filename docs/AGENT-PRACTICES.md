# Agency playbook practices applied

These practices were taken from the requested `msitarzewski/agency-agents` divisions; the agent files themselves are not copied into this application.

| Division playbook | Concrete application in ClearLedger |
|---|---|
| Engineering — Identity & Access Engineer, Backend Architect | One configured owner identity, no registration surface, server-side auth checks, typed document record, signed renewal tokens, documented demo-vs-production persistence boundary. |
| Security — Application Security Engineer, Security Architect | Threat boundaries documented; generic credential failures, throttling, cookie hardening, fixed server-only email recipients, safe upload handling and file paths, escaped HTML, no storage paths in API payloads. |
| Testing — API Tester, Test Automation Engineer | `tests/smoke.sh` tests protected API behavior, absent registration endpoints, login, extracted date, renewal status, ZIP integrity, and cleanup using deterministic API calls. |
| Design — UI Designer, UX Architect | Defined reusable color/spacing tokens and shared navigation/card/table/form patterns; responsive layouts, semantic labels, focus indicators, status colors with text labels, clear empty/loading states. |

## Acceptance test

From a running local server: `npm run test:smoke`.
