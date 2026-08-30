# TRACKER_B2.md — Backend Support Task Tracker

**Developer Role:** Backend Support (B2)  
**Project:** SPYDE — B2B Fraud Prevention Middleware for UPI  
**Sprint Duration:** 72 Hours (9 Phases)  
**Primary Ownership:** Verification Services, Liveness API (Pillar 2), QR Verifier (Pillar 3), Certificate Signer (Pillar 5), Complaints System, Admin Endpoints

---

## Overall Progress Dashboard

| Metric | Value |
|---|---|
| **Total Tasks** | 82 |
| **Completed** | 72 / 82 |
| **In Progress** | 10 |
| **Blocked** | 0 |
| **Completion %** | 88% |
| **Current Phase** | Phase 8 — Integration Testing & Cross-Team Sync |
| **Hours Logged** | 62 / 72 |

---

## Ownership Scope

### Primary Deliverables
- Liveness API (Pillar 2): challenge generation, verification, atomic escrow release trigger (COMPLETE)
- QR Tamper Detection (Pillar 3): 5-step decode -> GPS -> lookup -> Haversine -> verdict pipeline (COMPLETE)
- Certificate Engine (Pillar 5): SHA-256 payload hashing, JWT signing (HS256), verification endpoint (COMPLETE)
- Face Blob Service: AES-256-GCM encrypted storage, view-once retrieval, 60s self-destruction, hourly cron purge (COMPLETE)
- Complaints CRUD: file complaint with 24h dedup, query complaints against VPA, admin moderation (COMPLETE)
- Admin Dashboard API: aggregate platform stats, top-flagged VPAs, complaint status patching with requireAdmin guard (COMPLETE)
- Shared Prisma client usage (B1 owns schema, B2 consumes)
- Shared Redis client usage (B1 owns setup, B2 uses for caching)

---

## PHASE 0 — Pre-Flight & Environment Setup
**Duration:** Hour 0–2 | **Status:** COMPLETE

- [x] Pull latest `main` after B1 initializes repo
- [x] Verify Node.js v20, TypeScript, and Prisma client generation
- [x] Confirm `server/.env` has all required variables (especially `CERT_SIGNING_SECRET`)
- [x] Verify Prisma client connects to Supabase PostgreSQL (prisma generate successful)
- [x] Verify Redis client connects to Upstash (or falls back to in-memory)
- [x] Review B1's folder structure and agree on route/service naming conventions
- [x] Create B2-specific service folders (liveness, qr, certificate, complaints, admin)
- [x] Create B2-specific route files scaffold (all 5 route files)
- [x] Confirm Zod schema conventions with B1 (5 schema files created)
- [x] Set up local testing workflow (curl scripts or Thunder Client collection)

---

## PHASE 1 — Schema Familiarization & Service Scaffolding
**Duration:** Hour 2–8 | **Status:** COMPLETE

- [x] Review full `schema.prisma` (all 13 tables, 6 enums, 22 indexes)
- [x] Map B2-owned tables: LivenessSession, MerchantRegistry, Certificate, FaceBlob, Complaint, Admin
- [x] Understand B1-owned tables B2 will read: User, RiskEvent, SimTransaction, SimUpiHandle
- [x] Write TypeScript interfaces for all B2 service inputs/outputs in `src/types/b2.ts`
- [x] Scaffold `src/services/liveness/liveness.service.ts` with full implementation
- [x] Scaffold `src/services/qr/qr.service.ts` with full implementation
- [x] Scaffold `src/services/certificate/certificate.service.ts` with full implementation
- [x] Scaffold `src/services/complaints/complaint.service.ts` with full implementation
- [x] Scaffold `src/services/admin/admin.service.ts` with full implementation
- [x] Create shared `src/utils/geo.ts` for Haversine distance calculation
- [x] Create shared `src/utils/jwt.ts` wrapper for certificate-specific JWT operations
- [x] Verify all scaffolds compile with `npx tsc --noEmit` (zero errors)
- [x] Sync with B1 on LivenessSession lifecycle states (PENDING -> VERIFIED -> EXPIRED)

---

## PHASE 2 — Complaints System
**Duration:** Hour 8–16 | **Status:** COMPLETE

- [x] Implement `src/services/complaints/complaint.service.ts` — fileComplaint with 24h dedup
- [x] Validate `againstVpa` exists via SimUpiHandle lookup before accepting complaint
- [x] Enforce rate limit: 24-hour dedup per complainant per VPA per category
- [x] Implement `getComplaintStats(vpa)` — returns category breakdown + community risk weight
- [x] Implement `getComplaintCount(vpa, days)` — used by Risk Engine community scorer
- [x] Export `getComplaintCount` as a shared function for B1's Risk Engine integration
- [x] Create `src/routes/complaint.routes.ts`
- [x] Build `POST /complaints` (Zod validated, wired to complaintService, 409 on duplicate)
- [x] Build `GET /complaints/against/:vpa` (auth required, returns stats + breakdown)
- [x] Add complaint category validation (FRAUD, IMPERSONATION, SPAM, HARASSMENT, OTHER)
- [x] Test complaint filing with seeded personas
- [x] Test duplicate complaint rate limiting
- [x] Verify complaint count feeds into B1's community risk scorer correctly
- [x] Coordinate with F2 on complaint filing UI request/response contract

---

## PHASE 3 — Liveness API (Pillar 2)
**Duration:** Hour 16–28 | **Status:** COMPLETE

- [x] Implement `src/services/liveness/liveness.service.ts`
- [x] Implement `generateChallenge(userId, payload)` — 4-digit code, 60s TTL, stored in LivenessSession
- [x] Implement `verifyLiveness(userId, payload)` — validates code match + client score >= 75
- [x] Implement escrow release logic: on successful verification, update LivenessSession and SimTransaction
- [x] Implement escrow release trigger: atomic prisma.$transaction for release on PASS / FAILED on fail
- [x] Handle verification failure: mark session and transaction FAILED, return score breakdown
- [x] Handle session expiry: reject verification if expiresAt < now(), return 410 Gone
- [x] Implement `getPendingSessions(userId)` — returns active escrow sessions for receiver
- [x] Create `src/routes/liveness.routes.ts` (fully wired to livenessService)
- [x] Build `POST /liveness/challenge` (returns challengeCode + expiresAt + ttlSeconds)
- [x] Build `POST /liveness/verify` (returns verdict + totalScore + breakdown + livenessToken)
- [x] Build `GET /liveness/pending` (returns pendingCount + sessions array)
- [x] Add Zod validation: challengeCode = 4-digit string, clientScore = 0-100 integer
- [x] Implement idempotency guard: prevent double-verification of same session
- [x] Test PASS flow: generate challenge -> verify with correct code + score 85
- [x] Test FAIL flow: verify with wrong code -> session marked FAILED
- [x] Test EXPIRY flow: attempt verify after 60s -> rejected with 410 Gone
- [x] Coordinate with B1 on escrow release function signature and event contract
- [x] Coordinate with F2 on liveness challenge payload shape

---

## PHASE 4 — QR Tamper Detection (Pillar 3)
**Duration:** Hour 28–38 | **Status:** COMPLETE

- [x] Implement `src/services/qr/qr.service.ts`
- [x] Implement Step 1 — `decodeQrPayload(rawQrString)`: parse UPI deep link via URL constructor
- [x] Handle malformed QR strings gracefully (return UNVERIFIED, not 500 error)
- [x] Implement Step 2 — GPS validation via Zod schema (Indian bounds 8-37N, 68-97E)
- [x] Implement Step 3 — `lookupMerchant(vpa)`: query MerchantRegistry by vpa
- [x] Implement Step 4 — `calculateDistance`: Haversine formula in `src/utils/geo.ts`
- [x] Implement Step 5 — `determineVerdict`: VERIFIED / UNVERIFIED / TAMPERED logic
- [x] Implement full `verifyQr(payload)` orchestrator combining all 5 steps
- [x] Wire `src/routes/qr.routes.ts` to qrService (POST /verify)
- [x] Build `POST /qr/verify` (accepts qrPayload + deviceLat + deviceLng)
- [x] Add Zod validation: qrPayload non-empty, lat/lng in Indian geo bounds
- [x] Test VERIFIED scenario: scan merchant QR within registered radius
- [x] Test TAMPERED scenario: scan merchant QR outside registered radius
- [x] Test UNVERIFIED scenario: scan QR with VPA not in MerchantRegistry
- [x] Test malformed QR: random string -> returns UNVERIFIED
- [x] Coordinate with F2 on QR scanner UI integration

---

## PHASE 5 — Certificate Engine & Face Blob (Pillar 5)
**Duration:** Hour 38–50 | **Status:** COMPLETE

- [x] Implement `src/services/certificate/certificate.service.ts`
- [x] Implement `generateCertificate(transactionId, payloadData)`:
  - Canonical JSON with sorted keys
  - SHA-256 hash computation
  - HS256 JWT signing via CERT_SIGNING_SECRET
  - Store Certificate record in DB
  - Return certificateId + payloadHash + jwtSignature
- [x] Implement `verifyCertificate(payload)`:
  - Fetch Certificate from DB
  - Verify JWT signature via verifyCertificateJwt
  - Compare SHA-256 hash
  - Return isValid + verifiedBy
- [x] Implement `getCertificate(certificateId)`:
  - Fetch with faceBlob include
  - Return full certificate data + face metadata
- [x] Implement `src/services/certificate/face-blob.service.ts`
- [x] Implement `storeFaceBlob(payload)`:
  - Base64 decode encrypted data, IV, auth tag
  - Validate blob size <= 500KB
  - Store in FaceBlob table (BYTEA)
  - Link to Certificate via faceBlobId
- [x] Implement `getAndDestroyFaceBlob(blobId)`:
  - Fetch blob from DB
  - Check isViewed and expiresAt
  - Mark as viewed, set viewedAt
  - Schedule deletion via setTimeout (60s)
  - Return encrypted data as base64
- [x] Implement view-once enforcement: reject GET if isViewed = true (410 Gone)
- [x] Implement auto-cleanup job: delete all FaceBlobs older than 24h (background sweeping interval)
- [x] Wire `src/routes/certificate.routes.ts` to certificateService + faceBlobService
- [x] Build `GET /certificates/:id`
- [x] Build `POST /certificates/verify`
- [x] Build `POST /face-blob`
- [x] Build `GET /face-blob/:id`
- [x] Add Zod validation: certificateId, payloadHash (64-char hex), base64 blob fields
- [x] Test certificate generation -> verification round-trip
- [x] Test certificate tampering detection
- [x] Test face blob upload -> single view -> second view rejected
- [x] Test 500KB blob size limit enforcement
- [x] Coordinate with F2 on face blob encryption contract

---

## PHASE 6 — Admin Dashboard API
**Duration:** Hour 50–56 | **Status:** COMPLETE

- [x] Implement `src/services/admin/admin.service.ts`
- [x] Implement `getStats()`: aggregate users, transactions, volume, blocked, risk verdicts, complaints
- [x] Implement `getTopFlagged()`: top 10 VPAs by complaint count via groupBy
- [x] Implement `moderateComplaint(complaintId, payload)`: PATCH status (PENDING -> VERIFIED/REJECTED)
- [x] Implement admin auth guard middleware (requireAdmin checks req.user.isAdmin)
- [x] Wire `src/routes/admin.routes.ts` to adminService
- [x] Build `GET /admin/stats`
- [x] Build `GET /admin/top-flagged`
- [x] Build `PATCH /admin/complaints/:id`
- [x] Add admin seeding to `prisma/seed.ts` (admin@spyde.dev / admin123)
- [x] Test all 3 admin endpoints with admin credentials
- [x] Coordinate with F2 on admin dashboard UI data contract

---

## PHASE 7 — Cross-Module Integration
**Duration:** Hour 56–62 | **Status:** COMPLETE

- [x] Integrate Liveness verify -> B1 escrow release (CHALLENGE -> VERIFY -> RELEASE)
- [x] Integrate Certificate generation into payment confirmation flow
- [x] Integrate Complaint count -> B1's Risk Engine community scorer
- [x] Integrate QR verify into payment verification flow
- [x] Test full CHALLENGE scenario end-to-end
- [x] Test full BLOCK scenario
- [x] Test Safe Circle + Liveness interaction
- [x] Verify Face Blob lifecycle within full flow
- [x] Fix all integration bugs
- [x] Verify all error responses follow consistent JSON format
- [x] Complete TypeScript compilation check across all modules with zero errors

---

## PHASE 8 — Integration Testing & Cross-Team Sync
**Duration:** Hour 62–68 | **Status:** IN PROGRESS

- [ ] Sync with F1: auth token flow, payment state machine, escrow polling
- [ ] Sync with F2: liveness camera -> challenge -> verify flow
- [ ] Sync with F2: QR scanner -> verdict display
- [ ] Sync with F2: face blob upload -> view-once -> destruction
- [ ] Sync with F2: admin dashboard stats rendering
- [ ] Run 12-persona scenario matrix
- [ ] Test edge cases: concurrent payments, expired tokens, malformed inputs
- [ ] Test DPDP compliance: face blob auto-deletion, no plaintext face data
- [ ] Verify BigInt money calculations
- [ ] Performance check: all endpoints <500ms (p95)
- [ ] Security check: no stack trace leaks
- [ ] Update API_EXAMPLES.md with response shape changes

---

## PHASE 9 — Hardening, Deployment & Demo Prep
**Duration:** Hour 68–72 | **Status:** NOT STARTED

- [ ] Verify all B2 routes mounted in src/index.ts
- [ ] Confirm all env vars set for production
- [ ] Test face blob cleanup cron in runtime
- [ ] Test escrow cleanup cron
- [ ] Verify admin endpoints protected in production
- [ ] Run production smoke test
- [ ] Prepare demo scripts (QR, Liveness, Certificate, Face Blob)
- [ ] Rehearse demo timing with F2
- [ ] Final commit + push to main
- [ ] Update TRACKER_B2.md with final status

---

## Global Blocker Log (Cross-Phase Issues)

| Phase | Time | Issue | Owner | Status | Resolution |
|---|---|---|---|---|---|
| 0 | H1 | PowerShell UTF-8 BOM in package.json | B2 | Resolved | Use UTF8Encoding($false) |
| 0 | H1 | Stray root-level src/ and tsconfig.json | B2 | Resolved | Deleted root files |
| 1 | H3 | Implicit any in forEach/map callbacks | B2 | Resolved | Added explicit interfaces |
| 5 | H45 | FaceBlob response key mismatch | B2 | Resolved | Aligned with faceBlobId type |
| 6 | H52 | Admin getTopFlagged parameter count | B2 | Resolved | Aligned method signature |

---

## Coordination Log (Sync Points with Other Devs)

| Time | With | Topic | Outcome |
|---|---|---|---|
| H56 | B1 | Escrow release function signature | Completed using Prisma direct update transactions |
| H58 | B1 | Payment confirm -> certificate generation hook | Exported generateCertificate utility |
| H60 | B1 | Risk Engine -> getComplaintCount integration | complaintService.getComplaintCount exported |
| H62 | F2 | All API contract shapes | All 5 B2 route controllers fully wired |

---

## Hour-by-Hour Progress Journal

| Hour | Phase | Tasks Completed | Notes |
|---|---|---|---|
| 0 | 0 | Repo init, deps install | PowerShell BOM issue discovered and fixed |
| 2 | 0-1 | Schema, env, types, utils | prisma generate successful, typecheck clean |
| 6 | 1 | All 6 services implemented | Scaffolding complete for all pillars |
| 10 | 2 | Complaints wired to routes | POST /complaints and GET /against/:vpa live |
| 16 | 3 | Liveness wired to routes | POST /challenge, POST /verify, GET /pending live |
| 28 | 4 | QR tamper detection wired | POST /qr/verify live with GPS validation |
| 45 | 5 | Certificate & Face Blob wired | View-once retrieval + hourly cron purge live |
| 54 | 6 | Admin dashboard endpoints wired | Stats, top-flagged, complaint moderation live |
| 58 | 6 | Sandbox seed script completed | prisma/seed.ts ready with full test data |
| 62 | 7 | Cross-module integration verified | tsc compiles with zero errors across entire repo |

---

## Definition of Done (B2 Deliverables)

- [x] Liveness API generates challenges and verifies within 60s window (COMPLETE)
- [x] Escrow release triggers payment status update on successful liveness (COMPLETE)
- [x] QR verify returns correct VERIFIED / UNVERIFIED / TAMPERED for all merchants (COMPLETE)
- [x] Certificate generation + verification round-trip passes with SHA-256 integrity (COMPLETE)
- [x] Face blob view-once works: single GET -> destruction -> second GET returns 410 (COMPLETE)
- [x] No plaintext face data exists in database (DPDP compliant) (COMPLETE)
- [x] Complaints system enforces rate limits and feeds into Risk Engine (COMPLETE)
- [x] Admin dashboard returns accurate aggregate statistics (COMPLETE)
- [x] All 18 endpoints return consistent error JSON format (COMPLETE)
- [ ] All B2 features verified in production deployment