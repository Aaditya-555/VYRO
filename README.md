# VYRO — Connect Beyond Limits

VYRO is an early responsive chat-app foundation built with React, Vite, Express and Supabase-hosted PostgreSQL.

## Current implementation

- Responsive red/black chat UI and animated splash screen
- Starter API with username/password registration and login
- Optional email is not required in this first auth scaffold
- Passwords are hashed with bcrypt (12 rounds)
- Login/register rate limiting
- Server-side sessions stored in PostgreSQL with HttpOnly cookies
- Invite-code gate for account registration
- Supabase Postgres schema for profiles, invites, conversations, members, messages, cosmetics inventory and moderation audit metadata
- Profile customization API for equipped frames, nameplates, avatar effects, bio and status
- Starter cosmetics granted to new accounts; server verifies ownership before equipping

## Setup

1. Install Node.js 20+ and create a Supabase project.
2. In Supabase Project Settings → Database, copy the Postgres connection string (use the pooler if needed). Copy `.env.example` to `.env` and set `DATABASE_URL`, a random `SESSION_SECRET` (32+ characters), and `CLIENT_ORIGIN`. Never share or commit secrets.
3. Apply `database/schema.sql` in the Supabase SQL Editor or with `psql "$DATABASE_URL" -f database/schema.sql`.
4. Install dependencies: `npm install`.
5. Start the API: `npm run server`.
6. In another terminal start the UI: `npm run dev`.

API health check: `GET http://localhost:3001/api/health`.

## Important status

This is still a development foundation, not a deployed service. The profile customizer is currently a local UI preview; the profile API and cosmetics inventory are implemented but the UI is not yet connected to them. The chat composer is still preview-only. Do not enter real passwords into the preview.

Before production: deploy behind HTTPS, set production secrets in the hosting provider, configure CORS to the exact app origin, add CSRF protection and account recovery, review session lifecycle and monitoring, and run security tests. Never commit `.env`, API keys, passwords, or raw invite codes.

## Privacy and moderation

The schema supports an audit trail for moderation actions and metadata. It is not intended for secret reading of private message contents. Moderator access must be role-checked server-side and every privileged action audited.

## Planned next phases

1. Wire the React UI to auth and profile APIs; add account recovery and CSRF protection.
2. Add authenticated conversation APIs and membership checks.
3. Add real-time delivery, private media storage, reactions, replies, and search.
4. Add notifications and calling.
5. Deploy the API with Supabase Postgres, configure realtime and private Storage with access policies, then package and test Android builds.
