# VYRO — Connect Beyond Limits

VYRO is an early responsive chat-app foundation built with React, Vite, Express and PostgreSQL. Supabase is not required.

## Current implementation

- Responsive red/black chat UI and animated splash screen
- Starter API with username/password registration and login
- Passwords hashed with bcrypt (12 rounds)
- Login/register rate limiting
- Server-side sessions stored in PostgreSQL with HttpOnly cookies (production uses Secure + SameSite=None for Android WebView cross-origin API calls)
- API CORS allow-list supports multiple origins, including the Capacitor Android origin
- Open username/password registration; no invite code required
- PostgreSQL schema for profiles, invites, conversations, members, messages, cosmetics inventory and moderation audit metadata
- Profile customization API for frames, nameplates, avatar effects, bio and status
- Group/channel and moderator API foundation

## Hosting plan (Railway + PostgreSQL)

Railway can host the Node.js API and a PostgreSQL database in one project. The database is private by default; connect the API using Railway's reference variable for `DATABASE_URL`.

1. Create a Railway account and a new project.
2. Add a PostgreSQL database service.
3. Add a Node.js service from this GitHub repository.
4. In the API service Variables, add a reference to the Postgres service's `DATABASE_URL`.
5. Add `NODE_ENV=production`, `SESSION_SECRET` (a random value of at least 32 characters), and `CLIENT_ORIGIN` as a comma-separated allow-list. Include `https://localhost` for the Android Capacitor app and the exact HTTPS origin of any deployed web client.
6. Set the API service start command to `npm run server`.
7. Apply `database/schema.sql` to the Railway database using a trusted SQL client or a one-time migration job. Never paste database credentials into chat or commit them.
8. Check `/api/health` after deployment; it verifies PostgreSQL connectivity and returns HTTP 503 if the database is unavailable.
10. In GitHub Actions, run **Build VYRO Android APK** with the `api_base_url` input set to the public HTTPS API origin. A relative `/api` URL points to the phone itself, not the hosted API.

Railway PostgreSQL connection variables and private networking are documented at https://docs.railway.com/databases/postgresql.

## Local development

1. Install Node.js 20+ and PostgreSQL.
2. Create a local database and set `DATABASE_URL` in a local `.env` file.
3. Set `SESSION_SECRET` to a random value of at least 32 characters and set `CLIENT_ORIGIN=http://localhost:5173`.
4. Apply the schema with `psql "$DATABASE_URL" -f database/schema.sql`.
5. Install dependencies: `npm install`.
6. Start the API: `npm run server`.
7. In another terminal start the UI: `npm run dev`.

API health check: `GET http://localhost:3001/api/health`.

## Important status

This is a development foundation, not a deployed or production-ready service. The profile customizer and chat composer still have preview-only UI portions; the UI is not yet fully connected to the APIs. Real-time message delivery, authenticated message endpoints, account recovery, CSRF protection, media storage and notifications still need deployment and real-device testing. Voice and video calling are not included in VYRO. Do not enter real passwords into the preview.

Before production: deploy behind HTTPS, set production secrets in the hosting provider, configure CORS to the exact app origin, add CSRF protection and account recovery, review session lifecycle and monitoring, and run security tests. Never commit `.env`, API keys, database passwords, or raw invite codes.

## Privacy and moderation

The schema supports an audit trail for moderation actions and metadata. It is not intended for secret reading of private message contents. Moderator access must be role-checked server-side and every privileged action audited.
