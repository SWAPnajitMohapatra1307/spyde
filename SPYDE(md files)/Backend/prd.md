# 📋 PRD.md — SPYDE Product Requirements Document

**Product:** SPYDE — Receiver Fraud Prevention Middleware for UPI  
**Version:** 2.0 (Round 2 Production Build)  
**Status:** Locked for Build  
**Target Completion:** Before September 1st, 2025  
**Document Owner:** Team Lead  
**Last Updated:** Build Phase Start  

---

## 1. Executive Summary

### One-Liner
> Every UPI app verifies the sender. SPYDE is the first to verify the receiver.

### The Problem
India's UPI ecosystem processes 12+ billion transactions monthly. Sender-side authentication (UPI PIN, biometric, device binding) is mature. **Receiver-side verification is almost non-existent.**

This asymmetry is the root cause of India's most common payment frauds:
1. **QR sticker overwriting** — Scammers paste their QR over a merchant's legitimate QR
2. **Social engineering scams** — Fake job offers, lottery wins, "free recharge" schemes that extract money via UPI
3. **Account takeover + collect requests** — Compromised accounts used to request money from the victim's contacts
4. **Typosquatted VPAs** — `airtel.recharge@oksdi` instead of `@oksbi` — one character difference
5. **First-time payee traps** — Users transfer large amounts to unknown receivers with zero friction

Existing solutions (bank SMS alerts, post-facto dispute resolution) are **reactive**. By the time a user realizes they were scammed, the money is gone.

### The Solution
SPYDE is a **B2B middleware** that UPI apps, banks, and payment service providers (PSPs) integrate between the "Proceed to Pay" button and the "Enter UPI PIN" screen. In under 200ms, SPYDE:

1. Checks if the receiver is in the sender's **Safe Circle** (trusted whitelist) → instant green light
2. Scores the receiver using **algorithmic signals + community complaints + network graph**
3. Optionally triggers **live face verification** of the receiver for high-risk transfers
4. Detects **QR tampering** via GPS-to-VPA mismatch
5. Issues a **cryptographically signed evidence certificate** for every transaction

### Core Pitch to B2B Buyers
> "Drop in one API call. Reduce receiver fraud by 80%. Ship in 2 weeks. No NPCI license required — we sit above the rails."

---

## 2. Product Vision & Goals

### Vision (12 months)
SPYDE becomes the default fraud-prevention layer for Indian UPI apps — the "Stripe Radar" of UPI receiver verification.

### Goals for This Build (Reference App)
| # | Goal | Success Metric |
|---|---|---|
| G1 | Demonstrate all 5 pillars end-to-end with realistic UX | Full demo walkthrough < 10 minutes |
| G2 | Prove risk engine accuracy across 12 persona scenarios | 100% correct verdicts on seeded data |
| G3 | Show production-grade auth + session security | JWT rotation, rate limiting, device binding all functional |
| G4 | Prove browser-side liveness works without server-side face storage | Zero plaintext face data on server; view-once destroys blob |
| G5 | Make the demo investor/judge-ready | Looks and feels like a real UPI app (GPay/PhonePe quality UX) |

### Non-Goals (Explicitly Out of Scope for This Build)
- ❌ Real NPCI / UPI rail integration (simulated only)
- ❌ Real SMS/WhatsApp OTP delivery (console-logged mock)
- ❌ Real bank account linking via Account Aggregator
- ❌ Multi-language support (English only for now)
- ❌ iOS/Android native apps (web-only PWA-ready)
- ❌ Machine learning model training pipeline (rules-based scoring + pre-trained CV models)
- ❌ Real-time WebSocket notifications
- ❌ Payment gateway / merchant settlement
- ❌ Credit scoring or lending features

---

## 3. Target Users

### Primary Persona: The Everyday UPI User (Arjun)
| Attribute | Detail |
|---|---|
| **Name** | Arjun Mehta, 28, Bangalore |
| **Usage** | 15–30 UPI transactions/week |
| **Pain** | Has been scammed once (fake job offer, lost ₹5,000). Now anxious about every new payee. |
| **Need** | Confidence that the person/merchant he's paying is legitimate — without friction on trusted contacts |
| **Behavior** | Pays mom weekly, chai stall daily, friends occasionally, unknown merchants via QR |

### Secondary Persona: The UPI App Product Manager (B2B Buyer)
| Attribute | Detail |
|---|---|
| **Name** | Sneha, PM at a mid-size fintech / neo-bank |
| **Pain** | Fraud losses eating into margins. Customer support flooded with "I paid a scammer" tickets. RBI pressure to improve consumer protection. |
| **Need** | Drop-in fraud API that doesn't require rebuilding their payment stack. Clear audit trail for compliance. |
| **Success** | 50%+ reduction in first-time-payee fraud within 90 days of integration |

### Tertiary Persona: The Fraud Analyst (Admin)
| Attribute | Detail |
|---|---|
| **Name** | Karthik, fraud ops at a PSP |
| **Need** | Dashboard showing top flagged VPAs, network graphs of scam rings, merchant tamper alerts |
| **Behavior** | Reviews hard-blocked transactions, confirms/dismisses community complaints, tunes risk thresholds |

---

## 4. The 5 Core Pillars (Detailed Requirements)

### Pillar 1: Community-Driven Risk Engine

**What it is:** A 2-layer (+ bonus) scoring system that produces a 0–100 risk score and a verdict (PASS / WARN / BLOCK).

**Layer 1 — Algorithmic Score (Hard Cap: 55 points)**

| Signal | Points | Trigger Condition |
|---|---|---|
| Active call detection | +10 | Device reports ongoing phone/VoIP call during payment |
| Amount anomaly | +10 | Amount > 3× user's 30-day average transaction amount |
| New UPI ID | +8 | Receiver VPA first seen by system < 7 days ago |
| New device | +7 | Sender's device fingerprint not seen before for this user |
| Unusual hours | +5 | Transaction between 12:00 AM – 5:00 AM IST |
| Duplicate payment | +10 | Same sender → same VPA → same amount within last 15 minutes |
| First payee | +5 | Sender has never paid this VPA before |

**Rules:**
- Algorithmic score alone **CANNOT hard-block**. Max is 55.
- Hard block requires community signals to push total ≥ 90.

**Layer 2 — Community Complaint Score (0–50 points)**

| Complaint Count (quality-weighted) | Points |
|---|---|
| 0 | 0 |
| 1–3 | +10 |
| 4–7 | +30 |
| 8–9 | +40 |
| 10+ | +50 |

**Quality Multipliers:**
| Quality Tier | Weight | Requirement |
|---|---|---|
| Basic | 1× | Text description only |
| Verified | 2× | Text + valid transaction ID |
| Evidence | 3× | Text + txn ID + screenshot/call-log image |

**Reporter Trust Multipliers:**
| Trust Level | Multiplier | Criteria |
|---|---|---|
| New | 0.5× | Account age < 30 days OR total txns < 5 |
| Regular | 1.0× | Account age ≥ 30 days AND 5–50 txns |
| Trusted | 1.5× | Account age ≥ 90 days AND > 50 txns AND trustScore ≥ 1.2 |

**Time Decay:**
| Age of Complaint | Decay Weight |
|---|---|
| 0–30 days | 1.0 |
| 31–90 days | 0.7 |
| 91–180 days | 0.4 |
| 181–365 days | 0.1 |
| > 365 days | 0.0 (ignored) |

**Bonus Layer — Network Graph Score (0 / 8 / 15)**
| Hit Type | Points | Meaning |
|---|---|---|
| Clean | 0 | No connection to known fraud clusters |
| 1-hop | +8 | A contact of the sender has complained about this VPA |
| Direct hit | +15 | A Safe Circle member of the sender has complained about this VPA |

**Final Verdict Thresholds:**
| Total Score | Verdict | UX Behavior |
|---|---|---|
| 0–49 | **PASS** | Green. Direct to OTP. Subtle "Protected by SPYDE" badge. |
| 50–74 | **WARN** | Yellow warning banner. User can dismiss and proceed to OTP. Shows complaint count. |
| 75–89 | **CHALLENGE** | Orange. Requires liveness verification of receiver (if consenting) OR explicit user acknowledgment. Then OTP. |
| 90–100 | **BLOCK** | Red. OTP button disabled. Shows full risk breakdown. CTA to file complaint or go back. |

**Performance:** Evaluation must complete in < 200ms (p95).

---

### Pillar 2: Hybrid Browser Liveness Engine

**What it is:** A browser-side face liveness check that proves a real human is present — not a photo, video, or deepfake replay.

**Score Composition (0–100, Pass ≥ 75):**

| Component | Max Points | Technology |
|---|---|---|
| Face landmarks + blink detection | 40 | face-api.js (68-point model). Requires 2 blinks within 10 seconds. |
| Anti-spoofing | 35 | YOLOv8n ONNX (detects phones, screens, printed photos). Fallback: heuristic engine (face size ratio, texture variance, micro-motion, screen border contrast). |
| Server challenge code | 25 | Server generates 4-digit code. Displayed on screen. User must be present while code is active (60s TTL). Client confirms code match. |

**Critical Constraints:**
1. **Zero unencrypted face data leaves the browser.** Optional face capture for Pillar 5 is encrypted client-side before upload.
2. **Automatic fallback:** If YOLOv8n ONNX fails to load (network, WebGL, browser compat), seamlessly switch to heuristic anti-spoof. User never sees an error.
3. **Model load time:** Show progress indicator. Target < 5 seconds on 4G.
4. **Total liveness flow:** < 15 seconds from camera open to pass/fail.

**When Triggered:**
- Risk score 75–89 (CHALLENGE verdict)
- Manually by sender requesting receiver verification
- High-value transactions above a configurable threshold (default: ₹10,000 to new payee)

---

### Pillar 3: Merchant QR Tamper Detection

**What it is:** A 5-step pipeline that verifies a scanned QR code actually belongs to the merchant at the user's physical location.

**Pipeline:**
```
Step 1: Decode QR → Extract VPA
Step 2: Capture GPS → Get user's lat/lng (with permission)
Step 3: Server lookup → Find registered merchant at that GPS radius
Step 4: Compare → Does scanned VPA match registered merchant VPA?
Step 5: Verdict → VERIFIED / UNVERIFIED / TAMPERED
```

**Verdict Definitions:**

| Verdict | Color | Condition | UX |
|---|---|---|---|
| **VERIFIED** | 🟢 Green | VPA matches registered merchant within GPS radius | Auto-proceed to payment with merchant name badge |
| **UNVERIFIED** | 🟡 Yellow | QR is valid but merchant has no location registration / KYC incomplete | "Proceed with caution" — payment allowed |
| **TAMPERED** | 🔴 Red | GPS matches a registered merchant BUT scanned VPA ≠ that merchant's VPA | Payment blocked. "This QR doesn't belong here." Report CTA. |

**Edge Cases:**
- GPS permission denied → degrade to UNVERIFIED (never block solely on missing GPS)
- Multiple merchants in radius → match against all; TAMPERED if VPA matches none
- Rural / weak GPS → radius expands to 150m (from default 50m)
- Offline → queue QR scan, show "verification unavailable"

**Performance:** < 300ms server-side verification.

---

### Pillar 4: Safe Circle (Trusted Contacts Whitelist)

**What it is:** A user-managed whitelist of up to 20 trusted contacts. Payments to these contacts skip the entire risk engine.

**Rules:**
1. **Pre-check (Step 0):** Before any risk evaluation, check if `receiverVPA` is in sender's Safe Circle.
2. **If yes → bypass.** Return `{ bypass: true }` in < 10ms. Direct to OTP.
3. **If no → proceed** to full risk engine.
4. **Safety net:** If a Safe Circle contact accumulates **10+ confirmed fraud reports**, show a one-time warning banner: "Your contact [Dad] has been reported for fraud 11 times. Their account may be compromised." — but do **NOT** hard-block. User decides.
5. **Management:** User can add/remove contacts. Max 20. Each entry stores VPA, phone, name, optional nickname ("Mom", "Landlord").
6. **No auto-add.** User must explicitly add. Paying someone 100 times does not auto-whitelist.

**UX Requirements:**
- Green "Safe Circle" badge on payment confirmation for whitelisted contacts
- Dedicated Safe Circle management screen
- Add via phone lookup or VPA entry
- Swipe-to-remove with confirmation

---

### Pillar 5: Digital Evidence Certificate + Encrypted View-Once Face

**What it is:** Every successful (or blocked) transaction generates a cryptographically verifiable certificate. Optionally, the receiver can consent to a one-time face photo that the sender can view exactly once.

**Certificate Contents:**
```json
{
  "certificateId": "uuid",
  "transactionRef": "TXN20250713SPYDE0001",
  "senderId": "usr_arjun_01",
  "receiverVPA": "priya.s@paytm",
  "amount": 1000.00,
  "riskScore": 12,
  "verdict": "PASS",
  "signals": ["FIRST_PAYEE"],
  "timestamp": "2025-07-13T14:30:00.000Z",
  "payloadSha256Hash": "abc123...",
  "jwtSignature": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Hashing Spec:**
1. Serialize payload as **canonical JSON** (keys sorted alphabetically, no whitespace, no trailing commas)
2. SHA-256 hash the canonical string
3. Sign the hash with RS256 JWT (asymmetric key pair)
4. Anyone can verify by re-hashing and checking JWT signature against public key

**View-Once Face Flow:**
```
1. Receiver completes liveness → prompted: "Share a verified photo with sender? (view-once)"
2. If consent: capture 200×200 face frame from camera
3. Client generates random AES-256-GCM key (256-bit)
4. Client encrypts face frame → { ciphertext, iv, authTag }
5. Client uploads ciphertext + iv + authTag to server (NEVER the key)
6. Server stores encrypted blob, returns a one-time view token
7. Key is shared with sender out-of-band (displayed on sender's success screen as a QR or code)
8. Sender opens view link + enters key → client fetches blob → decrypts in-browser → displays face
9. 10-second countdown starts → on expiry OR tab close: key wiped from memory, server marks blob burned, blob deleted
10. Subsequent view attempts return 410 Gone
```

**DPDP Act Compliance:**
- No plaintext biometric data on server at any point
- Encryption key never touches server
- Automatic deletion after single view or 24-hour TTL (whichever first)
- User consent required before capture
- Right to erasure: user can request blob deletion before view

---

## 5. Supporting Features

### 5.1 Authentication System
| Feature | Requirement |
|---|---|
| Registration | Phone number + name. Auto-provisions simulated bank + UPI + balance. |
| OTP Login | 5-digit OTP, 60s expiry, 3 attempts, 5-min lockout after failures. Mock delivery (console log). |
| Sessions | JWT access (15 min) + refresh (7 days). httpOnly cookies. Rotation on refresh. Blacklist on logout. |
| Device Binding | First login stores device fingerprint. New device → +7 risk signal. |
| Roles | USER (default), ANALYST (admin dashboard), ADMIN (full access) |

### 5.2 Simulated Payment Flow
| Feature | Requirement |
|---|---|
| VPA Entry | Regex validation + async name lookup from sim DB |
| Ghost VPAs | Unknown VPAs auto-create ghost receiver (enables "new UPI" signal) |
| Balance Check | Reject if amount > available balance |
| PIN Entry | 6-digit simulated UPI PIN. Any valid 6-digit accepted. Realistic keypad UI. |
| Settlement | Debit sender, credit receiver, create txn record, generate certificate |
| History | List of past transactions with risk scores and verdicts |
| Starting Balance | ₹25,000 for new users |

### 5.3 Complaint Filing
| Feature | Requirement |
|---|---|
| 3 Quality Tiers | Basic / Verified (txn ID) / Evidence (txn ID + image) |
| Categories | Impersonation, QR Tampering, Fake Job Offer, Loan Fraud, Lottery Scam, Duplicate Collect, Other |
| Community Feed | Public list of complaints against a VPA (anonymized reporter) |
| Rate Limit | Max 5 complaints per user per day |

### 5.4 Admin Analyst Dashboard
| Feature | Requirement |
|---|---|
| Access | ANALYST or ADMIN role only |
| Metrics | Total complaints (today/week/month), hard blocks today, top flagged VPAs |
| Network Graph | Force-directed 2D visualization of complaint relationships |
| Merchant Alerts | List of TAMPERED QR events |
| Recent Blocks | Table of score ≥ 90 transactions |

---

## 6. User Journeys (Summary)

Full state diagrams are in `APPFLOW.md`. High-level journeys:

### Journey A: Pay a Safe Circle Contact (Happy Path, < 5 seconds)
```
Home → Send Money → Enter Mom's VPA → Confirm 
→ Safe Circle hit (green badge, < 10ms) → Enter PIN → Success + Certificate
```

### Journey B: Pay a Clean Unknown Contact
```
Home → Send Money → Enter Priya's VPA → Confirm 
→ Risk Engine (score 12, PASS) → Enter PIN → Success + Certificate
```

### Journey C: Pay a Suspicious Contact (Yellow Friction)
```
Home → Send Money → Enter instant.loan@cdfc → Confirm 
→ Risk Engine (score 63, WARN) → Yellow warning modal ("5 users reported this account") 
→ User acknowledges → Enter PIN → Success + Certificate (with WARN verdict logged)
```

### Journey D: Pay a Known Scammer (Hard Block)
```
Home → Send Money → Enter airtel.recharge599@oksdi → Confirm 
→ Risk Engine (score 97, BLOCK) → Red screen, OTP disabled 
→ "14 fraud reports. Payment blocked." → CTA: File Complaint / Go Back
```

### Journey E: Scan Verified Merchant QR
```
Home → Scan QR → Camera decodes → GPS captured → Server verifies 
→ VERIFIED green → Confirm ₹20 → PIN → Success
```

### Journey F: Scan Tampered QR (Sticker Fraud)
```
Home → Scan QR → Camera decodes fake VPA → GPS captured → Server detects mismatch 
→ TAMPERED red → Payment blocked → "This QR doesn't belong to this location" → Report CTA
```

### Journey G: High-Risk with Liveness Challenge
```
Home → Send Money → High-risk VPA → Risk score 82 (CHALLENGE) 
→ Orange modal → "Verify receiver identity" → Liveness camera opens 
→ Blink detection + anti-spoof + challenge code → Pass (≥ 75) 
→ Proceed to PIN → Success + optional view-once face
```

---

## 7. Functional Requirements Matrix

| ID | Requirement | Priority | Owner | Pillar |
|---|---|---|---|---|
| FR-01 | User can register with phone + name | P0 | B1, F1 | Auth |
| FR-02 | User can login via OTP | P0 | B1, F1 | Auth |
| FR-03 | JWT session with refresh rotation | P0 | B1 | Auth |
| FR-04 | Device fingerprint captured on login | P0 | B1, F1 | Auth |
| FR-05 | User can add/remove Safe Circle contacts (max 20) | P0 | B1, F1 | P4 |
| FR-06 | Safe Circle contacts bypass risk engine (< 10ms) | P0 | B1 | P4 |
| FR-07 | Compromised Safe Circle contact shows warning | P1 | B1, F1 | P4 |
| FR-08 | Risk engine evaluates 7 algorithmic signals | P0 | B1 | P1 |
| FR-09 | Risk engine calculates community score with quality + trust + decay | P0 | B1 | P1 |
| FR-10 | Risk engine calculates network graph score | P1 | B1 | P1 |
| FR-11 | Verdict thresholds: PASS/WARN/CHALLENGE/BLOCK | P0 | B1, F1 | P1 |
| FR-12 | Hard block disables OTP at score ≥ 90 | P0 | B1, F1 | P1 |
| FR-13 | Simulated payment: VPA lookup, balance check, PIN, settlement | P0 | B1, F1 | Payment |
| FR-14 | Transaction history with risk scores | P1 | B1, F1 | Payment |
| FR-15 | Liveness: blink detection (2 blinks) | P0 | B2, F2 | P2 |
| FR-16 | Liveness: YOLOv8n anti-spoof + heuristic fallback | P0 | B2, F2 | P2 |
| FR-17 | Liveness: server challenge code (4-digit, 60s) | P0 | B2, F2 | P2 |
| FR-18 | Liveness pass threshold ≥ 75 | P0 | B2 | P2 |
| FR-19 | QR scan with camera + GPS | P0 | F2 | P3 |
| FR-20 | QR server verification: VERIFIED/UNVERIFIED/TAMPERED | P0 | B2 | P3 |
| FR-21 | Tampered QR blocks payment | P0 | B2, F2 | P3 |
| FR-22 | Certificate generated on every settlement | P0 | B2 | P5 |
| FR-23 | Certificate: SHA-256 + JWT RS256 signature | P0 | B2 | P5 |
| FR-24 | Public certificate verification endpoint | P1 | B2, F2 | P5 |
| FR-25 | View-once face: client-side AES-256-GCM encrypt | P1 | F2 | P5 |
| FR-26 | View-once face: one-time view with 10s countdown + auto-delete | P1 | B2, F2 | P5 |
| FR-27 | Complaint filing: Basic / Verified / Evidence | P0 | B2, F2 | P1 |
| FR-28 | Community complaint feed per VPA | P1 | B2, F2 | P1 |
| FR-29 | Admin dashboard with metrics + network graph | P2 | F2 | Admin |
| FR-30 | 12 demo personas seeded with realistic data | P0 | B1 | Infra |

**Priority Legend:** P0 = Must have for demo | P1 = Should have | P2 = Nice to have

---

## 8. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | Risk evaluation < 200ms p95 |
| NFR-02 | Performance | Safe Circle check < 10ms p95 |
| NFR-03 | Performance | QR verification < 300ms p95 |
| NFR-04 | Performance | API p95 latency < 500ms for all endpoints |
| NFR-05 | Performance | Liveness total flow < 15 seconds |
| NFR-06 | Security | All inputs validated with Zod |
| NFR-07 | Security | JWTs in httpOnly cookies |
| NFR-08 | Security | No plaintext biometrics on server |
| NFR-09 | Security | Rate limiting on auth + complaint endpoints |
| NFR-10 | Privacy | DPDP Act compliant view-once face flow |
| NFR-11 | Reliability | Graceful degradation: Redis down → in-memory; YOLO fail → heuristic |
| NFR-12 | Usability | Mobile-first, primary target 375px width |
| NFR-13 | Usability | All critical flows completable one-handed on mobile |
| NFR-14 | Compatibility | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ |
| NFR-15 | Code Quality | Strict TypeScript, zero `any`, zero compilation errors |
| NFR-16 | Code Quality | Consistent API response envelope |
| NFR-17 | Observability | Structured logging with emoji categories; slow-query warnings |
| NFR-18 | Scalability | Stateless API servers; horizontal scale ready (session in Redis) |

---

## 9. Demo Success Criteria

The product is demo-ready when a presenter can complete this script without errors:

| Step | Action | Expected Result | Time |
|---|---|---|---|
| 1 | Login as Arjun | OTP flow works, home shows ₹25,000 | 30s |
| 2 | Pay Mom ₹500 | Safe Circle bypass, green, PIN, success | 20s |
| 3 | Pay Priya ₹1,000 | Score ~12, green PASS, success | 30s |
| 4 | Pay instant.loan@cdfc ₹2,000 | Score ~63, yellow WARN, proceed | 40s |
| 5 | Pay airtel.recharge599@oksdi ₹599 | Score ~97, red BLOCK, OTP disabled | 30s |
| 6 | Scan Ramesh Chai QR | VERIFIED green, pay ₹20 | 40s |
| 7 | Scan Fake Chai QR | TAMPERED red, blocked | 30s |
| 8 | Trigger liveness on high-risk | Camera → blinks → pass → proceed | 60s |
| 9 | Show certificate | SHA-256 + JWT visible, verifiable | 20s |
| 10 | View-once face | 10s countdown, then destroyed | 30s |
| | **Total demo time** | | **~6 minutes** |

---

## 10. Constraints & Assumptions

### Constraints
1. **No real money.** All payment rails are simulated. Connecting to real UPI requires NPCI partnership + PSP license.
2. **No real SMS gateway.** OTPs are console-logged in development.
3. **Browser-only CV.** Liveness runs entirely in-browser. No server-side GPU.
4. **English only.** No i18n for this build.
5. **Single region.** IST timezone assumptions for "unusual hours" signal.
6. **Team of 4 builders.** Scope must fit 4 developers before September 1st, 2025.

### Assumptions
1. Users grant camera permission for liveness and QR scanning.
2. Users grant GPS permission for QR merchant verification (degrades gracefully if denied).
3. Demo device has a working webcam and moderate GPU (for ONNX).
4. PostgreSQL and (optionally) Redis are available in the deployment environment.
5. Judges/investors will evaluate based on the reference app UX + architecture, not real transaction volume.

---

## 11. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| YOLOv8n fails on low-end devices | Liveness broken | Medium | Automatic heuristic fallback (Pillar 2 design) |
| face-api.js model too large (> 5MB) | Slow load on 4G | Medium | Lazy load, progress bar, CDN caching, subset models |
| Team members' AI tools hallucinate APIs | Integration breakage | High | Strict MD docs + tracker scope isolation + API_EXAMPLES.md as contract |
| Scope creep beyond 5 pillars | Miss deadline | High | PRD non-goals are locked; any new feature needs team vote |
| GPS inaccurate indoors | False QR tampers | Medium | Expand radius, UNVERIFIED fallback, never block on GPS alone |
| Prisma schema conflicts between B1/B2 | Merge hell | Medium | B1 owns schema exclusively; B2 requests changes via PR discussion |
| Demo day internet failure | Can't load models | Low | Bundle models in `public/`, pre-cache, heuristic fallback |

---

## 12. Glossary

| Term | Definition |
|---|---|
| **VPA** | Virtual Payment Address — UPI ID like `name@oksbi` |
| **PSP** | Payment Service Provider — entities licensed to move money on UPI |
| **NPCI** | National Payments Corporation of India — operates UPI |
| **P2P** | Person-to-Person transfer |
| **P2M** | Person-to-Merchant transfer |
| **Safe Circle** | User's trusted contacts whitelist (Pillar 4) |
| **Risk Score** | 0–100 composite score from algorithmic + community + graph |
| **Verdict** | PASS / WARN / CHALLENGE / BLOCK decision from risk engine |
| **Liveness** | Proof that a real, present human is in front of the camera |
| **Anti-spoof** | Detection of presentation attacks (photo, screen, mask) |
| **View-Once Face** | Encrypted face image viewable exactly one time for 10 seconds |
| **Typosquatting** | Registering lookalike VPAs (`@oksdi` vs `@oksbi`) to scam users |
| **Sticker fraud** | Pasting a fake QR sticker over a merchant's real QR |
| **DPDP Act** | Digital Personal Data Protection Act, 2023 (India) |
| **Canonical JSON** | Deterministic JSON serialization (sorted keys, no whitespace) |
| **Ghost VPA** | Auto-created receiver record for VPAs not in our sim DB |

---

## 13. Document Control

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | Pre-build | Team Lead | Initial draft |
| 2.0 | Build start | Team Lead | Locked for Round 2 Production Build. 5 pillars finalized. 12 personas. Simulated rails confirmed. |

**This PRD is LOCKED.** Changes require a team discussion and unanimous approval from all 4 developers + team lead. Propose changes in `LEARNING_NOTES.md` under a "PRD Change Request" heading.

---

**Next document to read:** `APPFLOW.md` — End-to-end user journeys with full state machine diagrams.

🛡️ *SPYDE — Built on clarity. Shipped with discipline.*