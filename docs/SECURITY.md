# Security notes

## Trust boundaries

The browser is untrusted. It may submit arbitrary JSON, filenames, tags, dates, and cookies. API handlers therefore authenticate every protected operation and validate inputs on the server. The only permitted account is provisioned from `DEFAULT_EMAIL` and `DEFAULT_PASSWORD`; public account creation is intentionally absent.

## Threat controls implemented

- Single-owner account seeding; unknown accounts receive the same generic sign-in failure as invalid passwords.
- bcrypt password hashes, HTTP-only SameSite=Lax session cookies, production Secure cookies, 12-hour browser session lifetime, and simple per-IP/email sign-in throttling.
- TOTP can be enabled by the owner. Session lookups and authorization occur server-side.
- Upload size and extension allowlists, PDF signature check, generated storage identifiers, private local file permissions, safe download paths, and no storage path in API responses/export manifest.
- Fixed recipient allowlist is read only from server configuration. User-controlled input cannot select email destinations.
- HTML-escaped document names in reminder emails and renewal result pages; signed renewal tokens expire after 30 days.
- Audit events capture sign-ins and document changes without storing document contents in the audit log.

## Operational risks / required production work

- Local JSON persistence is for the preview/demo only. It is not a durable or horizontally safe Vercel store. Before production, connect and test the Firebase Admin adapter, enforce the checked-in Firestore/Storage rules, verify encryption and backup/restore, and run security rules tests.
- Configure unique production credentials and secrets. Never deploy with the demo password, a sample `SESSION_SECRET`, or without a protected `CRON_SECRET` and the fixed alert list.
- The current sign-in throttle is process-local; deploy behind a persistent rate limiter/WAF for production.
- One-click renewal is a signed, time-limited GET action to meet the no-login requirement. Some email security scanners may follow links automatically; decide whether that behavior is acceptable for the deployment’s recipient environment.
- Configure SMTP and verify actual delivery plus allowlisted recipients before relying on reminders. With SMTP unset, the local demo records no outbound email.
