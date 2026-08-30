# ⚙️ TECHSPEC.md — SPYDE Technical Specification

**Product:** SPYDE v2.0  
**Document Owner:** Team Lead  
**Primary Consumers:** All developers  
**Last Updated:** Build Phase Start  

> Stack decisions in this document are **final**.  
> Do not introduce alternative libraries without a team vote logged in `LEARNING_NOTES.md`.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Tech Stack (Locked)](#2-tech-stack-locked)
3. [Repository Structure](#3-repository-structure)
4. [Backend Architecture](#4-backend-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Data Layer](#6-data-layer)
7. [Auth & Session Architecture](#7-auth--session-architecture)
8. [API Design Principles](#8-api-design-principles)
9. [Real-time & Caching Strategy](#9-real-time--caching-strategy)
10. [Computer Vision Pipeline](#10-computer-vision-pipeline)
11. [Encryption & Cryptography](#11-encryption--cryptography)
12. [Environment Variables](#12-environment-variables)
13. [Performance Budgets](#13-performance-budgets)
14. [Error Handling Strategy](#14-error-handling-strategy)
15. [Logging & Observability](#15-logging--observability)
16. [Security Architecture](#16-security-architecture)
17. [Deployment Topology](#17-deployment-topology)
18. [Local Development Setup](#18-local-development-setup)
19. [CI/CD Pipeline (Target)](#19-cicd-pipeline-target)
20. [Dependency Manifest](#20-dependency-manifest)
21. [Decision Log (ADRs)](#21-decision-log-adrs)

---

## 1. System Architecture

### 1.1 High-Level Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT (Browser)                             │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  React 18 + Vite + TypeScript + Tailwind + Zustand                │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌───────────┐  │  │
│  │  │ Auth UI │ │ Payment  │ │ Liveness │ │QR Scan │ │Certificate│  │  │
│  │  │  (F1)   │ │Flow (F1) │ │  CV (F2) │ │  (F2)  │ │  UI (F2)  │  │  │
│  │  └─────────┘ └──────────┘ └────┬─────┘ └───┬────┘ └───────────┘  │  │
│  │                                │           │                      │  │
│  │                     face-api.js│    html5-qrcode                  │  │
│  │                     YOLOv8n    │    Geolocation API               │  │
│  │                     ONNX Web   │                                  │  │
│  │                     WebCrypto  │                                  │  │
│  └────────────────────────────────┼───────────┼──────────────────────┘  │
│                                   │           │                         │
└───────────────────────────────────┼───────────┼─────────────────────────┘
                                    │ HTTPS     │
                                    │ JWT Cookie│
┌───────────────────────────────────▼───────────▼─────────────────────────┐
│                         API GATEWAY (Express)                           │
│                        Node.js 20 + TypeScript                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ Middleware Pipeline                                             │    │
│  │ helmet → cors → morgan → cookieParser → json → auth → validate  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │  Auth    │ │  Risk    │ │ Safe     │ │ Payment  │ │ Wallet   │     │
│  │ Service  │ │ Engine   │ │ Circle   │ │ Service  │ │ Service  │     │
│  │  (B1)    │ │  (B1)    │ │  (B1)    │ │  (B1)    │ │  (B1)    │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│  │ Liveness │ │   QR     │ │  Cert    │ │Complaint │                  │
│  │ Service  │ │ Verifier │ │  Signer  │ │ Service  │                  │
│  │  (B2)    │ │  (B2)    │ │  (B2)    │ │  (B2)    │                  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                  │
│                                                                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐    │
│  │  Prisma ORM    │  │  Redis Client  │  │  Crypto Utils          │    │
│  │  (type-safe)   │  │  (Upstash /    │  │  (SHA-256, JWT, AES    │    │
│  │                │  │   in-memory)   │  │   helpers — no face    │    │
│  └───────┬────────┘  └───────┬────────┘  │   decrypt on server)   │    │
│          │                   │           └────────────────────────┘    │
└──────────┼───────────────────┼─────────────────────────────────────────┘
           │                   │
           ▼                   ▼
┌──────────────────┐  ┌──────────────────┐
│   PostgreSQL     │  │     Redis        │
│   (Supabase)     │  │   (Upstash)      │
│                  │  │                  │
│ • users          │  │ • otp:{phone}    │
│ • sessions       │  │ • session blacklist│
│ • safe_circle    │  │ • rate limits    │
│ • complaints     │  │ • liveness codes │
│ • risk_assessments│ │ • safe circle    │
│ • liveness       │  │   cache (optional)│
│ • certificates   │  │                  │
│ • face_blobs     │  │                  │
│ • sim_* tables   │  │                  │
│ • merchants      │  │                  │
└──────────────────┘  └──────────────────┘
```

### 1.2 Request Lifecycle

```
Browser
  │
  │ 1. User action (tap Pay)
  ▼
apiClient.ts
  │ 2. Attach JWT cookie / Authorization header
  │ 3. JSON serialize body
  ▼
Express Middleware Chain
  │ 4. helmet (security headers)
  │ 5. cors (origin check)
  │ 6. morgan (request log)
  │ 7. cookieParser
  │ 8. express.json
  │ 9. authenticateToken (JWT verify → req.user)
  │10. Zod schema parse (route-level)
  ▼
Route Handler
  │11. Call service layer
  ▼
Service Layer
  │12. Business logic
  │13. Prisma queries / Redis ops
  │14. Compose result
  ▼
Route Handler
  │15. res.json({ success: true, data })
  ▼
apiClient.ts
  │16. Normalize response
  │17. On 401 → attempt refresh → retry once
  ▼
Zustand Store / Component
  │18. Update state → re-render UI
```

### 1.3 Simulation Boundary

```
┌─────────────────────────────────────────────────┐
│                 REAL LAYER                      │
│  Auth · JWT · Device FP · Safe Circle · Risk   │
│  Engine · Liveness · QR Verify · Certificates  │
│  · Complaints · All fraud logic                │
├─────────────────────────────────────────────────┤
│              SIMULATION BOUNDARY                │
│         (sim_* tables + payment service)        │
├─────────────────────────────────────────────────┤
│               SIMULATED LAYER                   │
│  Bank accounts · UPI IDs · Balances · PIN      │
│  · Transaction ledger · Merchant GPS registry  │
└─────────────────────────────────────────────────┘

Future: replace Simulated Layer with real PSP/NPCI
adapters without touching Real Layer.
```

---

## 2. Tech Stack (Locked)

### 2.1 Frontend

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | React | 18.3.x | UI library |
| Bundler | Vite | 5.4.x | Dev server + build |
| Language | TypeScript | 5.6.x | Type safety |
| Styling | Tailwind CSS | 3.4.x | Utility-first CSS |
| State | Zustand | 4.5.x | Global state |
| Animation | Framer Motion | 11.x | Transitions, gestures |
| Icons | Lucide React | 0.441.x | Icon set |
| Routing | React Router DOM | 6.x | Client routing |
| HTTP | Fetch wrapper (`apiClient`) | custom | API calls |
| Forms/Validation | Zod | 3.23.x | Shared schemas |
| Class merging | clsx + tailwind-merge | latest | Conditional classes |
| QR Scanning | html5-qrcode | 2.3.x | Camera QR decode |
| Face Landmarks | face-api.js | 0.22.x | Blink + 68-point mesh |
| Anti-Spoof | onnxruntime-web | 1.19.x | YOLOv8n inference |
| Crypto | Web Crypto API | native | AES-256-GCM client-side |
| PDF (cert) | jspdf (optional) | latest | Certificate download |

### 2.2 Backend

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js | 20.x LTS | Server runtime |
| Framework | Express | 4.21.x | HTTP framework |
| Language | TypeScript | 5.6.x | Type safety |
| ORM | Prisma | 5.19.x | Type-safe DB access |
| Validation | Zod | 3.23.x | Request validation |
| Auth | jsonwebtoken | 9.x | JWT sign/verify |
| Password hash | bcryptjs | 2.4.x | (future-proofing) |
| Cache | @upstash/redis | 1.34.x | Redis REST client |
| Security | helmet | 7.x | HTTP headers |
| CORS | cors | 2.8.x | Origin control |
| Cookies | cookie-parser | 1.4.x | Cookie parsing |
| Logging | morgan | 1.10.x | HTTP request logs |
| Env | dotenv + Zod | — | Typed env validation |
| Dev runner | tsx | 4.x | TS execute + watch |

### 2.3 Databases

| Store | Provider | Purpose |
|---|---|---|
| PostgreSQL 15+ | Supabase (or local) | Primary relational store |
| Redis 6+ | Upstash REST (or in-memory fallback) | OTP, sessions, rate limits, challenges |

### 2.4 Explicitly Rejected Alternatives

| Rejected | Why |
|---|---|
| Next.js | Overkill; we need a pure SPA + separate API for clear B2B middleware demo |
| Redux / Redux Toolkit | Too heavy; Zustand is sufficient for our store count |
| styled-components / Emotion | Tailwind is faster to write and closer to design tokens |
| TypeORM / Sequelize | Prisma has superior TS inference and migrations DX |
| Passport.js | Overkill for phone OTP + JWT; we own the auth flow |
| Socket.io | No real-time requirement in v2 |
| GraphQL | REST is simpler for 4-dev team and B2B API clarity |
| MongoDB | Relational data (users, txns, complaints) fits SQL better |
| Jest | Vitest is faster and Vite-native |
| Moment.js | Use native `Date` + `Intl` |
| axios | Native fetch is enough with a thin wrapper |

---

## 3. Repository Structure

```
spyde/
├── package.json                 # Monorepo scripts only
├── .gitignore
├── .prettierrc
├── README.md
├── RULES.md
├── PRD.md
├── APPFLOW.md
├── TECHSPEC.md                  ← this file
├── SCHEMA.md
├── API_EXAMPLES.md
├── RISK_ENGINE.md
├── SAFE_CIRCLE.md
├── LIVENESS.md
├── CERTIFICATE.md
├── QR_TAMPER.md
├── DESIGN.md
├── IMPLEMENTATIONPLAN.md
├── LEARNING_NOTES.md
├── TRACKER_B1.md
├── TRACKER_B2.md
├── TRACKER_F1.md
├── TRACKER_F2.md
│
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── .env                     # gitignored
│   ├── prisma/
│   │   ├── schema.prisma        # B1 owns
│   │   ├── seed.ts              # B1 owns
│   │   └── migrations/          # generated
│   └── src/
│       ├── app.ts               # Entry point
│       ├── config/
│       │   ├── env.ts           # Zod-validated env
│       │   ├── redis.ts         # Redis + memory fallback
│       │   └── jwt.ts           # Sign/verify helpers
│       ├── db/
│       │   └── prisma.ts        # Singleton PrismaClient
│       ├── middleware/
│       │   ├── auth.middleware.ts
│       │   ├── error.middleware.ts
│       │   ├── rateLimit.middleware.ts
│       │   └── validate.middleware.ts
│       ├── routes/
│       │   ├── index.ts         # Mount all routers
│       │   ├── auth.routes.ts           # B1
│       │   ├── safeCircle.routes.ts     # B1
│       │   ├── risk.routes.ts           # B1
│       │   ├── payment.routes.ts        # B1
│       │   ├── wallet.routes.ts         # B1
│       │   ├── liveness.routes.ts       # B2
│       │   ├── qr.routes.ts             # B2
│       │   ├── certificate.routes.ts    # B2
│       │   └── complaints.routes.ts     # B2
│       ├── services/
│       │   ├── auth.service.ts          # B1
│       │   ├── safeCircle.service.ts    # B1
│       │   ├── payment.service.ts       # B1
│       │   ├── wallet.service.ts        # B1
│       │   ├── risk/
│       │   │   ├── engine.ts            # B1 — orchestrator
│       │   │   ├── algorithmic.ts       # B1 — Layer 1
│       │   │   ├── community.ts         # B1 — Layer 2
│       │   │   └── network.ts           # B1 — Bonus layer
│       │   ├── liveness.service.ts      # B2
│       │   ├── qr.service.ts            # B2
│       │   ├── certificate.service.ts   # B2
│       │   └── complaint.service.ts     # B2
│       ├── schemas/
│       │   ├── auth.schema.ts
│       │   ├── payment.schema.ts
│       │   ├── risk.schema.ts
│       │   ├── safeCircle.schema.ts
│       │   ├── liveness.schema.ts
│       │   ├── qr.schema.ts
│       │   ├── certificate.schema.ts
│       │   └── complaint.schema.ts
│       ├── types/
│       │   └── index.ts
│       └── utils/
│           ├── asyncHandler.ts
│           ├── crypto.ts            # SHA-256, random, hashing
│           ├── geo.ts               # Haversine distance
│           ├── canonical.ts         # Canonical JSON serialize
│           └── response.ts          # success/error helpers
│
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── public/
    │   ├── models/                  # face-api.js weights + yolov8n.onnx
    │   │   ├── tiny_face_detector_model-weights_manifest.json
    │   │   ├── tiny_face_detector_model-shard1
    │   │   ├── face_landmark_68_model-weights_manifest.json
    │   │   ├── face_landmark_68_model-shard1
    │   │   ├── face_expression_model-weights_manifest.json
    │   │   └── yolov8n.onnx
    │   └── vite.svg
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── vite-env.d.ts
        ├── lib/
        │   ├── apiClient.ts         # F1 — central HTTP
        │   ├── mediaPermissions.ts  # F2
        │   ├── crypto.ts            # F2 — WebCrypto AES-GCM
        │   └── cn.ts                # clsx + twMerge helper
        ├── stores/
        │   ├── authStore.ts         # F1
        │   ├── paymentStore.ts      # F1
        │   ├── safeCircleStore.ts   # F1
        │   └── livenessStore.ts     # F2
        ├── components/
        │   ├── common/              # Shared (F1+F2)
        │   │   ├── Button.tsx
        │   │   ├── Modal.tsx
        │   │   ├── Toast.tsx
        │   │   ├── Input.tsx
        │   │   ├── Spinner.tsx
        │   │   ├── Skeleton.tsx
        │   │   └── ErrorBoundary.tsx
        │   ├── layout/
        │   │   ├── AppShell.tsx     # F1
        │   │   ├── BottomNav.tsx    # F1
        │   │   └── Header.tsx       # F1
        │   ├── auth/                # F1
        │   ├── payment/             # F1
        │   ├── safeCircle/          # F1
        │   ├── liveness/            # F2
        │   ├── qr/                  # F2
        │   ├── certificate/         # F2
        │   ├── complaint/           # F2
        │   └── admin/               # F2
        ├── pages/
        │   ├── SplashPage.tsx
        │   ├── auth/
        │   ├── home/
        │   ├── payment/
        │   ├── safeCircle/
        │   ├── liveness/
        │   ├── qr/
        │   ├── certificate/
        │   ├── complaints/
        │   └── admin/
        ├── hooks/
        │   ├── useAuth.ts
        │   ├── useRequireAuth.ts
        │   └── useMediaQuery.ts
        ├── types/
        │   └── index.ts
        └── utils/
            ├── format.ts            # currency, phone mask, date
            └── vpa.ts               # VPA regex + chips
```

---

## 4. Backend Architecture

### 4.1 Layering Rules

```
routes/  →  thin  →  parse + validate + call service + return
services/ → thick → all business logic, DB, Redis, scoring
utils/   → pure  → no HTTP, no DB side effects where possible
```

**Routes never touch Prisma directly.**  
**Services never touch `req` / `res`.**

### 4.2 Route Mount Map

```typescript
// server/src/routes/index.ts
router.use('/api/auth', authRoutes);             // B1
router.use('/api/safe-circle', safeCircleRoutes);// B1
router.use('/api/risk', riskRoutes);             // B1
router.use('/api/payment', paymentRoutes);       // B1
router.use('/api/wallet', walletRoutes);         // B1
router.use('/api/liveness', livenessRoutes);     // B2
router.use('/api/qr', qrRoutes);                 // B2
router.use('/api/certificate', certificateRoutes);// B2
router.use('/api/complaints', complaintRoutes);  // B2
```

### 4.3 Service Interface Pattern

Every service exports plain async functions:

```typescript
// Example pattern
export async function evaluateRisk(
  input: RiskEvaluationRequest
): Promise<RiskEvaluationResult> {
  const start = performance.now();
  // ... pure business logic
  return { ...result, evaluationTimeMs: performance.now() - start };
}
```

### 4.4 Risk Engine Internal Architecture (B1)

```
POST /api/risk/evaluate
        │
        ▼
   risk/engine.ts
        │
        ├──► safeCircle.service.check()  → if hit, short-circuit
        │
        ├──► risk/algorithmic.ts  → score 0–55 + signals[]
        ├──► risk/community.ts    → score 0–50 + complaint meta
        ├──► risk/network.ts      → score 0|8|15
        │
        ├──► sum + cap at 100
        ├──► verdict from thresholds
        ├──► persist RiskAssessment row
        └──► return RiskEvaluationResult
```

### 4.5 Module Ownership

| Path | Owner | Others May |
|---|---|---|
| `prisma/schema.prisma` | B1 | B2 proposes changes via discussion only |
| `services/risk/**` | B1 | Read-only |
| `services/safeCircle.*` | B1 | Read-only |
| `services/auth.*` | B1 | Read-only |
| `services/payment.*` | B1 | B2 may call cert hook |
| `services/liveness.*` | B2 | Read-only |
| `services/qr.*` | B2 | Read-only |
| `services/certificate.*` | B2 | B1 calls `generate()` after settle |
| `services/complaint.*` | B2 | B1 reads complaints in community scorer |
| `middleware/**` | Shared | Both maintain |
| `config/**` | Shared | Both maintain |
| `utils/**` | Shared | Both maintain |

---

## 5. Frontend Architecture

### 5.1 Rendering Model

- SPA via Vite
- React 18 concurrent features allowed (`useTransition` for heavy UI)
- No SSR/SSG in v2
- Route-level code splitting via `React.lazy` for liveness, admin, certificate

### 5.2 State Architecture

```
┌─────────────────────────────────────────────┐
│                 Zustand Stores               │
│  authStore │ paymentStore │ safeCircleStore │
│            │ livenessStore                   │
└─────────────────────────────────────────────┘
          ▲                    ▲
          │ read/write         │ read/write
┌─────────┴──────────┐  ┌──────┴──────────────┐
│   Page Components  │  │  Feature Components │
│   (route-level)    │  │  (domain UI)        │
└─────────┬──────────┘  └──────┬──────────────┘
          │                    │
          └──────────┬─────────┘
                     ▼
              apiClient.ts
                     │
                     ▼
                 SPYDE API
```

**Rules:**
- Server state (balance, history, complaints) → fetch on mount / invalidate on mutation
- Client flow state (payment machine, liveness progress) → Zustand
- Tiny UI state (modal open, input value) → `useState`

### 5.3 apiClient Design

```typescript
// client/src/lib/apiClient.ts
class ApiClient {
  private baseUrl: string;

  async get<T>(path: string): Promise<T>;
  async post<T>(path: string, body?: unknown): Promise<T>;
  async put<T>(path: string, body?: unknown): Promise<T>;
  async del<T>(path: string): Promise<T>;
  async postMultipart<T>(path: string, formData: FormData): Promise<T>;

  // Internals:
  // - credentials: 'include' (cookies)
  // - Content-Type: application/json (except multipart)
  // - On 401: POST /api/auth/refresh → retry original once
  // - On second 401: clear authStore → redirect /login
  // - Throws ApiError { status, message, code, details }
}
```

### 5.4 Payment State Machine Implementation

Implemented in `paymentStore.ts` using explicit state enum + transition functions.  
**No XState library** — keep it readable and dependency-light. Mirror states exactly from `APPFLOW.md`.

### 5.5 CV Module Loading Strategy (F2)

```
App boot
  │
  ├── core UI loads immediately
  │
  └── on first navigation to /liveness or /qr:
        ├── dynamic import() liveness modules
        ├── fetch /public/models/* with progress events
        ├── init onnxruntime-web (WebGL → WASM fallback)
        └── if YOLO fails: set usedFallback=true, continue
```

Models are **not** bundled into the JS chunk; they live in `public/models` and are cached by the browser.

---

## 6. Data Layer

### 6.1 PostgreSQL (Source of Truth)

- All durable business data
- Accessed exclusively via Prisma
- Schema documented in `SCHEMA.md` (must mirror `schema.prisma`)
- Migrations via `prisma migrate` in shared environments; `db push` allowed in local dev

### 6.2 Redis (Ephemeral)

| Key Pattern | TTL | Purpose |
|---|---|---|
| `otp:{phone}` | 60s | Hashed OTP |
| `otp_attempts:{phone}` | 5 min | Verify attempt counter |
| `otp_lockout:{phone}` | 5 min | Lock flag after 3 fails |
| `refresh_bl:{jti}` | remaining token TTL | Refresh token blacklist |
| `liveness:{sessionId}` | 60s | Challenge code + metadata |
| `rl:auth:{ip}` | 15 min | Auth rate limit window |
| `rl:complaint:{userId}` | until midnight IST | Complaint daily counter |
| `sc:{userId}` | 5 min | Optional Safe Circle cache |

### 6.3 In-Memory Fallback

If Upstash env vars are empty, `server/src/config/redis.ts` exports a `MemoryCache` implementing the same `get/set/del` interface.  
**Consequence:** multi-instance deploys without Redis will not share OTP/session state. Acceptable for local demo.

### 6.4 Simulated Tables Naming

All simulated payment entities use `Simulated` / `sim_` prefix in Prisma models / mental model:
- `SimulatedBankAccount`
- `SimulatedUPI`
- `SimulatedBalance`
- `SimulatedTransaction`
- `SimulatedMerchant`

This makes the real/sim boundary obvious in code review.

---

## 7. Auth & Session Architecture

### 7.1 Token Pair

| Token | Lifetime | Storage | Contents |
|---|---|---|---|
| Access JWT | 15 minutes | httpOnly cookie `spyde_access_token` | `{ userId, phone, role, kycStatus }` |
| Refresh JWT | 7 days | httpOnly cookie `spyde_refresh_token` + DB row | `{ userId, jti }` |

### 7.2 Cookie Attributes

```
Set-Cookie: spyde_access_token=...;
  HttpOnly;
  Secure;          # true in production
  SameSite=Strict;
  Path=/;
  Max-Age=900      # 15 min

Set-Cookie: spyde_refresh_token=...;
  HttpOnly;
  Secure;
  SameSite=Strict;
  Path=/api/auth;  # only sent to auth routes
  Max-Age=604800   # 7 days
```

### 7.3 Rotation Flow

```
1. Access token expires
2. Client gets 401
3. apiClient calls POST /api/auth/refresh with refresh cookie
4. Server verifies refresh JWT
5. Server checks jti not blacklisted + exists in DB
6. Server blacklists old jti, issues new pair, replaces DB row
7. Client retries original request
```

### 7.4 Device Fingerprint

Client generates a lightweight fingerprint hash from:
- `userAgent`
- `screen.width + height`
- `timezone`
- `language`
- canvas hash (optional, non-blocking)

Sent on login/register as `deviceFingerprint` string.  
Stored on `User.deviceFingerprint`.  
Mismatch on later login → risk engine `NEW_DEVICE +7`.

> Not a forensic fingerprint. Good enough for demo risk signal.

### 7.5 OTP Pipeline

```
request-otp:
  rate-limit check
  → generate crypto random 5-digit
  → hash with sha256
  → redis SET otp:{phone} hash EX 60
  → redis DEL otp_attempts:{phone}
  → dev: console.log OTP
  → return { expiresIn: 60 }

verify-otp:
  check lockout
  → get hash from redis
  → compare
  → on fail: incr attempts; at 3 → lockout 5 min
  → on success: delete otp key; issue tokens; bind device
```

---

## 8. API Design Principles

### 8.1 Base URL
- Local: `http://localhost:5000`
- All routes prefixed with `/api/`

### 8.2 Response Envelope

```typescript
// Success
type SuccessResponse<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>; // pagination, timing
};

// Error
type ErrorResponse = {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
};
```

### 8.3 HTTP Status Usage

| Status | When |
|---|---|
| 200 | Successful GET/PUT/PATCH/DELETE |
| 201 | Successful POST creating a resource |
| 400 | Validation failure / bad input |
| 401 | Missing/invalid auth |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate phone, duplicate safe circle entry) |
| 410 | Gone (view-once burned) |
| 429 | Rate limited |
| 500 | Unexpected server error |

### 8.4 Idempotency

- `POST /api/payment/settle` accepts optional `Idempotency-Key` header
- Server stores key → txn ref for 24h to prevent double-debit on retry

### 8.5 Pagination

List endpoints use cursor or offset:
```
GET /api/payment/history?limit=20&cursor=...
→ { data: items[], meta: { nextCursor, hasMore } }
```

### 8.6 Full endpoint catalog
Documented exhaustively in `API_EXAMPLES.md`.  
**If it's not in API_EXAMPLES.md, it does not exist.**

---

## 9. Real-time & Caching Strategy

### 9.1 No WebSockets in v2
All data is request/response. Client refetches after mutations.

### 9.2 Cache Policy

| Data | Cache? | Where | TTL | Invalidate On |
|---|---|---|---|---|
| OTP | Yes | Redis | 60s | verify / expiry |
| Safe Circle list | Optional | Redis | 5 min | add/remove |
| Risk evaluation | No (log only) | DB write | — | — |
| User profile | No | — | — | — |
| Complaint counts | Compute live | DB aggregate | — | — |
| Certificate | No | DB | — | — |
| Static models | Yes | Browser HTTP cache | long | versioned filenames |

### 9.3 Risk Engine Caching
Do **not** cache risk scores for reuse across payments.  
Every payment evaluates fresh (complaints may have landed seconds ago).

---

## 10. Computer Vision Pipeline

### 10.1 Browser-Only Principle
All face processing runs in the browser. Server receives only:
- numeric scores
- challenge code echo
- optional AES-GCM ciphertext blob

### 10.2 Model Assets

| Model | Approx Size | Purpose |
|---|---|---|
| tiny_face_detector | ~190 KB | Face box |
| face_landmark_68 | ~350 KB | Landmarks / blink |
| YOLOv8n ONNX (custom classes) | ~3–6 MB | phone/screen/photo spoof classes |
| **Total** | **~4–7 MB** | Lazy loaded |

### 10.3 Blink Detection Logic
1. Track eye aspect ratio (EAR) from landmarks each frame
2. EAR drop below threshold then recovery = 1 blink
3. Require 2 blinks within 10 seconds
4. Score: `min(40, blinks * 20)`

### 10.4 Anti-Spoof Logic
**Primary (YOLO):**
- Detect class labels: `cell_phone`, `screen`, `printed_face`, `real_face`
- If spoof class confidence > 0.5 → antiSpoofScore low
- If real_face only → award up to 35

**Fallback Heuristic (if YOLO unavailable):**
- Face area ratio vs frame (too large = print held close)
- Grayscale Laplacian variance (low = flat screen/photo)
- Micro-motion over 15 frames (zero motion = static image)
- Edge contrast near frame border (bezel detection)
- Weighted sum → 0–35

### 10.5 Challenge Code
- Server: `crypto.randomInt(1000, 9999)`
- Stored in Redis `liveness:{sessionId}`
- Displayed large on UI
- Client submits code back; server checks match → 0 or 25 points

### 10.6 Pass Threshold
```
totalScore = faceScore + antiSpoofScore + challengeScore
passed = totalScore >= 75
```

Full detail in `LIVENESS.md`.

---

## 11. Encryption & Cryptography

### 11.1 Algorithms

| Use Case | Algorithm | Where |
|---|---|---|
| OTP storage | SHA-256 hash | Server Redis |
| PIN (simulated) | SHA-256 hash (accepted if 6-digit format) | Server |
| Access/Refresh tokens | JWT HS256 (dev) / RS256 (prod target) | Server |
| Certificate signature | JWT RS256 over claims + SHA-256 payload hash | Server |
| Payload integrity | SHA-256 of canonical JSON | Server |
| View-once face | AES-256-GCM | **Client only** |
| Device fingerprint | SHA-256 of components | Client → Server store |

### 11.2 Canonical JSON (Certificates)

```typescript
function canonicalJSON(obj: Record<string, unknown>): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') {
      return Object.keys(v as object).sort().reduce((acc, k) => {
        acc[k] = sort((v as any)[k]);
        return acc;
      }, {} as Record<string, unknown>);
    }
    return v;
  };
  return JSON.stringify(sort(obj)); // no spaces
}
```

### 11.3 View-Once Face Crypto (Client)

```
key        = crypto.getRandomValues(new Uint8Array(32))  // 256-bit
iv         = crypto.getRandomValues(new Uint8Array(12))  // 96-bit
ciphertext = AES-GCM-Encrypt(facePixels, key, iv)
authTag    = included in WebCrypto output tail

Upload to server: { ciphertext: base64, iv: base64, authTag: base64 }
NEVER upload: key

Decrypt on viewer:
  import key → subtle.decrypt → draw to canvas → start 10s timer
  on end: zero key buffer, clear canvas, POST burn
```

### 11.4 Key Management

| Key | Storage | Rotation |
|---|---|---|
| `JWT_ACCESS_SECRET` | env | Manual |
| `JWT_REFRESH_SECRET` | env | Manual |
| Certificate RS256 keypair | env / file (prod) | Manual; kid in JWT header |
| Face AES keys | Client memory only | Per-capture ephemeral |

Full detail in `CERTIFICATE.md`.

---

## 12. Environment Variables

### 12.1 Server (`server/.env`)

```env
# ─── Core ───────────────────────────────────────────
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# ─── Database ───────────────────────────────────────
DATABASE_URL=postgresql://user:pass@host:5432/spyde_db?schema=public

# ─── JWT ────────────────────────────────────────────
JWT_ACCESS_SECRET=replace_me_min_32_chars_access
JWT_REFRESH_SECRET=replace_me_min_32_chars_refresh
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# ─── Redis (optional) ───────────────────────────────
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ─── Certificate Signing (B2) ───────────────────────
# Dev can use HS256 fallback; prod uses RS256 PEM
CERT_JWT_PRIVATE_KEY=
CERT_JWT_PUBLIC_KEY=
CERT_JWT_KID=spyde-cert-key-1

# ─── Uploads ────────────────────────────────────────
MAX_UPLOAD_BYTES=5242880
UPLOAD_DIR=./uploads

# ─── Feature Flags ──────────────────────────────────
ENABLE_DEV_OTP_LOG=true
ENABLE_DEV_OTP_TOAST=true
```

### 12.2 Client

Vite env (optional):
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_ENABLE_DEV_OTP_TOAST=true
```

Accessed as `import.meta.env.VITE_API_BASE_URL`.

### 12.3 Validation

`server/src/config/env.ts` parses with Zod on boot.  
**Missing required vars → process.exit(1).**

---

## 13. Performance Budgets

### 13.1 API Latency (p95)

| Endpoint Category | Budget |
|---|---|
| `POST /api/safe-circle/check` | **≤ 10ms** |
| `POST /api/risk/evaluate` | **≤ 200ms** |
| `POST /api/qr/verify` | **≤ 300ms** |
| `POST /api/auth/*` | ≤ 300ms |
| `POST /api/liveness/session/start` | ≤ 100ms |
| `POST /api/payment/settle` | ≤ 500ms |
| `POST /api/certificate/generate` | ≤ 500ms |
| All other endpoints | ≤ 500ms |

Log `⚠️ SLOW` when exceeded.

### 13.2 Frontend Budgets

| Metric | Budget |
|---|---|
| Initial JS bundle (gzip) | ≤ 250 KB (excluding CV models) |
| Route transition | ≤ 200ms perceived |
| Liveness model load (4G) | ≤ 5s with progress UI |
| Liveness full flow | ≤ 15s camera → result |
| Payment evaluate overlay min display | 400ms (UX floor even if API is faster) |
| Animation frame rate | 60 fps on mid-tier mobile |

### 13.3 Database

- Index every FK and every column used in WHERE for risk/complaint lookups
- `targetVPA`, `receiverVPA`, `userId`, `phone` must be indexed
- Risk engine queries must be explained (`EXPLAIN ANALYZE`) during B1 testing

---

## 14. Error Handling Strategy

### 14.1 Backend

```
throw new AppError(message, statusCode, code)
  → error middleware
  → { success: false, error, code, details? }
```

| Error Class | Status | Example Code |
|---|---|---|
| `ValidationError` | 400 | `VALIDATION_FAILED` |
| `UnauthorizedError` | 401 | `INVALID_TOKEN` |
| `ForbiddenError` | 403 | `INSUFFICIENT_ROLE` |
| `NotFoundError` | 404 | `USER_NOT_FOUND` |
| `ConflictError` | 409 | `DUPLICATE_VPA` |
| `GoneError` | 410 | `FACE_BLOB_BURNED` |
| `RateLimitError` | 429 | `OTP_RATE_LIMIT` |
| `AppError` | 400–500 | custom |

Uncaught errors → 500 with generic message in production (no stack leak).

### 14.2 Frontend

```
try {
  await apiClient.post(...)
} catch (err) {
  if (err instanceof ApiError) {
    showToast(err.message)
    // optionally branch on err.code
  } else {
    showToast('Something went wrong')
  }
}
```

React `ErrorBoundary` wraps route outlet for render crashes.

---

## 15. Logging & Observability

### 15.1 Log Prefix Conventions

| Prefix | Meaning |
|---|---|
| 🛡️ | Auth / security |
| ⚡ | Performance timing |
| 🔥 | Errors |
| 📱 | Mock external (OTP) |
| ✅ | Success milestones |
| ⚠️ | Warnings / slow / fallbacks |
| 🧠 | Risk engine decisions |
| 📷 | Liveness / QR events |
| 📜 | Certificate events |

### 15.2 Minimum Log Events

- OTP requested / verified / failed / locked
- Risk evaluation result (score, verdict, timeMs, signals)
- Safe Circle bypass
- Payment settle success/fail
- Liveness start/submit/pass/fail + usedFallback
- QR verify verdict
- Certificate generate + face burn
- Every 5xx with stack (dev) / message (prod)

### 15.3 Privacy Redaction
Never log:
- raw OTP in production
- raw PIN
- JWT full strings
- face ciphertext is OK to log length, not content
- encryption keys

---

## 16. Security Architecture

### 16.1 Threat Model (v2 Scope)

| Threat | Mitigation |
|---|---|
| Stolen JWT | Short access TTL + refresh rotation + httpOnly |
| OTP brute force | 3 attempts + 5 min lockout + rate limit |
| Replay payment | Idempotency-Key + server-side balance check |
| Client spoofed risk score | Server ignores client scores; always re-evaluates |
| Fake liveness scores | Server validates ranges + challenge code match |
| Face PII leakage | Client-side encrypt; server never has key; burn after view |
| QR spoof stickers | GPS + VPA merchant registry mismatch detection |
| XSS | React escaping + CSP headers via helmet |
| CSRF | SameSite=Strict cookies + origin check |
| Mass complaint abuse | 5/day rate limit + reporter trust weighting |
| Dependency attack | Lockfiles committed; no mystery packages |

### 16.2 Helmet Defaults
Use helmet with CSP tuned for Vite inline during dev; stricter in prod.

### 16.3 Upload Security
- MIME allowlist: jpeg/png/webp
- Size ≤ 5MB
- Random server-side filename
- No executable content-type
- Serve uploads from separate path without script execution

### 16.4 Secrets
- `.env` gitignored
- `.env.example` committed with placeholders
- Production secrets via host env / secret manager (not files in repo)

---

## 17. Deployment Topology

### 17.1 Target Demo Deploy

```
┌──────────────────┐     ┌──────────────────┐
│  Client (static) │     │  API (Node)      │
│  Vercel / Netlify│────►│  Railway / Render│
│  or Cloudflare   │     │  or Fly.io       │
└──────────────────┘     └────────┬─────────┘
                                  │
                     ┌────────────┼────────────┐
                     ▼                         ▼
              ┌────────────┐            ┌────────────┐
              │ Supabase   │            │  Upstash   │
              │ Postgres   │            │  Redis     │
              └────────────┘            └────────────┘
```

### 17.2 Production Process
```bash
# Server
cd server
npm run build          # tsc → dist/
npm run start          # node dist/app.js
# Prisma: migrate deploy on release

# Client
cd client
npm run build          # vite build → dist/
# Upload dist/ to static host
```

### 17.3 Health Checks
- `GET /health` → `{ status: 'online', service, timestamp, env }`
- Platform hits this for liveness

### 17.4 CORS
Only `CLIENT_ORIGIN`. No wildcards with credentials.

---

## 18. Local Development Setup

### 18.1 Required Services
1. Node 20+
2. PostgreSQL 15+ (local or Supabase)
3. Redis optional

### 18.2 First-Run Commands
```bash
# install
npm run install:all

# server env
cp server/.env.example server/.env
# edit DATABASE_URL and JWT secrets

# db
cd server
npx prisma generate
npx prisma db push
npx prisma db seed

# run (two terminals)
npm run dev        # server
cd ../client && npm run dev
```

### 18.3 Default Ports
| Service | Port |
|---|---|
| API | 5000 |
| Vite client | 5173 |

### 18.4 Seed Verification Query
After seed, confirm:
```sql
SELECT count(*) FROM "User";           -- 12
SELECT count(*) FROM "Complaint";      -- 40
SELECT count(*) FROM "SafeCircle";     -- 2
SELECT vpa FROM "SimulatedUPI";        -- 12 VPAs
```

---

## 19. CI/CD Pipeline (Target)

### 19.1 On every PR
```
1. Checkout
2. Install server + client deps
3. server: tsc --noEmit
4. client: tsc --noEmit
5. ESLint both
6. (Optional) unit tests
7. Block merge on failure
```

### 19.2 On merge to develop
```
1. Build client
2. Build server
3. Run prisma migrate deploy (staging)
4. Deploy staging
5. Smoke hit /health
```

> Full CI config is a chore task near end of build; not a day-1 blocker.

---

## 20. Dependency Manifest

### 20.1 Server `dependencies`
```
@prisma/client
@upstash/redis
bcryptjs
cookie-parser
cors
dotenv
express
helmet
jsonwebtoken
morgan
zod
```

### 20.2 Server `devDependencies`
```
@types/bcryptjs
@types/cookie-parser
@types/cors
@types/express
@types/jsonwebtoken
@types/morgan
@types/node
prisma
tsx
typescript
```

### 20.3 Client `dependencies`
```
react
react-dom
react-router-dom
zustand
framer-motion
lucide-react
clsx
tailwind-merge
zod
face-api.js
onnxruntime-web
html5-qrcode
```

### 20.4 Client `devDependencies`
```
@types/react
@types/react-dom
@vitejs/plugin-react
autoprefixer
postcss
tailwindcss
typescript
vite
```

### 20.5 Adding a New Dependency
1. Propose in team channel with reason
2. Get +1 from at least one other dev
3. Log in `LEARNING_NOTES.md`
4. Install in correct package (`server` or `client`)
5. Update this manifest section in same PR

---

## 21. Decision Log (ADRs)

### ADR-001: Separate client/server vs monorepo Next.js
**Decision:** Separate Vite SPA + Express API  
**Why:** Clearer B2B middleware boundary; mirrors how real PSPs would integrate; simpler ownership split for 4 devs.

### ADR-002: Zustand over Redux
**Decision:** Zustand  
**Why:** Minimal boilerplate; enough for 4 stores; faster onboarding.

### ADR-003: Prisma over raw SQL
**Decision:** Prisma  
**Why:** Type-safety, rapid iteration, readable migrations for mixed-experience team.

### ADR-004: HS256 now, RS256 for certificates
**Decision:** Session JWTs may use HS256 in dev; certificates designed for RS256  
**Why:** Faster local setup; certificates need public verifiability.

### ADR-005: In-memory Redis fallback
**Decision:** Required  
**Why:** Zero-friction local demo without Upstash account.

### ADR-006: Browser-only face crypto
**Decision:** AES-GCM in WebCrypto; server stores ciphertext only  
**Why:** DPDP alignment; eliminates server-side biometric liability.

### ADR-007: Rules-based risk engine (not ML)
**Decision:** Explicit weighted signals  
**Why:** Explainability for demo, deterministic persona outcomes, no training pipeline.

### ADR-008: Simulated payment rails
**Decision:** `sim_*` tables + fake PIN  
**Why:** No real funds risk; full UX realism; swappable later.

### ADR-009: No GraphQL
**Decision:** REST only  
**Why:** Contract simplicity via `API_EXAMPLES.md`; less tooling overhead.

### ADR-010: Documentation-first multi-dev split
**Decision:** 19 MD files + 4 trackers before feature code  
**Why:** Prevent AI hallucination and cross-domain collisions.

---

## 22. Cross-References

| Topic | Document |
|---|---|
| Product requirements | `PRD.md` |
| User flows / states | `APPFLOW.md` |
| DB schema | `SCHEMA.md` |
| Endpoint contracts | `API_EXAMPLES.md` |
| Risk formulas | `RISK_ENGINE.md` |
| Safe Circle logic | `SAFE_CIRCLE.md` |
| Liveness details | `LIVENESS.md` |
| Certificate details | `CERTIFICATE.md` |
| QR pipeline | `QR_TAMPER.md` |
| UI design system | `DESIGN.md` |
| Coding rules | `RULES.md` |
| Week-by-week plan | `IMPLEMENTATIONPLAN.md` |

---

## Document Control

| Version | Date | Changes |
|---|---|---|
| 2.0 | Build start | Locked stack, architecture, budgets, ADRs |

**Stack is LOCKED.** New libraries require team vote + ADR entry in `LEARNING_NOTES.md` and update here.

---

**Next document:** `IMPLEMENTATIONPLAN.md` — week-by-week milestones for all 4 developers.

🛡️ *SPYDE — Architecture is destiny. Choose deliberately.*