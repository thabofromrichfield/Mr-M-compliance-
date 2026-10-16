# Rebuild architecture

- **Frontend:** Next.js App Router / React / TypeScript. A private application shell contains overview, document library, document details, audit, and settings.
- **Auth boundary:** server-side APIs use one configured owner identity. There is no sign-up route or self-service account creation.
- **Domain:** a document stores its file and minimal management metadata (name, category, tags, status), with only expiry dates extracted from file contents. Candidate dates are reviewed before confirmation.
- **Preview persistence:** JSON metadata and local uploads under ignored `.data/` for local runs only.
- **Production target:** Firebase/Firestore + Storage with Vercel frontend and daily Vercel Cron. The Firebase files in this repo are deployment scaffolding; this local demo does not claim that the production adapter or encryption policy has been operationally verified.
- **Test strategy:** `tests/smoke.sh` exercises unauthenticated denial, absent registration endpoints, sign-in, expiry extraction, renewal, export, and cleanup against a running local server.
