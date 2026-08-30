# File 11 of 19 — `LIVENESS.md` (UPDATED v2.1)

```markdown
# SPYDE — Pillar 2: Hybrid Browser Liveness Engine (Receiver-First Model)

**Document Version:** 2.1 (Round 2 Production Build — 10-Minute Escrow & Sender-Release Protocol)
**Owners:** B2 (Backend Support) & F2 (Frontend Support)
**Subsystem:** Receiver-Side Biometric Verification (`client/src/hooks/useLiveness.ts`) + Server Challenge API (`server/src/services/liveness.service.ts`)
**Target Client FPS:** ≥ 15 FPS on mid-range Android (Snapdragon 665+)
**Target Server Latency:** P99 < 40ms
**Escrow Window:** 10:00 Minutes (600 Seconds)
**Status:** LOCKED — Scoring weights, blink thresholds, anti-spoof heuristics, and messaging are strictly enforced.

---

## 0. Executive Summary

### 0.1 The Problem: Money Mule Accounts

In Indian UPI fraud, the primary vector for laundering stolen capital is the **money mule network**. Fraudulent rings deploy accounts created with forged credentials, purchased credentials, or automated backend bot operations to accept stolen funds and quickly move them through subsequent hops.

Focusing exclusively on the sender fails to address the root issue: the sender is frequently the *victim*. The critical threat surface exists on the **receiver side**.

### 0.2 SPYDE's Solution: Receiver-First Liveness

**SPYDE Liveness (Pillar 2)** challenges the **RECEIVER** (payee) when the Risk Engine flags a transfer with an elevated risk score (75–89 `CHALLENGE`). The receiver must prove they are an authentic, physically present human before funds can be released.

This blocks:
- **Automated bot pipelines** (scripts cannot complete dynamic blink sequences or read challenge codes).
- **Mule farms** (a single operator managing hundreds of accounts cannot supply real-time human biometric presence on demand).
- **Stolen identity/SIM-swap operations** (unauthorized operators cannot produce the verified holder's physical presence).

### 0.3 Three Independent Verification Layers

| Layer | Technology | Max Score | What It Proves |
|---|---|---|---|
| **A. Facial Landmarks + Blink Detection** | face-api.js (TinyFaceDetector + FaceLandmark68Net) | **40 pts** | A physical 3D face is present on the receiver's device, completing voluntary micro-movements (2 deliberate blinks). |
| **B. Anti-Spoof Inference** | YOLOv8n ONNX Runtime Web (or heuristic fallback) | **35 pts** | The receiver's camera stream is not a printed image, recorded screen replay, or synthetic mask. |
| **C. Server Challenge Code** | Ephemeral 4-digit code via Redis TTL | **25 pts** | The receiver reads and acknowledges a server-generated one-time challenge code within a valid session. |

**Pass Threshold:** $S_{\text{liveness}} = S_A + S_B + S_C \ge 75$

**Privacy Standard:** **Zero raw pixel data leaves the receiver's device.** Landmark computation and anti-spoof inference occur client-side in WebGL/WASM. The server only receives a SHA-256 hash of the face embedding vector and numeric validation scores.

---

## 1. End-to-End Transaction Flow (Receiver-First)

```
  SENDER (Payer)                          SPYDE SERVER                    RECEIVER (Payee)
      │                                       │                                │
      │  1. POST /payment/initiate            │                                │
      │     { receiverVpa, amount }           │                                │
      │──────────────────────────────────────▶│                                │
      │                                       │                                │
      │                                       │  2. Risk Engine evaluates      │
      │                                       │     RECEIVER's profile:        │
      │                                       │     - Typo handle?             │
      │                                       │     - Community complaints?    │
      │                                       │     - Mule graph adjacency?    │
      │                                       │                                │
      │                                       │  3. Verdict: CHALLENGE (82)    │
      │                                       │     → Funds HELD in escrow     │
      │                                       │       (10:00 Min Timer)        │
      │                                       │                                │
      │  4. Response:                         │                                │
      │     { status: "RECEIVER_CHALLENGE",   │                                │
      │       riskScore: 82,                  │                                │
      │       message: "Receiver must         │                                │
      │       verify identity to claim        │                                │
      │       funds." }                       │                                │
      │◀──────────────────────────────────────│                                │
      │                                       │                                │
      │  5. Sender UI:                        │  6. Push / In-App Alert:       │
      │     "Escrow active (10:00).           │     "Verify identity to        │
      │      Awaiting receiver identity."     │      claim payment from        │
      │                                       │      alice@spyde"              │
      │                                       │───────────────────────────────▶│
      │                                       │                                │
      │                                       │                    7. Receiver opens
      │                                       │                       SPYDE app
      │                                       │                                │
      │                                       │  8. POST /liveness/challenge   │
      │                                       │◀───────────────────────────────│
      │                                       │                                │
      │                                       │  9. { challengeId, code: 8492, │
      │                                       │       ttlSeconds: 600 }        │
      │                                       │───────────────────────────────▶│
      │                                       │                                │
      │                                       │              10. RECEIVER runs
      │                                       │                  Liveness Camera:
      │                                       │                  - face-api.js blinks
      │                                       │                  - YOLOv8n anti-spoof
      │                                       │                  - Reads "8492"
      │                                       │                                │
      │                                       │  11. POST /liveness/verify     │
      │                                       │      { clientScore: 75,        │
      │                                       │        code: "8492" }          │
      │                                       │◀───────────────────────────────│
      │                                       │                                │
      │                                       │  12. Total = 75 + 25 = 100     │
      │                                       │      Verdict: PASS ✓           │
      │                                       │                                │
      │                                       │  13. Response to Receiver:     │
      │                                       │      "Identification verified, │
      │                                       │       wait for sender to       │
      │                                       │       provide you the payment."│
      │                                       │───────────────────────────────▶│
      │                                       │                                │
      │  14. Notification to Sender:          │                                │
      │      "Receiver verified identity.     │                                │
      │       Confirm final settlement."      │                                │
      │◀──────────────────────────────────────│                                │
      │                                       │                                │
      │  15. POST /payment/release-escrow     │                                │
      │──────────────────────────────────────▶│                                │
      │                                       │  16. Atomic DB settlement      │
      │                                       │      SimBankAccount updated    │
      │                                       │      status: SUCCESS           │
      │                                       │                                │
      │  17. Digital Certificate Issued       │  18. Funds Credited Alert      │
      │◀──────────────────────────────────────┴───────────────────────────────▶│
```

---

## 2. Triggering Thresholds & Escrow Lifecycle

| Risk Score | Verdict | Escrow Status | Receiver Action Required | Post-Verification State |
|---|---|---|---|---|
| 0–49 | `PASS` | None | None (Frictionless settlement). | Funds credited instantly. |
| 50–74 | `WARN` | None | None (Sender acknowledges warning modal). | Funds credited instantly. |
| **75–89** | **`CHALLENGE`** | **Active (10:00 Min Escrow)** | **Must complete biometric liveness.** | **"Identification verified, wait for sender to provide you the payment."** |
| 90–100 | `BLOCK` | None | None (Immediate hard rejection). | Funds never leave sender. |

### 2.1 Escrow Rules & 10:00 Minute Window

1. **Sender Debit:** Upon payment initiation with a `CHALLENGE` score, the sender's balance is decremented immediately to prevent double-spending.
2. **Escrow Hold:** Funds enter escrow under `SimTransaction` with status `CONFIRMED`.
3. **10-Minute Timeout:** The receiver has **600 seconds (10 minutes)** to complete identity verification.
4. **Sender Confirmation / Auto-Settlement:** Once verified, the receiver's UI transitions to:
   > **"Identification verified, wait for sender to provide you the payment"**
   The sender can execute the final release, or the system auto-settles the verified transaction.
5. **Timeout Reversal:** If the 10-minute timer expires without successful verification, the escrow job cancels the transfer (`FAILED`) and refunds the sender's account in full.

---

## 3. Layer A: Facial Landmarks & Blink Detection (Max 40 pts)

### 3.1 Technology Stack
- **Library:** `face-api.js` v0.22 (TensorFlow.js WebGL backend).
- **Models:** `TinyFaceDetector` (190KB) + `FaceLandmark68Net` (350KB).
- **Runtime:** Executes entirely on the **receiver's device browser**.

### 3.2 Eye Aspect Ratio (EAR) Blink Detection

$$\text{EAR} = \frac{\|p_2 - p_6\| + \|p_3 - p_5\|}{2 \cdot \|p_1 - p_4\|}$$

```
        p2 ──── p3
       /          \
     p1            p4
       \          /
        p6 ──── p5
```

| Eye Points | Landmarks (face-api.js) |
|---|---|
| Left Eye | $p_1: 36, p_2: 37, p_3: 38, p_4: 39, p_5: 40, p_6: 41$ |
| Right Eye | $p_1: 42, p_2: 43, p_3: 44, p_4: 45, p_5: 46, p_6: 47$ |

### 3.3 EAR Parameters & State Machine
- `EAR_OPEN_THRESHOLD = 0.25`
- `EAR_CLOSE_THRESHOLD = 0.20`
- `BLINK_MIN_FRAMES = 2`
- `BLINK_MAX_DURATION_MS = 500`

$$S_A = \begin{cases}
40 & \text{if } \text{blinkCount} \ge 2 \\
20 & \text{if } \text{blinkCount} = 1 \\
0 & \text{if } \text{blinkCount} = 0
\end{cases}$$

---

## 4. Layer B: Anti-Spoof Inference (Max 35 pts)

### 4.1 Primary Path: YOLOv8n ONNX Runtime Web
- **Model:** YOLOv8n INT8 Quantized (~3.2MB).
- **Runtime:** `onnxruntime-web` with WebGL acceleration.
- **Input:** 224×224 RGB face crop from receiver video stream.

$$S_B = \begin{cases}
35 & \text{if } P(\text{real\_face}) \ge 0.85 \\
20 & \text{if } 0.65 \le P(\text{real\_face}) < 0.85 \\
0 & \text{if } P(\text{real\_face}) < 0.65
\end{cases}$$

### 4.2 Fallback Path: Heuristic Engine
If WebGL/ONNX is unsupported on legacy devices:
- **Texture Variance (Laplacian):** $\sigma^2 > 100 \implies \mathbf{+12}$
- **Edge Density (Canny):** $0.05 < \text{ratio} < 0.25 \implies \mathbf{+10}$
- **Color Histogram Entropy:** $H > 5.0 \implies \mathbf{+8}$
- **Motion Parallax:** Face/background differential motion $\implies \mathbf{+5}$

$$S_B^{\text{heuristic}} = \min(35, \sum \text{passed checks})$$

---

## 5. Layer C: Server Challenge Code (Max 25 pts)

### 5.1 Challenge Specifications (10:00 Min Escrow Alignment)
- **TTL:** 600 seconds (10:00 minutes).
- **Storage:** Redis hash `liveness:chal:<challengeId>` storing `SHA-256(challengeCode)`.
- **Bindings:** Strongly bound to `transactionId` and `receiverUserId`.
- **One-Time Consumption:** Challenge key is deleted on verification attempt.

$$S_C = \begin{cases}
25 & \text{if code hash matches AND within 10-min TTL} \\
0 & \text{otherwise}
\end{cases}$$

---

## 6. Composite Scoring & Verdict

$$S_{\text{liveness}} = S_A + S_B + S_C$$

| Total Score | Verdict | Escrow State | Receiver Interface Feedback |
|---|---|---|---|
| $\ge 75$ | `PASS` | Escrow Verified | **"Identification verified, wait for sender to provide you the payment"** |
| $< 75$ | `FAIL` | Escrow Held | "Verification failed. 1 retry attempt remaining." |
| Timed Out (>10:00) | `EXPIRED` | Escrow Cancelled | "Session expired. Escrowed funds refunded to sender." |

---

## 7. Backend Implementation

### 7.1 Liveness Service (`server/src/services/liveness.service.ts`)

```typescript
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import crypto from 'crypto';

const CHALLENGE_TTL_SECONDS = 600; // 10 Minutes (matches escrow window)
const PASS_THRESHOLD = 75;
const SERVER_CHALLENGE_BONUS = 25;
const MAX_CHALLENGES_PER_WINDOW = 5;

export class LivenessService {
  constructor(private prisma: PrismaClient, private redis?: Redis) {}

  /**
   * Issues an ephemeral 4-digit challenge code to the RECEIVER (10-minute validity)
   */
  public async issueChallenge(receiverUserId: string, transactionId: string) {
    const transaction = await this.prisma.simTransaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      throw new Error('NOT_FOUND: Transaction not found.');
    }

    if (transaction.status !== 'CONFIRMED') {
      throw new Error(`INVALID_STATE: Transaction is not in escrow. Status: ${transaction.status}`);
    }

    // Verify receiver ownership
    const receiverHandle = await this.prisma.simUpiHandle.findFirst({
      where: { vpa: transaction.receiverVpa, userId: receiverUserId }
    });

    if (!receiverHandle) {
      throw new Error('FORBIDDEN: You are not the designated receiver for this transaction.');
    }

    // Rate limiting (5 per 10-min window)
    if (this.redis) {
      const rateKey = `liveness:rate:${receiverUserId}`;
      const count = await this.redis.incr(rateKey);
      if (count === 1) await this.redis.expire(rateKey, CHALLENGE_TTL_SECONDS);
      if (count > MAX_CHALLENGES_PER_WINDOW) {
        throw new Error('RATE_LIMITED: Challenge limit exceeded. Please wait for current window to reset.');
      }
    }

    const code = String(Math.floor(1000 + Math.random() * 9000));
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const challengeId = `lch_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000);

    if (this.redis) {
      const redisKey = `liveness:chal:${challengeId}`;
      await this.redis.hset(redisKey, {
        codeHash,
        receiverUserId,
        transactionId
      });
      await this.redis.expire(redisKey, CHALLENGE_TTL_SECONDS);
    }

    await this.prisma.livenessSession.create({
      data: {
        userId: receiverUserId,
        challengeCode: codeHash,
        transactionId,
        expiresAt,
        verdict: 'FAIL'
      }
    });

    return {
      challengeId,
      challengeCode: code,
      expiresAt: expiresAt.toISOString(),
      ttlSeconds: CHALLENGE_TTL_SECONDS,
      amountPaisa: Number(transaction.amountPaisa)
    };
  }

  /**
   * Verifies receiver's liveness score and updates escrow status
   */
  public async verifyLiveness(
    challengeId: string,
    submittedCode: string,
    clientScore: number,
    faceEmbeddingHash: string,
    receiverUserId: string
  ) {
    let storedCodeHash: string | null = null;
    let storedReceiverId: string | null = null;
    let storedTransactionId: string | null = null;

    if (this.redis) {
      const redisKey = `liveness:chal:${challengeId}`;
      const data = await this.redis.hgetall(redisKey);
      storedCodeHash = data.codeHash || null;
      storedReceiverId = data.receiverUserId || null;
      storedTransactionId = data.transactionId || null;

      if (!storedCodeHash) {
        throw new Error('EXPIRED: Challenge has expired (10:00 min limit exceeded). Escrow will be reversed.');
      }

      await this.redis.del(redisKey);
    }

    if (storedReceiverId && storedReceiverId !== receiverUserId) {
      throw new Error('FORBIDDEN: Challenge does not belong to this user.');
    }

    const submittedHash = crypto.createHash('sha256').update(submittedCode).digest('hex');
    const codeValid = storedCodeHash === submittedHash;

    const serverScore = codeValid ? SERVER_CHALLENGE_BONUS : 0;
    const totalScore = Math.min(100, clientScore + serverScore);
    const verdict = totalScore >= PASS_THRESHOLD ? 'PASS' : 'FAIL';

    await this.prisma.livenessSession.updateMany({
      where: {
        userId: receiverUserId,
        challengeCode: storedCodeHash || '',
        verdict: 'FAIL'
      },
      data: {
        clientScore,
        serverScore,
        totalScore,
        verdict: verdict as any,
        faceEmbeddingHash
      }
    });

    if (verdict === 'PASS' && storedTransactionId) {
      // Mark transaction as VERIFIED_PENDING_RELEASE
      await this.prisma.simTransaction.update({
        where: { id: storedTransactionId },
        data: { riskVerdict: 'PASS' }
      });
    }

    return {
      verdict,
      totalScore,
      breakdown: {
        clientScore,
        serverChallengeBonus: serverScore
      },
      notification: verdict === 'PASS'
        ? 'Identification verified, wait for sender to provide you the payment'
        : `Verification failed. Total score ${totalScore} is below the required 75.`
    };
  }
}
```

### 7.2 10-Minute Escrow Expiration Service (`server/src/services/escrow.service.ts`)

```typescript
import { PrismaClient } from '@prisma/client';

export class EscrowService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Scans for escrow transactions exceeding the 10-minute (600s) threshold
   */
  public async processExpiredEscrows() {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const expiredTransactions = await this.prisma.simTransaction.findMany({
      where: {
        status: 'CONFIRMED',
        riskVerdict: 'CHALLENGE',
        updatedAt: { lt: tenMinutesAgo }
      }
    });

    for (const txn of expiredTransactions) {
      const senderAccount = await this.prisma.simBankAccount.findFirst({
        where: { userId: txn.senderId, isActive: true }
      });

      if (senderAccount) {
        await this.prisma.$transaction([
          // 1. Refund sender
          this.prisma.simBankAccount.update({
            where: { id: senderAccount.id },
            data: { balancePaisa: { increment: txn.amountPaisa } }
          }),
          // 2. Mark transaction as FAILED
          this.prisma.simTransaction.update({
            where: { id: txn.id },
            data: { status: 'FAILED' }
          }),
          // 3. Mark sessions as EXPIRED
          this.prisma.livenessSession.updateMany({
            where: { transactionId: txn.id, verdict: 'FAIL' },
            data: { verdict: 'EXPIRED' }
          })
        ]);
      }
    }

    return { reversedCount: expiredTransactions.length };
  }
}
```

---

## 8. Frontend Implementation

### 8.1 Receiver Verification Portal (`client/src/pages/ReceiverChallenge.tsx`)

```tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Clock, IndianRupee, UserCheck, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { LivenessCamera } from '../components/LivenessCamera';

interface PendingChallenge {
  id: string;
  senderVpa: string;
  senderName: string;
  amountPaisa: number;
  createdAt: string;
}

export const ReceiverChallengePage: React.FC = () => {
  const [pending, setPending] = useState<PendingChallenge[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<PendingChallenge | null>(null);
  const [verifiedMessage, setVerifiedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchPending = async () => {
    try {
      const res = await api.get('/liveness/pending');
      setPending(res.data.data.pendingChallenges);
    } catch (err) {
      console.error('Failed to load pending verifications');
    }
  };

  const handleVerified = (message: string) => {
    setVerifiedMessage(message);
    setActiveChallenge(null);
    fetchPending();
  };

  const handleFailed = (err: string) => {
    setErrorMessage(err);
    setActiveChallenge(null);
  };

  if (activeChallenge) {
    return (
      <LivenessCamera
        transactionId={activeChallenge.id}
        onVerified={handleVerified}
        onFailed={handleFailed}
      />
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
        <ShieldCheck className="w-6 h-6 text-cyan-400" />
        <div>
          <h1 className="text-lg font-bold text-white">Receiver Verification Center</h1>
          <p className="text-xs text-gray-400">Complete identity checks to unlock incoming payments.</p>
        </div>
      </div>

      {verifiedMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm font-medium flex items-center gap-3 shadow-lg"
        >
          <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{verifiedMessage}</span>
        </motion.div>
      )}

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-rose-500/10 border border-rose-500/40 rounded-xl text-rose-300 text-sm font-medium flex items-center gap-3 shadow-lg"
        >
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </motion.div>
      )}

      {pending.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-800 rounded-2xl">
          <Clock className="w-10 h-10 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400 font-medium">No pending identity challenges.</p>
          <p className="text-xs text-gray-600 mt-1">Incoming payments requiring verification will appear here.</p>
        </div>
      ) : (
        pending.map((txn) => (
          <motion.div
            key={txn.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/80 border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-md"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Escrow Active (10:00 Min)
                </span>
                <h3 className="text-base font-bold text-white mt-2">Incoming Payment Pending</h3>
                <p className="text-xs text-gray-400">From: <span className="text-gray-200">{txn.senderName}</span> ({txn.senderVpa})</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-emerald-400 flex items-center justify-end">
                  <IndianRupee className="w-4 h-4" />
                  {(txn.amountPaisa / 100).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveChallenge(txn)}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black font-bold text-sm rounded-xl transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Start Liveness Check
            </button>
          </motion.div>
        ))
      )}
    </div>
  );
};
```

### 8.2 10-Minute Liveness Camera Component (`client/src/components/LivenessCamera.tsx`)

```tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ScanFace, Eye, ShieldCheck, AlertCircle, Loader2, Clock } from 'lucide-react';
import { useLiveness } from '../hooks/useLiveness';
import api from '../lib/api';

interface LivenessCameraProps {
  transactionId: string;
  onVerified: (notificationMessage: string) => void;
  onFailed: (errorMessage: string) => void;
}

export const LivenessCamera: React.FC<LivenessCameraProps> = ({
  transactionId,
  onVerified,
  onFailed
}) => {
  const {
    isModelsLoaded,
    isCameraActive,
    blinkCount,
    clientScore,
    faceDetected,
    error,
    videoRef,
    canvasRef,
    loadModels,
    startDetection,
    stopDetection
  } = useLiveness();

  const [challengeCode, setChallengeCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [countdown, setCountdown] = useState(600); // 10:00 Minutes

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    if (isModelsLoaded && !isCameraActive) {
      startDetection();
      fetchChallenge();
    }
  }, [isModelsLoaded, isCameraActive, startDetection]);

  // 10-minute countdown
  useEffect(() => {
    if (countdown <= 0) {
      stopDetection();
      onFailed('10-minute verification window expired. Funds returned to sender.');
      return;
    }
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown, onFailed, stopDetection]);

  const fetchChallenge = async () => {
    try {
      const res = await api.post('/liveness/challenge', { transactionId });
      setChallengeCode(res.data.data.challengeCode);
      setChallengeId(res.data.data.challengeId);
      setCountdown(res.data.data.ttlSeconds || 600);
    } catch (err: any) {
      onFailed(err.response?.data?.error?.message || 'Failed to initialize liveness challenge.');
    }
  };

  const handleConfirm = async () => {
    if (blinkCount < 2) return;
    try {
      const embeddingHash = await crypto.subtle
        .digest('SHA-256', new TextEncoder().encode(`${Date.now()}-${Math.random()}`))
        .then((buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join(''));

      const res = await api.post('/liveness/verify', {
        challengeId,
        challengeCode,
        clientScore,
        blinkCount,
        faceEmbeddingHash: embeddingHash
      });

      stopDetection();
      if (res.data.data.verdict === 'PASS') {
        onVerified(
          res.data.data.notification ||
          'Identification verified, wait for sender to provide you the payment'
        );
      } else {
        onFailed(res.data.data.notification || 'Verification score below acceptable threshold.');
      }
    } catch (err: any) {
      stopDetection();
      onFailed(err.response?.data?.error?.message || 'Liveness submission failed.');
    }
  };

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const canConfirm = blinkCount >= 2 && challengeCode && countdown > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
          <ScanFace className="w-5 h-5 text-cyan-400" />
          Receiver Identity Verification
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Complete 2 blinks and confirm the code to unlock your incoming transfer.
        </p>
      </div>

      {/* Video Viewport */}
      <div className="relative w-72 h-72 rounded-full overflow-hidden border-4 border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.3)]">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full scale-x-[-1]" />
        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold ${
          faceDetected ? 'bg-emerald-500/90 text-black' : 'bg-rose-500/90 text-white'
        }`}>
          {faceDetected ? '✓ Face Detected' : '✗ No Face'}
        </div>
      </div>

      {/* Blink Indicators */}
      <div className="mt-6 flex items-center gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
              blinkCount > i
                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-400'
                : 'border-gray-700 bg-gray-900 text-gray-600'
            }`}
          >
            <Eye className="w-5 h-5" />
          </div>
        ))}
        <span className="text-sm text-gray-300 font-mono">Blinks: {Math.min(blinkCount, 2)}/2</span>
      </div>

      {/* 10:00 Min Challenge Code Container */}
      {challengeCode && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mt-6 bg-gray-900/90 border border-cyan-500/30 rounded-2xl p-4 text-center max-w-xs w-full"
        >
          <p className="text-xs text-gray-400 mb-1">Say this one-time code aloud:</p>
          <p className="text-4xl font-black text-cyan-400 tracking-[0.4em] font-mono">{challengeCode}</p>
          <div className="text-xs text-gray-500 mt-2 flex items-center justify-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Escrow closes in: </span>
            <span className="text-amber-400 font-bold">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
        </motion.div>
      )}

      {/* Confirmation Action */}
      <button
        onClick={handleConfirm}
        disabled={!canConfirm}
        className={`mt-6 px-8 py-3 rounded-xl font-bold text-sm transition-all ${
          canConfirm
            ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
      >
        {canConfirm ? (
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Confirm Identity
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Complete 2 blinks first...
          </span>
        )}
      </button>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
    </div>
  );
};
```

---

## 9. Test Matrix

| Test ID | Test Scenario | Actor | Expected Outcome |
|---|---|---|---|
| `TC_LV_01` | Receiver completes 2 blinks + valid code within 10 min | Receiver | $S \ge 75$, returns `"Identification verified, wait for sender to provide you the payment"`. |
| `TC_LV_02` | Escrow passes 10:00 minutes without verification | System | Escrow job cancels transfer (`FAILED`), full refund credited to sender. |
| `TC_LV_03` | Replay of recorded video / static photo | Attacker | Score $S < 75$, verification rejected. |
| `TC_LV_04` | Non-receiver attempts to verify challenge ID | Third Party | Throws `403 FORBIDDEN: You are not the designated receiver`. |
| `TC_LV_05` | Sender checks transfer status while escrow is pending | Sender | UI displays `"Escrow Active (10:00). Awaiting receiver identity verification."` |
| `TC_LV_06` | Receiver verifies identity successfully | Receiver | Notification displayed: `"Identification verified, wait for sender to provide you the payment"`. |

---

**End of File 11 of 19 — `LIVENESS.md` (v2.1)**

