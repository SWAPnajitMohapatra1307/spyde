# SPYDE — Database Schema (Complete Reference)

**Document Version:** 1.0 (Round 2 Production Build)
**Owner:** B1 (Backend Lead)
**ORM:** Prisma 5.x
**Database:** PostgreSQL 15 (Supabase)
**Status:** LOCKED — Schema changes require B1 approval + migration review.

---

## 0. Executive Summary

SPYDE's database follows the **"Real Shell, Fake Rails"** philosophy:

- **Real tables** (no `sim_` prefix): `User`, `RiskEvent`, `SafeCircleContact`, `Complaint`, `LivenessSession`, `MerchantRegistry`, `Certificate`, `FaceBlob`, `RefreshToken`, `Admin`. These contain production-grade auth, fraud, and compliance data.
- **Simulated tables** (`sim_` prefix): `SimBankAccount`, `SimUpiHandle`, `SimTransaction`. These mock the banking/UPI layer that a real integration (Razorpay, Setu, NPCI) would replace.

**Total tables:** 13
**Total enums:** 6
**Total indexes:** 22 (including implicit unique constraints)

---

## 1. Entity-Relationship Overview

```
┌──────────┐       1:N       ┌─────────────────┐
│   User   │────────────────▶│ SimBankAccount   │
│          │                 └─────────────────┘
│          │       1:N       ┌─────────────────┐
│          │────────────────▶│ SimUpiHandle     │
│          │                 └─────────────────┘
│          │       1:N       ┌─────────────────┐
│          │────────────────▶│ SimTransaction   │ (as sender)
│          │                 └─────────────────┘
│          │       1:N       ┌─────────────────┐
│          │────────────────▶│ RiskEvent        │
│          │                 └─────────────────┘
│          │       1:N       ┌─────────────────┐
│          │────────────────▶│ SafeCircleContact│
│          │                 └─────────────────┘
│          │       1:N       ┌─────────────────┐
│          │────────────────▶│ Complaint        │ (as complainant)
│          │                 └─────────────────┘
│          │       1:N       ┌─────────────────┐
│          │────────────────▶│ LivenessSession  │
│          │                 └─────────────────┘
│          │       1:N       ┌─────────────────┐
│          │────────────────▶│ RefreshToken     │
└──────────┘                 └─────────────────┘

┌──────────────────┐  1:1   ┌─────────────────┐
│ SimTransaction   │───────▶│ Certificate     │
└──────────────────┘        └─────────────────┘
                                   │ 1:1
                                   ▼
                            ┌─────────────────┐
                            │ FaceBlob        │
                            └─────────────────┘

┌──────────────────┐  N:1   ┌─────────────────┐
│ Complaint        │───────▶│ User (target)   │
│ (targetVpa ref)  │        │ via SimUpiHandle│
└──────────────────┘        └─────────────────┘
```

---

## 2. Enums

### 2.1 `TransactionStatus`
| Value | Description |
|-------|-------------|
| `PENDING` | Payment initiated, awaiting PIN confirmation |
| `CONFIRMED` | PIN validated, processing debit/credit |
| `SUCCESS` | Funds transferred, balances updated |
| `FAILED` | Payment failed (bad PIN, timeout, insufficient funds) |
| `BLOCKED` | Risk engine blocked the transaction (score ≥ 90) |

### 2.2 `RiskVerdict`
| Value | Score Range | Description |
|-------|-------------|-------------|
| `PASS` | 0–49 | No intervention, proceed normally |
| `WARN` | 50–74 | Show warning modal with signals |
| `CHALLENGE` | 75–89 | Force liveness verification |
| `BLOCK` | 90–100 | Block transaction entirely, disable OTP |

### 2.3 `ComplaintCategory`
| Value | Weight (Community Score) | Description |
|-------|--------------------------|-------------|
| `FRAUD` | 25 | Financial fraud, money mule |
| `IMPERSONATION` | 20 | Fake identity, spoofed VPA |
| `SPAM` | 5 | Unsolicited payment requests |
| `HARASSMENT` | 10 | Threatening or abusive behavior |
| `OTHER` | 5 | Uncategorized |

### 2.4 `ComplaintStatus`
| Value | Description |
|-------|-------------|
| `PENDING` | Filed, awaiting admin review |
| `VERIFIED` | Admin confirmed, 1.5x weight in scoring |
| `REJECTED` | Admin dismissed, 0x weight |

### 2.5 `LivenessVerdict`
| Value | Description |
|-------|-------------|
| `PASS` | Total score ≥ 75 |
| `FAIL` | Total score < 75 |
| `EXPIRED` | Challenge timed out (60s TTL) |

### 2.6 `QrVerdict`
| Value | Description |
|-------|-------------|
| `VERIFIED` | VPA registered + geo within radius |
| `UNVERIFIED` | VPA not in merchant registry |
| `TAMPERED` | VPA registered but geo mismatch |

---

## 3. Table Definitions

### 3.1 `User` (Real — Auth Core)

The central identity table. Every human actor in the system has exactly one row here.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | `String` | PK, UUID | `cuid()` | Primary key |
| `phone` | `String` | UNIQUE, NOT NULL | — | 10-digit Indian mobile (e.g., `9876543210`) |
| `email` | `String?` | UNIQUE | `null` | Optional email for recovery |
| `passwordHash` | `String` | NOT NULL | — | bcrypt hash, cost 12 |
| `name` | `String` | NOT NULL | — | Display name (2–50 chars) |
| `avatarUrl` | `String?` | — | `null` | Profile picture URL (future) |
| `riskScore` | `Int` | NOT NULL | `0` | Cached aggregate risk score (0–100) |
| `isActive` | `Boolean` | NOT NULL | `true` | Soft-delete flag |
| `isAdmin` | `Boolean` | NOT NULL | `false` | Grants admin dashboard access |
| `createdAt` | `DateTime` | NOT NULL | `now()` | Account creation timestamp |
| `updatedAt` | `DateTime` | NOT NULL | `updatedAt` | Last profile modification |

**Indexes:**
- `@@unique([phone])` — implicit from `@unique`
- `@@unique([email])` — implicit from `@unique`
- `@@index([riskScore])` — for admin analytics queries
- `@@index([createdAt])` — for chronological sorting

**Relations:**
- `bankAccounts` → `SimBankAccount[]` (1:N)
- `upiHandles` → `SimUpiHandle[]` (1:N)
- `sentTransactions` → `SimTransaction[]` (1:N, as sender)
- `riskEvents` → `RiskEvent[]` (1:N)
- `safeCircle` → `SafeCircleContact[]` (1:N)
- `filedComplaints` → `Complaint[]` (1:N, as complainant)
- `livenessSessions` → `LivenessSession[]` (1:N)
- `refreshTokens` → `RefreshToken[]` (1:N)

---

### 3.2 `SimBankAccount` (Simulated — Sandbox Rails)

Mocks a real bank account. In production, this would be replaced by a Setu/RazorpayX API call.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | `String` | PK | `cuid()` | Primary key |
| `userId` | `String` | FK → User.id, NOT NULL | — | Owner |
| `ifsc` | `String` | NOT NULL | `"SBIN0000001"` | IFSC code (mock) |
| `accountNumberMasked` | `String` | NOT NULL | — | e.g., `"XXXXXX1234"` |
| `accountType` | `String` | NOT NULL | `"SAVINGS"` | SAVINGS / CURRENT |
| `balancePaisa` | `BigInt` | NOT NULL | `1000000` | Balance in paisa (₹10,000 default) |
| `isActive` | `Boolean` | NOT NULL | `true` | Account frozen flag |
| `createdAt` | `DateTime` | NOT NULL | `now()` | — |

**Indexes:**
- `@@index([userId])` — lookup accounts by user
- `@@unique([accountNumberMasked])` — no duplicate account numbers

**Relations:**
- `user` → `User` (N:1)

**Business Rules:**
- Balance is stored in **paisa** (1 INR = 100 paisa) to avoid floating-point errors.
- Minimum balance: 0 paisa (no overdraft).
- Default seed balance: 1,000,000 paisa (₹10,000).

---

### 3.3 `SimUpiHandle` (Simulated — Sandbox VPA)

Mocks a UPI Virtual Payment Address. Each user can have multiple VPAs but only one primary.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | `String` | PK | `cuid()` | Primary key |
| `userId` | `String` | FK → User.id, NOT NULL | — | Owner |
| `vpa` | `String` | UNIQUE, NOT NULL | — | e.g., `alice@spyde` |
| `isPrimary` | `Boolean` | NOT NULL | `true` | Only one primary per user |
| `isActive` | `Boolean` | NOT NULL | `true` | Deactivated flag |
| `createdAt` | `DateTime` | NOT NULL | `now()` | — |

**Indexes:**
- `@@unique([vpa])` — VPA is globally unique
- `@@index([userId])` — lookup VPAs by user
- `@@index([vpa])` — fast VPA resolution during payments

**Relations:**
- `user` → `User` (N:1)

**Business Rules:**
- VPA format: `^[a-z0-9._-]{2,30}@[a-z]{2,10}$` (enforced at app layer via Zod).
- Case-insensitive lookups: all VPAs stored lowercase.
- When a new primary is set, the old primary's `isPrimary` is flipped to `false` in a transaction.

---

### 3.4 `SimTransaction` (Simulated — Payment Ledger)

The core payment record. Every send/receive creates one row. This is the "ledger" in the sandbox.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | `String` | PK | `cuid()` | Primary key |
| `senderId` | `String` | FK → User.id, NOT NULL | — | Who initiated |
| `receiverVpa` | `String` | NOT NULL | — | Target VPA (denormalized for speed) |
| `receiverId` | `String?` | FK → User.id | `null` | Resolved receiver (null if VPA not found) |
| `amountPaisa` | `BigInt` | NOT NULL | — | Transaction amount in paisa |
| `note` | `String?` | — | `null` | Optional payment note (max 100 chars) |
| `status` | `TransactionStatus` | NOT NULL | `PENDING` | Current state |
| `riskVerdict` | `RiskVerdict` | NOT NULL | `PASS` | Risk engine decision at initiation |
| `riskScore` | `Int` | NOT NULL | `0` | Numeric risk score at time of txn |
| `riskSignals` | `Json` | NOT NULL | `[]` | Array of `{ type, weight, reason }` |
| `idempotencyKey` | `String?` | UNIQUE | `null` | Client-provided dedup key |
| `createdAt` | `DateTime` | NOT NULL | `now()` | Initiation time |
| `updatedAt` | `DateTime` | NOT NULL | `updatedAt` | Last status change |

**Indexes:**
- `@@index([senderId])` — sender's history
- `@@index([receiverId])` — receiver's history
- `@@index([receiverVpa])` — community risk lookups
- `@@index([status])` — pending transaction cleanup job
- `@@index([createdAt])` — chronological queries
- `@@index([riskVerdict])` — admin analytics
- `@@unique([idempotencyKey])` — deduplication

**Relations:**
- `sender` → `User` (N:1, `sentTransactions`)
- `receiver` → `User?` (N:1, optional)
- `certificate` → `Certificate?` (1:1)

**Business Rules:**
- Amount must be ≥ 100 paisa (₹1) and ≤ 10,000,000 paisa (₹1,00,000).
- PENDING transactions auto-expire to FAILED after 5 minutes (cron job).
- `riskSignals` is stored as JSON for full audit trail — never mutated after creation.
- Debit/credit happens atomically inside a Prisma `$transaction` block.

---

### 3.5 `RiskEvent` (Real — Audit Trail)

Immutable log of every risk score change. Used for debugging, compliance, and graph analysis.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | `String` | PK | `cuid()` | Primary key |
| `userId` | `String` | FK → User.id, NOT NULL | — | Subject user |
| `eventType` | `String` | NOT NULL | — | e.g., `TYPO_DETECTED`, `NEW_PAYEE`, `COMPLAINT_FILED` |
| `delta` | `Int` | NOT NULL | — | Score change (+ or -) |
| `reason` | `String` | NOT NULL | — | Human-readable explanation |
| `source` | `String` | NOT NULL | — | `ALGO`, `COMMUNITY`, `GRAPH`, `SAFE_CIRCLE` |
| `transactionId` | `String?` | FK → SimTransaction.id | `null` | Associated txn (if applicable) |
| `createdAt` | `DateTime` | NOT NULL | `now()` | Immutable timestamp |

**Indexes:**
- `@@index([userId])` — user's risk history
- `@@index([userId, createdAt])` — time-bounded risk queries
- `@@index([eventType])` — aggregate analytics
- `@@index([source])` — pillar-level breakdown

**Relations:**
- `user` → `User` (N:1)
- `transaction` → `SimTransaction?` (N:1)

**Business Rules:**
- **Append-only.** No UPDATE or DELETE operations permitted.
- `delta` can be negative (e.g., complaint rejected → score reduction).
- Retention: 1 year (archive older events to cold storage).

---

### 3.6 `SafeCircleContact` (Real — Pillar 4)

Whitelisted VPAs that skip risk analysis entirely.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | `String` | PK | `cuid()` | Primary key |
| `userId` | `String` | FK → User.id, NOT NULL | — | Owner of the safe circle |
| `contactVpa` | `String` | NOT NULL | — | Whitelisted VPA |
| `contactName` | `String` | NOT NULL | — | Display name (user-assigned) |
| `addedAt` | `DateTime` | NOT NULL | `now()` | When contact was added |

**Indexes:**
- `@@unique([userId, contactVpa])` — no duplicate contacts per user
- `@@index([userId])` — list user's circle
- `@@index([contactVpa])` — reverse lookup (safety net banner)

**Relations:**
- `user` → `User` (N:1)

**Business Rules:**
- Max 20 contacts per user (enforced at app layer before INSERT).
- If `contactVpa` accumulates 10+ verified complaints, a **safety net banner** appears: "⚠️ Your trusted contact @xyz has received multiple fraud reports."
- Contacts are NOT mutual — Alice adding Bob doesn't add Alice to Bob's circle.

---

### 3.7 `Complaint` (Real — Community Signal)

User-filed fraud reports. The lifeblood of Pillar 1's community scoring.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | `String` | PK | `cuid()` | Primary key |
| `complainantId` | `String` | FK → User.id, NOT NULL | — | Who filed |
| `targetVpa` | `String` | NOT NULL | — | Accused VPA |
| `targetUserId` | `String?` | FK → User.id | `null` | Resolved target (null if VPA unregistered) |
| `category` | `ComplaintCategory` | NOT NULL | — | Type of fraud |
| `description` | `String` | NOT NULL | — | Free-text description (10–1000 chars) |
| `evidenceUrl` | `String?` | — | `null` | Optional screenshot/receipt URL |
| `status` | `ComplaintStatus` | NOT NULL | `PENDING` | Moderation state |
| `transactionId` | `String?` | FK → SimTransaction.id | `null` | Link to specific txn |
| `createdAt` | `DateTime` | NOT NULL | `now()` | Filing timestamp |
| `updatedAt` | `DateTime` | NOT NULL | `updatedAt` | Status change timestamp |

**Indexes:**
- `@@index([complainantId])` — user's filed complaints
- `@@index([targetVpa])` — community score computation
- `@@index([targetVpa, status])` — verified complaints only
- `@@index([status])` — admin queue filtering
- `@@index([createdAt])` — time-decay calculations
- `@@unique([complainantId, targetVpa, category])` — one complaint per user per VPA per category (24h dedup at app layer)

**Relations:**
- `complainant` → `User` (N:1, `filedComplaints`)
- `targetUser` → `User?` (N:1)
- `transaction` → `SimTransaction?` (N:1)

**Business Rules:**
- Duplicate prevention: same `complainantId` + `targetVpa` within 24 hours → 409 Conflict.
- `VERIFIED` complaints get 1.5x weight in community scoring.
- `REJECTED` complaints get 0x weight.
- Time decay: complaints older than 30 days count at 50% weight.

---

### 3.8 `LivenessSession` (Real — Pillar 2)

Records every liveness verification attempt.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | `String` | PK | `cuid()` | Primary key |
| `userId` | `String` | FK → User.id, NOT NULL | — | Who was verified |
| `challengeCode` | `String` | NOT NULL | — | 4-digit code issued (stored hashed) |
| `clientScore` | `Int` | NOT NULL | `0` | Face-api + YOLO score (max 75) |
| `serverScore` | `Int` | NOT NULL | `0` | Challenge acknowledgment (max 25) |
| `totalScore` | `Int` | NOT NULL | `0` | clientScore + serverScore |
| `verdict` | `LivenessVerdict` | NOT NULL | `FAIL` | PASS / FAIL / EXPIRED |
| `faceEmbeddingHash` | `String?` | — | `null` | SHA-256 of face embedding (no raw data) |
| `transactionId` | `String?` | FK → SimTransaction.id | `null` | Associated payment |
| `expiresAt` | `DateTime` | NOT NULL | — | Challenge TTL (60s from creation) |
| `createdAt` | `DateTime` | NOT NULL | `now()` | — |

**Indexes:**
- `@@index([userId])` — user's liveness history
- `@@index([transactionId])` — txn audit
- `@@index([verdict])` — analytics
- `@@index([expiresAt])` — cleanup expired sessions

**Relations:**
- `user` → `User` (N:1)
- `transaction` → `SimTransaction?` (N:1)

**Business Rules:**
- Challenge code stored as SHA-256 hash (never plaintext).
- `expiresAt` = `createdAt` + 60 seconds.
- Rate limit: 5 challenges per minute per user.
- Raw face images **never** touch this table or the server.

---

### 3.9 `MerchantRegistry` (Real — Pillar 3)

Pre-registered merchants with verified geo-locations for QR tamper detection.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | `String` | PK | `cuid()` | Primary key |
| `vpa` | `String` | UNIQUE, NOT NULL | — | Merchant's UPI VPA |
| `businessName` | `String` | NOT NULL | — | Registered business name |
| `businessType` | `String` | NOT NULL | `"RETAIL"` | RETAIL / RESTAURANT / ONLINE / SERVICE |
| `isVerified` | `Boolean` | NOT NULL | `true` | KYC verified flag |
| `geoLat` | `Float` | NOT NULL | — | Latitude (e.g., 12.9716) |
| `geoLng` | `Float` | NOT NULL | — | Longitude (e.g., 77.5946) |
| `radiusMeters` | `Int` | NOT NULL | `100` | Acceptable scan radius |
| `address` | `String?` | — | `null` | Human-readable address |
| `createdAt` | `DateTime` | NOT NULL | `now()` | — |
| `updatedAt` | `DateTime` | NOT NULL | `updatedAt` | — |

**Indexes:**
- `@@unique([vpa])` — one registry entry per VPA
- `@@index([geoLat, geoLng])` — geo-proximity queries (PostGIS future)
- `@@index([isVerified])` — filter unverified merchants

**Relations:**
- None (standalone lookup table, joined via VPA string match)

**Business Rules:**
- Geo distance calculated using Haversine formula at app layer.
- Default radius: 100m. Large malls/stadiums can set up to 500m.
- In production, this would sync with NPCI's merchant database.

---

### 3.10 `Certificate` (Real — Pillar 5)

Digital evidence certificate issued after every successful transaction.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | `String` | PK | `cuid()` | Primary key |
| `transactionId` | `String` | FK → SimTransaction.id, UNIQUE, NOT NULL | — | One cert per txn |
| `payloadHash` | `String` | NOT NULL | — | SHA-256 of certificate payload |
| `jwtSignature` | `String` | NOT NULL | — | HS256 JWT signature |
| `payload` | `Json` | NOT NULL | — | Full cert data: `{ txId, sender, receiver, amount, timestamp, riskVerdict }` |
| `faceBlobId` | `String?` | FK → FaceBlob.id, UNIQUE | `null` | Optional view-once face |
| `issuedAt` | `DateTime` | NOT NULL | `now()` | Issuance timestamp |

**Indexes:**
- `@@unique([transactionId])` — 1:1 with transaction
- `@@unique([faceBlobId])` — 1:1 with face blob
- `@@index([payloadHash])` — external verification lookup
- `@@index([issuedAt])` — chronological queries

**Relations:**
- `transaction` → `SimTransaction` (1:1)
- `faceBlob` → `FaceBlob?` (1:1)

**Business Rules:**
- Auto-issued on `SimTransaction.status` → `SUCCESS`.
- `payloadHash` = SHA-256 of `JSON.stringify(payload)` with sorted keys.
- `jwtSignature` = `jwt.sign({ hash: payloadHash }, SERVER_PRIVATE_KEY, { algorithm: 'HS256', expiresIn: '1y' })`.
- Certificate is immutable after issuance.

---

### 3.11 `FaceBlob` (Real — Pillar 5, DPDP Compliant)

Stores encrypted face capture for view-once confirmation. Heavily regulated lifecycle.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | `String` | PK | `cuid()` | Primary key |
| `certificateId` | `String` | FK → Certificate.id, UNIQUE, NOT NULL | — | Parent certificate |
| `encryptedData` | `Bytes` | NOT NULL | — | AES-256-GCM encrypted image (max 500KB) |
| `iv` | `Bytes` | NOT NULL | — | Initialization vector (12 bytes) |
| `authTag` | `Bytes` | NOT NULL | — | GCM authentication tag (16 bytes) |
| `isViewed` | `Boolean` | NOT NULL | `false` | View-once flag |
| `viewedAt` | `DateTime?` | — | `null` | When first viewed |
| `expiresAt` | `DateTime` | NOT NULL | — | Hard TTL (24h from creation) |
| `createdAt` | `DateTime` | NOT NULL | `now()` | — |

**Indexes:**
- `@@unique([certificateId])` — 1:1 with certificate
- `@@index([isViewed])` — cleanup job filter
- `@@index([expiresAt])` — TTL cleanup

**Relations:**
- `certificate` → `Certificate` (1:1)

**Business Rules:**
- **Encryption:** Client-side AES-256-GCM. Server stores ciphertext only.
- **View-once:** First `GET` returns data + sets `isViewed = true`. Second `GET` returns 410 Gone.
- **Auto-delete:** Background job runs every 5 min, deletes rows where `isViewed = true AND viewedAt < now() - 60s` OR `expiresAt < now()`.
- **Max size:** 500KB encrypted (200x200 JPEG ≈ 15KB plaintext).
- **DPDP compliance:** No biometric data stored in plaintext. Decryption key never touches the server.

---

### 3.12 `RefreshToken` (Real — Auth)

Stores JWT refresh tokens for session management.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | `String` | PK | `cuid()` | Primary key |
| `userId` | `String` | FK → User.id, NOT NULL | — | Token owner |
| `tokenHash` | `String` | UNIQUE, NOT NULL | — | SHA-256 of refresh token (never store plaintext) |
| `expiresAt` | `DateTime` | NOT NULL | — | 7 days from creation |
| `isRevoked` | `Boolean` | NOT NULL | `false` | Logout / force-revoke flag |
| `userAgent` | `String?` | — | `null` | Device fingerprint |
| `ipAddress` | `String?` | — | `null` | Client IP at creation |
| `createdAt` | `DateTime` | NOT NULL | `now()` | — |

**Indexes:**
- `@@unique([tokenHash])` — fast lookup on refresh
- `@@index([userId])` — revoke all tokens for user
- `@@index([expiresAt])` — cleanup expired tokens

**Relations:**
- `user` → `User` (N:1)

**Business Rules:**
- Token stored as SHA-256 hash. Client holds plaintext; server verifies by hashing.
- On logout: set `isRevoked = true`.
- On password change: revoke ALL tokens for user.
- Cleanup job: delete rows where `expiresAt < now()` daily.

---

### 3.13 `Admin` (Real — Dashboard Access)

Separate table for admin accounts (not regular users).

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | `String` | PK | `cuid()` | Primary key |
| `email` | `String` | UNIQUE, NOT NULL | — | Admin login email |
| `passwordHash` | `String` | NOT NULL | — | bcrypt hash |
| `name` | `String` | NOT NULL | — | Display name |
| `role` | `String` | NOT NULL | `"MODERATOR"` | MODERATOR / SUPER_ADMIN |
| `isActive` | `Boolean` | NOT NULL | `true` | — |
| `lastLoginAt` | `DateTime?` | — | `null` | — |
| `createdAt` | `DateTime` | NOT NULL | `now()` | — |

**Indexes:**
- `@@unique([email])`
- `@@index([role])`

**Relations:**
- None (standalone)

---

## 4. Complete Prisma Schema

```prisma
// prisma/schema.prisma
// SPYDE — Complete Database Schema v1.0

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ───────────────────────────────────────────────

enum TransactionStatus {
  PENDING
  CONFIRMED
  SUCCESS
  FAILED
  BLOCKED
}

enum RiskVerdict {
  PASS
  WARN
  CHALLENGE
  BLOCK
}

enum ComplaintCategory {
  FRAUD
  IMPERSONATION
  SPAM
  HARASSMENT
  OTHER
}

enum ComplaintStatus {
  PENDING
  VERIFIED
  REJECTED
}

enum LivenessVerdict {
  PASS
  FAIL
  EXPIRED
}

enum QrVerdict {
  VERIFIED
  UNVERIFIED
  TAMPERED
}

// ─── REAL TABLES ─────────────────────────────────────────

model User {
  id           String   @id @default(cuid())
  phone        String   @unique
  email        String?  @unique
  passwordHash String   @map("password_hash")
  name         String
  avatarUrl    String?  @map("avatar_url")
  riskScore    Int      @default(0) @map("risk_score")
  isActive     Boolean  @default(true) @map("is_active")
  isAdmin      Boolean  @default(false) @map("is_admin")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  bankAccounts     SimBankAccount[]
  upiHandles       SimUpiHandle[]
  sentTransactions SimTransaction[]  @relation("SenderTransactions")
  receivedTransactions SimTransaction[] @relation("ReceiverTransactions")
  riskEvents       RiskEvent[]
  safeCircle       SafeCircleContact[]
  filedComplaints  Complaint[]       @relation("ComplainantComplaints")
  targetComplaints Complaint[]       @relation("TargetComplaints")
  livenessSessions LivenessSession[]
  refreshTokens    RefreshToken[]

  @@index([riskScore])
  @@index([createdAt])
  @@map("users")
}

model RiskEvent {
  id            String   @id @default(cuid())
  userId        String   @map("user_id")
  eventType     String   @map("event_type")
  delta         Int
  reason        String
  source        String   // ALGO | COMMUNITY | GRAPH | SAFE_CIRCLE
  transactionId String?  @map("transaction_id")
  createdAt     DateTime @default(now()) @map("created_at")

  user        User            @relation(fields: [userId], references: [id])
  transaction SimTransaction? @relation(fields: [transactionId], references: [id])

  @@index([userId])
  @@index([userId, createdAt])
  @@index([eventType])
  @@index([source])
  @@map("risk_events")
}

model SafeCircleContact {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  contactVpa  String   @map("contact_vpa")
  contactName String   @map("contact_name")
  addedAt     DateTime @default(now()) @map("added_at")

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, contactVpa])
  @@index([userId])
  @@index([contactVpa])
  @@map("safe_circle_contacts")
}

model Complaint {
  id            String            @id @default(cuid())
  complainantId String            @map("complainant_id")
  targetVpa     String            @map("target_vpa")
  targetUserId  String?           @map("target_user_id")
  category      ComplaintCategory
  description   String
  evidenceUrl   String?           @map("evidence_url")
  status        ComplaintStatus   @default(PENDING)
  transactionId String?           @map("transaction_id")
  createdAt     DateTime          @default(now()) @map("created_at")
  updatedAt     DateTime          @updatedAt @map("updated_at")

  complainant User            @relation("ComplainantComplaints", fields: [complainantId], references: [id])
  targetUser  User?           @relation("TargetComplaints", fields: [targetUserId], references: [id])
  transaction SimTransaction? @relation(fields: [transactionId], references: [id])

  @@index([complainantId])
  @@index([targetVpa])
  @@index([targetVpa, status])
  @@index([status])
  @@index([createdAt])
  @@map("complaints")
}

model LivenessSession {
  id                String          @id @default(cuid())
  userId            String          @map("user_id")
  challengeCode     String          @map("challenge_code")
  clientScore       Int             @default(0) @map("client_score")
  serverScore       Int             @default(0) @map("server_score")
  totalScore        Int             @default(0) @map("total_score")
  verdict           LivenessVerdict @default(FAIL)
  faceEmbeddingHash String?         @map("face_embedding_hash")
  transactionId     String?         @map("transaction_id")
  expiresAt         DateTime        @map("expires_at")
  createdAt         DateTime        @default(now()) @map("created_at")

  user        User            @relation(fields: [userId], references: [id])
  transaction SimTransaction? @relation(fields: [transactionId], references: [id])

  @@index([userId])
  @@index([transactionId])
  @@index([verdict])
  @@index([expiresAt])
  @@map("liveness_sessions")
}

model MerchantRegistry {
  id           String   @id @default(cuid())
  vpa          String   @unique
  businessName String   @map("business_name")
  businessType String   @default("RETAIL") @map("business_type")
  isVerified   Boolean  @default(true) @map("is_verified")
  geoLat       Float    @map("geo_lat")
  geoLng       Float    @map("geo_lng")
  radiusMeters Int      @default(100) @map("radius_meters")
  address      String?
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@index([geoLat, geoLng])
  @@index([isVerified])
  @@map("merchant_registry")
}

model Certificate {
  id            String   @id @default(cuid())
  transactionId String   @unique @map("transaction_id")
  payloadHash   String   @map("payload_hash")
  jwtSignature  String   @map("jwt_signature")
  payload       Json
  faceBlobId    String?  @unique @map("face_blob_id")
  issuedAt      DateTime @default(now()) @map("issued_at")

  transaction SimTransaction @relation(fields: [transactionId], references: [id])
  faceBlob    FaceBlob?

  @@index([payloadHash])
  @@index([issuedAt])
  @@map("certificates")
}

model FaceBlob {
  id            String    @id @default(cuid())
  certificateId String    @unique @map("certificate_id")
  encryptedData Bytes     @map("encrypted_data")
  iv            Bytes
  authTag       Bytes     @map("auth_tag")
  isViewed      Boolean   @default(false) @map("is_viewed")
  viewedAt      DateTime? @map("viewed_at")
  expiresAt     DateTime  @map("expires_at")
  createdAt     DateTime  @default(now()) @map("created_at")

  certificate Certificate @relation(fields: [certificateId], references: [id])

  @@index([isViewed])
  @@index([expiresAt])
  @@map("face_blobs")
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  tokenHash String   @unique @map("token_hash")
  expiresAt DateTime @map("expires_at")
  isRevoked Boolean  @default(false) @map("is_revoked")
  userAgent String?  @map("user_agent")
  ipAddress String?  @map("ip_address")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

model Admin {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String    @map("password_hash")
  name         String
  role         String    @default("MODERATOR")
  isActive     Boolean   @default(true) @map("is_active")
  lastLoginAt  DateTime? @map("last_login_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  @@index([role])
  @@map("admins")
}

// ─── SIMULATED TABLES ────────────────────────────────────

model SimBankAccount {
  id                  String   @id @default(cuid())
  userId              String   @map("user_id")
  ifsc                String   @default("SBIN0000001")
  accountNumberMasked String   @unique @map("account_number_masked")
  accountType         String   @default("SAVINGS") @map("account_type")
  balancePaisa        BigInt   @default(1000000) @map("balance_paisa")
  isActive            Boolean  @default(true) @map("is_active")
  createdAt           DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("sim_bank_accounts")
}

model SimUpiHandle {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  vpa       String   @unique
  isPrimary Boolean  @default(true) @map("is_primary")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([vpa])
  @@map("sim_upi_handles")
}

model SimTransaction {
  id             String            @id @default(cuid())
  senderId       String            @map("sender_id")
  receiverVpa    String            @map("receiver_vpa")
  receiverId     String?           @map("receiver_id")
  amountPaisa    BigInt            @map("amount_paisa")
  note           String?
  status         TransactionStatus @default(PENDING)
  riskVerdict    RiskVerdict       @default(PASS) @map("risk_verdict")
  riskScore      Int               @default(0) @map("risk_score")
  riskSignals    Json              @default("[]") @map("risk_signals")
  idempotencyKey String?           @unique @map("idempotency_key")
  createdAt      DateTime          @default(now()) @map("created_at")
  updatedAt      DateTime          @updatedAt @map("updated_at")

  sender      User         @relation("SenderTransactions", fields: [senderId], references: [id])
  receiver    User?        @relation("ReceiverTransactions", fields: [receiverId], references: [id])
  certificate Certificate?
  riskEvents  RiskEvent[]
  complaints  Complaint[]
  livenessSessions LivenessSession[]

  @@index([senderId])
  @@index([receiverId])
  @@index([receiverVpa])
  @@index([status])
  @@index([createdAt])
  @@index([riskVerdict])
  @@map("sim_transactions")
}
```

---

## 5. Migration Strategy

### 5.1 Development
```bash
npx prisma migrate dev --name <descriptive_name>
```
- Creates SQL migration file in `prisma/migrations/`
- Applies to local Supabase dev database
- Regenerates Prisma Client

### 5.2 Production
```bash
npx prisma migrate deploy
```
- Applies pending migrations without prompts
- Run on first deploy and every subsequent schema change
- **Never** use `prisma db push` in production

### 5.3 Reset (Dev Only)
```bash
npx prisma migrate reset
npm run seed
```
- Drops all tables, re-applies migrations, runs seed
- **Destructive** — never run on production

---

## 6. Seed Data Summary

The seed script (`prisma/seed.ts`) creates:

| Entity | Count | Details |
|--------|-------|---------|
| Users | 12 | Alice, Bob, Charlie + 9 typosquatted personas |
| SimBankAccounts | 12 | One per user, ₹10,000 each |
| SimUpiHandles | 21 | Primary + spoofed handles (`@oksdi`, `@cdfc`, etc.) |
| Merchants | 10 | Bengaluru, Delhi, Mumbai locations |
| Complaints | 15 | Pre-seeded fraud reports for demo |
| Transactions | 30 | Historical txns for graph analysis |
| Admin | 1 | `admin@spyde.com` / `Admin@123` |

---

## 7. Performance Notes

| Concern | Solution |
|---------|----------|
| VPA resolution speed | `@@index([vpa])` on SimUpiHandle — O(log n) lookup |
| Community score queries | `@@index([targetVpa, status])` on Complaint — filtered count |
| Transaction history | `@@index([senderId])` + `@@index([receiverId])` — paginated |
| Face blob cleanup | `@@index([isViewed])` + `@@index([expiresAt])` — batch delete |
| Risk event time queries | `@@index([userId, createdAt])` — composite for range scans |
| BigInt for money | Avoids floating-point precision loss on paisa arithmetic |

---

## 8. Security Notes

| Concern | Mitigation |
|---------|------------|
| Password storage | bcrypt cost 12, never plaintext |
| Refresh tokens | SHA-256 hash stored, plaintext only on client |
| Face data | AES-256-GCM encrypted, server stores ciphertext only |
| Challenge codes | SHA-256 hashed in LivenessSession |
| PII exposure | Phone/email not returned in public APIs |
| Soft deletes | `isActive` flags preserve audit trail |
| SQL injection | Prisma parameterized queries (ORM-level protection) |

---

**End of File 7 of 19 — `SCHEMA.md`**


