# SPYDE — Implementation Plan (Hour-by-Hour Build Roadmap)

**Document Version:** 1.0 (Round 2 Production Build)
**Owner:** Full Team (B1, B2, F1, F2)
**Total Build Window:** 72 Hours (3 Days) — Hackathon-Grade Sprint
**Status:** LOCKED — Deviations require team consensus.

---

## 0. Executive Summary

This document is the **single source of truth** for what gets built, when, and by whom. It breaks the 72-hour SPYDE build into **9 phases across 3 days**, with atomic tasks (2–6 hours each) assigned to one of four developers.

**Golden Rules:**
1. **No feature code before Phase 2.** Docs, scaffolding, and schema come first.
2. **Each phase ends with a commit + demo checkpoint.** If it doesn't run, it doesn't merge.
3. **Blocker escalation < 30 min.** If stuck, ping the team lead immediately.
4. **Every task has a "Definition of Done" checklist** — no partial merges.

---

## 1. Phase Overview

| Phase | Day | Hours | Focus | Owners | Exit Criteria |
|-------|-----|-------|-------|--------|---------------|
| **P0** | Day 0 (Pre-Build) | 4h | Docs Suite (Files 1–19) | All | All 19 MD files committed to `/docs` |
| **P1** | Day 1 | 0–6 | Scaffolding & Environment | B1, F1 | `npm run dev` boots on both client & server |
| **P2** | Day 1 | 6–14 | Database + Auth Core | B1, F1 | Login/Register works end-to-end with JWT |
| **P3** | Day 1 | 14–24 | Payment Skeleton + Simulated Rails | B1, F1 | Send ₹1 P2P transaction hits DB |
| **P4** | Day 2 | 24–34 | Risk Engine (Pillar 1) + Safe Circle (Pillar 4) | B1, F1 | Payment shows WARN/CHALLENGE/BLOCK modals |
| **P5** | Day 2 | 34–44 | Liveness (Pillar 2) + QR Verifier (Pillar 3) | B2, F2 | Camera detects blinks; QR scan returns verdict |
| **P6** | Day 2 | 44–48 | Complaints System + Community Signal Loop | B2, F2 | Filing complaint updates target's risk score |
| **P7** | Day 3 | 48–58 | Certificate (Pillar 5) + View-Once Face | B2, F2 | E2E encrypted face capture → 10s view → auto-delete |
| **P8** | Day 3 | 58–66 | Admin Dashboard + Polish + Seed Data | B1, F2 | 12 personas seeded; admin sees complaint queue |
| **P9** | Day 3 | 66–72 | Demo Rehearsal + Bug Bash + Deploy | All | 5-min demo runs 3x flawlessly on live URL |

---

## 2. Phase 0 — Documentation Suite (Pre-Build, 4 hours)

**Owner:** All (async, parallel review)
**Goal:** Lock every design decision on paper before writing a single line of feature code.

### 2.1 Deliverables (19 Files)

| # | File | Owner | Status |
|---|------|-------|--------|
| 1 | `README.md` | B1 | ✅ Done |
| 2 | `RULES.md` | B1 | ✅ Done |
| 3 | `PRD.md` | F1 | ✅ Done |
| 4 | `APPFLOW.md` | F1 | ✅ Done |
| 5 | `TECHSPEC.md` | B1 | ✅ Done |
| 6 | `IMPLEMENTATIONPLAN.md` | B1 | ➡️ **This file** |
| 7 | `SCHEMA.md` | B1 | ⏳ Next |
| 8 | `API_EXAMPLES.md` | B2 | ⏳ |
| 9 | `RISK_ENGINE.md` | B1 | ⏳ |
| 10 | `SAFE_CIRCLE.md` | B1 | ⏳ |
| 11 | `LIVENESS.md` | B2 | ⏳ |
| 12 | `CERTIFICATE.md` | B2 | ⏳ |
| 13 | `QR_TAMPER.md` | B2 | ⏳ |
| 14 | `DESIGN.md` | F2 | ⏳ |
| 15 | `LEARNING_NOTES.md` | All | ⏳ |
| 16 | `TRACKER_B1.md` | B1 | ⏳ |
| 17 | `TRACKER_B2.md` | B2 | ⏳ |
| 18 | `TRACKER_F1.md` | F1 | ⏳ |
| 19 | `TRACKER_F2.md` | F2 | ⏳ |

### 2.2 Definition of Done
- [ ] All 19 files committed to `main` branch under `/docs`.
- [ ] Zero `TODO`, `TBD`, or `<placeholder>` strings.
- [ ] Team walkthrough call (30 min) — everyone reads their assigned pillar doc aloud.

---

## 3. Phase 1 — Scaffolding & Environment (Day 1, Hours 0–6)

**Owners:** B1 (Server), F1 (Client)
**Goal:** Get both apps booting locally with hot-reload and a green healthcheck.

### 3.1 B1 Tasks (Server, 6h)

#### Task B1.1.1 — Repo Initialization (1h)
```bash
mkdir spyde && cd spyde
git init && git remote add origin <GITHUB_URL>
mkdir client server docs
touch .gitignore README.md
```
- [ ] Root `.gitignore` covers `node_modules`, `.env`, `dist`, `.DS_Store`, `*.log`
- [ ] MIT License added
- [ ] Move all 19 docs into `/docs`

#### Task B1.1.2 — Server Scaffold (2h)
```bash
cd server
npm init -y
npm i express cors helmet dotenv jsonwebtoken bcrypt zod
npm i @prisma/client prisma
npm i ioredis
npm i -D typescript @types/node @types/express @types/cors @types/jsonwebtoken @types/bcrypt tsx nodemon
npx tsc --init
npx prisma init
```
- [ ] `tsconfig.json` with `strict: true`, `target: "ES2022"`, `moduleResolution: "node"`
- [ ] Folder structure: `src/{routes,services,middleware,utils,types,config}`
- [ ] `src/index.ts` boots Express on port 5000 with `/health` endpoint
- [ ] `npm run dev` uses `tsx watch src/index.ts`

#### Task B1.1.3 — Environment Config (1h)
- [ ] Create `.env.example` with all keys listed in TECHSPEC §11
- [ ] `src/config/env.ts` uses Zod to validate env on boot — crashes if missing
- [ ] Supabase project created; DATABASE_URL added to local `.env`
- [ ] Upstash Redis project created; REDIS_URL added

#### Task B1.1.4 — Middleware Stack (1h)
- [ ] `helmet()` + `cors({ origin: CLIENT_URL })` + `express.json({ limit: '2mb' })`
- [ ] Global error handler middleware (catches Zod errors, JWT errors, DB errors)
- [ ] Request logger (method, path, status, duration)
- [ ] Rate limiter middleware stub (real rules added in P2)

#### Task B1.1.5 — Health & Ready Endpoints (1h)
- [ ] `GET /health` → `{ status: "ok", uptime, version }`
- [ ] `GET /ready` → checks DB + Redis connections, returns 503 if either down
- [ ] Commit + push to `main`

### 3.2 F1 Tasks (Client, 6h)

#### Task F1.1.1 — Vite + React Scaffold (1h)
```bash
cd client
npm create vite@latest . -- --template react-ts
npm i
npm i react-router-dom zustand framer-motion lucide-react axios
npm i -D tailwindcss postcss autoprefixer @types/react @types/react-dom
npx tailwindcss init -p
```
- [ ] Tailwind config includes `content: ['./index.html', './src/**/*.{ts,tsx}']`
- [ ] `src/index.css` has Tailwind directives
- [ ] Vite proxy configured: `/api` → `http://localhost:5000`

#### Task F1.1.2 — Folder Structure & Routing (2h)
- [ ] Structure: `src/{pages,components,hooks,stores,lib,types,assets}`
- [ ] React Router v6 setup with routes: `/`, `/login`, `/register`, `/home`, `/send`, `/scan`, `/circle`, `/complaints`, `/admin`
- [ ] `ProtectedRoute` HOC checks Zustand auth store, redirects to `/login`
- [ ] 404 page

#### Task F1.1.3 — Design System Primitives (2h)
- [ ] Color tokens in `tailwind.config.js` (primary, success, warn, danger, neutral scales)
- [ ] `<Button />` component with variants: primary, secondary, ghost, danger
- [ ] `<Input />` component with label, error state, helper text
- [ ] `<Card />`, `<Modal />`, `<Toast />` primitives
- [ ] `<Skeleton />` loader

#### Task F1.1.4 — Zustand Stores Stub (1h)
- [ ] `useAuthStore` — { user, token, login(), logout(), hydrate() }
- [ ] `usePaymentStore` — payment state machine skeleton (per APPFLOW)
- [ ] `useUIStore` — toasts, modals, loading flags
- [ ] Persist auth token to `localStorage`; hydrate on app mount

### 3.3 Phase 1 Exit Criteria
- [ ] `cd server && npm run dev` → boots, `/health` returns 200
- [ ] `cd client && npm run dev` → renders login page at `localhost:5173`
- [ ] Client can call `GET /api/health` through proxy
- [ ] Both apps committed to `main`; team pulls and confirms local boot

---

## 4. Phase 2 — Database + Auth Core (Day 1, Hours 6–14)

**Owners:** B1 (Schema + Auth API), F1 (Auth UI)
**Goal:** User can register, login, and hit a protected endpoint with a JWT.

### 4.1 B1 Tasks (8h)

#### Task B1.2.1 — Prisma Schema v1 (3h)
Write full schema in `prisma/schema.prisma` covering:
- [ ] `User` (id, phone, email, passwordHash, name, riskScore, createdAt)
- [ ] `SimBankAccount` (id, userId, ifsc, accountNumberMasked, balancePaisa)
- [ ] `SimUpiHandle` (id, userId, vpa, primaryFlag)
- [ ] `SimTransaction` (id, senderId, receiverVpa, amountPaisa, status, riskVerdict, createdAt)
- [ ] `RiskEvent` (id, userId, eventType, delta, reason, createdAt)
- [ ] `SafeCircleContact` (id, userId, contactVpa, contactName, addedAt)
- [ ] `Complaint` (id, complainantId, targetVpa, category, description, evidenceUrl, status, createdAt)
- [ ] `LivenessSession` (id, userId, challengeCode, score, verdict, createdAt)
- [ ] `MerchantRegistry` (id, vpa, businessName, verifiedFlag, geoLat, geoLng, radiusMeters)
- [ ] `Certificate` (id, transactionId, payloadHash, jwtSignature, faceBlobId, createdAt)
- [ ] `FaceBlob` (id, encryptedData, viewedFlag, expiresAt, createdAt)

Run:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

#### Task B1.2.2 — Auth Service (2h)
- [ ] `src/services/auth.service.ts`
  - `registerUser({ phone, email, password, name })` → bcrypt hash, create User + default SimBankAccount + SimUpiHandle
  - `loginUser({ phone, password })` → verify, return JWT (15min access + 7d refresh)
  - `refreshToken(refreshToken)` → issue new access token
- [ ] Zod schemas for all inputs
- [ ] Passwords: bcrypt cost 12

#### Task B1.2.3 — Auth Routes + Middleware (2h)
- [ ] `POST /api/auth/register`
- [ ] `POST /api/auth/login`
- [ ] `POST /api/auth/refresh`
- [ ] `POST /api/auth/logout` (invalidate refresh token in Redis)
- [ ] `authMiddleware` — verifies JWT, attaches `req.user`
- [ ] Rate limit: 5 register/hour/IP, 10 login/hour/IP

#### Task B1.2.4 — Seed Script v1 (1h)
- [ ] `prisma/seed.ts` creates 3 test users (Alice, Bob, Charlie) with SimBankAccount + SimUpiHandle
- [ ] `npm run seed` command in package.json

### 4.2 F1 Tasks (8h)

#### Task F1.2.1 — API Client (1h)
- [ ] `src/lib/api.ts` — Axios instance with baseURL, interceptors for JWT injection + 401 auto-refresh
- [ ] Typed API functions: `authApi.login()`, `authApi.register()`, `authApi.refresh()`

#### Task F1.2.2 — Login Screen (2h)
- [ ] `/login` page with phone + password inputs
- [ ] Zod client-side validation
- [ ] On success: store tokens in Zustand + localStorage, redirect to `/home`
- [ ] Error toasts for invalid credentials, rate limit

#### Task F1.2.3 — Register Screen (2h)
- [ ] `/register` page with 3-step wizard: phone → OTP mock → password + name
- [ ] Mock OTP is `123456`
- [ ] On success: auto-login, redirect to `/home`

#### Task F1.2.4 — Home Screen Shell (2h)
- [ ] Displays user name, balance (from `/api/me`), primary VPA
- [ ] 4 action cards: Send Money, Scan QR, Safe Circle, Complaints
- [ ] Bottom nav: Home, History, Circle, Profile

#### Task F1.2.5 — Logout + Session Guard (1h)
- [ ] Logout clears store + localStorage + calls `/api/auth/logout`
- [ ] Expired JWT triggers auto-logout with toast

### 4.3 Phase 2 Exit Criteria
- [ ] Register Alice → auto-login → see home screen with ₹10,000 balance
- [ ] Logout → login again → session restored
- [ ] Try accessing `/home` without token → redirected to `/login`
- [ ] Postman: `GET /api/me` with valid JWT returns user profile
- [ ] Commit tag: `v0.2-auth`

---

## 5. Phase 3 — Payment Skeleton + Simulated Rails (Day 1, Hours 14–24)

**Owners:** B1 (Payment API), F1 (Send Money UI)
**Goal:** Alice sends ₹1 to Bob's VPA; both balances update; transaction saved.

### 5.1 B1 Tasks (10h)

#### Task B1.3.1 — Payment Service Core (3h)
- [ ] `src/services/payment.service.ts`
  - `resolveVpa(vpa)` → returns receiver name, existence check
  - `initiatePayment({ senderId, receiverVpa, amountPaisa, note })` → creates PENDING transaction
  - `confirmPayment({ txId, pin })` → validates mock PIN `1234`, debits sender, credits receiver, marks SUCCESS
  - Uses Prisma `$transaction` for atomicity
- [ ] Idempotency key support (header `Idempotency-Key`, cached in Redis 24h)

#### Task B1.3.2 — Payment Routes (2h)
- [ ] `POST /api/vpa/resolve` — { vpa } → { name, exists, isMerchant }
- [ ] `POST /api/payment/initiate` — creates transaction, returns txId
- [ ] `POST /api/payment/confirm` — { txId, pin } → returns success + updated balance
- [ ] `GET /api/payment/history` — paginated transaction list
- [ ] `GET /api/me` — returns user profile + balance + primary VPA

#### Task B1.3.3 — Balance & VPA Helpers (2h)
- [ ] `getUserBalance(userId)` → sums SimBankAccount balances
- [ ] `getUserByVpa(vpa)` → joins SimUpiHandle → User
- [ ] Handles VPA case-insensitivity, whitespace trimming

#### Task B1.3.4 — Payment State Persistence (2h)
- [ ] Transaction states: PENDING → CONFIRMED → SUCCESS | FAILED
- [ ] `SimTransaction` row created at initiate, updated at confirm
- [ ] Timeout job: PENDING transactions > 5 min → FAILED

#### Task B1.3.5 — Integration Test Pass (1h)
- [ ] Postman collection: Register Alice → Login → Resolve Bob's VPA → Initiate ₹100 → Confirm → History shows txn
- [ ] Balances verified in DB

### 5.2 F1 Tasks (10h)

#### Task F1.3.1 — Payment State Machine (2h)
- [ ] Implement full state machine from APPFLOW §5 in `usePaymentStore`
- [ ] States: IDLE → RESOLVE → REVIEW → PIN → PROCESSING → SUCCESS | FAILED
- [ ] Actions: setVpa, resolveVpa, setAmount, enterPin, submit, reset

#### Task F1.3.2 — Send Money Screen (3h)
- [ ] `/send` page with VPA input + "Verify" button
- [ ] On verify → shows receiver name card
- [ ] Amount input with quick chips (₹100, ₹500, ₹1000)
- [ ] Note input (optional)
- [ ] "Proceed to Pay" button → PIN screen

#### Task F1.3.3 — PIN Screen (2h)
- [ ] 6-digit PIN pad with dots UI
- [ ] Haptic feedback on tap (navigator.vibrate)
- [ ] Submit → calls confirm API → routes to processing screen

#### Task F1.3.4 — Processing & Success/Failure Screens (2h)
- [ ] Processing: animated loader with "Verifying with bank..." text
- [ ] Success: green check, amount, receiver, timestamp, "Done" button
- [ ] Failure: red X, error message, "Try Again" button

#### Task F1.3.5 — Transaction History (1h)
- [ ] `/history` page with infinite scroll list
- [ ] Each row: receiver name, amount, date, status badge

### 5.3 Phase 3 Exit Criteria
- [ ] Alice sends ₹100 to `bob@spyde` → both balances update in DB
- [ ] History page shows the transaction
- [ ] Bad PIN shows error, correct PIN succeeds
- [ ] Commit tag: `v0.3-payments`

---

## 6. Phase 4 — Risk Engine (Pillar 1) + Safe Circle (Pillar 4) (Day 2, Hours 24–34)

**Owners:** B1 (Risk Engine + Safe Circle API), F1 (Risk Modals + Circle UI)
**Goal:** Payment to typosquatted VPA triggers WARN modal; adding contact to Safe Circle skips risk.

### 6.1 B1 Tasks (10h)

#### Task B1.4.1 — Algorithmic Risk Scorer (3h)
- [ ] `src/services/risk/algorithmic.service.ts`
  - Typo detection (Levenshtein distance vs. known handles) → +20
  - New payee check (never transacted before) → +10
  - High-value first transaction (>₹5000 to new payee) → +15
  - Odd-hour transaction (11pm–5am) → +5
  - Rapid successive transactions (>3 in 60s) → +10
  - Max cap: 55
- [ ] Returns `{ score, signals: [{ type, weight, reason }] }`

#### Task B1.4.2 — Community Risk Scorer (2h)
- [ ] `src/services/risk/community.service.ts`
  - Reads Complaint table for target VPA
  - Weighted by category (FRAUD=25, IMPERSONATION=20, SPAM=5)
  - Time decay: complaints >30 days old count 50%
  - Max cap: 50

#### Task B1.4.3 — Graph Bonus Scorer (2h)
- [ ] `src/services/risk/graph.service.ts`
  - If target VPA received money from ≥3 accounts that were later reported → +15
  - Simple query on SimTransaction + Complaint join
  - Cached in Redis 5 min per VPA

#### Task B1.4.4 — Risk Engine Orchestrator (2h)
- [ ] `src/services/risk/engine.service.ts`
  - `assessRisk({ senderId, receiverVpa, amountPaisa })` → runs 3 scorers in parallel
  - Sums scores → verdict: 0-49 PASS, 50-74 WARN, 75-89 CHALLENGE, 90-100 BLOCK
  - Returns full breakdown for UI display
- [ ] Integrate into `POST /api/payment/initiate` — response includes `{ txId, riskAssessment }`
- [ ] BLOCK verdict → transaction not created, returns 403

#### Task B1.4.5 — Safe Circle API (1h)
- [ ] `POST /api/circle/add` — { vpa, name }
- [ ] `DELETE /api/circle/:id`
- [ ] `GET /api/circle` — list all contacts
- [ ] Max 20 per user (enforced)
- [ ] Risk engine short-circuits if `receiverVpa` in sender's Safe Circle → verdict PASS immediately

### 6.2 F1 Tasks (10h)

#### Task F1.4.1 — Risk Assessment Modal Component (3h)
- [ ] `<RiskModal />` renders based on verdict
- [ ] PASS → no modal, proceed
- [ ] WARN (yellow): "This receiver seems suspicious" + top 3 signals + "Proceed" / "Cancel"
- [ ] CHALLENGE (orange): forces user to type receiver's name to confirm + Proceed / Cancel
- [ ] BLOCK (red): full-screen block page, "This transaction is blocked to protect you" + File Complaint CTA

#### Task F1.4.2 — Risk Signal Cards (2h)
- [ ] Each signal renders as pill: `⚠️ Typo detected: bob@oksbi is similar to bob@sbi (+20)`
- [ ] Community signals: `🚨 3 fraud complaints in last 30 days (+25)`
- [ ] Score meter: 0-100 gauge with color zones

#### Task F1.4.3 — Integrate Risk Into Payment Flow (2h)
- [ ] After initiate, if verdict != PASS, show modal
- [ ] User clicks Proceed → continue to PIN
- [ ] User clicks Cancel → reset state, back to home
- [ ] Track risk verdict in Zustand for analytics

#### Task F1.4.4 — Safe Circle Screen (3h)
- [ ] `/circle` page: list of contacts (avatar, name, VPA, remove button)
- [ ] "+ Add Contact" button opens modal with VPA input + name
- [ ] Empty state: "No trusted contacts yet"
- [ ] When adding, calls API + shows toast "Added to Safe Circle — payments skip risk checks"

### 6.3 Phase 4 Exit Criteria
- [ ] Send ₹500 to `bob@oksdi` (typo of `bob@sdi`) → WARN modal appears
- [ ] Send ₹100 to a VPA with 3 seeded complaints → CHALLENGE modal
- [ ] Send ₹100 to a fake ultra-high-risk VPA → BLOCK page
- [ ] Add Bob to Safe Circle → subsequent payments to Bob skip risk (verify in server logs <10ms)
- [ ] Commit tag: `v0.4-risk-engine`

---

## 7. Phase 5 — Liveness (Pillar 2) + QR Verifier (Pillar 3) (Day 2, Hours 34–44)

**Owners:** B2 (Liveness API + QR Verifier), F2 (Camera UI + Scanner UI)
**Goal:** High-risk payment triggers liveness camera; QR scan returns VERIFIED/UNVERIFIED/TAMPERED verdict.

### 7.1 B2 Tasks (10h)

#### Task B2.5.1 — Liveness Challenge API (2h)
- [ ] `POST /api/liveness/challenge` — issues 4-digit challenge code, TTL 60s in Redis
  - Returns `{ challengeId, code, expiresAt }`
- [ ] `POST /api/liveness/verify` — receives `{ challengeId, clientScore, faceEmbeddingHash }`
  - Validates challenge not expired
  - Server adds +25 if challenge acknowledged
  - Total score threshold: ≥75 = PASS
  - Stores in LivenessSession
- [ ] Rate limit: 5 challenges/min/user

#### Task B2.5.2 — Merchant Registry Seed (1h)
- [ ] Seed 10 merchants in MerchantRegistry with VPA, businessName, geoLat/Lng, radiusMeters
- [ ] Examples: `starbucks@spyde` (Bengaluru, 100m), `bigbazaar@spyde` (Delhi, 200m)

#### Task B2.5.3 — QR Verifier Service (3h)
- [ ] `src/services/qr.service.ts`
  - `verifyQR({ decodedPayload, clientGeoLat, clientGeoLng })`
  - Steps:
    1. Parse UPI QR (extract `pa=`, `pn=`, `am=`)
    2. Lookup VPA in MerchantRegistry
    3. If not registered → verdict UNVERIFIED (yellow)
    4. If registered but geo distance > radius → verdict TAMPERED (red) + reason
    5. If all match → verdict VERIFIED (green) + business name badge

#### Task B2.5.4 — QR Verify Route (1h)
- [ ] `POST /api/qr/verify` — { qrPayload, geoLat, geoLng } → verdict + details
- [ ] Logs to RiskEvent if TAMPERED

#### Task B2.5.5 — Merchant Admin CRUD (1h)
- [ ] `POST /api/admin/merchants` — add merchant
- [ ] `GET /api/admin/merchants` — list all
- [ ] Protected by admin role check

#### Task B2.5.6 — Integration Tests (2h)
- [ ] Postman: QR of registered merchant + correct geo → VERIFIED
- [ ] Same QR + wrong geo (500km away) → TAMPERED
- [ ] Random VPA → UNVERIFIED
- [ ] Liveness happy path + expired challenge

### 7.2 F2 Tasks (10h)

#### Task F2.5.1 — face-api.js Setup (2h)
- [ ] Install `face-api.js` + download models to `/public/models`
- [ ] `useFaceDetection` hook: loads models on mount, detects landmarks per frame
- [ ] Handles model loading state

#### Task F2.5.2 — Liveness Camera Screen (3h)
- [ ] `<LivenessCamera />` component
- [ ] Requests camera permission with clear rationale
- [ ] Live video feed with face bounding box overlay
- [ ] Instructions: "Blink twice, then say the code aloud"
- [ ] Shows 4-digit challenge code on screen
- [ ] Detects 2 blinks (eye aspect ratio drops <0.2 twice) → +40 client score
- [ ] YOLOv8n ONNX fallback for anti-spoof (mask/photo detection) → +35
- [ ] Submits `{ challengeId, clientScore, faceEmbeddingHash }` to server
- [ ] Zero raw image data sent

#### Task F2.5.3 — Liveness Result UI (1h)
- [ ] PASS → green check, continue payment
- [ ] FAIL → red X with reason, allow 1 retry then block payment
- [ ] Loading state during server verification

#### Task F2.5.4 — QR Scanner Screen (2h)
- [ ] `/scan` page using `html5-qrcode`
- [ ] Requests camera + geolocation permission
- [ ] Continuous scan mode
- [ ] On detect → decode, get lat/lng, call `/api/qr/verify`

#### Task F2.5.5 — QR Verdict Overlay (2h)
- [ ] VERIFIED (green): shows business name badge, "Proceed to Pay" button
- [ ] UNVERIFIED (yellow): "This QR is not verified. Proceed with caution." + Proceed / Cancel
- [ ] TAMPERED (red): full-screen alert, "This QR appears tampered — do NOT scan. Location mismatch detected." + File Complaint

### 7.3 Phase 5 Exit Criteria
- [ ] Trigger CHALLENGE verdict → liveness camera opens → user blinks 2x → passes → payment continues
- [ ] Scan valid merchant QR from correct location → VERIFIED
- [ ] Scan valid QR but spoof geo (browser dev tools) → TAMPERED alert
- [ ] Face embedding hash sent to server (verified in network tab, no raw pixels)
- [ ] Commit tag: `v0.5-cv-pillars`

---

## 8. Phase 6 — Complaints System + Community Signal Loop (Day 2, Hours 44–48)

**Owners:** B2 (Complaint API), F2 (Complaint UI)
**Goal:** User files complaint against VPA; that VPA's community score updates immediately.

### 8.1 B2 Tasks (4h)

#### Task B2.6.1 — Complaint Service (2h)
- [ ] `POST /api/complaints` — { targetVpa, category, description, evidenceUrl? }
  - Categories: FRAUD, IMPERSONATION, SPAM, HARASSMENT, OTHER
  - Status starts as PENDING
  - Duplicate check: same user + same VPA within 24h → 409
- [ ] `GET /api/complaints/me` — user's filed complaints
- [ ] `GET /api/complaints/against/:vpa` — count + summary (public)

#### Task B2.6.2 — Community Score Refresh (1h)
- [ ] On complaint create, invalidate Redis cache for that VPA's community score
- [ ] Next risk assessment recomputes fresh

#### Task B2.6.3 — Admin Moderation API (1h)
- [ ] `PATCH /api/admin/complaints/:id` — { status: VERIFIED | REJECTED }
- [ ] VERIFIED complaints get 1.5x weight in community score

### 8.2 F2 Tasks (4h)

#### Task F2.6.1 — File Complaint Screen (2h)
- [ ] `/complaints/new` page with VPA input, category dropdown, description textarea
- [ ] Optional evidence upload (URL only for now, no file storage)
- [ ] Submit → success toast, redirect to `/complaints`

#### Task F2.6.2 — My Complaints List (1h)
- [ ] `/complaints` shows user's filed complaints with status badges

#### Task F2.6.3 — Post-Block Complaint CTA (1h)
- [ ] BLOCK modal has "File Complaint" button → pre-fills target VPA
- [ ] TAMPERED QR overlay has "Report This Merchant" button

### 8.3 Phase 6 Exit Criteria
- [ ] Alice files FRAUD complaint against Charlie's VPA
- [ ] Bob then tries to pay Charlie → community score increased, WARN triggered
- [ ] Commit tag: `v0.6-complaints`

---

## 9. Phase 7 — Certificate (Pillar 5) + View-Once Face (Day 3, Hours 48–58)

**Owners:** B2 (Certificate Signer + Face Blob API), F2 (Face Capture + View-Once UI)
**Goal:** Successful payment issues signed certificate; optional consent captures encrypted face, sender views once with countdown.

### 9.1 B2 Tasks (5h)

#### Task B2.7.1 — Certificate Signer Service (2h)
- [ ] `src/services/certificate.service.ts`
  - `issueCertificate(transactionId)`:
    - Fetch transaction details
    - Build payload: `{ txId, sender, receiver, amount, timestamp, riskVerdict }`
    - Compute SHA-256 hash of payload
    - Sign with server private key (HS256 JWT for demo)
    - Store in Certificate table
    - Returns `{ certificateId, payloadHash, signature }`
- [ ] Called automatically at payment SUCCESS

#### Task B2.7.2 — Certificate Verify Endpoint (1h)
- [ ] `GET /api/certificates/:id` — returns payload + signature
- [ ] `POST /api/certificates/verify` — { certificateId, providedHash } → valid/invalid

#### Task B2.7.3 — Face Blob API (2h)
- [ ] `POST /api/face-blob` — { encryptedData, txId } → returns blobId (max 500KB)
- [ ] `GET /api/face-blob/:id` — returns encrypted blob if not viewed + not expired (24h TTL)
- [ ] `POST /api/face-blob/:id/mark-viewed` — sets viewedFlag=true, schedules deletion in 60s
- [ ] Background cleanup job: deletes viewed/expired blobs every 5 min

### 9.2 F2 Tasks (5h)

#### Task F2.7.1 — Consent Modal (Receiver Side) (1h)
- [ ] After receiver completes payment, show optional modal: "Share a quick photo with sender for their records? This will be viewable ONCE for 10 seconds."
- [ ] Decline → no capture, continue

#### Task F2.7.2 — Face Capture + Client-Side Encryption (2h)
- [ ] Capture 200x200 photo via canvas from webcam
- [ ] Generate AES-256-GCM key with WebCrypto
- [ ] Encrypt image blob
- [ ] Upload encrypted blob to server
- [ ] Send decryption key to sender via receipt metadata (encrypted with sender's session key)
- [ ] Wipe local plaintext image from memory

#### Task F2.7.3 — Sender View-Once UI (2h)
- [ ] On receipt screen, if faceBlobId present, show "View Confirmation Photo (Once)" button
- [ ] On click: fetch blob → decrypt with WebCrypto → render image
- [ ] 10-second countdown timer overlay
- [ ] At 0: image fades out, blob deleted server-side, key destroyed client-side
- [ ] Cannot be re-viewed (button removed, marked as viewed in state)

#### Task F2.7.4 — Certificate Viewer (1h)
- [ ] `/certificate/:id` page shows: transaction details, payload hash, signature, "Verify Signature" button
- [ ] QR code renders certificate ID for external verification

### 9.3 Phase 7 Exit Criteria
- [ ] Payment SUCCESS → certificate auto-issued and visible on receipt
- [ ] Verify signature button returns valid
- [ ] Receiver consents to face capture → sender sees photo for 10s exactly → auto-deletes
- [ ] Blob 404s on second view attempt
- [ ] Network tab: no plaintext image ever sent
- [ ] Commit tag: `v0.7-certificate`

---

## 10. Phase 8 — Admin Dashboard + Polish + Seed Data (Day 3, Hours 58–66)

**Owners:** B1 (Admin API + Seed), F2 (Admin UI + Polish)
**Goal:** Admin can view complaints queue, moderate them, and see fraud analytics. 12 personas seeded for demo.

### 10.1 B1 Tasks (4h)

#### Task B1.8.1 — Full 12-Persona Seed Script (2h)
- [ ] Extend `prisma/seed.ts` with all 12 personas per spec
- [ ] Includes typosquatted handles: `@oksdi`, `@cdfc`, `@pytm`, `@ypl`, `@bbank`, `@okhdfc`, `@oksbi`, `@paytm`, `@ybl`
- [ ] Pre-seed 15 complaints across various fraud VPAs
- [ ] Pre-seed transaction history for realistic graph analysis
- [ ] `npm run seed:reset` — clears + re-seeds

#### Task B1.8.2 — Admin Analytics Endpoints (2h)
- [ ] `GET /api/admin/stats` — total users, transactions, complaints, blocked payments
- [ ] `GET /api/admin/top-flagged` — top 10 VPAs by complaint count
- [ ] `GET /api/admin/risk-distribution` — histogram of risk scores across recent txns
- [ ] Admin role guard middleware

### 10.2 F2 Tasks (4h)

#### Task F2.8.1 — Admin Dashboard Page (2h)
- [ ] `/admin` page with 4 stat cards (users, txns, complaints, blocks)
- [ ] Top flagged VPAs table
- [ ] Risk distribution chart (simple bar chart, no library needed)

#### Task F2.8.2 — Complaint Moderation Queue (1h)
- [ ] Table of pending complaints with actions: Verify | Reject
- [ ] Filter by category, sort by date

#### Task F2.8.3 — Global Polish Pass (1h)
- [ ] All buttons have loading states
- [ ] All async actions have error toasts
- [ ] Empty states designed for all lists
- [ ] Consistent spacing/padding audit
- [ ] Mobile responsive check on all screens

### 10.3 Phase 8 Exit Criteria
- [ ] `npm run seed:reset` populates all 12 personas + realistic data
- [ ] Admin logs in → sees dashboard with real stats
- [ ] Can verify/reject a complaint
- [ ] Zero visual bugs on mobile viewport
- [ ] Commit tag: `v0.8-admin`

---

## 11. Phase 9 — Demo Rehearsal + Bug Bash + Deploy (Day 3, Hours 66–72)

**Owners:** All hands on deck
**Goal:** Deployed live URL, 5-min demo runs 3 times flawlessly, all bugs squashed.

### 11.1 Deployment (2h)

#### Task ALL.9.1 — Server Deploy (Railway or Render)
- [ ] Deploy server to Railway (auto-detects Node)
- [ ] Environment variables set (DATABASE_URL, REDIS_URL, JWT_SECRET, etc.)
- [ ] Run `prisma migrate deploy` on first boot
- [ ] Run seed script once
- [ ] `/health` returns 200 on public URL

#### Task ALL.9.2 — Client Deploy (Vercel)
- [ ] Deploy client to Vercel
- [ ] `VITE_API_URL` env var points to Railway server
- [ ] Test full auth + payment flow on live URL
- [ ] Face-api models load correctly (public folder)

### 11.2 Demo Script Rehearsal (2h)

**5-Minute Demo Flow:**
1. **0:00–0:30** — Problem intro: "₹1,000 Cr lost to UPI fraud in 2024"
2. **0:30–1:00** — Login as Alice, show clean home screen
3. **1:00–1:45** — Send ₹500 to `bob@oksbi` (safe) → PASS, success
4. **1:45–2:30** — Send ₹500 to `bob@oksdi` (typo) → WARN modal shows typo signal → Cancel
5. **2:30–3:15** — Scan tampered QR → TAMPERED alert (geo mismatch)
6. **3:15–4:00** — Send ₹5000 to high-risk VPA → CHALLENGE → liveness camera → blink 2x → pass → payment
7. **4:00–4:30** — Complete payment with consent → view face for 10s → auto-delete
8. **4:30–5:00** — Show certificate + admin dashboard with real fraud stats

- [ ] Team runs full demo 3x, timing each attempt
- [ ] Assign backup device per developer in case of failure
- [ ] Screenshot every screen for slide deck backup

### 11.3 Bug Bash (2h)

- [ ] Every dev tries to break every feature for 30 min
- [ ] Log bugs in shared sheet with severity (P0/P1/P2)
- [ ] Fix all P0s (blockers) + top 5 P1s
- [ ] Skip P2s (nice-to-haves)

### 11.4 Final Checks
- [ ] All 4 trackers (`TRACKER_B1.md` etc.) updated with % completion
- [ ] `LEARNING_NOTES.md` has 5+ entries per developer
- [ ] README has live demo URL + demo credentials
- [ ] Commit tag: `v1.0-demo-ready`

---

## 12. Team Communication Protocol

### 12.1 Daily Sync Cadence
- **09:00** — 15-min standup: yesterday, today, blockers
- **14:00** — 10-min midday check: on track?
- **20:00** — 20-min end-of-day: demo current progress, merge to `main`

### 12.2 Branch Strategy
- `main` — always deployable
- `feat/<name>-<task-id>` — one branch per task
- PR requires 1 review from same-role peer (B1↔B2, F1↔F2)
- No PR > 500 lines (split if bigger)

### 12.3 Blocker Escalation
- **< 30 min stuck** → try one Google + one AI query
- **30–60 min stuck** → post in team chat with error + attempted fixes
- **> 60 min stuck** → pair with peer or lead

### 12.4 Commit Message Format
```
<type>(<scope>): <subject>

feat(risk): add graph bonus scorer
fix(auth): resolve refresh token race condition
docs(schema): update User table with riskScore field
chore(deps): bump prisma to 5.10
```

---

## 13. Risk Matrix (Build Risks)

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| face-api.js models slow on low-end mobile | Medium | High | Preload models on login, show "Preparing camera..." spinner |
| Supabase free tier hits limits | Low | High | Have local Postgres backup script ready |
| Upstash Redis latency spikes | Low | Medium | In-memory fallback already coded (per TECHSPEC) |
| Deploy fails on demo day | Medium | Critical | Have local demo backup with ngrok tunnel |
| Team member gets sick | Low | High | Cross-train: each pillar has secondary owner |
| Feature scope creep | High | High | This doc is LOCKED — no additions during build |

---

## 14. Definition of "Done" (Project-Wide)

A feature is DONE when:
- [ ] Code merged to `main` with passing build
- [ ] Manual test covers happy path + 1 error path
- [ ] Corresponding tracker file updated
- [ ] Demo-able in <30 seconds without setup
- [ ] Zero console errors or warnings
- [ ] No hardcoded secrets or magic values

---

## 15. Post-Hackathon (Out of Scope, For Future)

Deferred to v2 (not built during 72h):
- Real bank API integration (currently simulated)
- ML-based risk scoring (currently heuristic)
- iOS/Android native apps (web-only for demo)
- Multi-language support (English only)
- SMS/email notifications (in-app only)
- Merchant onboarding portal (admin adds manually)
- Compliance audits (DPDP self-attested only)

---

## 16. Sign-Off

| Role | Name | Approval | Date |
|------|------|----------|------|
| Backend Lead (B1) | ______ | ⬜ | ______ |
| Backend Support (B2) | ______ | ⬜ | ______ |
| Frontend Lead (F1) | ______ | ⬜ | ______ |
| Frontend Support (F2) | ______ | ⬜ | ______ |

**Once signed, this plan is FROZEN. Any changes require unanimous team approval and update to this document.**

---

**End of File 6 of 19 — `IMPLEMENTATIONPLAN.md`**

Next: **File 7 of 19 — `SCHEMA.md`** (Complete Prisma schema with every field, relation, index, and constraint documented.)
