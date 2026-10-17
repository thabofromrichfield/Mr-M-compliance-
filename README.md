# ClearLedger

A private, single-owner workspace for government, business, licence, insurance, and other compliance documents. ClearLedger tracks expiry dates, sends fixed-recipient reminders, and supports one-click renewals without requiring the recipient to sign in.

## What it does

- Upload PDF, DOCX, TXT, CSV, and common image files (up to 4 MB per file, keeping uploads compatible with Vercel's request-size cap), view/download, and remove them. Text-based PDF, DOCX, TXT, and CSV files are scanned for expiry dates; images use the manual-date fallback.
- Scans document text **only for an expiry date** near expiry wording. Extracted text is transient in memory and is never written to a database, logs, or storage. The proposed date is shown for confirmation. If no date is found, the owner must enter one manually.
- Organises documents with categories and tags; urgency is shown as safe (green), approaching (amber), or urgent/expired (red).
- Sends alerts 30, 7, and 1 day before expiry to a server-configured email allowlist. Request bodies cannot supply recipients. There is deliberately no snooze function.
- Adds a signed, one-use “Mark as renewed” link to each alert. It works without a login and moves the expiry to the same calendar day next year, resetting alert flags. Edit the date in the workspace if the renewal term differs.
- Records sign-ins, document views/changes/downloads, alert sends, renewals, backup exports, and security-setting changes in the audit log.
- Supports TOTP two-factor authentication and on-demand ZIP export.
- Has no registration, sharing, user roles, or multi-tenant functionality.

## Local preview

```bash
npm install
npm run dev
```

Demo credentials: `admin@compliance.app` / `Compliance123!`. These defaults apply only outside production. Enable an authenticator in **Settings**; once enabled, each subsequent sign-in requires its code. Local metadata lives in `.data/`; files are encrypted with a demo-only key before being written to `.data/files/`. Demo mode has no configured email recipients or SMTP service. Do not use demo settings for real documents.

## Production deployment (Vercel + Firebase)

Copy `.env.example` into your deployment's secret manager and configure:

- `OWNER_EMAIL`, `OWNER_PASSWORD`: the only allowed owner account. No user can register.
- `SESSION_SECRET`: at least 32 high-entropy characters, shared by every deployment instance.
- `DOCUMENT_ENCRYPTION_KEY`: base64 encoding of 32 random bytes (`openssl rand -base64 32`). Keep it outside Firestore/Storage; losing it means the encrypted files cannot be recovered.
- Firebase Admin service-account credentials and `FIREBASE_STORAGE_BUCKET`.
- `ALERT_RECIPIENTS`: comma-separated, fixed allowlist of addresses.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.
- `APP_BASE_URL` and `CRON_SECRET`.

Deploy Firestore and Storage rules using `firebase deploy --only firestore:rules,storage`. Client SDK access is denied; the server uses Firebase Admin after validating the signed owner session. Firestore holds document metadata/settings/audit. Each file is AES-256-GCM encrypted in the application before being uploaded to Firebase Storage; Firebase Storage also applies Google-managed encryption at rest. The application encryption key is supplied independently via environment secret. Use Cloud KMS/CMEK for Google-side key management if required by your organisation.

Vercel runs the daily scheduled job declared in `vercel.json` at 07:00 UTC. The handler checks `CRON_SECRET` and sends only to `ALERT_RECIPIENTS`. Keep all alert configuration in deployment secrets; never accept recipient addresses from users or API payloads.

## Verification

```bash
npm run lint
npm run build
npm run test:smoke
npm audit
```

The smoke test exercises sign-in, protected APIs, upload and expiry-date confirmation, encrypted download, metadata edits, TOTP setup, no-login renewal, audit history, ZIP backup, logout, and the absence of registration.
