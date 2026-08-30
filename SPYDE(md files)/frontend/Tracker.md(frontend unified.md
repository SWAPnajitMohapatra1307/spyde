# 📋 TRACKER_F_UNIFIED.md — Integration & Testing Master Tracker

**Purpose:** Bridge the gap between the scaffolded shell and a production-ready SPYDE frontend.  
**Owners:** F1 (core platform) + F2 (security/CV features)  
**Backend Contracts:** `API_EXAMPLES_B1.md` + `API_EXAMPLES_B2.md` (source of truth)  
**Flow Contracts:** `APPFLOW_V2.md` (source of truth)  
**Visual Contracts:** `Design.md` (Slate & Emerald)

---

## 📊 Current State Summary

| Layer | Status | Notes |
|---|---|---|
| **Vite + TS + Tailwind Scaffold** | ✅ Done | F1 initialized project |
| **8 UI Components** | ✅ Done | Button, Input, Card, Badge, Modal, Toast, Skeleton, Avatar exist |
| **Layout Shell** | ✅ Done | AppShell, Header, Sidebar exist (need Router integration) |
| **6 Page Files** | ⚠️ Stubs | Files exist but use demoData; no real API |
| **Safe Circle Components** | ✅ Done | Cards + modals exist, need API wiring |
| **face-api.js Models** | ✅ Downloaded | Placed in `public/models/` |
| **API Client Layer** | ❌ Missing | Must build from scratch |
| **State Stores** | ❌ Missing | authStore, paymentStore, etc. must be built |
| **Routing + Guards** | ❌ Missing | No React Router configured |
| **F2 Entire Scope** | ❌ Missing | Liveness, QR, Certs, Face Blob, Complaints, Admin — nothing built |

**Realistic Completion Estimate:** 60–80 hours of focused work remaining.

---

## 🎯 PHASE 0 — Foundation & Missing Dependencies
**Duration:** 3 hours | **Owner:** F1

### Tasks
- [ ] Audit `client/package.json` → list all currently installed packages
- [ ] Install missing runtime dependencies:
  ```bash
  npm install axios zustand react-router-dom@6 @tanstack/react-query zod
  npm install framer-motion lucide-react
  ```
- [ ] Install F2 CV dependencies:
  ```bash
  npm install face-api.js html5-qrcode onnxruntime-web recharts
  ```
- [ ] Install dev dependencies:
  ```bash
  npm install -D @types/react-router-dom
  ```
- [ ] Download YOLOv8n ONNX model → place in `public/models/yolov8n-face.onnx`
- [ ] Update `client/.env`:
  ```
  VITE_API_URL=http://localhost:5000/api
  ```
- [ ] Update `vite.config.ts` with proxy to `localhost:5000`
- [ ] Verify `npm run dev` boots and dark theme renders
- [ ] Verify Design.md color tokens are in `tailwind.config.js` (Canvas Base #13161A, Muted Jade #1A8276, etc.)
- [ ] If not, add all Slate & Emerald tokens per Design.md §1

### Definition of Done
- All dependencies installed with zero peer warnings
- App boots on `localhost:5173` with proper dark theme
- Tailwind tokens match Design.md exactly

---

## 🎯 PHASE 1 — API Client + Auth Foundation
**Duration:** 6 hours | **Owner:** F1

### Tasks

**1.1 API Client (`src/lib/api.ts`)**
- [ ] Create Axios instance with `withCredentials: true` (for httpOnly refresh cookie)
- [ ] Implement request interceptor (attach `Authorization: Bearer <token>`)
- [ ] Implement response interceptor for 401 handling:
  - Silent refresh via `POST /api/auth/refresh`
  - Queue concurrent 401s to prevent race conditions
  - On refresh fail → clear tokens → redirect `/login` with SessionExpiredModal
- [ ] Parse error responses per B1 format `{ success: false, error: { code, message } }`

**1.2 Type Definitions (`src/types/app.ts`)**
- [ ] Update with: `User`, `BankAccount`, `UpiHandle`, `Transaction`, `SafeCircleContact`
- [ ] Add: `VpaResolution`, `RiskVerdict`, `RiskSignal`, `PaymentInitResult`, `PaymentConfirmResult`
- [ ] Add: `LivenessChallenge`, `LivenessVerifyResult`, `QrVerdict`, `Certificate`
- [ ] Add: `Complaint`, `ComplaintCategory`, `AdminStats`

**1.3 Auth Store (`src/stores/authStore.ts`)**
- [ ] Zustand store: `user`, `accessToken`, `isAuthenticated`, `isLoading`
- [ ] Actions: `login(phone, password)`, `register(payload)`, `logout()`, `fetchMe()`, `initialize()`
- [ ] `initialize()` attempts silent refresh from cookie on app boot
- [ ] Store access token in memory only (NOT localStorage per Design.md security)

**1.4 Query Client Setup**
- [ ] Create `src/lib/queryClient.ts` with React Query defaults (30s staleTime, 1 retry)

**1.5 Auth Page (`src/pages/AuthPage.tsx`) Wire-Up**
- [ ] Replace stub with real login + register tabs (per APPFLOW_V2 §3.2, §3.3)
- [ ] Implement login form: phone + password → `authStore.login()`
- [ ] Implement register form: name + phone + email + password + VPA → `authStore.register()`
- [ ] Use existing `Input.tsx`, `Button.tsx` components
- [ ] Apply Slate & Emerald tokens (Canvas Base bg, Warm Bone text, Muted Jade primary button)
- [ ] Show inline errors from API (`error.code === 'CONFLICT'` → "Phone/VPA already exists")
- [ ] On success → redirect to `/home`
- [ ] Dev-only quick-login buttons for seeded accounts

**1.6 App Root Rewire (`src/App.tsx` + `src/main.tsx`)**
- [ ] Wrap app in `<BrowserRouter>` + `<QueryClientProvider>`
- [ ] Add `<Toaster>` if using `react-hot-toast`, OR wire your custom `Toast.tsx`
- [ ] On mount, call `authStore.initialize()` for silent refresh check
- [ ] Show `<SplashPage>` during initialization

### Definition of Done
- Login with `9876543210` / `Password@123` works end-to-end
- Session persists across page refresh (silent refresh from cookie works)
- Wrong password shows inline error with Design.md styling
- Logout clears state and redirects

---

## 🎯 PHASE 2 — Routing, Guards & App Shell Integration
**Duration:** 4 hours | **Owner:** F1

### Tasks

**2.1 Route Configuration (`src/App.tsx`)**
Per APPFLOW_V2 §1.1 route inventory, set up:
- [ ] Public routes: `/`, `/welcome`, `/register`, `/login`, `/otp` (shell only)
- [ ] Protected routes: `/home`, `/payment/*`, `/circle`, `/history`, `/history/:id`, `/notifications`, `/profile`
- [ ] F2 protected routes: `/qr`, `/qr/result`, `/liveness/pending`, `/liveness/:sessionId`, `/certificates/:id`, `/face-blob/:id`, `/complaints/*`
- [ ] Admin routes: `/admin`, `/admin/flagged`, `/admin/complaints`, etc.
- [ ] Public verify: `/verify/:id`

**2.2 Route Guards**
- [ ] Create `src/components/guards/ProtectedRoute.tsx` (redirects to `/login` if not authenticated)
- [ ] Create `src/components/guards/PublicOnlyRoute.tsx` (redirects to `/home` if authenticated)
- [ ] Create `src/components/guards/RequireAdmin.tsx` (checks `user.isAdmin === true`, else redirect to `/home` with toast)
- [ ] Create `src/components/guards/RequirePaymentState.tsx` (checks paymentStore has valid state for step)

**2.3 App Shell Refactor**
- [ ] Convert `AppShell.tsx` to use `<Outlet />` for nested routes
- [ ] Update `Sidebar.tsx`: replace hardcoded links with `NavLink` from react-router
- [ ] Sidebar nav items: Home, Send Money, Scan QR, Safe Circle, History, Notifications, Profile
- [ ] Admin section conditionally shown if `user.isAdmin`
- [ ] Update `Header.tsx`: show risk score badge + notification bell + user avatar
- [ ] Bottom nav for mobile (per APPFLOW_V2 §4.1)

**2.4 Splash Page (`src/pages/SplashPage.tsx`)**
- [ ] 1.5s logo animation with Framer Motion
- [ ] Auto-redirect to `/home` if authenticated, else `/welcome`

### Definition of Done
- Navigating to protected routes without auth redirects to `/login`
- Sidebar highlights active route
- Route transitions use Framer Motion slide-left (per Design.md §6)
- Admin sidebar section only shown for admin users

---

## 🎯 PHASE 3 — Dashboard Integration
**Duration:** 4 hours | **Owner:** F1

### Tasks

**3.1 Hooks Layer (`src/hooks/`)**
- [ ] Create `useAuth.ts` (wraps authStore + queries)
- [ ] Create `usePayment.ts`:
  - `useResolveVpa()` — `POST /api/vpa/resolve`
  - `useInitiatePayment()` — `POST /api/payment/initiate`
  - `useConfirmPayment()` — `POST /api/payment/confirm`
  - `useTransactionHistory(limit, offset)` — `GET /api/payment/history`
- [ ] Create `useSafeCircle.ts`:
  - `useSafeCircle()` — `GET /api/circle`
  - `useAddContact()` — `POST /api/circle/add`
  - `useRemoveContact()` — `DELETE /api/circle/:id`

**3.2 Dashboard Page Rewire (`src/pages/DashboardPage.tsx`)**
Per APPFLOW_V2 §4.1:
- [ ] Replace `demoData.ts` imports with `useAuth()` + `useTransactionHistory(5, 0)` + `useSafeCircle()`
- [ ] BalanceCard: uses `user.bankAccounts[0].balanceRupees`, Indian formatting, `tnum` font
- [ ] Balance count-up animation on change (Framer Motion, 400ms)
- [ ] Eye toggle to hide/show balance (persist in localStorage)
- [ ] Quick Actions: Send Money, Scan QR, Safe Circle
- [ ] Quick Pay Carousel: horizontal scroll of Safe Circle contacts with anomaly dots
- [ ] Recent Transactions: last 5 from history API with verdict badges
- [ ] SPYDE Tip Card (rotating educational content)
- [ ] EscrowBanner (conditional, from `GET /api/liveness/pending`) — placeholder for now, wire in Phase 6
- [ ] All amounts use `Intl.NumberFormat('en-IN')` per Design.md §7

**3.3 Profile Page Rewire (`src/pages/ProfilePage.tsx`)**
Per APPFLOW_V2 §12:
- [ ] Display user name, phone, email, trust score badge
- [ ] Show bank accounts with masked account numbers
- [ ] Show UPI handles with Primary badge
- [ ] Active session card (device info, mocked for now)
- [ ] Logout button → `authStore.logout()` → redirect `/login`

### Definition of Done
- Dashboard renders live data from `/api/auth/me` and `/api/payment/history`
- Balance updates when transactions complete
- Numbers align vertically thanks to `tnum` font-feature
- No `demoData.ts` imports remain on Dashboard or Profile

---

## 🎯 PHASE 4 — Payment State Machine + Multi-Step Flow
**Duration:** 12 hours | **Owner:** F1 | **⭐ CRITICAL**

### Tasks

**4.1 Payment Store (`src/stores/paymentStore.ts`)**
Per APPFLOW_V2 §5.1 state machine:
- [ ] Define 16 states: `IDLE`, `VPA_ENTRY`, `VPA_LOOKUP`, `CONFIRM`, `SAFE_CIRCLE_CHECK`, `RISK_EVAL`, `FRICTION_PASS`, `FRICTION_WARN`, `FRICTION_CHALLENGE`, `FRICTION_BLOCK`, `LIVENESS_REDIRECT`, `AWAITING_RECEIVER`, `PIN_ENTRY`, `SETTLING`, `SUCCESS`, `FAILED`, `CANCELLED`
- [ ] Store: `step`, `vpa`, `amount`, `note`, `resolvedReceiver`, `initResult`, `transactionId`
- [ ] Actions: `startPayment()`, `resolveVpa()`, `initiatePayment()`, `confirmPayment(pin)`, `reset()`, `goBack()`
- [ ] Invalid transition guard (throw in dev, log warning in prod)

**4.2 Payment Page Router (`src/pages/PaymentPage.tsx` refactor)**
- [ ] Convert to route-based multi-step flow (each step is its own route per APPFLOW_V2 §1.1)
- [ ] `/payment/send` → VpaEntryPage
- [ ] `/payment/confirm` → ConfirmPaymentPage
- [ ] `/payment/warning` → FrictionWarnPage
- [ ] `/payment/challenge` → FrictionChallengePage
- [ ] `/payment/blocked` → FrictionBlockedPage
- [ ] `/payment/pin` → PinPadPage
- [ ] `/payment/success` → PaymentSuccessPage
- [ ] `/payment/failed` → PaymentFailedPage
- [ ] Each guarded by `RequirePaymentState` guard

**4.3 Individual Screens (per APPFLOW_V2 §5.3)**

Create in `src/pages/payment/`:
- [ ] `VpaEntryPage.tsx` — VPA input (mono, `tnum`) + bank chips + amount input + Verify Receiver CTA
- [ ] `ConfirmPaymentPage.tsx` — Receiver avatar + name + VPA + amount + note + Proceed to Pay
- [ ] `FrictionWarnPage.tsx` — Honey Amber (`#D97706`) wash, signal chips, "Proceed with Caution" (secondary pill)
- [ ] `FrictionChallengePage.tsx` — Terracotta (`#C2410C`) wash, signal breakdown, "Verify Receiver Identity" primary CTA
- [ ] `FrictionBlockedPage.tsx` — Deep Ruby (`#9F1239`) wash, PIN input UNRENDERED, "File a Complaint" CTA
- [ ] `PinPadPage.tsx` — 4 dot indicators + numeric keypad + `1234` enforcement (per §22 reconciliation)
- [ ] `SettlingPage.tsx` — Progressive checkmarks (Verifying → Debiting → Crediting → Cert)
- [ ] `PaymentSuccessPage.tsx` — Confetti (2.5s, 50 particles) + amount + View Certificate + optional View Face
- [ ] `PaymentFailedPage.tsx` — Red X + reason + Try Again

**4.4 Reusable Payment Components**
Create in `src/components/payment/`:
- [ ] `RiskVerdictCard.tsx` (4 variants: PASS/WARN/CHALLENGE/BLOCK)
- [ ] `SignalChip.tsx` (weight badge + signal type + reason)
- [ ] `RiskScoreRing.tsx` (SVG ring gauge, colored by verdict)
- [ ] `AmountDisplay.tsx` (display-xl, tnum, Indian formatting)
- [ ] `ReceiverCard.tsx` (avatar + name + VPA + bank)

**4.5 History Page (`src/pages/HistoryPage.tsx`)**
Per APPFLOW_V2 §13:
- [ ] Search bar (client-side filter for MVP)
- [ ] Filter tabs: All / Passed / Warned / Challenged / Blocked / Failed
- [ ] Date grouping (Today, Yesterday, dates)
- [ ] Transaction rows: direction icon + name + VPA + timestamp + verdict badge + amount
- [ ] Load More pagination (offset-based per §22)
- [ ] Use existing `TransactionRow.tsx`, extend as needed

**4.6 Transaction Detail Page (`src/pages/TransactionDetailPage.tsx`)**
Per APPFLOW_V2 §13.2:
- [ ] New route: `/history/:id`
- [ ] Full transaction breakdown: status, verdict, IDs (mono), timestamp, note
- [ ] Risk signals section with all signals from txn
- [ ] Actions: View Certificate, Report, Pay Again

### Definition of Done
- Full PASS flow works: VPA → resolve → confirm → PIN `1234` → success + confetti + cert link
- WARN flow: shows Honey Amber screen, requires acknowledgment
- CHALLENGE flow: shows Terracotta screen, routes to `/liveness/redirect` placeholder
- BLOCK flow: shows Deep Ruby screen, PIN input completely absent from DOM
- Wrong PIN triggers shake animation + clears dots
- Browser back mid-payment doesn't corrupt state
- All amounts render with `tnum` and Indian formatting

---

## 🎯 PHASE 5 — Safe Circle Full Integration
**Duration:** 3 hours | **Owner:** F1

### Tasks

**5.1 Safe Circle Page (`src/pages/SafeCirclePage.tsx`)**
Per APPFLOW_V2 §6:
- [ ] Replace demoData with `useSafeCircle()` hook
- [ ] Show count "(2/20)" in header
- [ ] Use existing `ContactCard.tsx`, wire up with real data
- [ ] Use existing `AnomalyBanner.tsx` when `hasAnomaly === true`
- [ ] Use existing `AddContactModal.tsx`, wire to `useAddContact()`
- [ ] Add remove confirmation modal (per §6.3)
- [ ] Empty state: "No trusted contacts added yet."

**5.2 Error Handling**
- [ ] `409 CONFLICT` → "This contact is already in your Safe Circle."
- [ ] `400 LIMIT_EXCEEDED` → "Safe Circle limit of 20 contacts reached."
- [ ] `400 SELF_ADDITION_PROHIBITED` → "You cannot add your own VPA."

**5.3 Anomaly Safety Net Integration**
Per APPFLOW_V2 §6.4:
- [ ] When paying a Safe Circle contact with `hasAnomaly: true`, show AnomalyBanner on Confirm screen
- [ ] Never hard-block — user decides

**5.4 Quick Pay Carousel Wire-Up (Dashboard)**
- [ ] Horizontal scroll of Safe Circle contacts on Dashboard
- [ ] Red dot on avatars with anomaly
- [ ] Tap → prefills `/payment/send?vpa=...&name=...`

### Definition of Done
- Add contact works, list refreshes, count updates
- Duplicate/limit/self-add errors show friendly messages
- Anomaly banner appears in payment flow when applicable
- Quick Pay carousel navigates to prefilled payment

---

## 🎯 PHASE 6 — F2 Foundation: CV Infrastructure + Utils
**Duration:** 6 hours | **Owner:** F2

### Tasks

**6.1 Camera Hooks (`src/hooks/cv/`)**
- [ ] `useCamera.ts` — `getUserMedia`, facing mode toggle, cleanup on unmount
- [ ] Handle permission denial → return error state for UI to show instructions
- [ ] Handle low-light detection (avg pixel brightness < 30) → warning flag

**6.2 face-api.js Integration**
- [ ] `useFaceApi.ts` — load models from `/models/` on mount, expose `detectLandmarks(video)`
- [ ] Model loading progress indicator (report % loaded)
- [ ] Fallback if models fail to load → show error state

**6.3 YOLOv8n Integration**
- [ ] `useYoloFace.ts` — load ONNX model via `onnxruntime-web`
- [ ] Fallback heuristic if ONNX fails → skin-color detection (capped at 20/35 points)
- [ ] Expose `detectFace(video)` returning `{ confidence, bbox }`

**6.4 Crypto Utils (`src/utils/crypto/`)**
- [ ] `aesGcm.ts` — `generateKey()`, `encrypt(blob, key)`, `decrypt(ciphertext, key, iv, authTag)` via WebCrypto
- [ ] `faceCrop.ts` — canvas-based 200×200 center crop from video frame → JPEG blob (0.8 quality)

**6.5 QR Scanner Hook (`src/hooks/cv/useQrScanner.ts`)**
- [ ] Wrap `html5-qrcode` with lifecycle management
- [ ] Config: `fps: 10`, `qrbox: 250×250`, rear camera preferred
- [ ] Expose `startScanning()`, `stopScanning()`, `onDecoded(callback)`

### Definition of Done
- Camera stream works on Chrome/Firefox/Safari
- face-api.js detects 68 landmarks in real-time (>10 FPS)
- YOLO detects face bounding box with confidence score
- AES-GCM encrypt→decrypt round-trip works
- QR scanner decodes seeded test QR

---

## 🎯 PHASE 7 — Liveness Camera Flow (Receiver-First)
**Duration:** 10 hours | **Owner:** F2

### Tasks

**7.1 Receiver Escrow Page (`src/pages/f2/ReceiverChallengePage.tsx`)**
- [ ] Route: `/liveness/pending`
- [ ] Poll `GET /api/liveness/pending` every 10s (add to `apiExamples` docs → coord with B2 if missing)
- [ ] List pending challenges with 10-min countdown per item
- [ ] Tap challenge → navigate to `/liveness/:sessionId`
- [ ] Empty state per APPFLOW_V2 §8.2

**7.2 Liveness Camera Page (`src/pages/f2/LivenessCameraPage.tsx`)**
Per APPFLOW_V2 §8.3:
- [ ] Circular camera viewport with 4px Muted Jade border (glowing aura)
- [ ] Border pulses Deep Ruby when no face detected
- [ ] On mount: `POST /api/liveness/challenge` → get `challengeCode` + `ttlSeconds`
- [ ] Display 4-digit challenge code (display-lg, tnum, `tracking-[0.4em]`)
- [ ] Two blink counter badges (empty → Muted Jade fill on blink)
- [ ] EAR calculation from face-api.js landmarks (points 37-42, 43-48)
- [ ] Blink detected when EAR < 0.20 for ≥2 consecutive frames
- [ ] Debounce blinks (500ms cooldown)
- [ ] YOLO status pill: "Face Detected ✓" green / "No Face" red
- [ ] Live score bar: `S = S_blink(40) + S_yolo(35) + S_challenge(25)`
- [ ] Escrow countdown pill in Honey Amber
- [ ] "Confirm Identity" button (disabled until blinks + code)
- [ ] Submit: `POST /api/liveness/verify` with `{ challengeId, challengeCode, clientScore, blinkCount, faceEmbeddingHash }`

**7.3 Locked Success Copy**
Per APPFLOW_V2 §8.4:
- [ ] On PASS, display EXACTLY: *"Identification verified, wait for sender to provide you the payment."*
- [ ] Return to Home CTA

**7.4 Failure States**
- [ ] Score < 75 → Retry (max 3)
- [ ] Code TTL expired (60s) → auto-request new challenge
- [ ] Escrow expired (10min) → refund notification
- [ ] Camera denied → instructions card
- [ ] Model load failure → skip option

**7.5 Sender-Side Escrow Waiting**
- [ ] `AWAITING_RECEIVER` state in paymentStore
- [ ] `src/pages/payment/AwaitingReceiverPage.tsx` — 10-min countdown + poll for status
- [ ] On receiver PASS notification → auto-advance to `/payment/pin`
- [ ] On timeout → auto-navigate to `/payment/failed` with refund confirmation

### Definition of Done
- Full liveness flow works: models load → face detected → 2 blinks counted → code entered → score ≥75 → submit → locked success message
- Sender sees countdown timer, gets notified when receiver completes
- All 4 failure states handled with proper UI

---

## 🎯 PHASE 8 — QR Scanner + Tamper Detection
**Duration:** 6 hours | **Owner:** F2

### Tasks

**8.1 QR Scanner Page (`src/pages/f2/QrScannerPage.tsx`)**
Per APPFLOW_V2 §7.2:
- [ ] Route: `/qr`
- [ ] Camera viewfinder with rounded overlay
- [ ] Torch toggle, camera switch, "Enter Manually" fallback
- [ ] On QR decode: stop scanner immediately, capture GPS via `navigator.geolocation.getCurrentPosition`
- [ ] Verifying overlay while API pending

**8.2 QR Verify API Call**
- [ ] `POST /api/qr/verify` with `{ qrPayload, deviceLat, deviceLng }`
- [ ] Navigate to `/qr/result` with verdict data

**8.3 QR Verdict Page (`src/pages/f2/QrVerdictPage.tsx`)**
Per APPFLOW_V2 §7.4:

**VERIFIED (Muted Jade wash):**
- [ ] Merchant name + VPA + business type pills
- [ ] "Distance: Xm / Allowed: 100m" in emerald
- [ ] "Scan Another" + "Proceed to Pay" (prefill `/payment/send?vpa=...&name=...`)

**UNVERIFIED (Honey Amber wash):**
- [ ] "Unregistered Merchant" message
- [ ] Reasons list
- [ ] "Proceed Anyway" navigates to `/payment/send?vpa=...` (no amount prefill)

**TAMPERED (Deep Ruby wash):**
- [ ] "Sticker-Over-QR TAMPER Detected" alert
- [ ] Distance mismatch shown prominently
- [ ] Payment CTA completely unrendered
- [ ] "Report This QR" → `/complaints/new?vpa=...&category=QR_TAMPERING`

**8.4 Error States**
- [ ] Camera denied → instructions + manual VPA entry
- [ ] GPS denied → proceed as UNVERIFIED
- [ ] Malformed QR → toast + retry
- [ ] Network timeout → toast + retry

### Definition of Done
- Scanner decodes valid UPI QR
- Correct GPS → VERIFIED verdict → prefilled payment flow
- Wrong GPS → TAMPERED verdict → payment blocked
- Missing merchant → UNVERIFIED with warning

---

## 🎯 PHASE 9 — Certificate Viewer + View-Once Face Blob
**Duration:** 8 hours | **Owner:** F2

### Tasks

**9.1 Certificate Viewer (`src/pages/f2/CertificateViewerPage.tsx`)**
Per APPFLOW_V2 §9.1:
- [ ] Route: `/certificates/:id`
- [ ] `GET /api/certificates/:id`
- [ ] Header: SPYDE shield + "Digital Evidence Certificate" (heading-md)
- [ ] Certificate ID displayed (mono, caption)
- [ ] Transaction details grid (sender, receiver, amount, verdict, liveness, settled)
- [ ] Cryptographic proof inset panel (Canvas Base background)
- [ ] SHA-256 hash + JWT signature in JetBrains Mono, Sand color, break-all
- [ ] Copy-to-clipboard buttons
- [ ] "Verify Signature" button → `POST /api/certificates/verify` → show result modal

**9.2 Certificate Verification Modal**
Per APPFLOW_V2 §9.2:
- [ ] Muted Jade wash on success
- [ ] Deep Ruby wash on failure with reason

**9.3 Face Blob Consent Modal**
Per APPFLOW_V2 §9.3:
- [ ] Triggered post-liveness on receiver side
- [ ] Explains DPDP compliance, 10s view-once
- [ ] Consent → open front camera → 200×200 center crop → AES-256-GCM encrypt → upload
- [ ] `POST /api/certificates/face-blob` with base64 payloads
- [ ] Wipe plaintext from canvas + memory

**9.4 View-Once Face Viewer (`src/pages/f2/ViewOnceFacePage.tsx`)**
Per APPFLOW_V2 §9.4:
- [ ] Route: `/face-blob/:id`
- [ ] 95% black overlay
- [ ] Fetch encrypted blob → decrypt with key → render on canvas
- [ ] Rose pill countdown at top ("Auto-destroy in Xs")
- [ ] Rose→Cyan gradient progress bar shrinking linearly
- [ ] CSS blur 0→9px in last 3 seconds
- [ ] Opacity 1→0 in last 3 seconds
- [ ] At 10s: wipe canvas, clear key from memory, destroy image element
- [ ] Second view returns `410 GONE` → show "Photo permanently destroyed"

### Definition of Done
- Certificate renders with SHA-256 hash + JWT signature in mono font
- Verify button confirms authenticity
- Face capture encrypts client-side (verify no plaintext in Network tab)
- View-once viewer destroys image at exactly 10s
- Second view attempt shows destroyed message

---

## 🎯 PHASE 10 — Complaints System
**Duration:** 4 hours | **Owner:** F2

### Tasks

**10.1 Complaint Form (`src/pages/f2/ComplaintFormPage.tsx`)**
Per APPFLOW_V2 §10.2:
- [ ] Route: `/complaints/new` (accepts `?vpa=&category=` query params)
- [ ] Target VPA input (pre-fillable)
- [ ] Category dropdown: FRAUD, IMPERSONATION, SPAM, HARASSMENT, QR_TAMPERING, OTHER
- [ ] Quality tier radio: Basic / Verified (+ Txn ID) / Evidence (+ image, ≤5MB)
- [ ] Description textarea (20-500 chars) with counter
- [ ] Optional file upload for Evidence tier
- [ ] Rate limit indicator "4 remaining today"
- [ ] Submit: `POST /api/complaints` (multipart if evidence)

**10.2 Error Handling**
- [ ] `409 CONFLICT` → "Already filed this category within 24h"
- [ ] `429 RATE_LIMITED` → "Max 5 per day, resets at midnight IST"

**10.3 Success Screen (`src/pages/f2/ComplaintSuccessPage.tsx`)**
Per APPFLOW_V2 §10.3:
- [ ] Reference ID (mono)
- [ ] Status: PENDING pill (Honey Amber)
- [ ] "View My Complaints" + "Return to Home" CTAs

**10.4 My Complaints (`src/pages/f2/MyComplaintsPage.tsx`)**
- [ ] Route: `/complaints/mine`
- [ ] List with status badges (PENDING/VERIFIED/REJECTED)

**10.5 Community Feed (`src/pages/f2/CommunityFeedPage.tsx`)**
Per APPFLOW_V2 §10.5:
- [ ] Route: `/complaints/vpa/:vpa`
- [ ] Risk score header (Deep Ruby if high)
- [ ] Anonymized report cards
- [ ] "File Your Own Report" CTA

### Definition of Done
- Complaint filing works with all tiers
- Rate limiting shows friendly errors
- Community feed anonymizes reporters
- Integration with BLOCK screen "File Complaint" CTA works

---

## 🎯 PHASE 11 — Admin Dashboard
**Duration:** 6 hours | **Owner:** F2

### Tasks

**11.1 Admin Overview (`src/pages/f2/admin/AdminOverviewPage.tsx`)**
Per APPFLOW_V2 §11.1:
- [ ] Route: `/admin`, guarded by `RequireAdmin`
- [ ] Poll `GET /api/admin/stats` every 30s
- [ ] Stat cards: Users, Transactions, Volume, Blocked
- [ ] CSS bar chart for verdict distribution (per LEARNING_NOTES [F2])
- [ ] Complaints summary + link to moderation

**11.2 Top Flagged (`src/pages/f2/admin/AdminTopFlaggedPage.tsx`)**
- [ ] `GET /api/admin/top-flagged`
- [ ] Ranked table with drill-down

**11.3 Complaint Moderation (`src/pages/f2/admin/AdminModerationPage.tsx`)**
Per APPFLOW_V2 §11.3:
- [ ] Pending complaints queue
- [ ] Filters: category, sort
- [ ] Verify / Reject actions → `PATCH /api/admin/complaints/:id`
- [ ] Optimistic UI updates

**11.4 Network Graph (`src/pages/f2/admin/AdminNetworkGraphPage.tsx`)**
- [ ] Stretch goal: force-directed graph of fraud relationships
- [ ] Can defer to v2.1 if time-constrained

### Definition of Done
- Admin login (`+919999999999` / `Password@123`) accesses dashboard
- Non-admin users get redirected with toast
- Stats poll every 30s
- Moderation actions update UI optimistically

---

## 🎯 PHASE 12 — Notifications + Escrow Banner
**Duration:** 3 hours | **Owner:** F1

### Tasks

**12.1 Notifications Page (`src/pages/NotificationsPage.tsx`)**
Per APPFLOW_V2 §14:
- [ ] Route: `/notifications`
- [ ] `GET /api/notifications?limit=20&offset=0` (⚠️ endpoint not in shipped API — coord with backend or mock)
- [ ] Type-based color coding (Escrow: Terracotta, Blocked: Deep Ruby, etc.)
- [ ] Mark all read CTA

**12.2 Notification Bell (Header)**
- [ ] Poll `GET /api/notifications/unread-count` every 10s
- [ ] Red badge on bell icon
- [ ] Tap → opens `/notifications`

**12.3 Escrow Banner (Dashboard)**
Per APPFLOW_V2 §4.4:
- [ ] Poll `GET /api/liveness/pending` every 10s from Home
- [ ] Render banner if any pending
- [ ] Terracotta wash + amber clock pulse + MM:SS countdown
- [ ] "Verify Identity Now" CTA → `/liveness/pending`

### Definition of Done
- Bell shows unread count badge
- Escrow banner appears when receiver has pending challenges
- Countdown ticks live

---

## 🎯 PHASE 13 — Onboarding + Splash + Permissions
**Duration:** 4 hours | **Owner:** F1

### Tasks

**13.1 Splash Page (`src/pages/SplashPage.tsx`)**
- [ ] Logo animation 1.5s
- [ ] Auto-check auth → redirect

**13.2 Welcome Page (`src/pages/onboarding/WelcomePage.tsx`)**
Per APPFLOW_V2 §2.2

**13.3 Onboarding Tour (`src/pages/onboarding/OnboardingTourPage.tsx`)**
Per APPFLOW_V2 §2.3:
- [ ] 3 slides with swipe + dots + auto-advance

**13.4 Permission Priming (`src/pages/onboarding/PermissionPrimingPage.tsx`)**
Per APPFLOW_V2 §2.4:
- [ ] Contextual cards for Camera, GPS, Notifications
- [ ] Never trigger raw browser dialog

**13.5 First Balance Reveal Modal**
Per APPFLOW_V2 §3.6:
- [ ] Shows once after registration
- [ ] `display-xl` for ₹5,00,000

**13.6 First-Time Coach Overlay**
Per APPFLOW_V2 §2.5:
- [ ] Dark backdrop with spotlight cutouts
- [ ] Persist `spyde:onboardingComplete` in localStorage

### Definition of Done
- New user flow: Welcome → Tour → Permissions → Register → Balance Reveal → Coach → Home
- Existing user: Splash → auto-redirect → Home

---

## 🎯 PHASE 14 — Loading, Empty, Offline & Error States
**Duration:** 3 hours | **Owner:** F1 + F2

### Tasks

Per APPFLOW_V2 §17, §18, §20:

**14.1 Skeleton Loaders**
- [ ] BalanceCard skeleton
- [ ] History row skeletons (5)
- [ ] Contact card skeletons (3)
- [ ] Certificate skeleton
- [ ] Admin stat card skeletons

**14.2 Empty States**
- [ ] History empty: "No transactions yet"
- [ ] Circle empty: "No trusted contacts added yet"
- [ ] Notifications empty: "You're all caught up!"
- [ ] Pending liveness empty: "No pending identity challenges"

**14.3 Offline Handling**
- [ ] Global banner on `navigator.onLine === false`
- [ ] Disable payments/QR/liveness/complaints when offline
- [ ] Show cached data for read-only screens

**14.4 Error Modals**
- [ ] SessionExpiredModal (401 after refresh fail)
- [ ] NetworkErrorModal (timeout > 10s)
- [ ] Toast queue with react-hot-toast OR custom implementation

### Definition of Done
- All 40 edge cases in APPFLOW_V2 §20 handled
- Offline banner appears/disappears based on connectivity
- Skeletons match Design.md Surface Level 2 pulse

---

## 🎯 PHASE 15 — Integration Testing
**Duration:** 6 hours | **Owner:** F1 + F2

### End-to-End Test Scenarios

**15.1 Auth Flow**
- [ ] Register new user → auto-login → dashboard
- [ ] Login with seeded account
- [ ] Session persists across refresh (silent refresh)
- [ ] Wrong password → inline error
- [ ] Duplicate phone on register → conflict error
- [ ] Logout → cleared state → redirect to login
- [ ] Access protected route without auth → redirect to login
- [ ] Token expiry → auto-refresh → retry request

**15.2 PASS Payment Flow (Safe Circle Bypass)**
- [ ] Add `aditya@okicici` to Safe Circle
- [ ] Send ₹100 to `aditya@okicici`
- [ ] Verify PASS toast appears
- [ ] Enter PIN `1234` → success + confetti
- [ ] Balance updates on dashboard
- [ ] Certificate link works

**15.3 WARN Payment Flow**
- [ ] Send to VPA with elevated risk (score 50-74)
- [ ] Honey Amber screen displays with signals
- [ ] "Proceed with Caution" (secondary pill) advances to PIN
- [ ] Success completes normally

**15.4 CHALLENGE Payment Flow (Full 2-Device)**
- [ ] Device A (Sender): Send to `challenge.test@oksdi` for ₹500
- [ ] Sender sees Terracotta screen + signal breakdown
- [ ] Sender clicks "Verify Receiver Identity" → escrow active
- [ ] Sender sees `AWAITING_RECEIVER` with 10-min countdown
- [ ] Device B (Receiver): Get notification → open `/liveness/pending`
- [ ] Receiver opens liveness camera → completes 2 blinks + reads code
- [ ] Receiver sees exact locked copy: *"Identification verified, wait for sender to provide you the payment."*
- [ ] Sender auto-advances to PIN entry
- [ ] Enter PIN → success
- [ ] Certificate generated with liveness proof

**15.5 BLOCK Payment Flow**
- [ ] Send to `mule@oksbii` for ₹5000
- [ ] Deep Ruby screen appears
- [ ] Verify PIN entry is completely absent from DOM (inspect element)
- [ ] "File a Complaint" CTA prefills complaint form

**15.6 QR Verification Flow**
- [ ] Scan seeded merchant QR at correct location → VERIFIED
- [ ] Proceed to prefilled payment
- [ ] Scan same QR with spoofed GPS (browser devtools sensors) → TAMPERED
- [ ] Verify Report CTA prefills complaint form

**15.7 Certificate + Face Blob Flow**
- [ ] Complete CHALLENGE flow
- [ ] Receiver consents to face blob
- [ ] Sender views certificate → View Receiver Photo
- [ ] Verify 10s countdown works
- [ ] Verify blur + fade in last 3s
- [ ] Second view attempt shows destroyed message

**15.8 Complaint Flow**
- [ ] File FRAUD complaint against `mule@oksbii`
- [ ] Try duplicate within 24h → 409 error
- [ ] Admin dashboard shows complaint in queue
- [ ] Admin verifies → optimistic update
- [ ] Rate limit test: file 5 → 6th blocked

**15.9 Cross-Browser**
- [ ] Chrome desktop
- [ ] Firefox desktop
- [ ] Safari desktop (if available)
- [ ] Chrome mobile (via DevTools device emulator)
- [ ] iPhone SE, Pixel 7, iPad breakpoints

### Definition of Done
- All 9 scenarios pass end-to-end
- Zero console errors
- Zero TypeScript errors
- Lighthouse Performance > 80, Accessibility > 90

---

## 🎯 PHASE 16 — Polish + Deployment
**Duration:** 4 hours | **Owner:** F1 + F2

### Tasks

**16.1 Motion Polish**
Per Design.md §6 + APPFLOW_V2 §19:
- [ ] Framer Motion page transitions (slide-left forward, slide-right back)
- [ ] Modal enter/exit (scale + opacity, 0.2s)
- [ ] Balance count-up on change
- [ ] PIN dot fill animation
- [ ] Wrong PIN shake
- [ ] Liveness score bar fluid fill
- [ ] Confetti on success
- [ ] `prefers-reduced-motion` respect

**16.2 Haptic Feedback**
- [ ] PIN tap: `navigator.vibrate([15])`
- [ ] Success: `navigator.vibrate([100])`
- [ ] Error: `navigator.vibrate([200, 100, 200])`

**16.3 Design System QA**
- [ ] Grep for `#FFFFFF` → replace with Warm Bone
- [ ] Grep for `font-weight: 600|700` → replace with size/color hierarchy
- [ ] Verify all buttons are pill-shaped (`rounded-full`)
- [ ] Verify all cards use 12px radius (`rounded-xl`)
- [ ] Verify `tnum` applied to all numeric elements

**16.4 Production Build**
- [ ] `npm run build` → zero TS errors
- [ ] Bundle size analysis (target < 1MB gzipped for main chunk)
- [ ] Lazy-load face-api.js models (only on Liveness route)
- [ ] Lazy-load html5-qrcode (only on QR route)
- [ ] Configure `.env.production` with production API URL

**16.5 Deployment**
- [ ] Deploy to Vercel/Netlify
- [ ] Configure CORS on backend for production domain
- [ ] Verify all routes work (SPA fallback for react-router)
- [ ] Verify environment variables loaded
- [ ] Smoke test on production URL

**16.6 Demo Prep**
- [ ] Prepare demo script covering:
  - Login as Aarav (`9876543210`)
  - Send Safe Circle payment (PASS)
  - Send to typosquat VPA (WARN/CHALLENGE)
  - Send to mule (BLOCK)
  - Scan tampered QR
  - Complete liveness challenge (2-device)
  - View certificate
  - View-once face blob
  - Admin dashboard (log in as `9999999999`)
- [ ] Rehearse in < 5 minutes

### Definition of Done
- Zero console errors in production
- All Design.md rules enforced
- Deployed URL accessible
- Demo rehearsed and timed

---

## 📊 Consolidated Progress Dashboard

| Phase | Duration | Owner | Priority | Status |
|---|---|---|---|---|
| 0 — Foundation & Deps | 3h | F1 | 🔴 Critical | ⬜ |
| 1 — API Client + Auth | 6h | F1 | 🔴 Critical | ⬜ |
| 2 — Routing + Guards | 4h | F1 | 🔴 Critical | ⬜ |
| 3 — Dashboard Integration | 4h | F1 | 🔴 Critical | ⬜ |
| 4 — Payment State Machine | 12h | F1 | 🔴 Critical | ⬜ |
| 5 — Safe Circle Integration | 3h | F1 | 🟡 High | ⬜ |
| 6 — F2 CV Infrastructure | 6h | F2 | 🔴 Critical | ⬜ |
| 7 — Liveness Flow | 10h | F2 | 🔴 Critical | ⬜ |
| 8 — QR Scanner | 6h | F2 | 🟡 High | ⬜ |
| 9 — Certificate + Face Blob | 8h | F2 | 🟡 High | ⬜ |
| 10 — Complaints | 4h | F2 | 🟢 Medium | ⬜ |
| 11 — Admin Dashboard | 6h | F2 | 🟢 Medium | ⬜ |
| 12 — Notifications | 3h | F1 | 🟢 Medium | ⬜ |
| 13 — Onboarding + Splash | 4h | F1 | 🟢 Medium | ⬜ |
| 14 — Loading/Empty/Offline | 3h | Both | 🟡 High | ⬜ |
| 15 — Integration Testing | 6h | Both | 🔴 Critical | ⬜ |
| 16 — Polish + Deploy | 4h | Both | 🔴 Critical | ⬜ |
| **TOTAL** | **92h** | | | **0%** |

---

## 🚦 Recommended Execution Order

### Sprint 1 — Foundation (Day 1, ~13h)
Phase 0 → Phase 1 → Phase 2 → Phase 3

**Milestone:** Login works, dashboard shows real data, routing set up.

### Sprint 2 — Core Payment (Day 2, ~15h)
Phase 4 → Phase 5

**Milestone:** All 4 risk verdicts work, Safe Circle fully integrated.

### Sprint 3 — Security Features (Day 3, ~24h — parallel F2 work)
Phase 6 → Phase 7 → Phase 8 → Phase 9

**Milestone:** Liveness + QR + Certificates all functional.

### Sprint 4 — Advanced Features (Day 4, ~17h)
Phase 10 → Phase 11 → Phase 12 → Phase 13

**Milestone:** Complaints, admin, notifications, onboarding complete.

### Sprint 5 — Polish (Day 5, ~13h)
Phase 14 → Phase 15 → Phase 16

**Milestone:** Production-deployed, demo-ready.

---

## ⚠️ Backend Coordination Required

Before Phase 12 (Notifications) and Phase 7 (Liveness Pending), confirm with backend team:

1. **`GET /api/liveness/pending`** — Does this endpoint exist? (Per APPFLOW_V2 §22 item 8, assumed to exist but not in B2 examples)
2. **`GET /api/notifications`** and **`GET /api/notifications/unread-count`** — Not in shipped API (APPFLOW_V2 §22 item 9)

If missing, either:
- Request backend to add them, OR
- Mock these endpoints client-side for demo purposes

---

## 🎯 Ready to Execute

This unified tracker is your **single source of truth** for the frontend integration work. It:
- ✅ Reflects the actual current state of your `client/` directory
- ✅ Adheres strictly to APPFLOW_V2.md, Design.md, and API contracts
- ✅ Sequences work to minimize blocking dependencies
- ✅ Includes cross-browser + 2-device testing
- ✅ Ends with a production deployment

