# Real-Time Chat API with Presence System

> A horizontally scalable, real-time messaging backend built for the interview circuit. WebSockets + Redis pub/sub + presence tracking + Jest test suite + Docker + CI/CD.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          React Client                               │
│               (login / room list / chat UI / online users)          │
└────────────────────┬───────────────────────────┬────────────────────┘
                     │ HTTP (REST)                │ WebSocket
                     ▼                            ▼
          ┌──────────────────┐        ┌──────────────────────┐
          │   API Server     │        │    WS Server         │
          │  Express / 3000  │        │    ws / 4000         │
          │                  │        │                      │
          │  /auth/register  │        │  join_room   (JWT)   │
          │  /auth/login     │        │  message     (DB+pub)│
          │  /rooms          │        │  heartbeat   (TTL)   │
          │  /rooms/:id/msg  │        │  onDisconnect(DEL)   │
          └────────┬─────────┘        └──────────┬───────────┘
                   │                             │
                   └──────────┬──────────────────┘
                              │
                   ┌──────────▼──────────┐
                   │       Redis 7       │
                   │                     │
                   │  pub/sub            │  ← cross-instance message fanout
                   │  room:{roomId}      │
                   │                     │
                   │  TTL keys           │  ← presence (30s TTL)
                   │  user:{id}:online   │
                   └─────────────────────┘
                              │
                   ┌──────────▼──────────┐
                   │     PostgreSQL       │
                   │   User / Room /      │
                   │  RoomMember/Message  │
                   └─────────────────────┘
```

### Key Design Decision: Why Redis pub/sub?

In-memory broadcast only works when all WebSocket connections live on **the same server instance**. The moment you run two instances behind a load balancer, clients on instance A never see messages from clients on instance B.

Redis pub/sub gives every instance a **shared channel** — a message published by any instance is received and fanned out by all of them. This is the difference between a toy and a production system.

### Presence: How Does it Handle a Server Crash?

Each user's key (`user:{userId}:online`) has a **30-second TTL**. If the server crashes and can't send `DEL` on disconnect, the key expires on its own after 30 seconds. The client heartbeat resets the TTL every 15 seconds while connected. Presence is eventually consistent — a crashed user appears offline within 30 seconds without any manual cleanup.

### Horizontal Scaling to 100,000 users

- **API layer**: already stateless — add instances behind a load balancer with zero config changes
- **WS layer**: stateless for delivery (Redis handles fan-out) and presence (Redis stores it)
- **Bottlenecks at scale**: Redis subscriber count, Postgres write throughput for message persistence
- **Solutions**: Redis Cluster for partitioning, async write queue for messages, read replica for history

---

## Tech Stack

| Technology | Role |
|---|---|
| Node.js / Express | REST API |
| `ws` (not Socket.IO) | WebSocket — forces understanding of the raw protocol |
| Redis 7 | pub/sub for fan-out + TTL keys for presence |
| PostgreSQL + Prisma | Persistent users, rooms, messages |
| React 18 + Vite | Demo frontend |
| Jest + Supertest | Unit + integration tests |
| Pino | Structured JSON logging |
| Sentry | Error tracking |
| Docker Compose | One-command local dev |
| GitHub Actions | CI (tests) + CD (Railway) |

---

## Project Structure

```
chat-api/
├── apps/
│   ├── api/              # Express REST API (port 3000)
│   └── ws/               # WebSocket server (port 4000)
├── packages/
│   ├── db/               # Prisma schema + PrismaClient singleton
│   └── shared/           # TypeScript types shared across apps
├── frontend/             # React + Vite chat UI (port 5173)
├── docker-compose.yml    # Postgres + Redis + API + WS
└── .github/workflows/    # CI/CD pipeline
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker + Docker Compose

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/chat-api.git
cd chat-api
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET and JWT_REFRESH_SECRET:
# openssl rand -hex 32   ← run twice, once for each secret
```

### 3. Start infrastructure + servers

```bash
# Postgres + Redis + API + WS (Docker)
docker-compose up -d

# Or run the API + WS locally (requires Redis + Postgres running):
npm run db:migrate          # Apply Prisma migrations
npm run dev:api             # API on :3000
npm run dev:ws              # WS on :4000
npm run dev:frontend        # React on :5173
```

### 4. Run tests

```bash
npm test                    # All tests
npm run test:coverage       # Tests + coverage report
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Access token signing key (≥32 chars, `openssl rand -hex 32`) |
| `JWT_REFRESH_SECRET` | Refresh token signing key (separate from JWT_SECRET) |
| `JWT_ACCESS_EXPIRES_IN` | e.g. `15m` |
| `JWT_REFRESH_EXPIRES_IN` | e.g. `7d` |
| `SENTRY_DSN` | Optional — from your Sentry project dashboard |
| `PORT` | `3000` for API, `4000` for WS |
| `NODE_ENV` | `development` \| `production` \| `test` |
| `TEST_DATABASE_URL` | Separate DB for tests (avoids wiping dev data) |

---

## API Reference

### Auth
| Method | Path | Body | Auth |
|---|---|---|---|
| POST | `/auth/register` | `{ username, email, password }` | — |
| POST | `/auth/login` | `{ email, password }` | — |
| POST | `/auth/refresh` | `{ refreshToken }` | — |
| GET | `/auth/me` | — | Bearer |

### Rooms
| Method | Path | Body | Auth |
|---|---|---|---|
| POST | `/rooms` | `{ name }` | Bearer |
| GET | `/rooms` | — | Bearer |
| GET | `/rooms/:id` | — | Bearer |
| POST | `/rooms/:id/join` | — | Bearer |

### Messages
| Method | Path | Query | Auth |
|---|---|---|---|
| GET | `/rooms/:id/messages` | `?cursor=<id>` | Bearer |

---

## WebSocket Protocol

All frames are JSON. Connect to `ws://localhost:4000`.

### Client → Server
```json
{ "type": "join_room", "roomId": "...", "token": "<JWT>" }
{ "type": "message",   "roomId": "...", "content": "Hello!" }
{ "type": "heartbeat" }
```

### Server → Client
```json
{ "type": "room_joined",    "roomId": "...", "onlineUsers": [...] }
{ "type": "message_received","messageId":"...","userId":"...","username":"...","content":"...","ts":"..." }
{ "type": "presence_update", "roomId":"...","userId":"...","username":"...","status":"online|offline" }
{ "type": "error",          "code": "...", "message": "..." }
```

---

## Test Coverage

The test suite covers:

- **auth.test.ts** — register, login, duplicate email/username, wrong password, token refresh, `/me`
- **rooms.test.ts** — create, list (scoped to user), get (403 for non-member), join
- **messages.test.ts** — paginated history, cursor-based pagination (30 per page), 403 for non-member
- **websocket.test.ts** — two clients join a room, one sends a message, both receive it

Run `npm run test:coverage` to generate the coverage report in `apps/api/coverage/`.

---

## Deployment (Railway)

1. Create a Railway project with three services: `api`, `ws`, `frontend`
2. Add PostgreSQL and Redis plugins
3. Set environment variables in each service's settings
4. Add `RAILWAY_TOKEN` to your GitHub repository secrets
5. Push to `main` — GitHub Actions deploys automatically

---

## Resume Bullet (fill in after load testing)

```
Built a horizontally scalable real-time chat API supporting [X] concurrent WebSocket
connections, using Redis pub/sub for cross-instance message fanout, Redis TTL keys for
live presence tracking, and a Jest test suite with [X]% coverage across auth and messaging
endpoints. Deployed via Docker + GitHub Actions to Railway.
```

**To get the numbers:**
```bash
# Load test (install artillery globally: npm i -g artillery)
artillery quick --count 100 --num 50 ws://YOUR_RAILWAY_URL

# Coverage
npm run test:coverage
# → check apps/api/coverage/coverage-summary.json
```
