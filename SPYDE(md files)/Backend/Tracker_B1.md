# 🔧 TRACKER_B1.md — Backend Lead Task Tracker

**Developer Role:** Backend Lead (B1)  
**Project:** SPYDE — B2B Fraud Prevention Middleware for UPI  
**Sprint Duration:** 72 Hours (9 Phases)  
**Primary Ownership:** Core Engine, Auth, Database, Risk Engine (Pillar 1), Safe Circle (Pillar 4)

---

## 📊 Overall Progress Dashboard

| Metric | Value |
|---|---|
| **Total Tasks** | 87 |
| **Completed** | 0 / 87 |
| **In Progress** | 0 |
| **Blocked** | 0 |
| **Completion %** | 0% |
| **Current Phase** | Phase 0 — Pre-Flight |
| **Hours Logged** | 0 / 72 |

---

## 🎯 Ownership Scope

### Primary Deliverables
- Full PostgreSQL schema via Prisma (13 tables, 6 enums, 22 indexes)
- Auth system (JWT access + refresh tokens, bcrypt, session management)
- Risk Engine (Pillar 1): 3-layer scoring, Levenshtein, community decay, graph adjacency
- Safe Circle (Pillar 4): Redis-cached whitelist, sub-10ms bypass, anomaly detection
- Payment orchestration endpoints (`vpa/resolve`, `payment/initiate`, `payment/confirm`)
- Simulated bank rails (`sim_*` tables + transaction ledger)
- Redis integration layer (Upstash + in-memory fallback)
- Middleware stack (auth guard, rate limiter, error handler, request logger)
- Zod validation schemas for all owned endpoints
- Database seed script (12 personas + 10 merchants)

### Shared / Coordination Points
- **With B2:** Shared Prisma client, shared error handler, shared Redis client
- **With F1:** Auth token contract, payment state machine event names, WebSocket/polling contract for escrow updates
- **With F2:** Risk verdict JSON schema, Safe Circle contact schema

---

## 📅 PHASE 0 — Pre-Flight & Environment Setup
**Duration:** Hour 0–2 | **Target Completion:** 100% by Hour 2

- [ ] Clone repository and configure `.gitignore`
- [ ] Install Node.js v20 LTS and verify version
- [ ] Set up Supabase PostgreSQL project and copy connection string
- [ ] Set up Upstash Redis instance and copy REST URL + token
- [ ] Create `server/.env` with `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CERT_SIGNING_SECRET`, `PORT`
- [ ] Run `npm init -y` in `/server` and install core dependencies (express, prisma, @prisma/client, zod, jsonwebtoken, bcrypt, cors, helmet, morgan, dotenv)
- [ ] Install dev dependencies (typescript, tsx, @types/*, nodemon, prisma)
- [ ] Configure `tsconfig.json` with strict mode, ES2022 target, moduleResolution node
- [ ] Set up `nodemon.json` for hot reload
- [ ] Create folder structure (`src/routes`, `src/services`, `src/middleware`, `src/utils`, `src/lib`, `src/types`)
- [ ] Verify `npm run dev` boots blank Express server on port 4000

**Blockers Log:**
| Time | Issue | Resolution |
|---|---|---|
| — | — | — |

---

## 📅 PHASE 1 — Database Schema & Prisma Setup
**Duration:** Hour 2–8 | **Target Completion:** 100% by Hour 8

- [ ] Run `npx prisma init` and configure `schema.prisma` with PostgreSQL provider
- [ ] Define all 6 enums (TransactionStatus, RiskVerdict, ComplaintCategory, ComplaintStatus, LivenessVerdict, QrVerdict)
- [ ] Define User model with VPA index and bcrypt password field
- [ ] Define RiskEvent model with composite indexes (userId, createdAt)
- [ ] Define SafeCircleContact model with unique constraint on (ownerId, contactVpa)
- [ ] Define Complaint model with (againstVpa, createdAt) composite index
- [ ] Define LivenessSession model with escrowExpiresAt index
- [ ] Define MerchantRegistry model with (registeredVpa) unique + geo indexes
- [ ] Define Certificate model with SHA-256 hash and JWT signature fields
- [ ] Define FaceBlob model with BYTEA field and TTL cleanup index
- [ ] Define RefreshToken model with userId + expiresAt index
- [ ] Define Admin model with role field
- [ ] Define SimBankAccount, SimUpiHandle, SimTransaction models
- [ ] Add all 22 required indexes across tables
- [ ] Run `npx prisma migrate dev --name init` and verify migration success
- [ ] Run `npx prisma generate` to build client
- [ ] Create `src/lib/prisma.ts` singleton
- [ ] Write `prisma/seed.ts` with all 12 personas (real + typosquatted VPAs)
- [ ] Add 10 merchants to seed (with GPS coordinates for QR verification)
- [ ] Add corresponding SimBankAccount + SimUpiHandle for each persona
- [ ] Configure `package.json` prisma seed command
- [ ] Run `npx prisma db seed` and verify all data inserted
- [ ] Verify seeded data in Prisma Studio (`npx prisma studio`)

**Blockers Log:**
| Time | Issue | Resolution |
|---|---|---|
| — | — | — |

---

## 📅 PHASE 2 — Core Infrastructure (Redis, Middleware, Utils)
**Duration:** Hour 8–14 | **Target Completion:** 100% by Hour 14

- [ ] Create `src/lib/redis.ts` with Upstash client + in-memory Map fallback
- [ ] Implement Redis helper methods (get, set, del, sadd, smembers, sismember, expire)
- [ ] Create `src/utils/logger.ts` with structured JSON logging (info, warn, error levels)
- [ ] Create `src/utils/errors.ts` with custom error classes (AppError, AuthError, ValidationError, NotFoundError)
- [ ] Create `src/middleware/errorHandler.ts` (catches all errors, returns consistent JSON)
- [ ] Create `src/middleware/requestLogger.ts` (logs method, path, status, duration)
- [ ] Create `src/middleware/rateLimiter.ts` (Redis-backed sliding window, 100 req/min per IP)
- [ ] Create `src/middleware/auth.ts` (JWT verification, attaches `req.user`)
- [ ] Create `src/utils/money.ts` (BigInt paisa helpers: toPaisa, toRupees, format)
- [ ] Create `src/utils/crypto.ts` (SHA-256 hashing helpers, secure random)
- [ ] Configure global CORS, helmet, JSON body parser, cookie parser in `src/app.ts`
- [ ] Mount all middleware in correct order (logger → cors → helmet → parsers → rate limiter → routes → errorHandler)
- [ ] Create `src/lib/zodSchemas.ts` for shared Zod validators (VPA regex, phone, amount)
- [ ] Write health check endpoint `GET /health` returning DB + Redis status
- [ ] Test Redis fallback by killing Upstash connection (verify in-memory works)

**Blockers Log:**
| Time | Issue | Resolution |
|---|---|---|
| — | — | — |

---

## 📅 PHASE 3 — Auth System & User Management
**Duration:** Hour 14–22 | **Target Completion:** 100% by Hour 22

- [ ] Create `src/services/authService.ts` with hashPassword, verifyPassword (bcrypt, 12 rounds)
- [ ] Implement `generateAccessToken` (15-min TTL, HS256)
- [ ] Implement `generateRefreshToken` (7-day TTL, stored in DB + rotated)
- [ ] Implement `verifyAccessToken` and `verifyRefreshToken`
- [ ] Implement `revokeRefreshToken` (marks DB record as revoked)
- [ ] Create `src/routes/authRoutes.ts` with router setup
- [ ] Build `POST /auth/register` (Zod validation, unique VPA check, hash password, auto-create SimBankAccount)
- [ ] Build `POST /auth/login` (verify credentials, issue access + refresh, set refresh as httpOnly cookie)
- [ ] Build `POST /auth/refresh` (validates refresh cookie, rotates token, issues new access)
- [ ] Build `POST /auth/logout` (revokes refresh token in DB, clears cookie)
- [ ] Build `GET /auth/me` (returns current user profile via auth middleware)
- [ ] Add rate limit override on `/auth/login` (5 attempts / 15 min per IP)
- [ ] Write manual curl test suite for all 5 auth endpoints
- [ ] Verify JWT expiry, refresh rotation, and revocation flow end-to-end
- [ ] Coordinate token contract with F1 (share sample JWT payload structure)

**Blockers Log:**
| Time | Issue | Resolution |
|---|---|---|
| — | — | — |

---

## 📅 PHASE 4 — Safe Circle Module (Pillar 4)
**Duration:** Hour 22–30 | **Target Completion:** 100% by Hour 30

- [ ] Create `src/services/safeCircleService.ts`
- [ ] Implement `addContact(ownerId, contactVpa)` with max-20 enforcement + duplicate check
- [ ] Implement `removeContact(ownerId, contactId)` with ownership verification
- [ ] Implement `listContacts(ownerId)` with Redis cache-through pattern
- [ ] Implement `isInSafeCircle(ownerId, targetVpa)` — sub-10ms Redis SISMEMBER check
- [ ] Implement `invalidateCache(ownerId)` on add/remove
- [ ] Implement `checkAnomaly(vpa)` — counts complaints in last 30 days, returns boolean flag if ≥10
- [ ] Create `src/routes/safeCircleRoutes.ts`
- [ ] Build `GET /circle` (returns list + anomaly flags per contact)
- [ ] Build `POST /circle/add` (Zod validation: VPA format, target user exists)
- [ ] Build `DELETE /circle/:id` (verifies ownership, invalidates cache)
- [ ] Add unit test for `isInSafeCircle` cache hit performance (<10ms)
- [ ] Test cache invalidation flow (add → check → remove → re-check)
- [ ] Coordinate with F2 on Safe Circle contact JSON schema
- [ ] Verify anomaly banner data flows correctly to frontend

**Blockers Log:**
| Time | Issue | Resolution |
|---|---|---|
| — | — | — |

---

## 📅 PHASE 5 — Risk Engine (Pillar 1)
**Duration:** Hour 30–42 | **Target Completion:** 100% by Hour 42

- [ ] Create `src/services/riskEngine/` module folder
- [ ] Implement `src/services/riskEngine/levenshtein.ts` (dynamic programming edit distance)
- [ ] Implement `src/services/riskEngine/typoDetector.ts` (checks against known bank suffixes: @okhdfcbank, @okicici, @oksbi, @paytm, @ybl)
- [ ] Implement `src/services/riskEngine/algorithmicScorer.ts` (max 55 points: typo=25, new account age=10, amount anomaly=10, velocity=10)
- [ ] Implement `src/services/riskEngine/communityScorer.ts` (max 50 points: complaint count × severity × time decay factor)
- [ ] Implement time decay function (exponential decay over 90 days)
- [ ] Implement `src/services/riskEngine/graphScorer.ts` (max 15 bonus: adjacency to already-flagged users via SimTransaction history)
- [ ] Implement `src/services/riskEngine/index.ts` with `computeRisk(senderId, receiverVpa, amount)` orchestrator
- [ ] Implement Safe Circle short-circuit at top of `computeRisk` (returns PASS instantly)
- [ ] Implement verdict mapping (0–49=PASS, 50–74=WARN, 75–89=CHALLENGE, 90–100=BLOCK)
- [ ] Log each risk computation to RiskEvent table with breakdown JSON
- [ ] Cache VPA reputation in Redis (5-min TTL) for repeated lookups
- [ ] Build `POST /vpa/resolve` (returns receiver name, bank, risk verdict, reasons array)
- [ ] Build `POST /payment/initiate` (runs risk engine, returns verdict + payment intent ID)
- [ ] Test all 4 verdict paths with seeded personas (`@oksdi`, `@cdfc`, `@pytm`)
- [ ] Benchmark risk engine execution time (target <150ms cold, <50ms warm)
- [ ] Coordinate verdict JSON schema with F1 and F2

**Blockers Log:**
| Time | Issue | Resolution |
|---|---|---|
| — | — | — |

---

## 📅 PHASE 6 — Payment Orchestration & Simulated Rails
**Duration:** Hour 42–52 | **Target Completion:** 100% by Hour 52

- [ ] Create `src/services/paymentService.ts`
- [ ] Implement `resolveVpa(vpa)` (queries SimUpiHandle + attaches risk verdict)
- [ ] Implement `initiatePayment(senderId, receiverVpa, amount)` (validates balance, creates SimTransaction in PENDING state)
- [ ] Implement `confirmPayment(txnId, pin)` (validates simulated PIN, moves funds, updates status)
- [ ] Implement escrow logic: CHALLENGE verdict creates LivenessSession, holds funds for 600s
- [ ] Implement `POST /payment/confirm` endpoint with verdict-aware routing (PASS→direct, CHALLENGE→escrow, BLOCK→reject)
- [ ] Implement `GET /payment/history` with pagination (last 50 transactions)
- [ ] Build simulated PIN check (all seeded personas use PIN `1234` for demo)
- [ ] Implement double-entry ledger update (debit sender, credit receiver in SimBankAccount)
- [ ] Ensure BigInt arithmetic throughout (no floats for money)
- [ ] Handle insufficient balance error with clear JSON response
- [ ] Coordinate with B2 on LivenessSession creation contract (escrow trigger)
- [ ] Coordinate with F1 on payment state transitions (PENDING → ESCROW → COMPLETED / FAILED / REFUNDED)
- [ ] Test full payment flow via curl (PASS path)
- [ ] Test CHALLENGE path (funds held, LivenessSession created)
- [ ] Test BLOCK path (transaction rejected, no fund movement)

**Blockers Log:**
| Time | Issue | Resolution |
|---|---|---|
| — | — | — |

---

## 📅 PHASE 7 — Escrow Cron Job & Refund Logic
**Duration:** Hour 52–58 | **Target Completion:** 100% by Hour 58

- [ ] Create `src/jobs/escrowCleaner.ts` (runs every 60 seconds via setInterval)
- [ ] Query all LivenessSession records where `escrowExpiresAt < now()` AND status = PENDING
- [ ] For each expired session: mark session EXPIRED, refund SimTransaction (credit sender, debit escrow holding)
- [ ] Log refund event to RiskEvent with reason "ESCROW_TIMEOUT"
- [ ] Emit event/notification for F1 to poll (add `refundedAt` timestamp on SimTransaction)
- [ ] Register cron job in `src/index.ts` on server boot
- [ ] Handle graceful shutdown (clear intervals on SIGTERM)
- [ ] Test escrow expiry with 30-second override for local testing
- [ ] Verify no double-refund on concurrent runs (add DB-level lock or status guard)
- [ ] Coordinate with F1 on polling endpoint for escrow status updates

**Blockers Log:**
| Time | Issue | Resolution |
|---|---|---|
| — | — | — |

---

## 📅 PHASE 8 — Integration Testing & Cross-Team Sync
**Duration:** Hour 58–66 | **Target Completion:** 100% by Hour 66

- [ ] Integrate with B2's liveness verification endpoint (escrow release on success)
- [ ] Verify Certificate generation triggers on successful CHALLENGE flow
- [ ] Sync with F1 on complete E2E payment flow (login → pay → verdict → confirm → certificate)
- [ ] Sync with F2 on Safe Circle UI data contract (verify contacts render with anomaly flags)
- [ ] Run full scenario tests with all 12 seeded personas
- [ ] Test typosquat scenario (`@oksdi` → CHALLENGE verdict + escrow)
- [ ] Test Safe Circle bypass (add contact → payment → verify <10ms PASS)
- [ ] Test community complaint accumulation (file 10 complaints → observe risk score climb)
- [ ] Test graph adjacency bonus (pay flagged user → check score bonus)
- [ ] Load-test Redis fallback (kill Upstash, verify system stays up)
- [ ] Fix all cross-team integration bugs discovered
- [ ] Verify all 18 endpoints return correct HTTP codes and JSON shapes
- [ ] Update `API_EXAMPLES.md` with any schema changes discovered during integration

**Blockers Log:**
| Time | Issue | Resolution |
|---|---|---|
| — | — | — |

---

## 📅 PHASE 9 — Hardening, Deployment & Demo Prep
**Duration:** Hour 66–72 | **Target Completion:** 100% by Hour 72

- [ ] Add global uncaught exception + unhandled rejection handlers
- [ ] Verify all environment variables have production values on Render/Railway
- [ ] Deploy backend to Render/Railway with build + start commands
- [ ] Configure production `DATABASE_URL` (Supabase pooled connection)
- [ ] Run production migration + seed on deployed DB
- [ ] Verify production health check endpoint returns 200
- [ ] Configure CORS whitelist for deployed frontend URL
- [ ] Set NODE_ENV=production and verify logging switches to JSON only
- [ ] Test all 18 endpoints against production URL
- [ ] Verify Redis (Upstash) connection in production
- [ ] Prepare 3 demo scenarios: (1) typosquat CHALLENGE, (2) Safe Circle bypass, (3) BLOCK verdict
- [ ] Rehearse demo timing (target 4 minutes end-to-end)
- [ ] Handoff production credentials + monitoring links to team
- [ ] Final commit + tag `v1.0.0-hackathon`
- [ ] Update TRACKER_B1.md with final completion status

**Blockers Log:**
| Time | Issue | Resolution |
|---|---|---|
| — | — | — |

---

## 🚨 Global Blocker Log (Cross-Phase Issues)

| Phase | Time | Issue | Owner | Status | Resolution |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

---

## 🔄 Coordination Log (Sync Points with Other Devs)

| Time | With | Topic | Outcome |
|---|---|---|---|
| — | — | — | — |

---

## 📈 Hour-by-Hour Progress Journal

| Hour | Phase | Tasks Completed | Notes |
|---|---|---|---|
| 0 | 0 | — | Kickoff |
| 6 | — | — | — |
| 12 | — | — | — |
| 18 | — | — | — |
| 24 | — | — | — |
| 30 | — | — | — |
| 36 | — | — | — |
| 42 | — | — | — |
| 48 | — | — | — |
| 54 | — | — | — |
| 60 | — | — | — |
| 66 | — | — | — |
| 72 | 9 | — | Demo ready |

---

## ✅ Definition of Done (B1 Deliverables)

- [ ] All 13 Prisma tables migrated and seeded successfully
- [ ] All 5 auth endpoints functional with JWT rotation
- [ ] Risk Engine returns all 4 verdicts correctly across seeded scenarios
- [ ] Safe Circle bypass measured at <10ms (p99)
- [ ] Payment flow completes end-to-end for PASS, CHALLENGE, BLOCK paths
- [ ] Escrow cron job refunds expired sessions automatically
- [ ] All owned endpoints have Zod validation
- [ ] Backend deployed to production and reachable
- [ ] Zero unhandled exceptions in 30-minute soak test
- [ ] All coordination contracts confirmed with B2, F1, F2


**End of TRACKER_B1.md**  


