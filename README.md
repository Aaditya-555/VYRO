# VYRO — Connect Beyond Limits

VYRO is an early responsive chat-app UI foundation built with React and Vite.

## Run locally

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```

## Current status

This first commit contains the responsive visual foundation, splash screen, sample conversation list, and preview conversation layout.

**It is not yet a working messaging service.** The sample chats are static UI data. The message composer does not send or persist messages. There is no real authentication, database, media storage, push notification service, or voice/video calling yet.

## Planned engineering phases

1. Backend and secure authentication (server-side password hashing, sessions, recovery, rate limiting).
2. Persistent chat database and real-time message delivery.
3. Media uploads, reactions, replies, edits, forwarding, and message search.
4. Group chats, presence, typing indicators, read receipts, and notification preferences.
5. Voice/video calling.
6. Transparent, role-based moderation tools with audited metadata access.

Never store passwords in browser local storage or commit secrets/API keys. Use environment variables and server-side secret management for future integrations.

## Tech

- React 18
- Vite 6
- CSS responsive layout