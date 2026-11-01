# VYRO — Connect Beyond Limits

VYRO is an early responsive chat-app foundation built with React, Vite, Express and PostgreSQL.

## Current implementation

- Responsive red/black chat UI and animated splash screen
- Starter API with username/password registration and login
- Optional email is not required in this first auth scaffold
- Passwords are hashed with bcrypt (12 rounds)
- Login/register rate limiting
- Server-side sessions stored in PostgreSQL with HttpOnly cookies
- Invite-code gate for account registration
- Initial PostgreSQL schema for profiles, invites, conversations, members, messages and moderation audit metadata

## Setup

1. Install Node.js 20+ and PostgreSQL.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, a random `SESSION_SECRET` (32+ characters), and `CLIENT_ORIGIN`.
3. Apply the schema: `psql "$DATABASE_URL" -f database/schema.sql`.
4. Install dependencies: `npm install`.
5. Start the API: `npm run server`.
6. In another terminal start the UI: `npm run dev`.

API health check: `GET http://localhost:3001/api/health`.

## Important status

This is a backend scaffold, not a deployed service. No production database or hosting has been connected yet. The current React screen is still a UI preview and is not yet wired to these auth endpoints. Do not enter real passwords into the preview.

Before production: deploy behind HTTPS, set production secrets in the hosting provider, configure CORS to the exact app origin, add CSRF protection and account recovery, review session lifecycle and monitoring, and run security tests. Never commit `.env`, API keys, passwords, or raw invite codes.

## Privacy and moderation

The schema supports an audit trail for moderation actions and metadata. It is not intended for secret reading of private message contents. Moderator access must be role-checked server-side and every privileged action audited.

## Planned next phases

1. Wire the React UI to the auth API and add account recovery.
2. Add authenticated conversation APIs and membership checks.
3. Add real-time delivery, media storage, reactions, replies, and search.
4. Add notifications and calling.
5. Deploy backend and database, then package and test Android builds.
