# SPYDE — Team Learning Notes & Technical Journal

**Document Version:** 1.0 (Round 2 Production Build)
**Owners:** All (B1, B2, F1, F2)
**Purpose:** Living journal of architectural decisions, debugging war stories, AI-assisted development insights, and lessons learned during the 72-hour build sprint.
**Status:** APPEND-ONLY — New entries added throughout the build. Never delete past entries.

---

## 0. How to Use This Document

Each team member logs entries under their developer ID using this format:

```
### [DEV_ID] — YYYY-MM-DD HH:MM — Short Title
**Context:** What were you trying to do?
**Problem:** What went wrong or what decision did you face?
**Solution:** What did you end up doing?
**Lesson:** What will you do differently next time?
**Tags:** #category
```

**Categories:** `#architecture` `#debugging` `#ai-assisted` `#performance` `#security` `#ux` `#devops` `#database` `#hackathon`

---

## 1. B1 — Backend Lead (Core Engine, Auth, Database, Risk Engine, Safe Circle)

### [B1] — Day 0 14:00 — "Real Shell, Fake Rails" Architecture Decision
**Context:** First architectural decision of the project. How do we build a fraud prevention middleware without access to real banking APIs?
**Problem:** A real UPI integration requires NPCI certification, bank partnerships, and months of compliance work. We have 72 hours.
**Solution:** Split the database into two namespaces:
- **Real tables** (`User`, `RiskEvent`, `Complaint`, `Certificate`, etc.) — production-grade code that would work identically with real payment rails.
- **Simulated tables** (`SimBankAccount`, `SimUpiHandle`, `SimTransaction`) — sandbox mocks that replicate the shape and behavior of real banking data.

The `sim_` prefix makes the boundary explicit. When a real integration (Setu, RazorpayX, NPCI) is plugged in, only the `sim_*` service layer is replaced. The risk engine, auth, and certificate systems remain untouched.
**Lesson:** Naming conventions are architectural decisions. The `sim_` prefix saved us hours of confusion during code review.
**Tags:** `#architecture` `#hackathon`

---

### [B1] — Day 1 09:30 — BigInt for Money, Not Float
**Context:** Designing the `SimBankAccount` and `SimTransaction` schemas.
**Problem:** JavaScript's `Number` type uses IEEE 754 double-precision floats. `0.1 + 0.2 !== 0.3`. Financial calculations with floating-point arithmetic produce rounding errors that compound over thousands of transactions.
**Solution:** All monetary values stored as `BigInt` in **paisa** (1 INR = 100 paisa). `₹500.00` → `50000n`. This eliminates floating-point entirely. Prisma's `BigInt` maps to PostgreSQL's `BIGINT` (8-byte integer, max 9.2 × 10¹⁸ paisa = ₹92 quadrillion — more than enough).
**Lesson:** Never use floats for money. This is a well-known rule, but it's tempting to cut corners during hackathons. Don't.
**Tags:** `#database` `#architecture`

---

### [B1] — Day 1 16:00 — Zod + Prisma Double Validation Pattern
**Context:** Building the auth registration endpoint.
**Problem:** Prisma throws ugly `P2002` unique constraint errors when a duplicate phone number is inserted. These bubble up as 500 Internal Server Error to the client.
**Solution:** Two-layer validation:
1. **Zod schema** validates shape, format, and business rules *before* hitting the database (e.g., phone regex, password strength, VPA format).
2. **Prisma try/catch** catches `P2002` (unique violation) and translates it to a clean `409 Conflict` response.

```typescript
try {
  const parsed = RegisterSchema.parse(req.body);
  const user = await authService.register(parsed);
  res.status(201).json({ success: true, data: user });
} catch (err) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: err.issues } });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'User already exists.' } });
  }
  next(err);
}
```
**Lesson:** Never let ORM errors leak to the client. Always translate database exceptions into semantic HTTP responses.
**Tags:** `#architecture` `#security`

---

### [B1] — Day 2 11:00 — Risk Engine Parallel Execution
**Context:** Building the risk engine orchestrator. Initially ran Algo → Community → Graph sequentially.
**Problem:** Sequential execution took ~180ms (Algo: 40ms, Community: 90ms, Graph: 50ms). This exceeds the P99 < 80ms SLA.
**Solution:** `Promise.all([algoService.evaluate(), communityService.evaluate(), graphService.evaluate()])`. Since all three layers read from independent tables and have no data dependencies, they can execute concurrently. Total latency dropped to ~95ms (bounded by the slowest layer: Community). Added Redis caching for Community and Graph layers, bringing cached P99 to ~25ms.
**Lesson:** Profile before optimizing. The sequential version "felt" fast enough until we measured it. `Promise.all` is free parallelism when layers are independent.
**Tags:** `#performance` `#architecture`

---

### [B1] — Day 2 14:30 — Levenshtein Distance for Typosquatting
**Context:** Implementing the `TYPOSQUAT_HANDLE` signal in the algorithmic risk scorer.
**Problem:** How do we detect that `@oksdi` is a spoof of `@oksbi`? Simple string equality fails. Regex patterns are too brittle (infinite spoof variations).
**Solution:** Levenshtein edit distance. If `levenshtein(inputHandle, officialHandle) === 1`, it's a single-character substitution/insertion/deletion — the hallmark of typosquatting. Computed against a dictionary of 9 official PSP handles (`oksbi`, `okhdfcbank`, `paytm`, `ybl`, etc.).

Edge case discovered: `@paytmm` has distance 1 from `@paytm` (extra character), but `@paytmm` could also be a legitimate user. We decided to flag it anyway — false positives are acceptable in a WARN verdict (user can still proceed).
**Lesson:** Simple algorithms often beat complex ML for narrow, well-defined problems. Levenshtein is O(n×m) but n and m are tiny (handle suffixes < 15 chars), so it runs in microseconds.
**Tags:** `#architecture` `#debugging`

---

### [B1] — Day 2 18:00 — Safe Circle Redis Set vs. PostgreSQL Lookup
**Context:** Optimizing the Safe Circle bypass check to meet the <10ms SLA.
**Problem:** PostgreSQL compound index lookup (`userId + contactVpa`) takes ~4ms on a cold query, ~1ms warm. This is fast, but under load (1000 concurrent payments), connection pool contention could push it to 15-20ms.
**Solution:** Two-tier cache:
1. **Redis `SISMEMBER circle:<userId> <vpa>`** — O(1) time, ~0.5ms latency.
2. **PostgreSQL fallback** — if Redis is down, fall back to indexed query.

Cache is populated on `addContact()` and invalidated on `removeContact()`. TTL of 1 hour prevents stale data.
**Lesson:** Cache at the data structure level, not the query level. A Redis Set with `SISMEMBER` is semantically perfect for "is X in Y's whitelist?" lookups.
**Tags:** `#performance` `#database`

---

### [B1] — Day 3 09:00 — Atomic Fund Transfers with Prisma $transaction
**Context:** Implementing the debit/credit logic in `confirmPayment()`.
**Problem:** If the debit succeeds but the credit fails (e.g., receiver account frozen), money disappears from the system. This is a classic double-entry bookkeeping race condition.
**Solution:** Prisma's `$transaction([...])` wraps both operations in a single PostgreSQL transaction with serializable isolation:

```typescript
await prisma.$transaction([
  prisma.simBankAccount.update({
    where: { id: senderAccountId },
    data: { balancePaisa: { decrement: amountPaisa } }
  }),
  prisma.simBankAccount.update({
    where: { id: receiverAccountId },
    data: { balancePaisa: { increment: amountPaisa } }
  }),
  prisma.simTransaction.update({
    where: { id: txId },
    data: { status: 'SUCCESS' }
  })
]);
```

If any operation fails, all three roll back. Zero money lost.
**Lesson:** Financial operations must be atomic. "Debit then credit" as two separate calls is a bug waiting to happen.
**Tags:** `#database` `#security`

---

## 2. B2 — Backend Support (Liveness API, QR Verifier, Certificate, Complaints)

### [B2] — Day 1 11:00 — AI-Assisted API Design with Cursor
**Context:** Designing the full REST API surface for 5 pillars.
**Problem:** 15+ endpoints with consistent request/response envelopes, error codes, and Zod schemas. Writing this from scratch would take 2 days.
**Solution:** Used AI (Cursor/Claude) to generate the initial API skeleton from the PRD and TECHSPEC documents. Fed the AI the exact envelope format and error code table, then asked it to generate route handlers for each endpoint. Reviewed and corrected every output — the AI got ~80% right on the first pass, but missed edge cases like idempotency keys and receiver-binding on liveness challenges.
**Lesson:** AI is excellent at boilerplate generation and pattern replication. It is poor at understanding business logic edge cases. Always review AI output as if it were a junior developer's PR.
**Tags:** `#ai-assisted` `#hackathon`

---

### [B2] — Day 2 10:00 — Receiver-First Liveness Architecture Pivot
**Context:** Original design had the SENDER doing liveness verification.
**Problem:** During team discussion, we realized the sender is usually the *victim* in UPI fraud. The real threat is the receiver (money mule accounts). Forcing the victim to do biometric checks adds friction to the wrong party.
**Solution:** Flipped the entire liveness architecture to receiver-first:
- Risk Engine evaluates the **receiver's** profile.
- If CHALLENGE, funds go into **escrow** (sender debited, receiver not yet credited).
- **Receiver** must complete liveness to claim funds.
- 10-minute timeout → auto-refund to sender.

This required rewriting the escrow state machine, adding a `CONFIRMED` intermediate status, and building the cron-based refund job.
**Lesson:** Architecture should follow the threat model, not the user flow. The person who needs to prove identity is the person who benefits from the fraud.
**Tags:** `#architecture` `#security` `#hackathon`

---

### [B2] — Day 2 15:00 — Haversine Formula Precision vs. Performance
**Context:** Implementing geo-distance calculation for QR tamper detection.
**Problem:** Initially considered using PostGIS `ST_Distance` for accuracy. But PostGIS requires a PostgreSQL extension that Supabase free tier doesn't support reliably, and adding a spatial index felt like overkill for 10 merchant rows.
**Solution:** Implemented the Haversine formula in pure TypeScript. It runs in <0.1ms and is accurate to within 0.5% for distances under 1000km (which covers all Indian inter-city scenarios). The merchant registry is small enough that we don't need spatial indexing — a simple sequential scan with Haversine is faster than a PostGIS query with connection overhead.
**Lesson:** Don't add infrastructure dependencies for problems that a 10-line math function solves. PostGIS is amazing at scale, but we have 10 merchants.
**Tags:** `#performance` `#architecture`

---

### [B2] — Day 2 19:00 — Certificate Signing: HS256 vs. RS256
**Context:** Choosing the JWT algorithm for digital evidence certificates.
**Problem:** RS256 (asymmetric) is more secure for public verification — anyone can verify with the public key without being able to forge signatures. HS256 (symmetric) requires the secret key for both signing and verification, which means anyone who can verify can also forge.
**Solution:** Used HS256 for the hackathon demo because:
1. We don't have a public key infrastructure (PKI) set up.
2. The verification endpoint is server-side only (not client-side).
3. The secret key never leaves the server.

For production, we would migrate to RS256 with a published public key at `/.well-known/jwks.json` so banks and law enforcement can verify certificates offline.
**Lesson:** Cryptographic choices should match the deployment context. HS256 is fine for server-to-server verification. RS256 is required for public/offline verification.
**Tags:** `#security` `#architecture`

---

### [B2] — Day 3 08:00 — Face Blob Storage: Why Not S3?
**Context:** Deciding where to store encrypted face blobs.
**Problem:** AWS S3 is the standard for blob storage. But S3 adds latency (100-200ms per GET), requires IAM configuration, and introduces a dependency that could fail during the demo.
**Solution:** Stored face blobs directly in PostgreSQL as `BYTEA` (Prisma `Bytes`). Max blob size is 500KB (200×200 JPEG ≈ 15KB plaintext → ~20KB encrypted). At this size, PostgreSQL handles it efficiently. The `face_blobs` table will never exceed a few hundred rows because of the aggressive auto-deletion policy (60s after viewing, 24h TTL).
**Lesson:** Choose storage based on data size and lifecycle, not convention. S3 is for large, long-lived blobs. PostgreSQL BYTEA is fine for small, ephemeral ones.
**Tags:** `#architecture` `#database` `#hackathon`

---

### [B2] — Day 3 11:00 — Escrow Timeout Cron Job
**Context:** Building the 10-minute escrow expiration service.
**Problem:** How to reliably detect expired escrows without a dedicated job scheduler (no Bull/BullMQ in the stack to keep things simple)?
**Solution:** Simple `setInterval` in the Express server that runs every 60 seconds:

```typescript
setInterval(async () => {
  const result = await escrowService.processExpiredEscrows();
  if (result.reversedCount > 0) {
    console.log(`[Escrow] Refunded ${result.reversedCount} expired transactions`);
  }
}, 60_000);
```

The query scans for `CONFIRMED` transactions with `riskVerdict = 'CHALLENGE'` and `updatedAt < now() - 10min`. In production, this would be a proper cron job (pg_cron, AWS EventBridge, or Railway Cron), but for a 72-hour hackathon, `setInterval` is reliable enough.
**Lesson:** Perfect is the enemy of shipped. A 60-second polling interval is "good enough" for a demo. Real-time precision would require event-driven architecture.
**Tags:** `#architecture` `#hackathon`

---

## 3. F1 — Frontend Lead (Payment Flow, Auth, State Machine, Safe Circle)

### [F1] — Day 1 10:00 — Zustand vs. Redux vs. Context
**Context:** Choosing the state management library for the client.
**Problem:** The payment flow has complex state (7+ states in the state machine), auth tokens need persistence, and multiple components need to read risk assessment data. React Context would cause unnecessary re-renders. Redux is too much boilerplate for a 72-hour sprint.
**Solution:** Zustand. It provides:
- Minimal boilerplate (no providers, no action creators, no reducers).
- Built-in `persist` middleware for auth token localStorage.
- Selective subscriptions (components only re-render when their specific slice changes).
- TypeScript inference out of the box.

```typescript
const usePaymentStore = create<PaymentState>()(
  persist(
    (set) => ({
      state: 'IDLE',
      receiverVpa: '',
      amount: 0,
      riskAssessment: null,
      setStep: (step) => set({ state: step }),
    }),
    { name: 'spyde-payment' }
  )
);
```
**Lesson:** For hackathons, choose the library with the lowest time-to-first-feature. Zustand's API is so simple that we had the auth store working in 20 minutes.
**Tags:** `#architecture` `#hackathon`

---

### [F1] — Day 1 18:00 — Payment State Machine Design
**Context:** Modeling the send-money user journey.
**Problem:** The payment flow has branching logic based on risk verdicts. A naive `if/else` chain in the component became unmanageable after adding WARN, CHALLENGE, and BLOCK states.
**Solution:** Formalized the flow as a finite state machine in the Zustand store:

```
IDLE → RESOLVE → REVIEW → [RISK_CHECK] → PIN → PROCESSING → SUCCESS
                                      ↘ WARN_MODAL → (proceed) → PIN
                                      ↘ CHALLENGE → (receiver liveness) → PIN
                                      ↘ BLOCK → (terminal)
```

Each state transition is a single `set()` call. Components render based on `state` with a `switch` statement. No nested conditionals.
**Lesson:** State machines prevent impossible states. Before the state machine, we had bugs where the UI showed the PIN pad AND the risk modal simultaneously. After formalizing, those bugs disappeared.
**Tags:** `#architecture` `#ux` `#debugging`

---

### [F1] — Day 2 13:00 — Framer Motion for Risk Modals
**Context:** Building the WARN/CHALLENGE/BLOCK modals.
**Problem:** Static modals feel "flat" and don't convey urgency. The BLOCK screen needs to feel alarming. The WARN screen needs to feel cautionary but not panic-inducing.
**Solution:** Framer Motion with semantic animations:
- **WARN:** Gentle slide-up (`y: 20→0`) with yellow glow pulse. Calm but attention-grabbing.
- **CHALLENGE:** Scale-in (`scale: 0.9→1`) with orange border animation. Urgent but controlled.
- **BLOCK:** Hard snap-in (`scale: 0.8→1`, `duration: 0.15s`) with red background pulse (`animate: { opacity: [0.2, 0.4, 0.2] }`). Alarming and final.

```tsx
<motion.div
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
  className="bg-danger-900/40 border-2 border-danger-500/50 rounded-2xl p-6"
>
```
**Lesson:** Animation is communication. The speed, easing, and color of an animation tell the user how to feel before they read a single word.
**Tags:** `#ux` `#performance`

---

### [F1] — Day 2 17:00 — Safe Circle Safety Net Banner UX
**Context:** Displaying the anomaly warning when a trusted contact has accumulated complaints.
**Problem:** We don't want to block the payment (that defeats the purpose of Safe Circle), but we also can't silently ignore 12 fraud complaints against a "trusted" contact.
**Solution:** Advisory banner that appears *above* the PIN entry screen, not as a blocking modal:

```
⚠️ Safety Net Advisory
Your trusted contact "Charlie" has accumulated 12 recent fraud reports.
Please confirm you are speaking to the authentic account holder.
[Proceed Anyway]  [Cancel Payment]
```

The banner uses amber (not red) to signal caution without alarm. The "Proceed Anyway" button is the primary action because we respect the user's trust decision.
**Lesson:** Security UX is a spectrum, not a binary. Between "silent pass" and "hard block" lies a wide space of advisory patterns that respect user agency while providing information.
**Tags:** `#ux` `#security`

---

### [F1] — Day 3 10:00 — Vite Proxy for Local Development
**Context:** Connecting the React frontend to the Express backend during development.
**Problem:** CORS errors when the client (`localhost:5173`) calls the server (`localhost:5000`). Adding CORS headers to the server works but doesn't match production (where both are behind the same domain).
**Solution:** Vite's built-in proxy in `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
});
```

Now `fetch('/api/me')` in the client transparently routes to `http://localhost:5000/api/me`. No CORS issues. Matches production behavior where Nginx/Vercel routes `/api/*` to the backend.
**Lesson:** Solve CORS in development with a proxy, not with permissive CORS headers. Permissive CORS in dev can mask real production issues.
**Tags:** `#devops` `#debugging`

---

## 4. F2 — Frontend Support (Computer Vision, QR Scanner, Certificate Viewer, Admin)

### [F2] — Day 1 15:00 — face-api.js Model Loading Strategy
**Context:** Integrating face detection for the liveness camera.
**Problem:** face-api.js requires downloading ~540KB of TensorFlow model weights before detection can start. On a slow 3G connection, this takes 5-10 seconds. If we load models on the liveness screen, the user stares at a blank camera for too long.
**Solution:** Preload models on the `/login` screen (in the background). By the time the user logs in, navigates to home, initiates a payment, and hits the liveness challenge, the models are already cached in the browser's Cache API.

```typescript
// On login page mount
useEffect(() => {
  faceapi.nets.tinyFaceDetector.loadFromUri('/models').then(() => {
    console.log('Face models preloaded');
  });
}, []);
```

YOLOv8n ONNX (3.2MB) is lazy-loaded only when the liveness camera mounts because it's only needed for anti-spoof, not basic face detection.
**Lesson:** Perceived performance matters more than actual performance. A 2-second model load feels instant if it happens during a screen the user is already waiting on (login).
**Tags:** `#performance` `#ux`

---

### [F2] — Day 2 12:00 — Eye Aspect Ratio Blink Detection Tuning
**Context:** Implementing blink counting for liveness Layer A.
**Problem:** Initial EAR threshold of 0.25 was too sensitive — it counted normal eye movements and micro-saccades as blinks. Users were getting "2 blinks detected" within 1 second of opening the camera without actually blinking.
**Solution:** Three adjustments:
1. **Lowered close threshold** from 0.25 to 0.20 (eyes must close more fully).
2. **Added minimum frame count** of 2 consecutive closed frames (prevents single-frame noise).
3. **Added maximum duration** of 500ms (prevents slow eye-closure attacks where someone holds their eyes shut).

```typescript
if (avgEAR < 0.20) {
  closedFrameCount++;
  if (closedFrameCount >= 2 && blinkState === 'open') {
    blinkState = 'closed';
  }
} else if (avgEAR > 0.25 && blinkState === 'closed') {
  blinkCount++;
  blinkState = 'open';
  closedFrameCount = 0;
}
```
**Lesson:** Biometric thresholds must be tuned on real humans, not in theory. What looks correct in a paper (EAR < 0.25 = blink) produces false positives in practice due to camera noise and individual eye geometry.
**Tags:** `#debugging` `#performance`

---

### [F2] — Day 2 16:00 — html5-qrcode vs. jsQR vs. ZXing
**Context:** Choosing a QR code scanning library for the browser.
**Problem:** Three popular options:
- `jsQR`: Lightweight (20KB) but only decodes from static images, not live video.
- `@zxing/browser`: Full-featured but 200KB+ and complex API.
- `html5-qrcode`: 100KB, wraps native `BarcodeDetector` API with fallback, simple API, supports live video.

**Solution:** `html5-qrcode`. It provides the best balance of size, features, and developer experience. The `Html5Qrcode.start()` method handles camera selection, focus, and continuous scanning in a single call.

```typescript
const scanner = new Html5Qrcode('qr-reader');
await scanner.start(
  { facingMode: 'environment' },
  { fps: 10, qrbox: 250 },
  (decodedText) => { /* handle scan */ }
);
```
**Lesson:** Choose libraries based on the specific use case, not general popularity. jsQR is great for image uploads but useless for live scanning. html5-qrcode is purpose-built for our exact need.
**Tags:** `#architecture` `#hackathon`

---

### [F2] — Day 2 20:00 — WebCrypto AES-256-GCM for Face Encryption
**Context:** Implementing client-side encryption for the view-once face blob.
**Problem:** The server must never see the plaintext face image. This means encryption must happen in the browser *before* the upload. We need a symmetric cipher (fast for small blobs) with authentication (prevent tampering).
**Solution:** WebCrypto API's AES-256-GCM:

```typescript
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true, ['encrypt', 'decrypt']
);
const iv = crypto.getRandomValues(new Uint8Array(12));
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  plaintextBuffer
);
```

GCM mode provides both confidentiality and integrity (the auth tag detects any ciphertext tampering). The 12-byte IV is generated randomly per encryption (critical — never reuse IVs with GCM).
**Lesson:** WebCrypto is built into every modern browser and requires zero dependencies. Don't reach for `crypto-js` or `sjcl` when the native API does everything you need with better performance and security.
**Tags:** `#security` `#architecture`

---

### [F2] — Day 3 09:00 — View-Once Countdown UX
**Context:** Building the 10-second face viewing countdown.
**Problem:** How do you make a 10-second countdown feel urgent without causing panic? A ticking number alone is easy to ignore. A full-screen red flash is too aggressive.
**Solution:** Three-layer visual countdown:
1. **Numeric timer** at the top: "Auto-destroy in 7s" (rose-400 text).
2. **Progress bar** at the bottom: gradient from cyan to rose, shrinking linearly.
3. **Image fade + blur** in the last 3 seconds: opacity drops from 1→0 and blur increases from 0→9px. This creates a visceral "disappearing" effect that communicates finality.

```tsx
style={{
  opacity: countdown <= 3 ? countdown / 3 : 1,
  filter: countdown <= 3 ? `blur(${(3 - countdown) * 3}px)` : 'none',
  transition: 'opacity 1s, filter 1s'
}}
```
**Lesson:** Multi-sensory feedback (number + bar + visual degradation) is more effective than any single indicator. The blur effect in particular creates an emotional response — the user *feels* the data disappearing.
**Tags:** `#ux` `#security`

---

### [F2] — Day 3 14:00 — Admin Dashboard Without Chart Libraries
**Context:** Building the risk distribution chart for the admin dashboard.
**Problem:** Chart libraries (Recharts, Chart.js, D3) add 50-200KB to the bundle. For a single bar chart in an admin panel, this is overkill.
**Solution:** Pure CSS/Tailwind bar chart:

```tsx
{riskBuckets.map((bucket) => (
  <div key={bucket.label} className="flex items-center gap-2">
    <span className="text-xs text-gray-400 w-16">{bucket.label}</span>
    <div className="flex-1 bg-surface-800 rounded-full h-4 overflow-hidden">
      <div
        className={`h-full rounded-full ${bucket.color}`}
        style={{ width: `${(bucket.count / maxCount) * 100}%` }}
      />
    </div>
    <span className="text-xs text-gray-300 w-8 text-right">{bucket.count}</span>
  </div>
))}
```

Zero dependencies. Renders in <1ms. Looks clean with Tailwind's color system.
**Lesson:** Not every chart needs a chart library. For simple bar charts and progress indicators, CSS is faster, smaller, and more customizable.
**Tags:** `#performance` `#ux` `#hackathon`

---

## 5. Cross-Team Insights

### [ALL] — Day 1 20:00 — The 72-Hour Hackathon Stack Decision
**Context:** Finalizing the tech stack on Day 1 evening.
**Problem:** Too many options. Team members had preferences for Next.js vs. Vite, MongoDB vs. PostgreSQL, Redux vs. Zustand, etc.
**Solution:** Made a "no debates after 8 PM" rule. Locked the stack based on three criteria:
1. **Familiarity:** Everyone must have used it before (no learning curves during the sprint).
2. **Free tier availability:** Must deploy for $0 (Supabase, Upstash, Vercel, Railway).
3. **TypeScript support:** End-to-end type safety from database to UI.

Final stack: React 18 + Vite + TypeScript + Tailwind + Zustand + Express + Prisma + PostgreSQL + Redis.
**Lesson:** In a hackathon, stack decisions are irreversible. A "good enough" stack chosen in 30 minutes beats a "perfect" stack debated for 6 hours.
**Tags:** `#hackathon` `#architecture`

---

### [ALL] — Day 2 21:00 — AI-Assisted Development: What Worked and What Didn't
**Context:** Mid-sprint retrospective on AI tool usage (Cursor, Claude, Copilot).
**What worked:**
- Generating Prisma schemas from natural language descriptions (90% accurate).
- Writing Zod validation schemas (95% accurate).
- Creating React component boilerplate with Tailwind classes (85% accurate).
- Generating curl examples for API documentation (95% accurate).
- Writing unit test skeletons (80% accurate).

**What didn't work:**
- Complex business logic (risk scoring formulas needed manual correction).
- Security-sensitive code (AI suggested storing refresh tokens in plaintext — caught in review).
- State machine transitions (AI created impossible state combinations).
- Database migration ordering (AI didn't understand Prisma's migration history).

**Overall:** AI accelerated boilerplate by ~3x but required 100% human review for business logic and security. Net time savings: ~12 hours across the team.
**Tags:** `#ai-assisted` `#hackathon`

---

### [ALL] — Day 3 16:00 — Demo Day Preparation Lessons
**Context:** Rehearsing the 5-minute demo 3 times before submission.
**Problem:** First rehearsal took 8 minutes and the liveness camera failed on the demo laptop (no webcam).
**Solution:**
1. Cut the demo to exactly 5 minutes by removing the admin dashboard walkthrough.
2. Pre-recorded a 15-second liveness video as backup (in case live camera fails).
3. Seeded the database with a "demo-ready" state so we don't waste time registering accounts live.
4. Assigned one person as "demo driver" and another as "narrator" to avoid awkward screen-sharing silence.
**Lesson:** Demo day is a performance, not a code review. Optimize for narrative flow, not feature completeness. A 5-minute demo that tells a compelling story beats a 10-minute demo that shows every feature.
**Tags:** `#hackathon` `#ux`

---

## 6. Post-Build Retrospective (To Be Completed After Demo)

### What We Would Do Differently
- [ ] Start with the database schema on Day 0, not Day 1. Schema changes cascade everywhere.
- [ ] Build the risk engine as a standalone microservice from the start (currently tightly coupled to Express routes).
- [ ] Add end-to-end tests for the payment flow on Day 1 (we caught 3 critical bugs during manual testing on Day 3).
- [ ] Use a proper job queue (BullMQ) for escrow timeouts instead of `setInterval`.

### What We Would Keep
- [x] "Real Shell, Fake Rails" architecture — made the demo credible without real banking APIs.
- [x] Receiver-first liveness — the most innovative and defensible feature in the product.
- [x] View-once face with client-side encryption — impressive demo moment and genuinely privacy-preserving.
- [x] Zod + Prisma double validation — caught dozens of edge cases before they reached production.
- [x] Zustand over Redux — saved at least 4 hours of boilerplate.

### Key Metrics Achieved
| Metric | Target | Actual |
|---|---|---|
| Total build time | 72 hours | ~68 hours |
| Documentation files | 19 | 19 |
| API endpoints | 18 | 18 |
| Database tables | 13 | 13 |
| Risk engine P99 latency | < 80ms | ~45ms (cached) |
| Liveness camera FPS | ≥ 15 | ~22 (mid-range Android) |
| QR scan-to-verdict | < 500ms | ~380ms |
| Zero plaintext face data on server | Required | Verified ✓ |



**End of File 15 of 19 — `LEARNING_NOTES.md`**

