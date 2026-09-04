# 🛡️ SPYDE — Receiver Fraud Prevention Middleware for UPI

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Prisma-5.x-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-Upstash%20%2F%20Local-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Compliance-DPDP%20Act%202023-00C853?style=for-the-badge" alt="DPDP Act" />
</p>

---

> ### **"Every UPI app verifies the sender. SPYDE is the first to verify the receiver."**
>
> **SPYDE** is a high-speed, B2B fraud prevention middleware engineered to sit directly between a user tapping **"Proceed to Pay"** and the **"Enter UPI PIN"** authorization screen. In **under 200ms**, SPYDE runs a multi-layered receiver risk evaluation using community complaints, algorithmic heuristics, network graph analysis, browser-based biometric liveness, and GPS QR tamper detection—deciding in real time whether to **PASS**, **WARN**, **CHALLENGE**, or **BLOCK** the transaction before any money moves.

---

<p align="center">
  <img src="./assets/spyde-preview.png" alt="SPYDE Web Platform Preview" width="100%" style="border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
</p>

---

## 📑 Table of Contents

- [💡 Problem Statement](#-problem-statement)
- [🎯 The 5 Core Pillars](#-the-5-core-pillars)
- [🏗️ System Architecture](#️-system-architecture)
- [⚡ How SPYDE Works (The Pre-Transaction Interlock)](#-how-spyde-works-the-pre-transaction-interlock)
- [🧮 Multi-Layer Risk Engine Formulation](#-multi-layer-risk-engine-formulation)
- [🧪 Pre-Seeded Demo Personas & Test Scenarios](#-pre-seeded-demo-personas--test-scenarios)
- [💻 Tech Stack](#-tech-stack)
- [📂 Project Directory Structure](#-project-directory-structure)
- [🚀 Quick Start & Local Setup](#-quick-start--local-setup)
  - [Prerequisites](#prerequisites)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Setup Database & Seed Demo Data](#4-setup-database--seed-demo-data)
  - [5. Run Development Servers](#5-run-development-servers)
- [🔌 API Reference](#-api-reference)
- [🔒 Security, Privacy & DPDP Compliance](#-security-privacy--dpdp-compliance)
- [🛠️ Available Monorepo Scripts](#️-available-monorepo-scripts)
- [❓ Troubleshooting & FAQ](#-troubleshooting--faq)
- [👥 Core Contributors](#-core-contributors)
- [📜 License](#-license)

---

## 💡 Problem Statement

India's Unified Payments Interface (UPI) ecosystem processes over **12+ billion transactions per month**. While sender-side authentication (device binding, SIM verification, UPI PIN, bank 2FA) is mature and secure, **receiver-side authentication is virtually non-existent**.

This fundamental asymmetry makes UPI prime territory for social engineering and physical fraud:

1. **Merchant QR Sticker Overwriting:** Scammers slap a fraudulent QR sticker over a merchant's authentic physical standee at retail checkouts.
2. **Typosquatted & Spoofed VPAs:** Fraudsters register deceptive handles like `airtel.recharge@oksdi` instead of `@oksbi` or `refund.support@paytm`.
3. **Social Engineering Scams:** Fake lottery prizes, task scams, fake job recruitments, and urgent distress calls coerce victims into immediate P2P transfers.
4. **Mule Syndicate Networks:** Stolen funds are rapidly channeled across multi-hop dummy mule accounts before banks can freeze them.
5. **Reactive Inadequacy:** Bank SMS alerts, national cyber portals (1930), and chargebacks operate *after* the funds have cleared. By the time a victim realizes they were duped, the money is gone.

### The SPYDE Solution

SPYDE transforms fraud mitigation from **post-incident reaction** into **in-flight pre-transaction prevention**:

- **Pre-PIN Interception:** Evaluates the transaction before the user commits their UPI PIN.
- **Ultra-Low Latency:** P50 < 25ms, P99 < 80ms execution via parallelized evaluators and Redis caching.
- **Zero Friction on Trusted Contacts:** Whitelisted contacts skip risk evaluation entirely in `< 10ms`.
- **Zero Raw Biometrics Stored:** Browser-level liveness with client-side encryption and view-once self-destructing blobs.
- **Cryptographic Audit Trail:** Immutable, digitally signed evidence certificates for every processed payment.

---

## 🎯 The 5 Core Pillars

| # | Pillar | Description | Tech Implementation |
|---|---|---|---|
| **1** | **Community-Driven Risk Engine** | Computes a real-time risk score ($S \in [0, 100]$) using a 3-layer architecture: Algorithmic Heuristics (max 55 pts) + Community Complaints with exponential time decay (max 50 pts) + Graph Mule Linkage (max 15 pts). | Deterministic formula, parallel `Promise.all` evaluation, weighted category multipliers. |
| **2** | **Hybrid Browser Liveness Engine** | Step-up anti-spoofing challenge for high-risk or escrow transactions. Employs blink detection via Eye Aspect Ratio (EAR), facial landmark triangulation, interactive 4-digit code challenge, and camera motion tracking. | `face-api.js` (TinyFaceDetector + 68 landmarks), WebCrypto hashing, and texture heuristic fallback. |
| **3** | **Merchant QR Tamper Detection** | Decodes incoming QR payloads and compares user device GPS coordinates against registered merchant geo-boundaries via Haversine distance. Flags sticker-swap attacks instantly. | Haversine distance computation, geo-radius tolerance checks, and structured QR scan logging. |
| **4** | **Safe Circle (Trusted Contacts)** | Whitelist up to 20 verified friends, family, and recurring merchants. Transactions to Safe Circle members completely bypass risk analysis ($S = 0$) in `< 10ms`. Includes compromised-account anomaly safety nets. | High-performance Redis set caching with Prisma PostgreSQL persistence. |
| **5** | **Digital Evidence Certificate & View-Once Face** | Generates an immutable, SHA-256 payload-hashed and JWT-signed certificate for every transaction. For challenged flows, an encrypted face capture (AES-256-GCM) is viewable once by the sender for 10 seconds before permanent deletion. | WebCrypto AES-256-GCM, RS256/HMAC JWT signature, hourly DPDP auto-purge cron. |

---

## 🏗️ System Architecture

```
                               ┌─────────────────────────────────────────┐
                               │           SPYDE CLIENT (PWA)            │
                               │  React 18 + Vite + TypeScript + Tailwind│
                               │  Zustand + TanStack Query + Framer Motion│
                               │  face-api.js + ONNX Web + html5-qrcode  │
                               └────────────────────┬────────────────────┘
                                                    │ HTTPS / JWT
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │        SPYDE MIDDLEWARE GATEWAY         │
                               │        Node.js 20 + Express + Zod       │
                               │                                         │
                               │  ┌───────────────┐   ┌───────────────┐  │
                               │  │  Auth Router  │   │  Safe Circle  │  │
                               │  └───────────────┘   └───────────────┘  │
                               │  ┌───────────────┐   ┌───────────────┐  │
                               │  │  Risk Engine  │   │ Liveness Svc  │  │
                               │  └───────────────┘   └───────────────┘  │
                               │  ┌───────────────┐   ┌───────────────┐  │
                               │  │ QR Verifier   │   │ Certificates  │  │
                               │  └───────────────┘   └───────────────┘  │
                               │  ┌───────────────┐   ┌───────────────┐  │
                               │  │ Complaints    │   │  Admin Portal │  │
                               │  └───────────────┘   └───────────────┘  │
                               └──────────┬───────────────────┬──────────┘
                                          │                   │
                     ┌────────────────────▼─────┐       ┌─────▼────────────────────┐
                     │   PostgreSQL (Supabase)  │       │   Redis (Upstash/Local)  │
                     │  - Users & Bank Accounts │       │  - Active OTPs & Session │
                     │  - Ledger & Certificates │       │  - Safe Circle Fast Caches│
                     │  - Community Complaints  │       │  - Liveness Nonce Keys   │
                     │  - Merchant Geofences    │       │  - Sliding Rate Limits   │
                     └──────────────────────────┘       └──────────────────────────┘
```

---

## ⚡ How SPYDE Works (The Pre-Transaction Interlock)

```mermaid
sequenceDiagram
    autonumber
    actor Sender as Sender (Siddharth)
    participant Client as SPYDE Client App
    participant Middleware as SPYDE Middleware
    participant Cache as Redis Cache
    participant DB as PostgreSQL DB
    actor Receiver as Receiver (Merchant/P2P)

    Sender->>Client: Enter Payee VPA & Amount, tap "Proceed to Pay"
    Client->>Middleware: POST /api/payment/initiate (receiverVpa, amount, coords)
    
    Middleware->>Cache: Step 0: Check Safe Circle Whitelist
    alt Receiver in Safe Circle
        Cache-->>Middleware: Whitelist HIT
        Middleware-->>Client: Verdict: PASS (Score = 0, Latency < 10ms)
        Client->>Sender: Prompt for UPI PIN immediately (Green)
    else Receiver NOT in Safe Circle
        Middleware->>DB: Fetch complaints, transaction graph, and historical signals
        Note over Middleware: Compute Algorithmic (55) + Community (50) + Graph (15)
        
        alt Score 0 - 49 (PASS)
            Middleware-->>Client: Verdict: PASS (Standard green confirmation)
            Client->>Sender: Enter UPI PIN
        else Score 50 - 74 (WARN)
            Middleware-->>Client: Verdict: WARN (Specific risk badges & friction delay)
            Client->>Sender: Display warning modal (Requires manual acknowledgement)
        else Score 75 - 89 (CHALLENGE)
            Middleware-->>Client: Verdict: CHALLENGE (Escrow hold created)
            Client->>Receiver: Trigger Biometric Liveness Challenge
            Receiver->>Client: Complete 2-Blink + Face Landmark Verification
            Client->>Middleware: POST /api/liveness/verify (Landmarks, Hash, Code)
            Middleware-->>Client: Liveness Passed + View-Once Face Snapshot
            Client->>Sender: 10s Face Verification Countdown -> Proceed to PIN
        else Score 90 - 100 (BLOCK)
            Middleware-->>Client: Verdict: BLOCK (Critical Risk Detected)
            Client->>Sender: Hard Block Screen (UPI PIN input disabled)
        end
    end

    Sender->>Client: Enters UPI PIN (Simulated)
    Client->>Middleware: POST /api/payment/confirm (transactionId, pin)
    Middleware->>DB: Move funds & generate cryptographic SHA-256 JWT Certificate
    Middleware-->>Client: Payment Success + Immutable Certificate
```

---

## 🧮 Multi-Layer Risk Engine Formulation

The composite risk score $S_{\text{total}}$ is evaluated deterministically in real-time before any payment is authorized:

$$S_{\text{raw}} = S_{\text{algorithmic}} + S_{\text{community}} + S_{\text{graph}}$$

$$S_{\text{total}} = \begin{cases} 
0 & \text{if } \text{receiverVpa} \in \text{SafeCircle}(\text{senderId}) \\
\min\left(100, \max\left(0, S_{\text{raw}}\right)\right) & \text{otherwise}
\end{cases}$$

### Scoring Layer Breakdown

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │ Layer 1: Algorithmic Scorer (Max 55 Pts)                              │
  │ • Typosquatting / VPA Levenshtein distance check       (+20 pts)       │
  │ • First-time transaction to new payee                 (+15 pts)       │
  │ • High-value anomaly (> 3x 30-day average)             (+15 pts)       │
  │ • Velocity spike (> 5 transactions / 10 minutes)       (+15 pts)       │
  │ • Odd-hour transaction (1:00 AM – 5:00 AM)             (+10 pts)       │
  │ • New account creation age (< 7 days old)              (+10 pts)       │
  └────────────────────────────────────────────────────────────────────────┘
                                     +
  ┌────────────────────────────────────────────────────────────────────────┐
  │ Layer 2: Community Complaints Scorer (Max 50 Pts)                     │
  │ • Base weights: QR Tampering (30 pts), Fraud (25 pts),                 │
  │   Impersonation (20 pts), Spam/Harassment (10 pts)                     │
  │ • Status Multiplier: VERIFIED (1.5x), PENDING (1.0x)                  │
  │ • Exponential Time-Decay: Half-life of 30 days (older complaints decay)│
  └────────────────────────────────────────────────────────────────────────┘
                                     +
  ┌────────────────────────────────────────────────────────────────────────┐
  │ Layer 3: Network Graph Scorer (Max 15 Pts)                            │
  │ • 1-Hop direct transfer with a confirmed fraudulent VPA (+15 pts)      │
  │ • 2-Hop association with a flagged mule syndicate      (+10 pts)       │
  └────────────────────────────────────────────────────────────────────────┘
```

### Decision Thresholds

| Score Range | Verdict | UI Experience | Action Required |
|:---:|:---:|:---:|:---|
| **0 – 49** | `PASS` | 🟢 **Green Accent** | Normal payment flow; instant navigation to PIN entry. |
| **50 – 74** | `WARN` | 🟡 **Amber Accent** | Informational friction modal with risk signals; 3s countdown before PIN entry. |
| **75 – 89** | `CHALLENGE` | 🟣 **Purple Accent** | Funds placed in 5-minute escrow hold; step-up biometric liveness required from receiver. |
| **90 – 100** | `BLOCK` | 🔴 **Crimson Accent** | Payment rejected immediately; UPI PIN input strictly disabled; option to report. |

---

## 🧪 Pre-Seeded Demo Personas & Test Scenarios

The database seed (`prisma/seed.ts`) pre-loads 12 real-world personas designed to demonstrate every fraud pattern and safety mechanism:

| Persona / Name | VPA Handle | Role / Scenario | Expected Verdict | Score | Details |
|---|---|---|:---:|:---:|---|
| **Siddharth Roy** *(You)* | `sid@okhdfc` | Default Logged-In User | — | 12 | Primary demo user; ₹100,000 balance; holds registered Safe Circle contacts. |
| **Mom (Ananya Roy)** | `mom@oksbi` | Whitelisted Family Contact | `PASS` | 0 | Safe Circle bypass; instant green path in `< 10ms`. |
| **Landlord (Mr. Verma)** | `landlord@okaxis` | Whitelisted Utility Payee | `PASS` | 0 | Safe Circle bypass; instant green path. |
| **Warn Demo Payee** | `warn.test@spyde` | Low-tier Flagged Merchant | `WARN` | 55 | Has verified spam and pending fraud reports. Prompts warning dialog. |
| **Challenge Liveness Payee** | `challenge.liveness@spyde` | Escrow / Step-Up Receiver | `CHALLENGE` | 75 | Verified QR tampering reports + graph linkage. Triggers live camera face check. |
| **Escrow Seller** | `escrow.seller@okicici` | Refurbished Electronics Store | `CHALLENGE` | 78 | High-value purchase (€15,000); triggers view-once biometric evidence. |
| **Blocked Scam Syndicate** | `block.scam@spyde` | Known Syndicate Mule | `BLOCK` | 99 | Multiple verified fraud, impersonation, and tampering reports. Hard blocked. |
| **Free Recharge Phishing** | `airtel.recharge599@oksdi` | Typosquatted VPA (`@oksdi`) | `BLOCK` | 96 | Levenshtein distance flag against SBI handle + 14 community fraud reports. |
| **Apex Secure Retail** | `merchant@okaxis` | Legitimate Registered Shop | `PASS` | 5 | Lat: `12.971598`, Lng: `77.594562`. GPS location matches QR code. |
| **Local Corner Shop** | `tampered.qr@okhdfcbank` | Tampered Standee Sticker | `BLOCK` | 94 | Registered in Chennai, scanned in Bengaluru (**350km away**). Tamper detected! |
| **Admin Portal User** | `admin@spyde.dev` | System Administrator | — | — | Password: `Password@123`; Full access to moderation dashboard. |

---

## 💻 Tech Stack

### Frontend (`/client`)
- **Framework:** React 18 (SPA) bootstrapped with **Vite 6**
- **Language:** TypeScript 5.7 (Strict Mode)
- **Styling:** Tailwind CSS 3.4 with dark-mode optimized fintech color palette
- **State Management:** Zustand 5 (Auth, Safe Circle, Payments, Notifications)
- **Data Fetching:** TanStack React Query 5
- **Animations:** Framer Motion 11
- **Computer Vision & Biometrics:**
  - `face-api.js` (0.22) — TinyFaceDetector & 68-point facial landmark mesh
  - `onnxruntime-web` (1.29) — Lightweight client-side neural execution
  - `html5-qrcode` & `jsqr` — Instant camera-based QR code decoding
- **Visualizations:** Recharts (Admin risk trends & complaint breakdown)
- **Icons:** Lucide React

### Backend & Middleware (`/server`)
- **Runtime:** Node.js 20+ LTS
- **Server Framework:** Express 4.19 with modular routing
- **Language:** TypeScript 5.5
- **Database & ORM:** PostgreSQL 15+ via **Prisma ORM 5.19**
- **In-Memory & Cache:** Redis (**Upstash Redis REST** + local in-memory fallback)
- **Validation:** Zod 3.23 (Comprehensive request schema enforcement)
- **Security & Cryptography:**
  - `bcrypt` — Password hashing
  - `jsonwebtoken` — Dual-token JWT architecture (Short-lived Access + Rotating Refresh)
  - `helmet` — Security header configuration with CORS credentials support
  - Node.js native `crypto` — SHA-256 evidence hashing and AES-256-GCM view-once encryption
- **Background Jobs:** Scheduled hourly purge cron for DPDP compliance and expired escrow release

---

## 📂 Project Directory Structure

```
spyde/
├── README.md                          # Comprehensive project documentation
├── package.json                       # Monorepo scripts (concurrent execution)
├── package-lock.json
├── .env.example                       # Root environment variable template
├── .gitignore
│
├── client/                            # Frontend Application (React 18 + Vite)
│   ├── index.html
│   ├── vite.config.ts                 # Dev server proxy & build configuration
│   ├── tailwind.config.js             # SPYDE fintech theme tokens
│   ├── package.json
│   ├── public/
│   │   └── models/                    # Pre-trained face-api.js neural weights
│   │       ├── tiny_face_detector_model-weights_manifest.json
│   │       ├── tiny_face_detector_model-shard1
│   │       ├── face_landmark_68_tiny_model-weights_manifest.json
│   │       └── face_landmark_68_tiny_model-shard1
│   └── src/
│       ├── App.tsx                    # Route definitions & layout wrappers
│       ├── main.tsx                   # React root mount
│       ├── components/                # Modular UI components
│       │   ├── common/                # Navbar, bottom sheet, buttons, badges
│       │   ├── liveness/              # Camera feed, landmark canvas, countdown
│       │   ├── qr/                    # QR scanner overlay & GPS verifier
│       │   ├── certificate/           # Tamper-proof certificate card
│       │   └── safeCircle/            # Contact selector & add-modal
│       ├── pages/                     # Full-screen page views
│       │   ├── DashboardPage.tsx      # Main wallet balance & quick actions
│       │   ├── PaymentPage.tsx        # VPA input & friction review modal
│       │   ├── LivenessChallengePage.tsx # Live interactive face test
│       │   ├── CertificatePage.tsx    # Digital evidence receipt viewer
│       │   ├── QrScannerPage.tsx      # Camera QR scanner
│       │   ├── SafeCirclePage.tsx     # Whitelist manager
│       │   └── admin/                 # Security moderation portal
│       └── stores/                    # Zustand global stores
│
└── server/                            # Backend Middleware (Node.js + Express)
    ├── package.json
    ├── tsconfig.json
    ├── .env.example                   # Server-specific env configuration
    ├── prisma/
    │   ├── schema.prisma              # Complete database relational schema
    │   └── seed.ts                    # 12-persona test database seeder
    ├── scripts/
    │   └── demo-scenarios.ts          # Automated CLI validation of 3 core paths
    └── src/
        ├── app.ts                     # Express app setup, CORS, and middleware
        ├── index.ts                   # HTTP listener & worker launcher
        ├── config/                    # Environment variables & constants
        ├── db/                        # Prisma client singleton
        ├── middleware/                # JWT auth guards, admin check, rate-limiting
        ├── routes/                    # API Endpoints
        │   ├── authRoutes.ts          # Authentication & token rotation
        │   ├── paymentRoutes.ts       # Payment initiate, resolve, confirm
        │   ├── safeCircleRoutes.ts    # Safe Circle whitelist CRUD
        │   ├── liveness.routes.ts     # Challenge generation & verification
        │   ├── qr.routes.ts           # QR verification & GPS matching
        │   ├── certificate.routes.ts  # Proof verification & view-once blob
        │   ├── complaint.routes.ts    # Community fraud filing & query
        │   ├── admin.routes.ts        # Admin moderation & risk statistics
        │   └── cv.routes.ts           # Computer Vision session endpoints
        ├── services/                  # Business Logic Layer
        │   ├── authService.ts
        │   ├── paymentService.ts
        │   ├── safeCircleService.ts
        │   ├── risk/                  # 3-Layer Risk Engine
        │   │   ├── engine.ts          # Orchestrator & parallel evaluator
        │   │   ├── algorithmic.ts     # Layer 1: Heuristic scoring
        │   │   ├── community.ts       # Layer 2: Complaint time-decay
        │   │   └── network.ts         # Layer 3: Graph mule adjacency
        │   ├── liveness/              # Biometric challenge validation
        │   ├── qr/                    # Haversine distance calculator
        │   └── certificate/           # Crypto signers & self-destruct blob
        └── utils/                     # Async handlers, cryptography helpers
```

---

## 🚀 Quick Start & Local Setup

### Prerequisites

Make sure you have the following installed on your machine:
- **Node.js:** `v20.0.0` or higher
- **npm:** `v10.0.0` or higher (or `pnpm` / `yarn`)
- **PostgreSQL:** `v15.0` or higher (or a free [Supabase](https://supabase.com) instance)
- **Redis:** (Optional) [Upstash Redis](https://upstash.com) or local Redis (Server automatically falls back to an in-memory cache if omitted)

---

### 1. Clone Repository

```bash
git clone https://github.com/Asmit-06/spyde.git
cd spyde
```

---

### 2. Install Dependencies

Install root, backend, and frontend packages:

```bash
# Install root monorepo tools
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Return to root
cd ..
```

---

### 3. Configure Environment Variables

Create your `.env` file inside the `server/` directory:

```bash
cd server
cp .env.example .env
```

Open `server/.env` and configure your credentials:

```env
# Database Connection (PostgreSQL or Supabase)
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/spyde?schema=public"

# Cryptographic Keys (Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_ACCESS_SECRET="super_secret_access_jwt_key_32_characters_minimum"
JWT_REFRESH_SECRET="super_secret_refresh_jwt_key_32_characters_minimum"
CERT_SIGNING_SECRET="super_secret_cert_signing_key_32_characters_minimum"

# Redis Cache (Optional: leave blank to automatically use high-performance In-Memory cache)
REDIS_URL="redis://localhost:6379"
# Or Upstash REST credentials:
# UPSTASH_REDIS_REST_URL="https://your-upstash-url.upstash.io"
# UPSTASH_REDIS_REST_TOKEN="your_upstash_token"

# Server Port & Allowed Client Origin
PORT=5000
CLIENT_ORIGIN="http://localhost:5173"
NODE_ENV="development"
```

> 💡 **Client Configuration:** The frontend client comes pre-configured with a Vite reverse proxy forwarding `/api` calls directly to `http://localhost:5000`. No `.env` is required for client local development.

---

### 4. Setup Database & Seed Demo Data

Run Prisma migrations and populate the database with the 12 demo personas:

```bash
cd server

# Generate Prisma Client code
npx prisma generate

# Push database schema to PostgreSQL
npx prisma db push

# Seed 12 personas, Safe Circle links, complaints, and merchants
npx prisma db seed
```

You will see confirmation logs in your terminal:
```
[DB] STARTING SPYDE INTEGRATION SEEDING ENGINE...
[DB] Cleaning database tables...
[DB] Seeding Security Admin record...
[DB] Seeding Primary Demo User (Pillar 1)...
[DB] Seeding Geo-located Merchant Registries (Pillar 3)...
[DB] Seeding Dedicated Demo VPAs for Risk Engine Testing...
[DB] DATABASE SEEDING COMPLETED SUCCESSFULLY! ✅
```

---

### 5. Run Development Servers

You can start both the backend and frontend simultaneously from the root directory:

```bash
# From the root directory:
npm run dev
```

Or run them in separate terminal windows:

```bash
# Terminal 1 — Backend (Port 5000)
npm run dev:server

# Terminal 2 — Frontend (Port 5173)
npm run dev:client
```

Open your browser at:
👉 **[http://localhost:5173](http://localhost:5173)**

#### Quick Login Credentials:
- **Demo User:** Phone: `9123456780` | Password: `Password@123`
- **Admin Portal:** Email: `admin@spyde.dev` | Password: `Password@123`
- *(Mock OTPs are logged directly to the server terminal during phone verification)*

---

## 🔌 API Reference

All requests accept and return standard JSON. Authenticated endpoints require a Bearer token: `Authorization: Bearer <accessToken>`.

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/auth/register` | No | Creates a new user account and registers primary UPI VPA. |
| `POST` | `/api/auth/login` | No | Authenticates via phone/password, issuing JWT access and refresh cookies. |
| `POST` | `/api/auth/refresh` | No | Rotates expiring access tokens using refresh token cookies. |
| `POST` | `/api/auth/logout` | Yes | Revokes refresh tokens and invalidates user session. |
| `GET` | `/api/auth/me` | Yes | Returns authenticated profile, bank accounts, and active handles. |

### 2. Payments & Pre-PIN Verification (`/api`)
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/vpa/resolve` | No | Resolves recipient metadata (Name, Bank, Avatar) for any VPA. |
| `POST` | `/api/payment/initiate` | Yes | **Core SPYDE Interlock:** Evaluates receiver risk before PIN entry. Returns `PASS`, `WARN`, `CHALLENGE`, or `BLOCK`. |
| `POST` | `/api/payment/confirm` | Yes | Verifies simulated PIN, moves funds, and mints evidence certificate. |
| `GET` | `/api/payment/history` | Yes | Fetches paginated transaction ledger with risk verdicts and audit links. |

### 3. Safe Circle Whitelist (`/api/circle`)
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/circle` | Yes | Lists all trusted contacts in the sender's Safe Circle (max 20). |
| `POST` | `/api/circle/add` | Yes | Whitelists a new contact to allow `< 10ms` risk-bypass. |
| `DELETE` | `/api/circle/:id` | Yes | Removes contact from whitelist and clears Redis lookup cache. |

### 4. Biometric Liveness & Computer Vision (`/api/liveness` & `/api/cv`)
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/liveness/challenge` | Yes | Issues a 4-digit code and session nonce for high-risk escrow verification. |
| `POST` | `/api/liveness/verify` | No | Validates EAR blinks, landmark triangulation, and code response. |
| `GET` | `/api/liveness/status/:sessionId` | No | Polls real-time completion state of a receiver challenge. |
| `GET` | `/api/liveness/pending` | Yes | Fetches pending escrow challenges awaiting user biometric action. |

### 5. Merchant QR Verification (`/api/qr`)
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/qr/verify` | No | Validates scanned QR payload against registered merchant GPS bounds. |

### 6. Evidence Certificates & View-Once Blob (`/api/certificates`)
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/certificates/verify` | No | Public verification of certificate payload hash & cryptographic signature. |
| `POST` | `/api/certificates/face-blob` | Yes | Uploads encrypted biometric snapshot linked to verified challenge. |
| `GET` | `/api/certificates/face-blob/:id` | No | **View-Once:** Retrieves encrypted face frame and immediately deletes it from storage. |

### 7. Community Complaints & Admin Portal (`/api/complaints` & `/api/admin`)
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/complaints` | Yes | Files a fraud/tampering report with 24-hour deduplication. |
| `GET` | `/api/complaints/mine` | Yes | Lists complaints authored by the current user. |
| `GET` | `/api/admin/stats` | Admin | Fetches system-wide fraud trends, total blocks, and latency metrics. |
| `GET` | `/api/admin/top-flagged` | Admin | Lists highest-risk VPAs ranked by community report severity. |

---

## 🔒 Security, Privacy & DPDP Compliance

SPYDE was engineered from the ground up to respect the **Digital Personal Data Protection (DPDP) Act 2023 (India)**:

```
                  ┌──────────────────────────────────────────────┐
                  │             RECEIVER BROWSER                 │
                  │   Captures 200x200 face verification frame   │
                  │   Generates ephemeral AES-256-GCM symmetric key│
                  └──────────────────────┬───────────────────────┘
                                         │ Encrypted Blob Only
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │               SPYDE SERVER                   │
                  │   Stores ciphertext ONLY. Key NEVER received. │
                  │   Server CANNOT decrypt or reconstruct face. │
                  └──────────────────────┬───────────────────────┘
                                         │ Decrypts in Sender RAM
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │              SENDER BROWSER                  │
                  │   10-Second ephemeral visual confirmation    │
                  │   Key destroyed from memory upon countdown    │
                  │   Server deletes ciphertext permanently      │
                  └──────────────────────────────────────────────┘
```

1. **Zero Plaintext Biometric Storage:** Raw facial photos or video streams are **never stored** on the server.
2. **Ephemeral View-Once Face Blobs:** Face frames are encrypted in the client browser using WebCrypto (AES-256-GCM). The sender is granted a single 10-second inspection window before the decryption key is wiped from browser memory and the server ciphertext is permanently deleted.
3. **Automated Data Purge Cron:** An active background sweeper (`server/src/app.ts`) triggers every hour to delete any orphaned biometric records older than their expiration limit.
4. **Cryptographic Integrity:** Every payment certificate encapsulates a SHA-256 payload digest signed with a private key, guaranteeing non-repudiation in banking disputes.

---

## 🛠️ Available Monorepo Scripts

### Root Directory
| Command | Action |
|---|---|
| `npm run dev` | Runs both Backend (`server`) and Frontend (`client`) concurrently with color-coded terminal outputs. |
| `npm run dev:server` | Starts only the Node.js Express backend in watch mode (`ts-node-dev`). |
| `npm run dev:client` | Starts only the Vite frontend development server. |
| `npm run build` | Compiles the production build for the frontend client. |

### Server Directory (`cd server`)
| Command | Action |
|---|---|
| `npm run dev` | Starts server with live reload via `ts-node-dev`. |
| `npm run build` | Compiles TypeScript source to `dist/`. |
| `npm run start` | Runs compiled server build (`node dist/index.js`). |
| `npm run prisma:generate` | Generates latest Prisma Client bindings. |
| `npm run prisma:migrate` | Runs database migrations in dev mode. |
| `npx tsx scripts/demo-scenarios.ts` | Runs the automated 3-scenario fraud prevention benchmark in the console. |

### Client Directory (`cd client`)
| Command | Action |
|---|---|
| `npm run dev` | Launches Vite dev server with Hot Module Replacement (HMR). |
| `npm run build` | Executes TypeScript typecheck and bundles production assets. |
| `npm run preview` | Serves the production build locally. |

---

## ❓ Troubleshooting & FAQ

<details>
<summary><strong>1. Why didn't I receive an SMS with my OTP?</strong></summary>

In this Reference Implementation, external SMS gateways are replaced with simulated dev logging to eliminate third-party telecom dependencies. When you initiate registration or login, look at your **backend terminal window** running `npm run dev:server`. You will see:
```text
📱 [MOCK OTP] Phone: 9123456780 | Code: 48291 | Expires in 60s
```
Simply enter this 5-digit code into the frontend prompt.
</details>

<details>
<summary><strong>2. Camera or QR scanner will not open in the browser</strong></summary>

Modern browsers restrict `navigator.mediaDevices.getUserMedia` exclusively to **secure contexts** (`https://` or `http://localhost`). Ensure you are accessing the app via `http://localhost:5173` or `http://127.0.0.1:5173`. If accessing from a smartphone over a local Wi-Fi network, use a TLS tunneling tool like `ngrok` or `localtunnel`.
</details>

<details>
<summary><strong>3. Prisma error: "Environment variable not found: DATABASE_URL"</strong></summary>

Make sure you created `.env` inside the `server/` directory (`server/.env`) and not just at the project root. Prisma reads the environment variables from the directory where `schema.prisma` is located or from `server/.env`.
</details>

<details>
<summary><strong>4. Redis connection errors or ECONNREFUSED</strong></summary>

Redis is **completely optional** for local development. If `REDIS_URL` or Upstash environment keys are missing or unreachable, the server automatically mounts an in-memory cache fallback. You can verify this in the server startup logs:
```text
⚠️ Redis credentials not found. Using high-performance In-Memory cache fallback.
```
</details>

<details>
<summary><strong>5. face-api.js neural weights fail to load</strong></summary>

Ensure the model weight files exist in `client/public/models/`. If neural network weights fail to load due to browser memory limits, SPYDE automatically engages its intelligent heuristic anti-spoof fallback to ensure payment flows are never indefinitely blocked.
</details>

---

## 👥 Core Contributors

A huge shoutout to the engineers and builders who brought **SPYDE** to life:

<table align="center">
  <tr>
    <td align="center" width="160">
      <a href="https://github.com/Asmit-06">
        <img src="https://github.com/Asmit-06.png?size=100" width="100px;" alt="Asmit-06" style="border-radius:50%;"/><br />
        <sub><b>Asmit-06</b></sub>
      </a>
      <br />
      <a href="https://github.com/Asmit-06" title="GitHub Profile">💻 Contributor</a>
    </td>
    <td align="center" width="160">
      <a href="https://github.com/AmitxCode07">
        <img src="https://github.com/AmitxCode07.png?size=100" width="100px;" alt="AmitxCode07" style="border-radius:50%;"/><br />
        <sub><b>AmitxCode07</b></sub>
      </a>
      <br />
      <a href="https://github.com/AmitxCode07" title="GitHub Profile">💻 Contributor</a>
    </td>
    <td align="center" width="160">
      <a href="https://github.com/ritupragnyabal">
        <img src="https://github.com/ritupragnyabal.png?size=100" width="100px;" alt="ritupragnyabal" style="border-radius:50%;"/><br />
        <sub><b>ritupragnyabal</b></sub>
      </a>
      <br />
      <a href="https://github.com/ritupragnyabal" title="GitHub Profile">💻 Contributor</a>
    </td>
    <td align="center" width="160">
      <a href="https://github.com/SWAPnajitMohapatra1307">
        <img src="https://github.com/SWAPnajitMohapatra1307.png?size=100" width="100px;" alt="SWAPnajitMohapatra1307" style="border-radius:50%;"/><br />
        <sub><b>SWAPnajitMohapatra1307</b></sub>
      </a>
      <br />
      <a href="https://github.com/SWAPnajitMohapatra1307" title="GitHub Profile">💻 Contributor</a>
    </td>
  </tr>
</table>

| Contributor | GitHub Handle | Profile Link |
|---|---|---|
| **Asmit** | `@Asmit-06` | [github.com/Asmit-06](https://github.com/Asmit-06) |
| **Amit** | `@AmitxCode07` | [github.com/AmitxCode07](https://github.com/AmitxCode07) |
| **Ritupragnya Bal** | `@ritupragnyabal` | [github.com/ritupragnyabal](https://github.com/ritupragnyabal) |
| **Swapnajit Mohapatra** | `@SWAPnajitMohapatra1307` | [github.com/SWAPnajitMohapatra1307](https://github.com/SWAPnajitMohapatra1307) |

---

## 📜 License

This project is licensed under the **ISC License**.

---

<p align="center">
  <b>Built with 🛡️ for safer digital payments across India.</b><br />
  <i>SPYDE — Because every rupee deserves a receiver check.</i>
</p>

