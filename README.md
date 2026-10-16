# Compliance App

Single-user web application for storing compliance/government documents and tracking expiry dates, with email alerts.

## Stack

- Frontend: Next.js (App Router) on Vercel
- Backend (demo mode): local file + JSON store (no external services required)
- Backend (production): Firebase (Auth, Firestore, Storage) + Vercel serverless/cron

The app runs in **demo mode** when Firebase env vars are not set, using a local file-based store under `.data/`. This makes it runnable locally without any cloud credentials.

## Getting started (demo mode)

```bash
npm install
cp .env.example .env.local
# edit .env.local as needed
npm run dev
```

Open http://localhost:3000, register the first (and only) account, then upload documents.

## Features

- Upload, view, download, delete documents
- Automatic expiry-date detection (PDF/text) with confirmation prompt
- Manual expiry entry when no date is found
- Dashboard colour-coded by urgency (green/amber/red)
- Categories and tags
- Mark as renewed (resets tracking)
- Audit log
- Backup/export as zip
- Email alerts at 1 month / 1 week / 1 day before expiry
- One-click "Mark as renewed" link in alert emails (no login)
- Two-factor authentication (TOTP)
- Fixed recipient whitelist for outbound email

## Email alerts

Alerts are sent by `GET /api/cron/alerts?secret=CRON_SECRET`. Configure Vercel Cron or any scheduler to call it daily. Recipients are fixed via `ALERT_RECIPIENTS` env var.

## Firebase (production)

Set the `NEXT_PUBLIC_FIREBASE_*` and `FIREBASE_SERVICE_ACCOUNT_JSON` env vars and replace the local store calls with the Firebase modules in `src/lib/firebase/`. Security rules are in `firestore.rules` / `storage.rules`.

## Environment variables

See `.env.example`.
