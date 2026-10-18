# Standalone demo (default)

Run `npm install`, `npm run build`, then `npm start`, or deploy as a Next.js app.
No environment variables, Firebase, SMTP, or external accounts are needed.

Sign in with **admin@compliance.app** / **Compliance123!**.

Demo mode defaults to enabled even in production. Firebase connections and outbound
email are disabled regardless of any existing Firebase/SMTP settings. Documents,
audit records and settings use temporary local storage (including on serverless hosts).
Data can reset on restart/redeploy and is not shared reliably across serverless
instances. This is a shared public test account: use sample documents only.
Email reminders are simulated, not delivered. Do not use this mode for real data.

To explicitly restore the externally backed mode, set `DEMO_MODE=false` and configure
the owner, session, Firebase, document encryption and SMTP variables in `.env.example`.

---

# ClearLedger

A private, single-owner workspace for government, business, licence, insurance, and other compliance documents. ClearLedger tracks expiry dates, sends fixed-recipient reminders, and lets approved alert recipients record the actual new expiry date without signing in.

## What it does

- Upload PDF, DOCX, TXT, CSV, and common image files (up to 4 MB per file, keeping uploads compatible with Vercel's request-size cap), preview supported files, download, and remove them. Text-based PDF, DOCX, TXT, and CSV files are scanned for expiry dates; images use the manual-date fallback.
- Checks uploads against existing files and matching document names/expiry metadata before storing them. If a likely duplicate is found, the owner can cancel or explicitly confirm adding another copy; file fingerprints are checked in memory and not persisted.
- Scans document text **only for an expiry date** near expiry wording. Extracted text is transient in memory and is never written to a database, logs, or storage. The proposed date is shown for confirmation. If no date is found, the owner must enter one manually.
- Organises documents with categories and tags; urgency is shown as safe (green), approaching (amber), or urgent/expired (red).
- Sends alerts 30, 7, and 1 day before expiry to a server-configured email allowlist. Request bodies cannot supply recipients. There is deliberately no snooze function.
- Adds a signed, one-use renewal link to each alert. It works without a login and asks for the actual new expiry date before updating the record; renewal periods are never assumed to be annual.
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

The smoke test exercises sign-in, duplicate detection and override, upload and expiry-date confirmation, encrypted preview/download, variable-term no-login renewal, TOTP setup, audit history, ZIP backup, logout, and the absence of registration.
