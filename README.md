# ClearLedger — Compliance workspace

A single-owner compliance document tracker. This is a clean rebuild of the app UI and sign-in flow, with design and engineering practices informed by the repository’s Engineering, Security, Testing, and Design agent playbooks.

## Product rules

- One owner account; **there is no public registration page or registration API**.
- A single configured email/password is provisioned by the server. The demo account is only enabled automatically in local development.
- Documents support categories, tags, expiry-date detection from PDFs/text, manual date confirmation, renewal state, audit history, fixed-recipient reminders, and ZIP export.
- Email renewal links can mark a document renewed without signing in.
- No sharing, roles, multi-tenant access, document-data extraction beyond expiry dates, or snooze flow.

## Run locally

```sh
npm install
npm run dev
```

Open `http://localhost:3000/login` and use the **development-only** demo account:

- Email: `admin@compliance.app`
- Password: `Compliance123!`

The local demo uses the ignored `.data/` directory. Do not use demo credentials or the local JSON store for production data.

## Production configuration

Set these in the deployment environment before enabling sign-in:

```env
DEFAULT_EMAIL=owner@example.com
DEFAULT_PASSWORD=<unique long password>
SESSION_SECRET=<at least 32 random bytes>
ALERT_RECIPIENTS=owner@example.com,another-fixed-recipient@example.com
APP_BASE_URL=https://your-domain.example
CRON_SECRET=<random secret>
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
```

Production sign-in deliberately fails closed if `DEFAULT_EMAIL` or `DEFAULT_PASSWORD` is missing. Registration remains disabled. For the scoped Firebase/Vercel deployment, complete Firebase service-account, encryption/backup, email transport, and protected daily-cron configuration before handling real documents. The checked-in Firebase rules/scaffold are not a substitute for deployment verification; the local JSON demo store is not durable on serverless infrastructure.

## Engineering notes

- App Router UI is responsive and uses semantic form controls, visible keyboard focus, and labelled navigation.
- Session cookies are HTTP-only, SameSite=Lax, Secure in production, and limited to 12 hours. Passwords are bcrypt-hashed. Sign-in errors are generic and attempts are throttled in-process.
- Audit and document APIs require an authenticated session. Alert destinations are environment-whitelisted.
- Manual and detected expiry dates are suggestions; users confirm before saving.

## Checks

```sh
npm run lint
npm run build
```
