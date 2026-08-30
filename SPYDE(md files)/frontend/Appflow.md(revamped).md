# 🔄 APPFLOW_V2.md — SPYDE Complete Navigation, Screen Architecture & Interaction Specification

**Product Version:** v2.0 (Round 2 Production Build)  
**Document Status:** ✅ LOCKED & PRODUCTION-READY  
**Design Theme:** Slate & Emerald Trust System (`Design.md`)  
**Backend Contracts:** `API_EXAMPLES_B1.md` + `API_EXAMPLES_B2.md` (Source of Truth)  
**Cross-References:** `PRD.md`, `TECHSPEC.md`, `SAFECIRCLE.md`, `LIVENESS.md`, `QR_TAMPER.md`, `CERTIFICATE.md`, `IMPLEMENTATIONPLAN.md`, `LEARNING_NOTES.md`  

> **Golden Rule:** If a screen, card, transition, or interaction is NOT in this document — it does NOT get built.  
> **Contract Rule:** If an API call is NOT documented in `API_EXAMPLES_B1.md` or `API_EXAMPLES_B2.md` — it does NOT exist.  
> **Architecture Rule:** *"Real Shell, Fake Rails"* — Real fraud logic + simulated payment rails (`sim_*` tables).

---

## Table of Contents

1. [App-Level Navigation Map](#1-app-level-navigation-map)
2. [First-Time User Onboarding & Permission Priming](#2-first-time-user-onboarding--permission-priming)
3. [Authentication Flow & Session Lifecycle](#3-authentication-flow--session-lifecycle)
4. [Home Shell & Dashboard Architecture](#4-home-shell--dashboard-architecture)
5. [Core Payment Flow State Machine ★ CRITICAL](#5-core-payment-flow-state-machine--critical)
6. [Safe Circle Flows & Anomaly Safety Net](#6-safe-circle-flows--anomaly-safety-net)
7. [QR Scanner & Tamper Detection Flow](#7-qr-scanner--tamper-detection-flow)
8. [Receiver-First Liveness Flow](#8-receiver-first-liveness-flow)
9. [Certificate & View-Once Face Flow](#9-certificate--view-once-face-flow)
10. [Complaint Filing & Community Feed Flow](#10-complaint-filing--community-feed-flow)
11. [Admin Dashboard & Moderation Flow](#11-admin-dashboard--moderation-flow)
12. [User Profile & Account Settings](#12-user-profile--account-settings)
13. [Transaction History & Detail Spec](#13-transaction-history--detail-spec)
14. [Notifications System Spec](#14-notifications-system-spec)
15. [Component Cards Catalog](#15-component-cards-catalog)
16. [Modals & Bottom Sheets Inventory](#16-modals--bottom-sheets-inventory)
17. [Loading, Skeleton & Empty State Specs](#17-loading-skeleton--empty-state-specs)
18. [Offline & Poor Network Handling](#18-offline--poor-network-handling)
19. [Micro-Interactions & Animation Catalog](#19-micro-interactions--animation-catalog)
20. [Comprehensive Error & Edge Case Matrix](#20-comprehensive-error--edge-case-matrix)
21. [Cross-Dev Handoff & Contract Matrix](#21-cross-dev-handoff--contract-matrix)
22. [Contract Reconciliation Notes](#22-contract-reconciliation-notes)

---

## 1. App-Level Navigation Map

```
                                  ┌─────────────┐
                                  │   SPLASH    │
                                  │  (/) 1.5s   │
                                  └──────┬──────┘
                                         │ Auth check
                             ┌───────────┴───────────┐
                             │  Valid JWT Session?   │
                             └───────┬───────┬───────┘
                                NO   │       │ YES
                             ┌───────▼──┐ ┌──▼───────┐
                             │  PUBLIC  │ │   HOME   │
                             │  STACK   │ │  SHELL   │
                             └──────────┘ └────┬─────┘
                                               │
       ┌───────────┬─────────────┬─────────────┼─────────────┬───────────┐
       │           │             │             │             │           │
       ▼           ▼             ▼             ▼             ▼           ▼
   ┌───────┐  ┌────────┐   ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌────────┐
   │ Send  │  │Scan QR │   │  Safe    │  │ History  │  │Notifi-  │  │Profile │
   │Money  │  │        │   │  Circle  │  │          │  │cations  │  │        │
   └───┬───┘  └───┬────┘   └──────────┘  └──────────┘  └─────────┘  └───┬────┘
       │          │                                                     │
       ▼          ▼                                                     ▼
  PAYMENT FLOW  QR FLOW ──► merges into PAYMENT FLOW              ADMIN (role-based)
       │
       ├──► LIVENESS REDIRECT (F2) [conditional]
       ├──► FRICTION UI (WARN/CHALLENGE/BLOCK) [F1]
       ├──► PIN ENTRY [F1]
       ├──► SUCCESS + CERTIFICATE [F1/F2]
       └──► VIEW-ONCE FACE [F2]
```

### 1.1 Complete Route Inventory

| Route | Component | Owner | Guard | Access | Description |
|---|---|---|---|---|---|
| `/` | `SplashPage` | F1 | None | Public | Logo animation + token validation |
| `/welcome` | `WelcomePage` | F1 | `PublicOnly` | Public | Brand intro & onboarding entry |
| `/onboarding/tour` | `OnboardingTourPage` | F1 | `PublicOnly` | Public | 3-slide value prop |
| `/onboarding/permissions` | `PermissionPrimingPage` | F1 | `PublicOnly` | Public | Camera, GPS, Notification priming |
| `/register` | `RegisterPage` | F1 | `PublicOnly` | Public | Name, phone, email, password, VPA |
| `/login` | `LoginPage` | F1 | `PublicOnly` | Public | Phone + Password login |
| `/otp` | `OtpPage` | F1 | `PublicOnly` | Public | 5-digit OTP (mock delivery) |
| `/home` | `HomePage` | F1 | `RequireAuth` | User | Main dashboard |
| `/payment/send` | `VpaEntryPage` | F1 | `RequireAuth` | User | Enter VPA + amount |
| `/payment/confirm` | `ConfirmPaymentPage` | F1 | `RequireAuth` + `RequirePaymentState` | User | Receiver review |
| `/payment/warning` | `FrictionWarnPage` | F1 | `RequireAuth` + `RequirePaymentState` | User | Score 50–74: Honey Amber |
| `/payment/challenge` | `FrictionChallengePage` | F1 | `RequireAuth` + `RequirePaymentState` | User | Score 75–89: Terracotta |
| `/payment/blocked` | `FrictionBlockedPage` | F1 | `RequireAuth` + `RequirePaymentState` | User | Score 90–100: Deep Ruby |
| `/payment/pin` | `PinPadPage` | F1 | `RequireAuth` + `RequirePaymentState` | User | 6-digit PIN (`1234`) |
| `/payment/success` | `PaymentSuccessPage` | F1 | `RequireAuth` + `RequirePaymentState` | User | Confetti + certificate link |
| `/payment/failed` | `PaymentFailedPage` | F1 | `RequireAuth` | User | Failure breakdown + retry |
| `/circle` | `SafeCirclePage` | F1 | `RequireAuth` | User | Trusted contacts (max 20) |
| `/qr` | `QrScannerPage` | F2 | `RequireAuth` | User | Camera + GPS scanner |
| `/qr/result` | `QrVerdictPage` | F2 | `RequireAuth` | User | VERIFIED / UNVERIFIED / TAMPERED |
| `/liveness/pending` | `ReceiverChallengePage` | F2 | `RequireAuth` | User | Pending escrow list |
| `/liveness/:sessionId` | `LivenessCameraPage` | F2 | `RequireAuth` + `RequireLivenessSession` | User | EAR + YOLO + code |
| `/certificates/:id` | `CertificateViewerPage` | F2 | `RequireAuth` | User | Cert with SHA-256 + JWT |
| `/verify/:id` | `PublicVerifyPage` | F2 | None | Public | External verification portal |
| `/face-blob/:id` | `ViewOnceFacePage` | F2 | `RequireAuth` | User | AES-256-GCM 10s viewer |
| `/complaints/new` | `ComplaintFormPage` | F2 | `RequireAuth` | User | File fraud complaint |
| `/complaints/vpa/:vpa` | `CommunityFeedPage` | F2 | `RequireAuth` | User | Anonymized VPA feed |
| `/complaints/mine` | `MyComplaintsPage` | F2 | `RequireAuth` | User | User's filed complaints |
| `/history` | `TransactionHistoryPage` | F1 | `RequireAuth` | User | Paginated txn list |
| `/history/:id` | `TransactionDetailPage` | F1 | `RequireAuth` | User | Full audit breakdown |
| `/notifications` | `NotificationsPage` | F1 | `RequireAuth` | User | System alerts |
| `/profile` | `ProfilePage` | F1 | `RequireAuth` | User | Account & security |
| `/admin` | `AdminOverviewPage` | F2 | `RequireAuth` + `RequireAnalyst` | Analyst+ | Platform metrics |
| `/admin/flagged` | `AdminTopFlaggedPage` | F2 | `RequireAuth` + `RequireAnalyst` | Analyst+ | Top flagged VPAs |
| `/admin/network` | `AdminNetworkGraphPage` | F2 | `RequireAuth` + `RequireAnalyst` | Analyst+ | Fraud graph |
| `/admin/tampers` | `AdminQrTampersPage` | F2 | `RequireAuth` + `RequireAnalyst` | Analyst+ | QR tamper events |
| `/admin/complaints` | `AdminModerationPage` | F2 | `RequireAuth` + `RequireAnalyst` | Analyst+ | Complaint queue |

---

## 2. First-Time User Onboarding & Permission Priming

### 2.1 Onboarding Flow

```
   ┌────────────┐     ┌──────────────────┐     ┌───────────────────────┐
   │WELCOME PAGE│────►│ ONBOARDING TOUR  │────►│  PERMISSION PRIMING   │
   │ (/welcome) │     │(/onboarding/tour)│     │(/onboarding/permission│
   └────────────┘     └──────────────────┘     └───────────┬───────────┘
                                                            │
   ┌────────────┐     ┌──────────────────┐                  │
   │ LOGIN PAGE │◄────│  REGISTER PAGE   │◄─────────────────┘
   │  (/login)  │     │   (/register)    │
   └─────┬──────┘     └────────┬─────────┘
         │                     │
         └──────────┬──────────┘
                    ▼
   ┌─────────────────────────────────────┐
   │ OTP ENTRY PAGE (/otp)               │
   └────────────────┬────────────────────┘
                    ▼
   ┌─────────────────────────────────────┐
   │ FIRST BALANCE REVEAL MODAL          │
   │ "₹5,00,000 sandbox provisioned"     │
   └────────────────┬────────────────────┘
                    ▼
   ┌─────────────────────────────────────┐
   │ HOME + FIRST-TIME COACH OVERLAY     │
   └─────────────────────────────────────┘
```

### 2.2 Welcome Page (`/welcome`)

| Element | Spec |
|---|---|
| Logo | SPYDE shield mark, top center, `display-md` |
| Tagline | *"Every rupee deserves a receiver check."* — `heading-md`, `Warm Bone` |
| Body | 2-line B2B trust statement — `body-md`, `Sand` color |
| Primary CTA | "Create Account" → `/register` (Muted Jade pill) |
| Secondary CTA | "I already have an account" → `/login` (Ghost pill) |
| Footer link | "Learn more about SPYDE" → `/onboarding/tour` |

### 2.3 Onboarding Tour (`/onboarding/tour`)

3 slides with horizontal swipe + progress dots. Auto-advances after 5s unless user taps to advance.

| Slide | Icon | Title | Body |
|---|---|---|---|
| 1 | 🛡️ | **Verify the Receiver** | Traditional UPI checks the sender. SPYDE verifies where your money is actually going. |
| 2 | ✨ | **Instant Safe Circle** | Whitelist up to 20 trusted contacts. Payments to family bypass all security checks in under 10 milliseconds. |
| 3 | 📜 | **Cryptographic Proof** | Every payment generates a tamper-proof Digital Evidence Certificate signed with SHA-256 + JWT. |

- **Skip:** Top-right corner, jumps to `/onboarding/permissions`
- **Get Started:** Slide 3 primary CTA → `/onboarding/permissions`

### 2.4 Permission Priming (`/onboarding/permissions`)

**Rationale:** Never trigger raw browser permission dialogs cold. Always show a contextual card explaining *why* before requesting.

```
┌────────────────────────────────────────────────────────────┐
│  🔐 SPYDE needs a few permissions                          │
│  We'll ask for these only when needed. You can change them │
│  anytime in your device settings.                          │
├────────────────────────────────────────────────────────────┤
│  📷 Camera  ─  Required for QR scanning & liveness         │
│                verification of receivers.                  │
│                [ Grant Camera Access ]                     │
├────────────────────────────────────────────────────────────┤
│  📍 Location  ─  Required to detect sticker-over-QR fraud │
│                  via Merchant GPS verification.            │
│                  [ Grant Location Access ]                 │
├────────────────────────────────────────────────────────────┤
│  🔔 Notifications  ─  Required for real-time escrow alerts│
│                       and Safety Net warnings.             │
│                       [ Grant Notification Access ]        │
├────────────────────────────────────────────────────────────┤
│                          [ Continue → ]                    │
└────────────────────────────────────────────────────────────┘
```

- Each permission triggers browser dialog on tap.
- Denial is non-blocking. Continue button always active.
- Denied permissions surface `PermissionRePrimingBanner` on relevant screens later.

### 2.5 First-Time Coach Overlay (After First Home Load)

Dark backdrop with spotlight cutouts pointing to key UI elements:

1. **Spotlight 1:** Balance card → *"Your simulated sandbox balance. Real UPI integration coming soon."*
2. **Spotlight 2:** Send Money button → *"Start here. Every payment runs through SPYDE's 3-layer risk engine."*
3. **Spotlight 3:** Safe Circle button → *"Add trusted contacts to bypass friction on repeat payments."*
4. **Spotlight 4:** Bottom nav → *"Scan QRs, review history, and manage settings."*

- Dismisses on final "Got it" tap.
- Stored in `localStorage` as `spyde:onboardingComplete = true`.
- Never re-shows unless user resets from Profile → Settings.

---

## 3. Authentication Flow & Session Lifecycle

### 3.1 Auth State Machine

```
   ┌─────────────┐
   │   SPLASH    │
   └──────┬──────┘
          │ Check accessToken (memory) + refreshToken cookie
          ├────── Valid ─────────────────► HOME
          │
          ▼
   ┌─────────────┐     Action: Create      ┌──────────────┐
   │WELCOME PAGE │─────────────────────────►│ REGISTER PAGE│
   └──────┬──────┘                          └──────┬───────┘
          │ Action: Existing                       │
          ▼                                        ▼
   ┌─────────────┐                          ┌──────────────┐
   │ LOGIN PAGE  │                          │ POST /auth/  │
   │(phone+pass) │                          │  register    │
   └──────┬──────┘                          └──────┬───────┘
          │ POST /auth/login                       │
          └────────────────┬───────────────────────┘
                           ▼
                  ┌─────────────────┐
                  │ OTP ENTRY PAGE  │
                  │  (60s TTL)      │
                  └────────┬────────┘
                           │ Correct 5-digit
                           ▼
                  ┌─────────────────┐
                  │ STORE JWT PAIR  │
                  │(access + cookie)│
                  └────────┬────────┘
                           ▼
                  ┌─────────────────┐
                  │ GET /api/auth/me│
                  └────────┬────────┘
                           ▼
                  ┌─────────────────┐
                  │  HOME (/home)   │
                  └─────────────────┘
```

### 3.2 Register Screen (`/register`)

| Field | Type | Validation | Notes |
|---|---|---|---|
| Full Name | text | 2–50 chars | Required |
| Phone | text | `+91` or 10-digit | Accepts both; backend normalizes to `+91` |
| Email | email | RFC email | Optional |
| Password | password | ≥ 6 chars, mix recommended | Required |
| UPI VPA | text | `^[a-z0-9._-]+@[a-z]+$` (3–50) | Required, lowercase |

**API:** `POST /api/auth/register` → auto-provisions `SimBankAccount` (₹5,00,000 balance) + primary `SimUpiHandle`.

**On Success:** Returns `{ user, accessToken, refreshToken }` → stores in `authStore` → redirect to `/home` OR trigger First Balance Reveal modal.

**Errors:**
- `409 CONFLICT` → Inline: *"An account with this phone or VPA already exists."*
- `400 BAD_REQUEST` → Inline field errors from Zod.

### 3.3 Login Screen (`/login`)

| Field | Type | Notes |
|---|---|---|
| Phone | text | `+91` or 10-digit format accepted |
| Password | password | Standard input |

**API:** `POST /api/auth/login` → Returns `{ user, accessToken, refreshToken }`.

**Errors:**
- `401 UNAUTHORIZED` → Inline: *"Invalid phone number or password."*

**Additional CTAs:**
- "Forgot password?" — link to reset flow (deferred to v2.1)
- "Create new account" — link to `/register`

### 3.4 OTP Entry (`/otp`)

**Note:** Per `LEARNING_NOTES.md` [B2] and product intent, OTP flow is the target UX. However, B1 API examples currently expose password login. Frontend implements OTP UI against the shipped password endpoint OR mocks the OTP layer until B1 unifies. **See Section 22 for reconciliation.**

| Element | Spec |
|---|---|
| Digit Boxes | 5 individual boxes, auto-focus, auto-advance, paste support |
| Timer | 60s countdown |
| Resend | Disabled until countdown expires |
| Dev Aid | In development, mock OTP `123456` displayed in dismissible top toast |
| Lockout | After 3 wrong attempts → 5-min lockout with clear countdown |
| Shake | Framer Motion shake animation on wrong entry |

### 3.5 Session Lifecycle & Token Rotation

```
Access Token  → 15 minutes (HS256 JWT, stored in memory or `httpOnly` cookie)
Refresh Token → 7 days (SHA-256 hash stored in DB, `httpOnly` cookie)

On 401:
  1. apiClient intercepts response
  2. Calls POST /api/auth/refresh with refresh cookie
  3. Server returns new access + new refresh token (rotation)
  4. Original request retried once
  5. On second 401 → clear authStore → redirect /login with toast

Token Theft Detection:
  If a revoked refresh token is reused → ALL user sessions revoked immediately.
```

### 3.6 First Balance Reveal Modal

Appears once after initial registration:

```
┌───────────────────────────────────────────┐
│              🎉                            │
│                                            │
│    Welcome, Aarav!                         │
│                                            │
│    Your sandbox account is ready.          │
│                                            │
│         ₹ 5,00,000.00                      │
│                                            │
│    Use this balance to explore SPYDE      │
│    without any real money at risk.        │
│                                            │
│         [ Start Exploring → ]              │
└───────────────────────────────────────────┘
```

- Uses `display-xl` for amount with `tnum`.
- Muted Jade CTA pill.
- On dismiss → triggers First-Time Coach Overlay on Home.

---

## 4. Home Shell & Dashboard Architecture

### 4.1 Home Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  🛡️ SPYDE            [Trust: 5]    [🔔 2]     [Avatar: AS]      │  Header (56px)
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Available Balance                            [👁️ Hide]      │  │  BalanceCard
│  │ ₹ 5,00,000.00                                              │  │  (display-xl, tnum)
│  │ State Bank of India ••••3210  •  aarav@okaxis             │  │
│  └────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ⏰ ESCROW PENDING: ₹500.00 incoming from Priya Mehta       │  │  EscrowBanner
│  │    Receiver Liveness Required  •  Closes in 08:42          │  │  (Terracotta wash,
│  │    [ Verify Identity Now ]                                 │  │   conditional render)
│  └────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│  Quick Actions                                                   │
│  [ ↗️ Send Money ]   [ 📷 Scan QR ]   [ 🛡️ Safe Circle ]        │
├──────────────────────────────────────────────────────────────────┤
│  Trusted Payees                                    [ See All →]  │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐                        │  QuickPayCarousel
│  │ AP │  │ AI │  │ RG │  │ DN │  │ +  │                        │  (horizontal scroll,
│  │Adi │  │Ana │  │Roh⚠│  │Diya│  │Add │                        │   Safe Circle contacts)
│  └────┘  └────┘  └────┘  └────┘  └────┘                        │
├──────────────────────────────────────────────────────────────────┤
│  Recent Transactions                              [ See All →]   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ↑ Aditya Patel     aditya@okicici   ₹250.00     🟢 PASS   │  │  RecentTransactions
│  │ ↗️ challenge.test   challenge@oksdi  ₹500.00    🟠 CHAL   │  │  (last 5 items from
│  │ ✗ Mule Syndicate   mule@oksbii      ₹5,000.00  🔴 BLOCK  │  │   /payment/history)
│  └────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│  💡 SPYDE Tip: Typosquatting handles like @oksdi mimic          │  Educational
│     legitimate bank handles (@oksbi). Always check the risk     │  Tip Card
│     verdict badge before confirming.                            │  (Rotating)
├──────────────────────────────────────────────────────────────────┤
│ [ 🏠 Home ]    [ 📷 Scan ]    [ 🛡️ Circle ]    [ 👤 Profile ]  │  BottomNav (fixed)
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Bindings

| Component | Data Source | Refresh Trigger |
|---|---|---|
| **BalanceCard** | `GET /api/auth/me` → `bankAccounts[0].balanceRupees` | Mount, focus, post-payment |
| **Header Trust Badge** | `GET /api/auth/me` → `riskScore` | Mount only |
| **Notification Bell** | `GET /api/notifications/unread-count` (polling 10s) | Every 10s |
| **EscrowBanner** | `GET /api/liveness/pending` (polling 10s) | Every 10s |
| **QuickPayCarousel** | `GET /api/circle` | Mount |
| **RecentTransactions** | `GET /api/payment/history?limit=5&offset=0` | Mount, post-payment |
| **TipCard** | Rotating local content array | Mount |

### 4.3 Balance Card Interactions

| Action | Behavior |
|---|---|
| Tap eye icon | Toggles between `₹ 5,00,000.00` and `₹ ••••••••` (persisted in localStorage) |
| Long press | Copies masked account number to clipboard + toast confirmation |
| Pull-to-refresh (mobile) | Refetches `/api/auth/me` |
| Balance change | Framer Motion count-up animation over 400ms |

### 4.4 Escrow Banner (Conditional)

Renders when `GET /api/liveness/pending` returns any active challenges.

- **Wash:** Terracotta (`#C2410C` @ 15% opacity)
- **Icon:** Amber clock with pulse animation
- **Timer:** MM:SS countdown from response `ttlSeconds`
- **CTA:** Primary pill "Verify Identity Now" → `/liveness/pending`
- **Multiple pending:** Shows "3 pending challenges" and navigates to list

### 4.5 Quick Pay Carousel

- Horizontal scroll, avatar-only tiles (48px)
- Shows up to 5 Safe Circle contacts + "+ Add" tile
- Anomaly indicator: red dot on avatar if `hasAnomaly === true`
- Tap → navigates to `/payment/send?vpa=<contactVpa>&name=<contactName>` (prefilled)

---

## 5. Core Payment Flow State Machine ★ CRITICAL

### 5.1 States (`paymentStore.ts`)

```typescript
type PaymentStep =
  | 'IDLE'
  | 'VPA_ENTRY'
  | 'VPA_LOOKUP'
  | 'CONFIRM'
  | 'SAFE_CIRCLE_CHECK'
  | 'RISK_EVAL'
  | 'FRICTION_PASS'
  | 'FRICTION_WARN'
  | 'FRICTION_CHALLENGE'
  | 'FRICTION_BLOCK'
  | 'LIVENESS_REDIRECT'
  | 'AWAITING_RECEIVER'
  | 'PIN_ENTRY'
  | 'SETTLING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';
```

### 5.2 Complete State Diagram

```
                       ┌──────────┐
                       │   IDLE   │
                       └────┬─────┘
                            │ Tap "Send Money"
                            ▼
                       ┌──────────┐
                       │VPA_ENTRY │ (/payment/send)
                       └────┬─────┘
                            │ Submit VPA + amount
                            ▼
                       ┌──────────┐
                       │VPA_LOOKUP│ POST /api/vpa/resolve
                       └────┬─────┘
                            │ Returns {name, bank, verdict, signals}
                            ▼
                       ┌──────────┐
                       │ CONFIRM  │ (/payment/confirm)
                       └────┬─────┘
                            │ Tap "Proceed to Pay"
                            ▼
                    ┌────────────────┐
                    │ POST /payment/ │
                    │ initiate       │
                    │ (Safe Circle + │
                    │  Risk Engine   │
                    │  evaluated     │
                    │  server-side)  │
                    └───────┬────────┘
                            │
              ┌─────────────┼─────────────────────────┐
              │             │                         │
        Safe Circle    Risk Score              Risk Score
        Whitelist      0–49 PASS               50–74 WARN
              │             │                         │
              ▼             ▼                         ▼
       [SILENT PASS]  [SILENT PASS]           [WARN MODAL]
              │             │                         │
              │             │                    User acknowledges
              │             │                         │
              └──────┬──────┴─────────────────────────┘
                     │
                     ▼         Risk Score 75–89 CHALLENGE
              ┌──────────────┐              │
              │  PIN_ENTRY   │              ▼
              │(/payment/pin)│      ┌──────────────┐
              └──────┬───────┘      │  CHALLENGE   │
                     │              │  (Terracotta)│
                     │ 6-digit PIN  └──────┬───────┘
                     ▼                     │
              ┌──────────────┐             │ "Verify Receiver"
              │  SETTLING    │             ▼
              │POST /payment │      ┌──────────────┐
              │  /confirm    │      │  LIVENESS    │
              └──────┬───────┘      │  REDIRECT    │
                     │              │(Escrow held) │
             ┌───────┴──────┐       └──────┬───────┘
             │              │              │
             ▼              ▼         ┌────┴────┐
        ┌────────┐    ┌────────┐    PASS      FAIL/EXPIRED
        │SUCCESS │    │ FAILED │      │              │
        │+ Cert  │    │        │      ▼              ▼
        │+ Face  │    └────────┘  [PIN_ENTRY]   [FAILED]
        └────────┘                                (+refund)

  Risk Score 90–100 BLOCK
              │
              ▼
        ┌──────────────┐
        │FRICTION_BLOCK│
        │ (Deep Ruby)  │
        │ PIN unrender │
        │ [Report CTA] │
        └──────────────┘
```

### 5.3 Screen-by-Screen Spec

#### 5.3.1 VPA Entry (`/payment/send`)

| Element | Spec |
|---|---|
| Header | "Send Money" + back arrow |
| VPA Input | Large mono field, `display-lg`, `tnum`, autofocus |
| Quick Chips | `@oksbi`, `@okaxis`, `@okicici`, `@okhdfc`, `@paytm`, `@ybl`, `@spyde` |
| Amount Input | `display-xl`, `tnum`, ₹ symbol prefix, min ₹1, max ₹1,00,000 |
| Amount Quick Chips | ₹100, ₹500, ₹1000, ₹5000 |
| Note Input | Optional, 50 chars max |
| Balance Preview | *"Available: ₹5,00,000.00"* below amount |
| Primary CTA | "Verify Receiver" (Muted Jade pill) |

**Validation:**
- VPA regex: `^[a-z0-9._-]+@[a-z]+$`
- Amount > 0 AND ≤ balance
- Client-side Zod before API call

#### 5.3.2 VPA Lookup (Transient Overlay)

- **State:** `VPA_LOOKUP`
- **API:** `POST /api/vpa/resolve` with `{ vpa }`
- **UI:** Skeleton pulse on name/bank area
- **Duration:** Typically < 200ms; enforce 400ms minimum for perceived polish
- **Ghost VPA:** If `isRegistered: false`, badge shows *"New Recipient"* + amber accent
- **Error:** Toast + return to VPA_ENTRY

#### 5.3.3 Confirmation (`/payment/confirm`)

```
┌────────────────────────────────────────┐
│  ← Confirm Payment                     │
├────────────────────────────────────────┤
│           ┌────┐                       │
│           │ AP │                       │  Receiver avatar (initials)
│           └────┘                       │
│         Aditya Patel                   │  heading-md
│         aditya@okicici                 │  caption, tnum, Sand color
│         ICICI Bank                     │  caption, Sand color
├────────────────────────────────────────┤
│                                        │
│           ₹ 250.00                     │  display-xl, tnum
│                                        │
│         "Dinner bill split"            │  Note (if provided)
├────────────────────────────────────────┤
│  From: SBI ••••3210                    │
│  Available after: ₹4,99,750.00         │
├────────────────────────────────────────┤
│  [ ← Edit ]        [ Proceed to Pay ] │
└────────────────────────────────────────┘
```

**On "Proceed to Pay":** Calls `POST /api/payment/initiate` (backend runs Safe Circle bypass + 3-layer risk).

#### 5.3.4 Friction — PASS (Silent, 0–49)

- No modal, no interruption.
- Brief green toast at top: *"✓ Protected by SPYDE · Risk: {score}"*
- Auto-dismiss after 1 second
- Direct transition to `PIN_ENTRY`

**Safe Circle Variant:**
- Toast: *"✓ Safe Circle · Aditya · Instant Pass"*
- Same auto-advance

#### 5.3.5 Friction — WARN (Honey Amber, 50–74)

```
┌─────────────────────────────────────────┐
│         ⚠️  Advisory Warning             │
├─────────────────────────────────────────┤
│  This receiver has some risk signals    │
│  worth reviewing:                       │
│                                         │
│  Risk Score: 63/100                     │  Ring gauge, Honey Amber
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🚨 3 community complaints in    │    │  Signal chips
│  │    last 90 days (+30)           │    │
│  │ 🕐 New account (< 7 days) (+10) │    │
│  │ 📞 High velocity (+10)          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  You can proceed if you know and trust  │
│  this receiver.                         │
│                                         │
│  [ Cancel ]     [ Proceed with Caution ]│
└─────────────────────────────────────────┘
```

- **Background:** Honey Amber wash (`#D97706` @ 15%)
- **Border:** 1px Honey Amber
- **CTA:** "Proceed with Caution" is a **Secondary** pill (not primary) — creates deliberate friction
- **On Proceed:** State → `PIN_ENTRY`
- **On Cancel:** State → `IDLE`, back to `/home`

#### 5.3.6 Friction — CHALLENGE (Terracotta, 75–89)

```
┌─────────────────────────────────────────┐
│         🔒  Verification Required        │
├─────────────────────────────────────────┤
│  This transaction requires the receiver │
│  to verify their identity.              │
│                                         │
│  Risk Score: 82/100                     │  Ring gauge, Terracotta
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Signal breakdown:               │    │
│  │ 🎭 Typosquat detected (+25)     │    │
│  │ 🕐 New account (+10)            │    │
│  │ 📞 High velocity (+10)          │    │
│  │ 🚨 4 community reports (+30)    │    │
│  │ 🕸️ Graph adjacency (+10)        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  How this works:                        │
│  • Your ₹500 will be held in escrow    │
│  • Receiver has 10 minutes to verify   │
│  • If they can't verify, you get refund│
│                                         │
│  [ Cancel ]  [ Verify Receiver Identity]│
└─────────────────────────────────────────┘
```

- **Background:** Terracotta wash (`#C2410C` @ 15%)
- **Primary CTA:** "Verify Receiver Identity" (Muted Jade pill)
- **On Verify:** State → `LIVENESS_REDIRECT` → funds enter escrow (10-min timer starts) → sender routed to `AWAITING_RECEIVER` screen
- **On Cancel:** Transaction abandoned, no escrow created

**Sender's `AWAITING_RECEIVER` Screen:**

```
┌─────────────────────────────────────────┐
│            🔒 Escrow Active              │
├─────────────────────────────────────────┤
│  ₹500 held in escrow                    │
│                                         │
│  Waiting for aditya@okicici to verify   │
│  their identity.                        │
│                                         │
│         09:42                           │  Live MM:SS countdown
│         (10-min window)                 │
│                                         │
│  You'll be notified when verification   │
│  completes or if the window expires.   │
│                                         │
│  [ View Escrow Status ]                 │
│  [ Return to Home ]                     │
└─────────────────────────────────────────┘
```

- Polls `GET /api/payment/history?limit=1` every 15s for status change
- OR listens for notification push
- On receiver verify → auto-navigates to `PIN_ENTRY` for final settlement
- On timeout → auto-navigates to `FAILED` with refund confirmation

#### 5.3.7 Friction — BLOCK (Deep Ruby, 90–100)

```
┌─────────────────────────────────────────┐
│         🚫  Payment Blocked              │
├─────────────────────────────────────────┤
│                                         │
│  This transaction has been blocked to   │
│  protect you from potential fraud.      │
│                                         │
│  Risk Score: 100/100                    │  Ring gauge, Deep Ruby
│                                         │
│  Why we blocked this:                   │
│  ┌─────────────────────────────────┐    │
│  │ 🎭 Typosquat of @oksbi (+25)    │    │
│  │ 🕐 New account, 0 days old (+10)│    │
│  │ 📞 High velocity (+10)          │    │
│  │ 🚨 4 fraud reports (+50)        │    │
│  │ 🕸️ Direct link to mule ring    │    │
│  │    (+15)                         │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ⚠️ The PIN entry has been disabled    │
│  for your safety. This decision cannot │
│  be overridden.                        │
│                                         │
│  [ File a Complaint ]                   │
│  [ Return to Home ]                     │
└─────────────────────────────────────────┘
```

- **Background:** Deep Ruby wash (`#9F1239` @ 15%)
- **PIN entry unrendered from DOM** (per PRD requirement)
- **Primary CTA:** "File a Complaint" → `/complaints/new?vpa=<targetVpa>&category=FRAUD`
- **Secondary:** "Return to Home"
- **Backend behavior:** Transaction already recorded as `BLOCKED` in DB; no ledger mutation

#### 5.3.8 PIN Entry (`/payment/pin`)

```
┌─────────────────────────────────────────┐
│  Confirm ₹250.00 to Aditya Patel        │  Sticky header
│  aditya@okicici                         │
├─────────────────────────────────────────┤
│                                         │
│  Enter your UPI PIN                     │
│                                         │
│         ●  ●  ●  ●  ○  ○                │  6 dots, fill as user types
│                                         │
│  ┌───┬───┬───┐                          │
│  │ 1 │ 2 │ 3 │                          │  Numeric keypad
│  ├───┼───┼───┤                          │
│  │ 4 │ 5 │ 6 │                          │
│  ├───┼───┼───┤                          │
│  │ 7 │ 8 │ 9 │                          │
│  ├───┼───┼───┤                          │
│  │   │ 0 │ ⌫ │                          │
│  └───┴───┴───┘                          │
│                                         │
│  🛡️ SPYDE Protected                     │
└─────────────────────────────────────────┘
```

- **PIN:** Simulated `"1234"` (per PRD — accepts any 4-digit BUT B1 requires exactly `"1234"` per API examples)
- **Note:** B1 API examples show PIN as `"1234"` explicitly. Frontend rejects any non-`1234` PIN client-side too.
- **Auto-submit:** Triggers on 4th digit (per B1 API contract)
- **Haptic feedback:** `navigator.vibrate([15])` on each tap
- **Wrong PIN:** Shake animation + clear dots + inline error

#### 5.3.9 Settling (Transient)

```
┌─────────────────────────────────────────┐
│                                         │
│              ●                          │  Muted Jade pulse
│           (spinner)                     │
│                                         │
│    Processing your payment...           │  body-md
│                                         │
│    ✓ Verifying receiver                 │
│    ✓ Risk check complete                │
│    ○ Debiting your account              │  Progressive checkmarks
│    ○ Crediting receiver                 │
│    ○ Generating certificate             │
│                                         │
└─────────────────────────────────────────┘
```

- API: `POST /api/payment/confirm` with `{ transactionId, pin }`
- Backend performs atomic double-entry via Prisma `$transaction`
- **Idempotency:** Client generates UUID and passes as `Idempotency-Key` header (per Techspec §8.4)

#### 5.3.10 Success (`/payment/success`)

```
┌─────────────────────────────────────────┐
│                                         │
│              ✓                          │  Framer Motion checkmark
│           (green scale-in)              │  + confetti particles
│                                         │
│      Payment Successful                 │  display-md, Warm Bone
│                                         │
│         ₹ 250.00                        │  display-xl, tnum
│      paid to Aditya Patel               │
│                                         │
│  Transaction ID:                        │
│  cmt86me01000i1305pqr678                │  caption, tnum, Sand
│                                         │
│  Risk Verdict: PASS (0/100)             │  Muted Jade badge
│                                         │
│  [ 📜 View Certificate ]                │  Primary pill
│  [ 👁️ View Receiver Photo ]             │  If face blob available
│  [ Done ]                               │  Ghost pill
│  [ Pay Again ]                          │  Ghost pill
└─────────────────────────────────────────┘
```

- **Confetti:** Fires on mount, 2.5s duration, 50 particles, colors: Muted Jade, Honey Amber, Warm Bone
- **Certificate CTA:** → `/certificates/{certificateId}`
- **View Face CTA:** Only visible if `faceBlobId !== null` AND `isFaceViewed === false`
- **Balance update:** Home refetches on next mount

#### 5.3.11 Failed (`/payment/failed`)

```
┌─────────────────────────────────────────┐
│                                         │
│              ✗                          │  Red X icon
│                                         │
│      Payment Failed                     │
│                                         │
│      Reason: {error message}            │  From API error
│                                         │
│  Possible causes:                       │
│  • Insufficient balance                 │
│  • Network interruption                 │
│  • Wrong UPI PIN                        │
│  • Escrow verification timeout          │
│  • Session expired                      │
│                                         │
│  [ Try Again ]                          │  Primary pill
│  [ Return to Home ]                     │  Ghost pill
└─────────────────────────────────────────┘
```

---

## 6. Safe Circle Flows & Anomaly Safety Net

### 6.1 Safe Circle List (`/circle`)

```
┌────────────────────────────────────────────────────────────┐
│  ← Safe Circle                                     (2/20)  │  Header
├────────────────────────────────────────────────────────────┤
│  🛡️ Trusted Payees                                         │
│  Payments to these contacts bypass risk screening in       │
│  under 10 milliseconds.                                    │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ┌──┐ Aditya Patel                                   │  │  ContactCard
│  │ │AP│ aditya@okicici                        [🗑️]     │  │
│  │ └──┘ Added Jan 15, 2025 · TRUSTED PAYEE             │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ┌──┐ Rohan Gupta                                    │  │
│  │ │RG│ rohan@okhdfc                          [🗑️]     │  │
│  │ └──┘ Added Jan 10, 2025 · TRUSTED PAYEE             │  │
│  │  ┌────────────────────────────────────────────────┐ │  │  Anomaly Banner
│  │  │ ⚠️ Safety Net Advisory                         │ │  │  (Honey Amber wash)
│  │  │ This account has accumulated 12 recent fraud   │ │  │
│  │  │ complaints. Account may be compromised.        │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  [ + Add Trusted Payee ]                                   │  Add CTA
└────────────────────────────────────────────────────────────┘
```

**API Bindings:**
- **List:** `GET /api/circle` → `{ contacts: [{ id, contactVpa, contactName, addedAt, hasAnomaly }], total }`
- **Anomaly Flag:** `hasAnomaly: true` when target VPA has ≥ 10 active complaints in 30-day window

### 6.2 Add Contact Modal

```
┌──────────────────────────────────────────┐
│  Add Trusted Payee                    ✕  │
├──────────────────────────────────────────┤
│                                          │
│  Display Name                            │
│  ┌────────────────────────────────────┐  │
│  │ e.g., Mom, Landlord, Roommate      │  │
│  └────────────────────────────────────┘  │
│                                          │
│  UPI VPA                                 │
│  ┌────────────────────────────────────┐  │
│  │ name@okhdfcbank                     │  │  Monospace, tnum
│  └────────────────────────────────────┘  │
│                                          │
│  ⚠️ Once added, all payments to this     │
│     contact will skip SPYDE's risk       │
│     engine entirely. Add only trusted    │
│     people.                              │
│                                          │
│  [ Cancel ]        [ Save to Circle ]    │
└──────────────────────────────────────────┘
```

- **API:** `POST /api/circle/add` with `{ contactVpa, contactName }`
- **Errors:**
  - `409 CONFLICT` — *"This contact is already in your Safe Circle."*
  - `400 BAD_REQUEST (LIMIT_EXCEEDED)` — *"Safe Circle limit of 20 contacts reached."*
  - `400 BAD_REQUEST (SELF_ADDITION_PROHIBITED)` — *"You cannot add your own VPA to your Safe Circle."*
- **On Success:** Toast *"Added! Payments to this contact now bypass risk screening."* + list refresh

### 6.3 Remove Contact Flow

**Trigger:** Trash icon on contact card.

```
┌──────────────────────────────────────┐
│  Remove from Safe Circle?            │
│                                      │
│  Aditya Patel (aditya@okicici) will  │
│  no longer bypass risk screening.    │
│                                      │
│  Future payments to this contact     │
│  will run through the full 3-layer   │
│  risk engine.                        │
│                                      │
│  [ Cancel ]     [ Remove Contact ]   │
└──────────────────────────────────────┘
```

- **API:** `DELETE /api/circle/:id`
- **On Success:** Framer Motion slide-out animation, list count decrements

### 6.4 Safety Net Behavior (Payment Time)

When paying a Safe Circle contact whose `hasAnomaly === true`:

```
┌─────────────────────────────────────────┐
│  Confirm Payment                        │
│  ┌──┐                                   │
│  │RG│ Rohan Gupta                       │
│  └──┘ rohan@okhdfc  · TRUSTED PAYEE     │
│                                         │
│  ┌───────────────────────────────────┐  │  Anomaly Banner
│  │ ⚠️ Safety Net Advisory            │  │  (Honey Amber wash)
│  │ Your trusted contact has 12       │  │
│  │ recent fraud reports. Their       │  │
│  │ account may be compromised.       │  │
│  │ Please verify with them directly. │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ₹1,000.00                              │
│                                         │
│  [ Cancel ]   [ Proceed Anyway ]        │
└─────────────────────────────────────────┘
```

**Rules:**
- **Never hard-block** — user's trust decision is respected
- Banner also shown on PIN entry screen
- User taps "Proceed Anyway" → normal PIN flow
- Payment proceeds with `PASS` verdict (Safe Circle bypass still applies)

### 6.5 Constraints Summary

| Rule | Enforcement | Error Code |
|---|---|---|
| Max 20 contacts | Server (DB count check) | `400 LIMIT_EXCEEDED` |
| No duplicates | Server (`@@unique([userId, contactVpa])`) | `409 CONFLICT` |
| No self-addition | Server (VPA vs user's own handles) | `400 SELF_ADDITION_PROHIBITED` |
| VPA regex | Client Zod + Server | `400 BAD_REQUEST` |
| Case normalization | Server (lowercase, trim) | Auto-corrected |
| Bypass latency | Redis `SISMEMBER` → PostgreSQL fallback | < 10ms P99 |

---

## 7. QR Scanner & Tamper Detection Flow

### 7.1 QR State Machine

```
   IDLE → CAMERA_INIT → SCANNING → QR_DECODED → GPS_CAPTURE → SERVER_VERIFY
                                                                    │
                                        ┌──────────────┬────────────┴─────────────┐
                                        ▼              ▼                          ▼
                                   VERIFIED       UNVERIFIED                  TAMPERED
                                        │              │                          │
                                        ▼              ▼                          ▼
                                → PAYMENT/CONFIRM  → PAYMENT/CONFIRM        HARD BLOCK
                                  (Emerald badge)   (Amber warning)         (No payment)
                                                                             + Report CTA
```

### 7.2 QR Scanner (`/qr`)

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                                                            │
│           ┌────────────────────────────┐                   │
│           │                            │                   │
│           │      [ CAMERA FEED ]       │                   │
│           │                            │                   │
│           │       ┌──────────┐         │                   │
│           │       │          │         │                   │  QR viewfinder
│           │       │  Frame   │         │                   │  (rounded overlay)
│           │       │          │         │                   │
│           │       └──────────┘         │                   │
│           │                            │                   │
│           └────────────────────────────┘                   │
│                                                            │
│           Point camera at UPI QR code                      │
│                                                            │
│  [ 💡 Torch ]  [ 🔄 Switch ]  [ ⌨️ Enter Manually ]        │
└────────────────────────────────────────────────────────────┘
```

- **Library:** `html5-qrcode` @ 10 FPS, 250×250 qrbox
- **Camera:** Prefers rear (`facingMode: environment`)
- **On decode:** Immediate stop, capture GPS, call API

### 7.3 Verifying Overlay (Transient)

```
   ┌─────────────────────────────┐
   │                             │
   │         ◐  (spinner)         │
   │                             │
   │  Verifying merchant...      │
   │                             │
   │  Checking GPS location      │
   │  against merchant registry  │
   │                             │
   └─────────────────────────────┘
```

- Duration: 200–500ms
- API: `POST /api/qr/verify` with `{ qrPayload, deviceLat, deviceLng }`

### 7.4 Verdict Screens

#### 7.4.1 VERIFIED (Muted Emerald)

```
┌────────────────────────────────────────────┐
│  ✓ Merchant Verified                       │  Header
├────────────────────────────────────────────┤
│                                            │
│      🏪                                    │
│                                            │
│      Haldirams Restaurant                  │  heading-md
│      haldirams@okhdfc                      │  caption, tnum
│                                            │
│      [ RETAIL ]  [ KYC VERIFIED ]          │  Pill tags
│                                            │
│  📍 Distance: 0m / Allowed: 100m           │  Emerald text
│  ✓ Location confirmed                      │
│                                            │
│  ─────────────────────────────────────     │
│                                            │
│  [ Scan Another ]    [ Proceed to Pay ]    │
└────────────────────────────────────────────┘
```

- **Wash:** Muted Jade @ 10%
- **Proceed:** Navigates to `/payment/send?vpa={merchantVpa}&name={businessName}` (pre-filled)

#### 7.4.2 UNVERIFIED (Honey Amber)

```
┌────────────────────────────────────────────┐
│  ⚠️  Unregistered Merchant                  │
├────────────────────────────────────────────┤
│                                            │
│  This VPA is not registered in SPYDE's     │
│  merchant registry.                        │
│                                            │
│  Decoded VPA: random.merchant@spyde        │
│                                            │
│  Reasons this may happen:                  │
│  • Small merchant not onboarded yet        │
│  • Personal VPA (not a business)           │
│  • Location permission denied              │
│  • GPS accuracy too low                    │
│                                            │
│  ⚠️ Proceed only if you know the receiver  │
│                                            │
│  [ Scan Another ]     [ Proceed Anyway ]   │
└────────────────────────────────────────────┘
```

- **Wash:** Honey Amber @ 10%
- **Proceed:** Navigates to `/payment/send?vpa={decodedVpa}` (user must enter amount manually)

#### 7.4.3 TAMPERED (Deep Ruby)

```
┌────────────────────────────────────────────┐
│  🚨  Sticker-Over-QR TAMPER Detected        │
├────────────────────────────────────────────┤
│                                            │
│  This QR code appears to have been         │
│  physically tampered with.                 │
│                                            │
│  Registered Merchant: Haldirams Restaurant │
│  Registered Location: Delhi (28.613°N)     │
│  Your Location: 3.6 km away                │
│                                            │
│  ⚠️ DO NOT PAY. Someone may have pasted    │
│  a fake QR over the legitimate one.        │
│                                            │
│  Payment options have been disabled.       │
│                                            │
│  [ Scan Another ]    [ 🚨 Report This QR ] │
└────────────────────────────────────────────┘
```

- **Wash:** Deep Ruby @ 10%
- **Payment CTA:** **Completely unrendered** (per PRD)
- **Report CTA:** → `/complaints/new?vpa={merchantVpa}&category=QR_TAMPERING&evidence={geoAnalysis}`
- Server logs `QR_TAMPER_DETECTED` to `RiskEvent` table

### 7.5 Error States

| Error | UI |
|---|---|
| Camera denied | Full-screen instructions card + "Open Device Settings" link + "Enter VPA Manually" fallback |
| GPS denied | Continue with UNVERIFIED verdict (never blocks) |
| Malformed QR | Toast: *"Invalid QR format. Please scan a valid UPI QR code."* + return to scan |
| Network timeout | Toast: *"Could not verify. Check your connection."* + retry CTA |

---

## 8. Receiver-First Liveness Flow

### 8.1 Two Perspectives

**SENDER SIDE:**
1. Initiate payment → CHALLENGE verdict → funds enter escrow
2. Sender sees `AWAITING_RECEIVER` screen with 10-min countdown
3. When receiver passes → sender notified → PIN entry → settlement
4. When receiver fails or timeout → refund + failed screen

**RECEIVER SIDE:**
1. Push notification: *"Incoming payment of ₹500. Verify identity to claim."*
2. Opens `/liveness/pending` → sees pending challenges
3. Taps challenge → `/liveness/:sessionId` camera opens
4. Completes 2 blinks + YOLO anti-spoof + reads 4-digit code
5. On PASS → sees locked message: *"Identification verified, wait for sender to provide you the payment."*

### 8.2 Receiver Verification Portal (`/liveness/pending`)

```
┌────────────────────────────────────────────────────────────┐
│  ← Receiver Verification Center                            │
├────────────────────────────────────────────────────────────┤
│  🛡️ Complete identity checks to unlock incoming payments.  │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [ Escrow Active · 09:42 remaining ]                  │  │  Terracotta pill
│  │                                                      │  │
│  │ Incoming Payment Pending                             │  │
│  │ From: Aarav Sharma (aarav@okaxis)                    │  │
│  │                                            ₹500.00   │  │  display-lg, tnum
│  │                                                      │  │
│  │ [ 🛡️ Start Liveness Check ]                          │  │  Muted Jade primary
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  (If none pending)                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              🕒                                       │  │  Empty state
│  │    No pending identity challenges                    │  │
│  │    Incoming payments requiring verification          │  │
│  │    will appear here.                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

- **API:** `GET /api/liveness/pending` (polled every 10s while on page)
- **Note:** This endpoint is required per Techspec/Liveness.md — call out in Section 22 if not yet in B2 examples.

### 8.3 Liveness Camera (`/liveness/:sessionId`)

```
┌────────────────────────────────────────────────────────────┐
│         🛡️ Receiver Identity Verification                   │  Header
│         Complete 2 blinks and confirm the code             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                    ╭──────────╮                            │
│                   ╱            ╲                           │
│                  │              │                          │
│                  │  [ CAMERA ]  │  Circular viewport       │  Face oval
│                  │              │  4px Muted Jade border   │  overlay
│                   ╲            ╱                           │
│                    ╰──────────╯                            │
│                    ● Face Detected                         │  Emerald pill (bottom)
│                                                            │
│           ○ ○   Blinks: 0/2                                │  Empty blink badges
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Say this one-time code aloud:                        │  │
│  │                                                      │  │
│  │              3  5  4  3                              │  │  display-lg
│  │                                                      │  │  tnum
│  │                                                      │  │  tracking-[0.4em]
│  │ 🕒 Escrow closes in: 09:42                           │  │  Amber pill
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  [ 🛡️ Confirm Identity ]  (disabled until blinks + code)   │
└────────────────────────────────────────────────────────────┘
```

**Scoring Formula:**
```
S_liveness = S_blink(40 max) + S_YOLO(35 max) + S_challenge(25 max)
Pass threshold: S_liveness ≥ 75
```

**Two Timers Displayed:**
- **Challenge code TTL:** 60 seconds (server-side, `POST /api/liveness/challenge`)
- **Escrow window:** 10 minutes total (visible amber pill)

**API Flow:**
1. Mount → `POST /api/liveness/challenge` with `{ transactionId }` → get `{ challengeId, challengeCode, ttlSeconds }`
2. Load face-api.js + YOLOv8n models (already preloaded from login screen per Learning Notes [F2])
3. Detect 2 EAR blinks (threshold 0.20, min 2 frames)
4. Run YOLO anti-spoof continuously
5. User enters challenge code aloud (visual acknowledgment)
6. Submit → `POST /api/liveness/verify` with `{ challengeId, challengeCode, clientScore, blinkCount, faceEmbeddingHash }`
7. On PASS → success screen with locked copy
8. On FAIL → retry (max 3) or cancel

### 8.4 Post-Verification Success (Receiver)

```
┌─────────────────────────────────────────┐
│              ✓                          │
│                                         │
│      Identity Verified                  │
│                                         │
│  Identification verified, wait for      │  ★ LOCKED COPY
│  sender to provide you the payment.     │
│                                         │
│  You'll receive a notification when     │
│  the funds are credited to your         │
│  account.                               │
│                                         │
│  [ Return to Home ]                     │
└─────────────────────────────────────────┘
```

**Locked copy per `LIVENESS.md`:** *"Identification verified, wait for sender to provide you the payment"*

### 8.5 Liveness Failure States

| State | UI |
|---|---|
| Score < 75 | *"Verification failed. Score {N}. Try again."* + Retry button (max 3) |
| Code TTL expired | *"60-second code expired. Requesting new code..."* + auto-refresh challenge |
| Escrow expired | *"10-minute window expired. Funds refunded to sender."* + return home |
| Camera denied | Instructions card + settings link |
| YOLO model load fail | Silent fallback to heuristic engine + `usedFallback: true` badge (dev only) |
| Wrong receiver | `403 FORBIDDEN` → *"You are not the designated receiver for this transaction."* |

---

## 9. Certificate & View-Once Face Flow

### 9.1 Certificate Viewer (`/certificates/:id`)

```
┌────────────────────────────────────────────────────────────┐
│         🛡️ Digital Evidence Certificate                     │
│         cert_clx9876543210012                              │  caption, mono
├────────────────────────────────────────────────────────────┤
│  📄 Transaction Details                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Sender          aarav@okaxis                         │  │
│  │ Receiver        aditya@okicici                       │  │
│  │ Amount          ₹ 250.00                             │  │  display-md, tnum
│  │ Risk Verdict    PASS (0/100)         [Muted Jade]    │  │
│  │ Liveness        Not Required                         │  │
│  │ Settled         15 Jan 2025, 10:35:00 IST            │  │
│  └──────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│  🔐 Cryptographic Proof                                    │
│  ┌──────────────────────────────────────────────────────┐  │  Inset panel
│  │ SHA-256 Payload Hash                                 │  │  (Canvas Base)
│  │ e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca... │  │  Mono, Sand color
│  │                                            [📋 Copy]  │  │
│  │                                                      │  │
│  │ JWT Signature (HS256)                                │  │
│  │ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJoYXNoIj...   │  │  Mono, Sand color
│  │                                            [📋 Copy]  │  │
│  │                                                      │  │
│  │ [ 🔍 Verify Signature ]                              │  │  Secondary pill
│  └──────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│  [ 👁️ View Receiver Photo (Once) ]                          │  Only if face blob
│                                                            │  exists & unviewed
│  [ 📄 Download PDF ]  [ 🔗 Share Link ]                    │
└────────────────────────────────────────────────────────────┘
```

- **API:** `GET /api/certificates/:id` (plural per B2 examples)
- **Verify CTA:** `POST /api/certificates/verify` → returns `isValid: boolean`

### 9.2 Verification Result

```
┌────────────────────────────────────────────┐
│           ✓ Certificate Verified            │  Muted Jade wash
│                                            │
│  This certificate is authentic and         │
│  has not been tampered with.               │
│                                            │
│  Verified by: SPYDE Trust Authority v1.0   │
│  Verification time: <10ms                  │
└────────────────────────────────────────────┘
```

OR

```
┌────────────────────────────────────────────┐
│           ✗ Verification Failed             │  Deep Ruby wash
│                                            │
│  Reason: {Payload has been tampered with}  │
│                                            │
│  Do not trust this certificate.            │
└────────────────────────────────────────────┘
```

### 9.3 View-Once Face Consent (Receiver Side, Post-Liveness)

```
┌──────────────────────────────────────────┐
│         📷 Share Confirmation Photo?      │
├──────────────────────────────────────────┤
│                                          │
│  Would you like to share a quick photo   │
│  with the sender to confirm they paid    │
│  the right person?                       │
│                                          │
│  How this works:                         │
│  🔒 Encrypted on your device (AES-256)   │
│  ✓ Viewable exactly once (10 seconds)    │
│  🗑️ Permanently deleted after viewing    │
│  📜 DPDP Act 2023 compliant              │
│                                          │
│  Server never sees your photo — only     │
│  the encrypted ciphertext.               │
│                                          │
│  [ No Thanks ]     [ Yes, Take Photo ]   │
└──────────────────────────────────────────┘
```

**Capture Flow:**
1. Consent → open front camera → capture 200×200 center crop
2. Generate AES-256-GCM key via WebCrypto (client only)
3. Encrypt → extract IV + AuthTag
4. Upload ciphertext to `POST /api/certificates/face-blob` with `{ certificateId, encryptedBase64, ivBase64, authTagBase64 }`
5. Wipe plaintext from memory + canvas + stop camera stream
6. Success confirmation modal

### 9.4 View-Once Face Viewer (`/face-blob/:id`)

```
     (95% black overlay)

    ┌─────────────────────────────┐
    │                             │
    │   Auto-destroy in 8s        │  Rose pill top
    │                             │
    │        ┌─────────┐          │
    │        │         │          │
    │        │ [FACE]  │          │  200×200 image
    │        │         │          │  Cyan glow border
    │        └─────────┘          │
    │                             │
    │  ▓▓▓▓▓▓▓▓░░░░  Progress    │  Rose→Cyan gradient
    │                             │
    │  This image will be         │  micro caption
    │  permanently destroyed.     │
    │                             │
    └─────────────────────────────┘
```

**10-Second Lifecycle:**
1. **0s:** Fetch encrypted blob → decrypt with key → render
2. **0–7s:** Full opacity, sharp image
3. **7–10s:** CSS blur increases (0→9px) + opacity decreases (1→0)
4. **10s:** Image destroyed, canvas cleared, key wiped, POST burn to server

**Multi-Sensory Countdown (per LEARNING_NOTES [F2]):**
- **Numeric:** Rose pill top ("Auto-destroy in 7s")
- **Progress bar:** Gradient bar shrinking linearly
- **Visual degradation:** Blur + opacity fade in last 3 seconds

**Second View:** `410 GONE` response → screen displays *"This photo has already been viewed and permanently destroyed."*

---

## 10. Complaint Filing & Community Feed Flow

### 10.1 Complaint Categories

Per PRD and B2 API examples, the following categories are supported:

- `FRAUD` — General financial fraud
- `IMPERSONATION` — Impersonating another person/brand
- `SPAM` — Unwanted payment requests
- `HARASSMENT` — Repeated unwanted contact
- `QR_TAMPERING` — Sticker-over-QR attacks (from QR flow)
- `OTHER` — Miscellaneous

### 10.2 File Complaint (`/complaints/new`)

```
┌────────────────────────────────────────────────────────────┐
│  ← File a Complaint                                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Target VPA                                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ mule@oksbii                                          │  │  Pre-filled from
│  └──────────────────────────────────────────────────────┘  │  query params
│                                                            │
│  Category                                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Fraud                                            ▼   │  │  Dropdown
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Quality Tier (impacts risk weight)                        │
│  ○ Basic          (description only, 1×)                   │
│  ● Verified       (+ transaction ID, 2×)                   │
│  ○ Evidence       (+ image, 3×)                            │
│                                                            │
│  Transaction ID (if Verified/Evidence)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ cmt86me04000l1305yza567                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Description (20–500 chars)                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Received urgent payment request claiming to be from  │  │
│  │ my bank's fraud team. Called back and confirmed it   │  │
│  │ was a scam. Multiple friends received same request.  │  │
│  └──────────────────────────────────────────────────────┘  │
│  178/500 characters                                        │
│                                                            │
│  Evidence Image (if Evidence tier)                         │
│  [ 📎 Upload Screenshot ] (max 5MB, JPEG/PNG)              │
│                                                            │
│  ⚠️ You have 4 complaints remaining today (5 max).         │
│                                                            │
│  [ Cancel ]              [ Submit Complaint ]              │
└────────────────────────────────────────────────────────────┘
```

**API:** `POST /api/complaints` (multipart if evidence image)

**Errors:**
- `409 CONFLICT` — *"You already filed a {category} complaint against this VPA within the last 24 hours."*
- `429 RATE_LIMITED` — *"Max 5 complaints per day. Resets at midnight IST."*

### 10.3 Complaint Success

```
┌──────────────────────────────────────┐
│           ✓ Complaint Filed          │
│                                      │
│  Reference: cmt7g967x000513xj       │  Mono, tnum
│                                      │
│  Your complaint has been logged.     │
│  The community fraud score for       │
│  mule@oksbii has been updated        │
│  immediately.                        │
│                                      │
│  Status: PENDING REVIEW              │  Amber pill
│                                      │
│  [ View My Complaints ]              │
│  [ Return to Home ]                  │
└──────────────────────────────────────┘
```

### 10.4 My Complaints (`/complaints/mine`)

Simple list of user's filed complaints with status badges:
- **PENDING** (Amber)
- **VERIFIED** (Muted Jade) — Admin confirmed as fraud
- **REJECTED** (Sand) — Admin rejected

### 10.5 Community Feed (`/complaints/vpa/:vpa`)

```
┌────────────────────────────────────────────────────────────┐
│  ← Community Reports                                       │
├────────────────────────────────────────────────────────────┤
│  mule@oksbii                                               │  Target header
│                                                            │
│  🚨 High Risk (Score: 100/100)                             │  Deep Ruby wash
│  4 verified fraud reports · 24 blocked payments            │
├────────────────────────────────────────────────────────────┤
│  Recent Reports                                            │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🚨 FRAUD          [VERIFIED]        2 hours ago      │  │
│  │ "Received fake urgent payment request..."            │  │  Description snippet
│  │ Reporter: Anonymous · Trust: HIGH                    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🎭 IMPERSONATION  [PENDING]        5 hours ago       │  │
│  │ "Claimed to be from HDFC bank..."                    │  │
│  │ Reporter: Anonymous · Trust: MEDIUM                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  [ + File Your Own Report ]                                │
└────────────────────────────────────────────────────────────┘
```

- **API:** `GET /api/complaints/against/:vpa`
- **Anonymization:** Reporter identity hidden; only trust tier shown
- **Sort:** Newest first, verified reports prioritized

---

## 11. Admin Dashboard & Moderation Flow

### 11.1 Admin Overview (`/admin`)

```
┌────────────────────────────────────────────────────────────┐
│  🛡️ SPYDE Admin Console               [Analyst: Karthik]  │
├────────────────────────────────────────────────────────────┤
│  Platform Overview                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Users    │ │ Txns     │ │ Volume   │ │ Blocked  │      │  StatCards
│  │ 12       │ │ 30       │ │ ₹1.18L   │ │ 2        │      │
│  │          │ │ +5 today │ │ +₹35K    │ │ ₹35,000  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
├────────────────────────────────────────────────────────────┤
│  Risk Verdict Distribution                                 │
│  PASS (24) ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  80%      │  CSS bar chart
│  WARN (1)  ▓                                        3%     │  (per LEARNING_NOTES)
│  CHAL (3)  ▓▓▓▓                                    10%     │
│  BLOCK (2) ▓▓                                       7%     │
├────────────────────────────────────────────────────────────┤
│  Complaints                                                │
│  📋 17 Total · 16 Pending · 1 Verified · 0 Rejected        │
│  [ Go to Moderation Queue → ]                              │
├────────────────────────────────────────────────────────────┤
│  Quick Navigation                                          │
│  [ Top Flagged VPAs ] [ Network Graph ] [ QR Tampers ]     │
└────────────────────────────────────────────────────────────┘
```

- **API:** `GET /api/admin/stats` (polled every 30s)
- **Refresh:** Live stats update via polling; skeleton loaders during fetch

### 11.2 Top Flagged VPAs (`/admin/flagged`)

```
┌────────────────────────────────────────────────────────────┐
│  Top Flagged VPAs (last 30 days)                           │
├────────────────────────────────────────────────────────────┤
│  Rank │ VPA              │ Complaints │ Risk │ Actions     │
│  ─────┼──────────────────┼────────────┼──────┼─────────    │
│  #1   │ tanvi@okicici    │ 8          │ 95   │ [ Review ]  │
│  #2   │ mule@oksbii      │ 4          │ 100  │ [ Review ]  │
│  #3   │ challenge@oksdi  │ 2          │ 85   │ [ Review ]  │
└────────────────────────────────────────────────────────────┘
```

- **API:** `GET /api/admin/top-flagged`
- **Actions:** Click VPA → drill-down to complaint list for that VPA

### 11.3 Complaint Moderation Queue (`/admin/complaints`)

```
┌────────────────────────────────────────────────────────────┐
│  Pending Complaints (16)                                   │
│  Filters: [ Category ▼ ] [ Sort: Newest ▼ ]                │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🚨 FRAUD                                Filed 2h ago │  │
│  │ Target: mule@oksbii                                  │  │
│  │ Reporter: aarav@okaxis (Trust: HIGH)                 │  │
│  │ Quality: Verified (with Txn ID)                      │  │
│  │                                                      │  │
│  │ "Received fake urgent payment request..."            │  │
│  │                                                      │  │
│  │ [ ✓ Verify Fraud ]    [ ✗ Reject Complaint ]         │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

- **API:** `PATCH /api/admin/complaints/:id` with `{ status: 'VERIFIED' | 'REJECTED' }`
- **Optimistic UI:** Card fades out immediately on action

### 11.4 Network Graph (`/admin/network`)

Force-directed 2D visualization of complaint relationships.

- **Nodes:** VPAs (sized by complaint count, colored by verdict)
- **Edges:** Transaction relationships between flagged accounts
- **Interactions:**
  - Zoom (mouse wheel / pinch)
  - Pan (drag background)
  - Click node → sidebar with VPA details + complaint history
  - Filter: category, date range, risk score

### 11.5 Admin Access Guards

```typescript
// requireAnalyst middleware
if (user.isAdmin !== true) {
  // Redirect to /home with toast
  toast.error('Access Denied');
  navigate('/home');
}
```

**Server also enforces:** `req.user.isAdmin === true` check on all `/api/admin/*` routes → returns `403 FORBIDDEN` if failed.

---

## 12. User Profile & Account Settings

### 12.1 Profile Page (`/profile`)

```
┌────────────────────────────────────────────────────────────┐
│  ← Profile                                                 │
├────────────────────────────────────────────────────────────┤
│         ┌──┐                                               │
│         │AS│    Aarav Sharma                               │  Header
│         └──┘    +91 98765 43210                            │
│                 aarav@okaxis                               │
│                 Trust Score: 5/100  🛡️ LOW RISK             │
│                 Member since: 15 Jan 2025                  │
├────────────────────────────────────────────────────────────┤
│  🏦 Linked Bank Accounts                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ State Bank of India                                  │  │
│  │ SBIN0000002 · Savings · ••••3210                     │  │  Masked account
│  │ Balance: ₹5,00,000.00                                │  │  tnum
│  └──────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│  📱 UPI Handles                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ aarav@okaxis   [PRIMARY]                             │  │
│  └──────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│  🔐 Security & Devices                                     │
│  Active Session                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 💻 This Device                                       │  │
│  │ Chrome 120 · macOS · Mumbai, IN                      │  │
│  │ Last active: Just now                                │  │
│  └──────────────────────────────────────────────────────┘  │
│  [ Change UPI PIN ]                                        │
│  [ Manage Notifications ]                                  │
├────────────────────────────────────────────────────────────┤
│  📜 Privacy (DPDP Act 2023)                                │
│  [ Download Personal Data Archive ]                        │
│  [ Request Account Erasure ]                               │
├────────────────────────────────────────────────────────────┤
│  🚪 [ Logout ]                                              │
└────────────────────────────────────────────────────────────┘
```

**Data Bindings (from `GET /api/auth/me`):**
- `name`, `phone`, `email`, `riskScore`, `createdAt`
- `bankAccounts[]` → Bank cards with `ifsc`, `accountNumberMasked`, `balanceRupees`
- `upiHandles[]` → VPA list with `isPrimary` badge

**Logout:** `POST /api/auth/logout` → clear authStore → redirect `/login`

---

## 13. Transaction History & Detail Spec

### 13.1 History Page (`/history`)

```
┌────────────────────────────────────────────────────────────┐
│  ← Transaction History                                     │
├────────────────────────────────────────────────────────────┤
│  🔍 Search by name, VPA, or transaction ID...              │
├────────────────────────────────────────────────────────────┤
│  Filter: [ All ] [ Passed ] [ Warned ] [ Challenged ]      │  Tabs
│          [ Blocked ] [ Failed ]                            │
├────────────────────────────────────────────────────────────┤
│  Today                                                     │  Date group
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ↑ Aditya Patel        aditya@okicici                 │  │
│  │   10:35 AM  ·  🟢 PASS                    -₹250.00   │  │  Outgoing (red minus)
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ✗ Mule Syndicate      mule@oksbii                    │  │  Blocked
│  │   10:32 AM  ·  🔴 BLOCK                   ₹5,000.00  │  │  (no direction)
│  └──────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│  Yesterday                                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ↓ Priya Mehta          priya@okhdfc                  │  │
│  │   3:45 PM  ·  🟢 PASS                    +₹1,500.00  │  │  Incoming (green plus)
│  └──────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│  [ Load More ]                                             │
└────────────────────────────────────────────────────────────┘
```

**API:** `GET /api/payment/history?limit=10&offset=0` (offset-based per B1 API)

**Row Anatomy:**
- **Direction icon:** `↑` outgoing, `↓` incoming, `✗` blocked/failed
- **Recipient/Sender name**
- **VPA** (mono, tnum, Sand color)
- **Timestamp** (relative today, absolute older)
- **Verdict badge** (color-coded pill)
- **Amount** with sign (- for outgoing, + for incoming)

### 13.2 Transaction Detail (`/history/:id`)

Slide-over drawer or full page:

```
┌────────────────────────────────────────────────────────────┐
│  ← Transaction Details                                     │
├────────────────────────────────────────────────────────────┤
│  ↑ Sent                                                    │
│  ₹250.00                                                   │  display-xl, tnum
│  to Aditya Patel                                           │
│  aditya@okicici                                            │
├────────────────────────────────────────────────────────────┤
│  Status               SUCCESS                              │
│  Verdict              PASS (0/100)   🟢                    │
│  Transaction ID       cmt86me01000i1305pqr678              │  mono
│  Certificate ID       cmt86mf01000m1305bcd890              │  mono
│  Date & Time          15 Jan 2025, 10:35:00 IST            │
│  Note                 "Dinner bill split"                  │
├────────────────────────────────────────────────────────────┤
│  🧠 Risk Signals                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ SAFE_CIRCLE_WHITELIST (0 pts)                        │  │
│  │ Receiver is in sender Safe Circle whitelist.         │  │
│  │ Risk analysis bypassed.                              │  │
│  └──────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│  [ 📜 View Certificate ]                                    │
│  [ 🚨 Report This Transaction ]                            │
│  [ 🔁 Pay Again ]                                           │
└────────────────────────────────────────────────────────────┘
```

**API:** Uses same `/api/payment/history` list result or dedicated `/api/payment/:id` (if added later)

---

## 14. Notifications System Spec

### 14.1 Delivery Mechanism

Per `TECHSPEC.md` §9 — **no WebSockets in v2**. All notifications delivered via polling.

**Poll:** `GET /api/notifications/unread-count` every 10 seconds (from Home only)  
**Fetch:** `GET /api/notifications?limit=20&offset=0` on notifications page mount

### 14.2 Notification Types

| Type | Trigger | Color | Action |
|---|---|---|---|
| **Escrow Pending** | Incoming payment requires liveness | Terracotta | Go to `/liveness/pending` |
| **Payment Received** | Successful incoming credit | Muted Jade | View txn detail |
| **Payment Blocked** | Your high-risk payment rejected | Deep Ruby | View block reason |
| **Escrow Refunded** | 10-min window expired | Sand | Return to history |
| **Safe Circle Anomaly** | Trusted contact hit 10+ complaints | Honey Amber | Review contact |
| **Complaint Updated** | Admin verified/rejected your complaint | Sand | View complaint |
| **Certificate Ready** | Cert generated post-settlement | Sand | View cert |
| **Security Alert** | New device login detected | Deep Ruby | Review devices |

### 14.3 Notifications Page (`/notifications`)

```
┌────────────────────────────────────────────────────────────┐
│  ← Notifications                          [ Mark all read ]│
├────────────────────────────────────────────────────────────┤
│  ●  Escrow Pending                          2 min ago      │  Terracotta
│     ₹500 incoming from Priya. Verify identity to claim.   │
│     [ Verify Now → ]                                       │
├────────────────────────────────────────────────────────────┤
│  ●  Payment Blocked                         10 min ago     │  Deep Ruby
│     Your payment of ₹5,000 to mule@oksbii was blocked.    │
│     [ View Details → ]                                     │
├────────────────────────────────────────────────────────────┤
│     Safe Circle Anomaly                     3 hours ago    │  Honey Amber
│     Rohan Gupta has accumulated 12 fraud reports.          │  (read state)
│     [ Review Contact → ]                                   │
├────────────────────────────────────────────────────────────┤
│     Certificate Ready                       Yesterday      │
│     Your certificate for txn #pqr678 is now available.    │
│     [ View Certificate → ]                                 │
└────────────────────────────────────────────────────────────┘
```

- **Unread indicator:** Muted Jade dot on left
- **Bell badge:** Red numeric pill in header (max "99+")
- **Bell tap:** Opens `/notifications` OR slide-over drawer on mobile

---

## 15. Component Cards Catalog

Reusable card components used across the app, all mapped to Slate & Emerald design tokens.

### 15.1 `BalanceCard`
| Field | Value |
|---|---|
| Data | `balanceRupees`, bank name, `ifsc`, `accountNumberMasked`, primary VPA |
| Layout | `Surface Level 1` bg, 1px `Hairline` border, `rounded-xl` |
| Typography | Amount: `display-xl`, `tnum`, `Warm Bone` |
| Interactions | Eye toggle (hide/show), long-press copy account |

### 15.2 `TransactionCard` / `TransactionRow`
| Field | Value |
|---|---|
| Variants | Compact (Home), Full Row (History), Detail (Drawer) |
| Data | `receiverVpa`, receiver name, `amountRupees`, `status`, `riskVerdict`, `createdAt`, `isSender` |
| Icon | Direction arrow + color coding |

### 15.3 `RiskVerdictCard` (4 variants)
| Variant | Wash | Icon | CTA |
|---|---|---|---|
| PASS | Muted Jade @ 10% | ✓ | Auto-advance |
| WARN | Honey Amber @ 10% | ⚠️ | "Proceed with Caution" (secondary) |
| CHALLENGE | Terracotta @ 10% | 🔒 | "Verify Receiver Identity" (primary) |
| BLOCK | Deep Ruby @ 10% | 🚫 | "File a Complaint" (destructive) |

### 15.4 `ContactCard`
| Field | Value |
|---|---|
| Data | `contactName`, `contactVpa`, `addedAt`, `hasAnomaly` |
| Elements | Avatar initials (48px circle), "TRUSTED" pill tag, trash icon |
| Conditional | Anomaly banner injected inline when `hasAnomaly === true` |

### 15.5 `CertificateCard`
| Field | Value |
|---|---|
| Data | `certificateId`, `payloadHash`, `jwtSignature`, transaction payload |
| Typography | Hash + JWT in mono font, `Sand` color, `tnum` |
| Layout | Inset Canvas Base panel within Surface Level 1 card |

### 15.6 `MerchantCard`
| Field | Value |
|---|---|
| Data | `businessName`, `vpa`, `businessType`, `isVerified`, `geoAnalysis` |
| Pills | `RETAIL/RESTAURANT/MALL` tag + `KYC VERIFIED` badge |

### 15.7 `EscrowCard`
| Field | Value |
|---|---|
| Data | Sender name, `amountPaisa`, 10-min countdown, `challengeId` |
| Elements | Amber "Escrow Active" pill, live MM:SS timer, primary CTA |

### 15.8 `NotificationCard`
| Field | Value |
|---|---|
| Data | Type, title, body, timestamp, actionUrl |
| Elements | Unread dot, color-coded left border, inline CTA |

### 15.9 `StatCard` (Admin)
| Field | Value |
|---|---|
| Data | Label, value, delta, trend indicator |
| Typography | Value: `display-md`, `tnum` |

### 15.10 `EmptyStateCard`
| Field | Value |
|---|---|
| Elements | Illustrated icon (48px), title (`heading-md`), subtitle (`Sand`), primary CTA |
| Used on | Empty history, empty circle, no pending challenges, no notifications |

### 15.11 `PermissionPrimingCard`
| Field | Value |
|---|---|
| Elements | Icon, permission name, "why we need it" body, grant button |
| Used on | Onboarding & re-priming banners |

---

## 16. Modals & Bottom Sheets Inventory

| Modal | Trigger | Purpose |
|---|---|---|
| `AddContactModal` | "+ Add Trusted Payee" | Add Safe Circle contact |
| `RemoveContactConfirmModal` | Trash icon | Confirm contact removal |
| `ReceiverConsentModal` | Post-liveness | View-once face capture opt-in |
| `FirstBalanceRevealModal` | After initial registration | Welcome + ₹5,00,000 announce |
| `WarningModal` | Score 50–74 | Yellow acknowledgment dialog |
| `RiskBreakdownDrawer` | "View signals" | Full signal list expansion |
| `LogoutConfirmModal` | Logout tap | Confirm logout intent |
| `ChangePinModal` | Profile → Change PIN | New PIN entry (v2.1) |
| `PermissionSettingsModal` | Denied permission banner | Instructions to enable |
| `SessionExpiredModal` | 401 after refresh fail | "Please log in again" |
| `OfflineBanner` | `navigator.onLine === false` | Global offline indicator |
| `NetworkErrorModal` | API timeout > 10s | Retry / cancel options |
| `SuccessToast` | Any successful action | Auto-dismiss 3s, Muted Jade |
| `ErrorToast` | Any error | Auto-dismiss 5s, Deep Ruby |
| `InfoToast` | Info messages | Auto-dismiss 3s, Sand |

**Modal Design Rules:**
- Backdrop: Black @ 60% opacity + 8px blur
- Enter: Framer Motion `scale: 0.95 → 1, opacity: 0 → 1, duration: 0.2s`
- Exit: Reverse
- Escape key + backdrop click close (except critical modals like BLOCK)

---

## 17. Loading, Skeleton & Empty State Specs

### 17.1 Skeleton Loaders

Pulse animation on `Surface Level 2` (`#272C35`).

| Screen | Skeleton |
|---|---|
| Home | BalanceCard skeleton + 3 transaction row skeletons |
| History | 5 row skeletons with staggered pulse |
| Circle | 3 contact card skeletons |
| Profile | Header skeleton + 2 section skeletons |
| Certificate | Full cert skeleton with placeholder blocks |
| Admin | 4 stat card skeletons + bar chart skeleton |

### 17.2 Empty States

| Screen | State |
|---|---|
| History | *"No transactions yet. Send your first payment to see it here."* + [Send Money] |
| Circle | *"No trusted contacts added yet."* + [+ Add Trusted Payee] |
| Notifications | *"You're all caught up!"* |
| Complaints | *"No complaints filed. Report suspicious VPAs to protect the community."* |
| Pending Liveness | *"No pending identity challenges."* |
| Admin (top-flagged) | *"No flagged VPAs at this time."* |

### 17.3 Loading Patterns

- **Full-page loader:** Only on initial app boot / login redirect
- **Inline loader:** For API calls < 3s (e.g., VPA resolve, complaint submit)
- **Skeleton:** For data-heavy pages (history, dashboard)
- **Progress bar:** For file uploads (evidence images)
- **Optimistic UI:** Contact add/remove, complaint moderation (with rollback on fail)

---

## 18. Offline & Poor Network Handling

### 18.1 Global Offline Banner

```
┌─────────────────────────────────────────┐
│ ⚠️ You're offline. Some features may     │  Fixed top, Sand bg
│ be limited.                              │  Warm Bone text
└─────────────────────────────────────────┘
```

- Trigger: `navigator.onLine === false`
- Persists at top of screen
- Auto-dismisses when connection returns
- Shows brief "✓ Back online" success toast on reconnect

### 18.2 Offline Capabilities

| Feature | Offline Behavior |
|---|---|
| Home | Renders cached Zustand state (last known balance + transactions) |
| Safe Circle | Renders cached contact list |
| History | Renders cached transactions |
| Profile | Renders cached profile |
| Payments | **Disabled** — button greyed, tooltip "Requires internet" |
| QR Scan | **Disabled** — cannot verify without server |
| Liveness | **Disabled** — cannot submit without server |
| Complaints | **Disabled** — cannot file without server |

### 18.3 Slow Network Handling

- **Threshold:** API call > 3 seconds
- **UI:** Inline loader with message: *"Connecting to SPYDE Trust Engine..."*
- **Timeout:** 10 seconds → error toast + retry CTA
- **Retry logic:** Automatic retry (1 time) for GET requests only

---

## 19. Micro-Interactions & Animation Catalog

### 19.1 Framer Motion Patterns

| Interaction | Config |
|---|---|
| **Page transitions** | `initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, duration: 0.2s` (slide left forward) |
| **Modal enter** | `initial: { scale: 0.95, opacity: 0 }, animate: { scale: 1, opacity: 1 }, spring stiffness: 400, damping: 20` |
| **Toast** | Slide from top-right, `duration: 3s`, auto-dismiss |
| **Verdict transition** | Crossfade `duration: 0.2s`, `ease: easeInOut` |
| **Contact list add** | Stagger `delayChildren: 0.05s` |
| **Contact list remove** | `exit: { opacity: 0, x: -20 }` |

### 19.2 Specific Animations

| Element | Animation |
|---|---|
| **Confetti (Success)** | 50 particles, 2.5s duration, colors: Jade + Amber + Bone |
| **Balance count-up** | Tween from old → new value over 400ms, `ease: easeOut` |
| **PIN dot fill** | Scale + opacity, `duration: 0.15s` per dot |
| **Wrong PIN shake** | `x: [-10, 10, -10, 10, 0]`, `duration: 0.4s` |
| **Blink counter fill** | Scale + Muted Jade color transition |
| **Liveness score bar** | Fluid tween to target %, `duration: 0.3s`, `ease: easeOut` |
| **Face viewer countdown** | Progress bar shrink linear, blur increase in last 3s |
| **Escrow timer** | Digit flip on MM:SS change |
| **Card hover** | `scale: 1.02, translateY: -2px, duration: 0.15s` (desktop only) |
| **Button press** | `scale: 0.97, duration: 0.1s` |

### 19.3 Haptic Feedback (Mobile)

- **PIN tap:** `navigator.vibrate([15])`
- **Verdict reveal:** `navigator.vibrate([50, 30, 50])`
- **Success:** `navigator.vibrate([100])`
- **Error:** `navigator.vibrate([200, 100, 200])`

### 19.4 Restraint Rules

- **No bouncy springs** on financial UI (per Design.md)
- **No parallax scrolling**
- **No auto-playing videos**
- **No color-flashing** (accessibility)
- **Reduced motion respect:** All animations disabled if `prefers-reduced-motion: reduce`

---

## 20. Comprehensive Error & Edge Case Matrix

| # | Scenario | HTTP / Trigger | UX Behavior | Owner |
|---|---|---|---|---|
| 1 | Invalid phone format | `400 BAD_REQUEST` | Inline field error | F1 |
| 2 | Duplicate phone/VPA on register | `409 CONFLICT` | Toast + link to login | F1, B1 |
| 3 | Wrong password | `401 UNAUTHORIZED` | Inline "Invalid credentials" | F1, B1 |
| 4 | Wrong PIN | `400 BAD_REQUEST` | Shake + clear + inline error | F1, B1 |
| 5 | Access token expired | `401` on any endpoint | Silent refresh → retry once → logout on 2nd fail | F1 |
| 6 | Refresh token expired | `401` on `/refresh` | Force logout + redirect `/login` | F1 |
| 7 | Refresh token reuse (theft) | `401 UNAUTHORIZED` | All sessions revoked, toast "Security alert" | F1, B1 |
| 8 | Safe Circle 20-limit | `400 LIMIT_EXCEEDED` | Modal error + suggestion to remove | F1, B1 |
| 9 | Safe Circle duplicate | `409 CONFLICT` | Inline error: "Already in Safe Circle" | F1, B1 |
| 10 | Safe Circle self-add | `400 SELF_ADDITION_PROHIBITED` | Inline: "Cannot add your own VPA" | F1, B1 |
| 11 | Insufficient balance | `400 BAD_REQUEST` | Failed page: "Insufficient balance" | F1, B1 |
| 12 | Typosquat detected | Verdict WARN/CHALLENGE/BLOCK | Signal chip displayed in breakdown | F1, B1 |
| 13 | Hard block (score 90+) | Verdict BLOCK, txn saved as BLOCKED | Deep Ruby screen, PIN unrendered, File Complaint CTA | F1, B1 |
| 14 | Escrow window expired (10min) | Cron marks FAILED | Refund credited, notification to sender | F2, B2 |
| 15 | Liveness code TTL expired (60s) | `410 GONE` | Auto-request new code | F2, B2 |
| 16 | Liveness score < 75 | Verdict FAIL | Retry CTA (max 3 attempts) | F2, B2 |
| 17 | Non-receiver tries verify | `403 FORBIDDEN` | Toast + return to home | F2, B2 |
| 18 | QR TAMPERED (GPS mismatch) | Verdict TAMPERED | Deep Ruby, payment disabled, Report CTA | F2, B2 |
| 19 | QR UNVERIFIED | Verdict UNVERIFIED | Amber warning, Proceed with caution | F2, B2 |
| 20 | Camera permission denied | Browser | Instructions card + manual VPA entry fallback | F2 |
| 21 | GPS permission denied | Browser | QR flow degrades to UNVERIFIED (never blocks) | F2 |
| 22 | face-api.js model load fail | Client | "Liveness unavailable" + skip option | F2 |
| 23 | YOLO ONNX load fail | Client | Silent fallback to heuristic engine, `usedFallback: true` | F2 |
| 24 | View-once already viewed | `410 GONE` | "Photo permanently destroyed" screen | F2, B2 |
| 25 | View-once TTL expired (24h) | `410 GONE` | "Photo expired" screen | F2, B2 |
| 26 | Complaint duplicate in 24h | `409 CONFLICT` | Toast: "Already filed within 24h" | F2, B2 |
| 27 | Complaint rate limit (5/day) | `429 RATE_LIMITED` | Toast: "Max 5 per day, resets at midnight IST" | F2, B2 |
| 28 | Evidence file > 5MB | Client validation | Inline: "Max 5MB" | F2 |
| 29 | Non-admin at `/admin/*` | `403 FORBIDDEN` | Redirect `/home` + toast "Access Denied" | F2, B2 |
| 30 | Ghost VPA payment | 200 OK, `isRegistered: false` | Amber "New Recipient" badge on confirm | F1, B1 |
| 31 | Concurrent liveness sessions | Server invalidates previous | New session valid, old returns 410 | F2, B2 |
| 32 | Concurrent Safe Circle adds (race) | Server transaction | Only first succeeds, others get 409 | F1, B1 |
| 33 | Tab close mid-PIN | Client | Payment store resets on next visit | F1 |
| 34 | Browser back mid-settling | Client | Ignore back, show settling until complete | F1 |
| 35 | Network offline mid-payment | Client | Offline banner + disabled submit | F1 |
| 36 | API timeout > 10s | Client | Error toast + retry CTA | F1, F2 |
| 37 | Certificate not found | `404 NOT_FOUND` | Page: "Certificate not found or has been deleted" | F2, B2 |
| 38 | Payment cannot be confirmed (bad state) | `409 CONFLICT` | Toast: "Transaction already processed" | F1, B1 |
| 39 | Amount = 0 or negative | Client Zod | Inline: "Amount must be at least ₹1" | F1 |
| 40 | Amount > balance | Client | Disabled Proceed button + inline hint | F1 |

---

## 21. Cross-Dev Handoff & Contract Matrix

| # | Handoff Trigger | From | To | Contract |
|---|---|---|---|---|
| 1 | Login success | F1 Auth | F1 Home | `authStore` populated with user + tokens |
| 2 | Register success | F1 Register | F1 Home | Same as login + First Balance Reveal modal |
| 3 | Proceed to Pay | F1 Payment | B1 Backend | `POST /api/payment/initiate` |
| 4 | Safe Circle bypass | F1 Payment | B1 Backend | Server short-circuits, returns PASS in <10ms |
| 5 | CHALLENGE verdict | F1 Payment | F2 Liveness | Sender: escrow screen; Receiver: notification to `/liveness/pending` |
| 6 | Liveness pass | F2 Liveness | B2 Backend | `POST /api/liveness/verify` → returns PASS + notification |
| 7 | Escrow release | B2 Server | F1 Sender | Notification triggers sender's `AWAITING_RECEIVER` → PIN flow |
| 8 | QR verified | F2 QR | F1 Payment | Navigate to `/payment/send?vpa=<vpa>` with pre-fill |
| 9 | Payment settled | B1 Payment | B2 Certificate | B1 calls `certificateService.issueCertificate(txId)` |
| 10 | Certificate issued | B1/B2 | F1 Success | Return `certificateId` in confirm response |
| 11 | Success → View Cert | F1 Success | F2 Cert Viewer | Navigate to `/certificates/:id` |
| 12 | Success → View Face | F1 Success | F2 Face Viewer | Navigate to `/face-blob/:id` |
| 13 | BLOCK → File Complaint | F1 Blocked | F2 Complaint | Navigate to `/complaints/new?vpa=...&category=FRAUD` |
| 14 | Tampered QR → Report | F2 QR | F2 Complaint | Navigate to `/complaints/new?vpa=...&category=QR_TAMPERING` |
| 15 | Complaint verified (admin) | F2 Admin | B2 Backend | `PATCH /api/admin/complaints/:id` |
| 16 | Community score refresh | B2 Complaint | B1 Risk Engine | Redis cache invalidated on complaint create/verify |
| 17 | Notification poll | F1 Home | B1 Backend | `GET /api/notifications/unread-count` every 10s |
| 18 | Pending escrow poll | F1 Home | B2 Backend | `GET /api/liveness/pending` every 10s |
| 19 | View-once first view | F2 Face Viewer | B2 Backend | `GET /api/certificates/face-blob/:id` → returns blob + starts 60s deletion timer |
| 20 | View-once destroy | F2 Face Viewer | B2 Backend | POST burn (implicit via `isViewed: true`) |

---

## 22. Contract Reconciliation Notes

These are known conflicts between docs and shipped APIs. Frontend must implement against **shipped API** and treat product docs as v2.1 targets.

| # | Topic | Product Doc / Techspec Intent | Shipped B1/B2 API | Frontend Stance |
|---|---|---|---|---|
| 1 | **Auth Method** | OTP flow (`request-otp` / `verify-otp`) | Password login (`/auth/login` with `phone` + `password`) | **Implement against shipped password login.** OTP screen (`/otp`) can be built as UI shell for future integration. |
| 2 | **Safe Circle Route** | `/api/safe-circle` (Techspec) | `/api/circle` (B1 shipped) | **Use `/api/circle`** — shipped |
| 3 | **Risk Endpoint** | `/api/risk/evaluate` (Techspec) | Risk inline in `/api/payment/initiate` + `/api/vpa/resolve` | **Use payment/initiate response verdict** — no standalone risk call needed |
| 4 | **Liveness TTL** | 600s escrow window (LIVENESS.md) | 60s challenge code (B2 shipped) | **Both exist:** 10-min escrow window, 60s challenge code TTL |
| 5 | **Certificates Path** | `/api/certificate/:id` (context summary) | `/api/certificates/:id` (B2 shipped) | **Use plural `/api/certificates`** |
| 6 | **Face Blob Path** | `/api/face-blob/:id` (context summary) | `/api/certificates/face-blob/:id` (B2 shipped, nested) | **Use nested path** |
| 7 | **History Pagination** | `cursor` (Techspec) | `offset` (B1 shipped) | **Use `offset`** — shipped |
| 8 | **Pending Liveness** | `GET /api/liveness/pending` (Techspec + Liveness.md) | Not in current B2 examples | **Assume it exists** per Techspec/Liveness.md; verify with B2 dev if missing |
| 9 | **Notifications API** | Polling `/api/notifications` (Techspec) | Not in current B1/B2 examples | **Design UI as if endpoint exists**; backend team to add before demo |
| 10 | **Post-Liveness Copy** | `"Identification verified, wait for sender to provide you the payment"` (LIVENESS.md — locked) | `"Liveness check passed. Proceed to transaction confirmation."` (B2 example) | **Use LIVENESS.md locked string** — receiver-first UX |
| 11 | **Admin Credentials** | `admin@spyde.dev` / `admin123` (B2 tracker) | `admin@spyde` / `Password@123` (B1 seed) | **Test both**, use B1 seed as source of truth |
| 12 | **PIN** | Any 6-digit accepted (PRD) | Exactly `"1234"` (B1 API examples) | **Enforce `"1234"`** client-side too |

**Action Item:** Team lead should reconcile items #1, #8, #9 with backend devs before demo. All others are documentation-only mismatches with clear resolution.

---

## Document Control

| Version | Date | Changes |
|---|---|---|
| 1.0 | Original build | Initial 44 KB version |
| 2.0 | Post-audit expansion | Added Sections 2, 12–19, 22. Expanded 4, 5, 6, 8. Aligned to shipped B1/B2 APIs. Total ~100 KB. |

**This document is LOCKED for the demo build.** Flow changes require team consensus + version bump.

---

🛡️ **SPYDE v2.0 — APPFLOW_V2.md**  
*Every screen deliberate. Every state accounted for. Every card catalogued.*