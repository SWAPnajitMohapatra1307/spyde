# 🛡️ SPYDE — Receiver Fraud Prevention Middleware for UPI

> **"Every UPI app verifies the sender. SPYDE is the first to verify the receiver."**

SPYDE is a B2B fraud prevention middleware that sits between a user tapping **"Proceed to Pay"** and the **"Enter UPI PIN / OTP"** screen. In under 200ms, it evaluates the receiver's risk profile using community complaints, algorithmic signals, network graph analysis, live face verification, and QR tamper detection — then decides whether to allow, warn, or block the transaction.

This repository contains the **production-grade Reference Implementation** consisting of:
- A **React 18 + Vite** client app that mimics a real UPI payment flow
- A **Node.js + Express + Prisma** middleware engine with 5 fraud-prevention pillars
- A **PostgreSQL + Redis** data layer with 12 pre-seeded demo personas

---

## 🎯 The 5 Core Pillars

| # | Pillar | What It Does |
|---|---|---|
| **1** | **Community-Driven Risk Engine** | 2-layer scoring: algorithmic signals (max 55) + weighted community complaints (max 50) + network graph bonus (max 15). Hard block only at score ≥ 90. |
| **2** | **Hybrid Browser Liveness Engine** | face-api.js (blink + landmarks) + YOLOv8n ONNX (anti-spoof) + server challenge code. Automatic heuristic fallback if YOLO fails to load. Zero unencrypted face data leaves the browser. |
| **3** | **Merchant QR Tamper Detection** | 5-step pipeline: decode QR → capture GPS → server lookup → verdict. Catches sticker-over-QR fraud via location-VPA mismatch. |
| **4** | **Safe Circle (Trusted Contacts)** | Pre-check step 0. Whitelisted contacts (Mom, Dad, Landlord — up to 20) skip risk analysis entirely and go straight to OTP in < 10ms. |
| **5** | **Digital Evidence Certificate + View-Once Face** | SHA-256 payload hash + JWT signature. Optional receiver consent captures a 200×200 face frame, encrypted client-side with AES-256-GCM. Sender views once for 10s, then key destroyed and blob auto-deleted (DPDP-compliant). |

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                        SPYDE CLIENT                        │
│  React 18 + Vite + TS + Tailwind + Zustand + Framer Motion │
│  face-api.js + YOLOv8n ONNX Web + html5-qrcode             │
└──────────────────────┬─────────────────────────────────────┘
                       │ HTTPS + JWT
┌──────────────────────▼─────────────────────────────────────┐
│                    SPYDE MIDDLEWARE                        │
│           Node.js 20 + Express + TypeScript                │
│                                                            │
│  ┌────────────┐ ┌───────────┐ ┌────────────┐ ┌──────────┐  │
│  │   Auth     │ │   Risk    │ │  Liveness  │ │   QR     │  │
│  │  Service   │ │  Engine   │ │  Service   │ │ Verifier │  │
│  └────────────┘ └───────────┘ └────────────┘ └──────────┘  │
│  ┌────────────┐ ┌───────────┐ ┌────────────┐               │
│  │Safe Circle │ │Certificate│ │ Complaints │               │
│  │  Service   │ │  Signer   │ │  Service   │               │
│  └────────────┘ └───────────┘ └────────────┘               │
└──────────┬────────────────────────────────────┬────────────┘
           │                                    │
┌──────────▼──────────┐              ┌──────────▼──────────┐
│    PostgreSQL       │              │       Redis         │
│    (Supabase)       │              │     (Upstash)       │
│  Real users, risk   │              │  OTP, sessions,     │
│  scores, complaints │              │  liveness challenges│
│  + simulated rails  │              │  + rate limits      │
└─────────────────────┘              └─────────────────────┘
```

---

## 🎭 Real Auth + Simulated Payment Rails

SPYDE follows a **"Real Shell, Fake Rails"** philosophy:

| Layer | Real or Simulated? | Why |
|---|---|---|
| User registration & OTP login | 🟢 **REAL** | Risk engine needs real identity + device tracking |
| JWT auth, refresh tokens, session mgmt | 🟢 **REAL** | Security must be demonstrably production-grade |
| Device fingerprinting | 🟢 **REAL** | Feeds `new device` risk signal |
| Safe Circle, Risk Engine, Liveness, QR, Certificates, Complaints | 🟢 **REAL** | Core SPYDE fraud logic |
| UPI IDs, bank accounts, balances, PIN entry, transaction ledger | 🟠 **SIMULATED** | Zero real money at stake — sandbox demo |

---

## 👥 Team Structure

| Dev | Codename | Domain | Owned Pillars |
|---|---|---|---|
| **Dev 1** | **B1** — Backend Lead | Auth, DB, Risk Engine, Safe Circle | Pillar 1, Pillar 4 |
| **Dev 2** | **B2** — Backend Support | Liveness API, QR, Certificate, Complaints | Pillar 2, Pillar 3, Pillar 5 |
| **Dev 3** | **F1** — Frontend Lead | Auth UI, Payment Flow, Friction UI, Safe Circle | Pillar 1, Pillar 4 (UI) |
| **Dev 4** | **F2** — Frontend Support | Liveness Camera, QR Scanner, Certificate Viewer, Complaint UI, Admin | Pillar 2, Pillar 3, Pillar 5 (UI) |

Every developer has a **personal `TRACKER_XX.md`** file with their exact scope, deliverables, and coordination points. **Read your tracker before writing any code.**

---

## 📚 Documentation Map — Read in This Order

### 🥇 Foundation (Everyone Reads)
1. **`README.md`** ← *You are here*
2. **`RULES.md`** — Coding conventions, git workflow, PR rules
3. **`PRD.md`** — Product Requirements Document
4. **`APPFLOW.md`** — End-to-end user journey with state diagrams
5. **`TECHSPEC.md`** — Architecture, stack decisions, deployment
6. **`IMPLEMENTATIONPLAN.md`** — Week-by-week milestone plan

### 🥈 Backend Core
7. **`SCHEMA.md`** — Complete DB schema mirror of `schema.prisma`
8. **`API_EXAMPLES.md`** — Every endpoint's request/response contract

### 🥉 Pillar Deep Dives
9. **`RISK_ENGINE.md`** — Scoring formulas, signals, worked examples *(B1 + F1)*
10. **`SAFE_CIRCLE.md`** — Whitelist logic, bypass rules *(B1 + F1)*
11. **`LIVENESS.md`** — CV pipeline, challenge protocol *(B2 + F2)*
12. **`CERTIFICATE.md`** — Hashing, JWT, view-once face flow *(B2 + F2)*
13. **`QR_TAMPER.md`** — 5-step pipeline, GPS-VPA matching *(B2 + F2)*

### 🎨 Frontend
14. **`DESIGN.md`** — Design system, colors, typography, components *(F1 + F2)*

### 📝 Living Docs
15. **`LEARNING_NOTES.md`** — Shared knowledge base, gotchas, decisions
16. **`TRACKER_B1.md`** — Personal tracker for Dev 1 *(B1 private)*
17. **`TRACKER_B2.md`** — Personal tracker for Dev 2 *(B2 private)*
18. **`TRACKER_F1.md`** — Personal tracker for Dev 3 *(F1 private)*
19. **`TRACKER_F2.md`** — Personal tracker for Dev 4 *(F2 private)*

> ⚠️ **Critical:** Each developer's AI assistant (Cursor/Copilot/Claude) should **only ingest MD files listed in their tracker**. Feeding unrelated docs causes context bloat and hallucination.

---

## ⚙️ Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | ≥ 20.0.0 | Runtime for both client & server |
| **npm** | ≥ 10.0.0 | Package manager (pnpm/yarn also work) |
| **PostgreSQL** | ≥ 15.0 | Primary database (or Supabase account) |
| **Redis** | ≥ 6.0 (optional) | Session cache (in-memory fallback available) |
| **Git** | latest | Version control |
| **VS Code** | latest (recommended) | With Prisma, Tailwind IntelliSense extensions |

**Optional but recommended:**
- A [Supabase](https://supabase.com) free-tier project (managed Postgres)
- An [Upstash](https://upstash.com) free-tier Redis (REST API)

---

## 🚀 Local Setup — From Zero to Running

### Step 1: Clone & Enter
```bash
git clone <your-repo-url> spyde
cd spyde
```

### Step 2: Install All Dependencies
```bash
npm run install:all
```
This installs root, `server/`, and `client/` dependencies.

### Step 3: Configure Environment Variables

**Server:**
```bash
cd server
cp .env.example .env
```

Edit `server/.env` and fill in:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/spyde_db?schema=public"
JWT_ACCESS_SECRET="generate-a-32-char-random-string-here"
JWT_REFRESH_SECRET="generate-another-32-char-random-string-here"
UPSTASH_REDIS_REST_URL=""             # Optional — leave blank for in-memory fallback
UPSTASH_REDIS_REST_TOKEN=""           # Optional
CLIENT_ORIGIN="http://localhost:5173"
```

> 💡 **Tip:** Generate secure secrets with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

**Client:** No env setup needed for local dev.

### Step 4: Set Up the Database
```bash
cd server
npx prisma generate          # Generate Prisma Client
npx prisma db push           # Push schema to Postgres
npx prisma db seed           # Seed 12 demo personas + complaints
```

You should see:
```
✅ Seeded 12 User Personas with simulated accounts & balances.
✅ Seeded Safe Circle Contacts for Arjun (Mom + Dad).
✅ Seeded 40 Community Complaint records across target personas.
✅ Seeded 6 Historical Transactions for baseline scoring.
✅ Seeded Registered Merchant GPS Coordinates.
✨ SPYDE Database Seeding Finished Successfully!
```

### Step 5: Start Both Services

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```
Expected output:
```
🛡️  SPYDE Server running on port 5000 [development]
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```
Expected output:
```
VITE ready in 342 ms
➜  Local:   http://localhost:5173/
```

### Step 6: Verify Setup
Open [http://localhost:5173](http://localhost:5173). You should see the SPYDE landing screen. Try:
1. Register with any phone number (e.g., `+919999999999`)
2. Watch server console for the mock OTP
3. Enter the OTP → login succeeds
4. Try sending to `sunita.mom@okhdfc` → Safe Circle bypass (green, instant OTP)
5. Try sending to `airtel.recharge599@oksdi` → Hard block (red, OTP disabled)

---

## 📂 Project Structure

```
spyde/
├── README.md                    ← You are here
├── PRD.md
├── APPFLOW.md
├── SCHEMA.md
├── TECHSPEC.md
├── DESIGN.md
├── API_EXAMPLES.md
├── RISK_ENGINE.md
├── LIVENESS.md
├── CERTIFICATE.md
├── QR_TAMPER.md
├── SAFE_CIRCLE.md
├── RULES.md
├── IMPLEMENTATIONPLAN.md
├── LEARNING_NOTES.md
├── TRACKER_B1.md
├── TRACKER_B2.md
├── TRACKER_F1.md
├── TRACKER_F2.md
├── package.json                 ← Monorepo scripts
│
├── server/                      ← Backend (B1 + B2)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma        ← Owned by B1
│   │   └── seed.ts              ← Owned by B1
│   └── src/
│       ├── app.ts               ← Express entry
│       ├── config/              ← env, redis, jwt
│       ├── db/                  ← Prisma client
│       ├── middleware/          ← auth, error, rate-limit
│       ├── routes/              ← Split by domain
│       │   ├── auth.routes.ts        (B1)
│       │   ├── safeCircle.routes.ts  (B1)
│       │   ├── risk.routes.ts        (B1)
│       │   ├── payment.routes.ts     (B1)
│       │   ├── wallet.routes.ts      (B1)
│       │   ├── liveness.routes.ts    (B2)
│       │   ├── qr.routes.ts          (B2)
│       │   ├── certificate.routes.ts (B2)
│       │   └── complaints.routes.ts  (B2)
│       ├── services/            ← Business logic
│       │   ├── auth.service.ts       (B1)
│       │   ├── safeCircle.service.ts (B1)
│       │   ├── risk/                 (B1)
│       │   │   ├── algorithmic.ts
│       │   │   ├── community.ts
│       │   │   ├── network.ts
│       │   │   └── engine.ts
│       │   ├── payment.service.ts    (B1)
│       │   ├── liveness.service.ts   (B2)
│       │   ├── qr.service.ts         (B2)
│       │   ├── certificate.service.ts(B2)
│       │   └── complaint.service.ts  (B2)
│       ├── schemas/             ← Zod validation schemas
│       ├── types/               ← Shared TS types
│       └── utils/               ← Helpers (crypto, hash, geo)
│
└── client/                      ← Frontend (F1 + F2)
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── public/
    │   └── models/              ← face-api + YOLOv8n ONNX weights
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── lib/                 ← Shared utilities
        │   ├── apiClient.ts          (F1)
        │   ├── mediaPermissions.ts   (F2)
        │   └── crypto.ts             (F2)
        ├── stores/              ← Zustand state
        │   ├── authStore.ts          (F1)
        │   ├── paymentStore.ts       (F1)
        │   └── safeCircleStore.ts    (F1)
        ├── components/          ← Reusable UI
        │   ├── common/               (F1 + F2 shared)
        │   ├── payment/              (F1)
        │   ├── safeCircle/           (F1)
        │   ├── liveness/             (F2)
        │   ├── qr/                   (F2)
        │   ├── certificate/          (F2)
        │   └── complaint/            (F2)
        ├── pages/               ← Route-level screens
        │   ├── SplashPage.tsx        (F1)
        │   ├── auth/                 (F1)
        │   ├── home/                 (F1)
        │   ├── payment/              (F1)
        │   ├── safeCircle/           (F1)
        │   ├── liveness/             (F2)
        │   ├── qr/                   (F2)
        │   ├── certificate/          (F2)
        │   └── admin/                (F2)
        ├── types/               ← Client-side TS types
        └── styles/              ← Additional Tailwind layers
```

---

## 🧪 Demo Personas — Quick Reference

The seed script creates 12 personas designed to trigger specific scenarios. Full details in **`SCHEMA.md`** and **`RISK_ENGINE.md`**.

| # | Persona | VPA | Scenario |
|---|---|---|---|
| P1 | Arjun Mehta (**you**) | `arjun.mehta@oksbi` | Default sender, ₹25,000 balance |
| P2 | Mom | `sunita.mom@okhdfc` | Safe Circle → instant bypass |
| P3 | Dad (hijacked) | `rajesh.dad@oksbi` | Safe Circle + compromise warning |
| P4 | Priya (friend) | `priya.s@paytm` | Clean payee, green flow |
| P5 | Loan scammer (typosquat) | `instant.loan@cdfc` | 5 reports → yellow friction |
| P6 | Deepak (duplicate trap) | `deepak.k@ybl` | Triggers duplicate payment detection |
| P7 | Neha (new user) | `neha.gupta@oksbi` | New UPI + first payee signals |
| P8 | Free recharge scam | `airtel.recharge599@oksdi` | 14 reports → **hard block** |
| P9 | Job offer scam | `ssc.recruitment@pytm` | 10 reports + graph hit → **hard block** |
| P10 | Ramesh Chai (real) | `ramesh.tea@paytm` | Verified merchant QR (GPS match) |
| P11 | Fake Chai (sticker) | `ramesh.chai@ypl` | Tampered QR → red block |
| P12 | Street food (unverified) | `street.snacks@bbank` | Unverified merchant → yellow |

---

## 🛠️ Available Scripts

**Root:**
```bash
npm run install:all       # Install root + server + client deps
npm run db:setup          # Push schema + seed data
npm run dev:server        # Start backend only
npm run dev:client        # Start frontend only
```

**Server (`cd server`):**
```bash
npm run dev               # Start with hot reload (tsx watch)
npm run build             # Compile TypeScript to dist/
npm run start             # Run compiled build
npm run prisma:generate   # Regenerate Prisma Client
npm run prisma:migrate    # Create + run migration
npm run prisma:push       # Push schema without migration (dev only)
npm run prisma:seed       # Re-run seed script
```

**Client (`cd client`):**
```bash
npm run dev               # Vite dev server
npm run build             # Production build
npm run preview           # Preview built output
```

---

## 🐛 Troubleshooting

<details>
<summary><strong>Prisma: "Environment variable not found: DATABASE_URL"</strong></summary>

Make sure you copied `.env.example` to `.env` inside `server/` and filled in your Postgres URL.
</details>

<details>
<summary><strong>OTP never arrives</strong></summary>

By design, OTPs are logged to the **server console** in dev mode. Check the terminal where `npm run dev` is running for a line like:
```
📱 [MOCK OTP] Phone: +919999999999 | Code: 48291 | Expires in 60s
```
</details>

<details>
<summary><strong>Camera / QR scanner doesn't open</strong></summary>

Browsers require **HTTPS or localhost** for camera access. `http://localhost:5173` works. If testing on a mobile device on the same network, use `ngrok` or Vite's `--host` flag with a TLS certificate.
</details>

<details>
<summary><strong>face-api.js models fail to load</strong></summary>

Model files must exist at `client/public/models/`. Download from the official face-api.js repo and place in that folder. If missing, the app auto-falls back to the heuristic anti-spoof engine. See **`LIVENESS.md`** for full instructions.
</details>

<details>
<summary><strong>Redis connection fails</strong></summary>

Redis is **optional**. If `UPSTASH_REDIS_REST_URL` is blank, the server automatically uses an in-memory cache. You'll see this log line on startup:
```
⚠️ Redis credentials not found. Using high-performance In-Memory cache fallback.
```
</details>

<details>
<summary><strong>Port 5000 or 5173 already in use</strong></summary>

Change `PORT` in `server/.env` and update `client/vite.config.ts` port + `CLIENT_ORIGIN` in server env accordingly.
</details>

---

## 🔒 Security Notes

1. **This is a reference implementation.** Do NOT deploy to production without a security audit.
2. **Simulated payment rails must never connect to real UPI/NPCI infrastructure** without a licensed PSP integration.
3. **JWT secrets in `.env.example` are placeholders** — always regenerate for your own deployment.
4. **Face data is never stored in plaintext.** All encryption happens client-side via WebCrypto (AES-256-GCM).
5. **DPDP Act (India) compliance** built into the view-once face flow: keys never touch the server, blobs auto-delete after one view or 24 hours.

---

## 📜 License

Proprietary — SPYDE Project Team, 2025. All rights reserved.

---

## 📞 Support

- **Team Lead:** [Your Contact]
- **Backend Questions:** Ask B1 or B2
- **Frontend Questions:** Ask F1 or F2
- **Shared Knowledge Base:** See `LEARNING_NOTES.md`
- **Blockers:** Log in your personal `TRACKER_XX.md`

---

**Ready to build? Open your `TRACKER_XX.md` next, then read the docs listed for your role.**

🛡️ *SPYDE — Because every rupee deserves a receiver check.*
