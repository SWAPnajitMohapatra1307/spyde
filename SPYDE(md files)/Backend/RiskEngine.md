# File 9 of 19 — `RISK_ENGINE.md`

```markdown
# SPYDE — Pillar 1: Multi-Layer Risk Engine Deep Dive

**Document Version:** 1.0 (Round 2 Production Build)
**Owner:** B1 (Backend Lead)
**Subsystem:** Core Decisioning Engine (`server/src/services/risk/`)
**Target Latency:** P50 < 25ms, P99 < 80ms
**Status:** LOCKED — All scoring weights, decay algorithms, and thresholds are strictly enforced.

---

## 0. Executive Summary

The SPYDE Risk Engine is a 3-layer deterministic evaluation system that computes a numeric fraud risk score ($S \in [0, 100]$) in real time before any money moves. It solves the structural flaw of traditional UPI payments: **zero pre-transaction context**.

Unlike opaque ML models that hallucinate or require massive training corpora, SPYDE uses an explainable, auditable, 3-layer architecture:

1. **Layer 1: Algorithmic Scorer** (Max 55 pts) — Typosquatting distance, payee novelty, high-value anomalies, odd-hour timing, and velocity bursts.
2. **Layer 2: Community Scorer** (Max 50 pts) — Time-decayed, admin-weighted fraud reports across the federated user base.
3. **Layer 3: Graph Bonus Scorer** (Max 15 pts) — Money mule adjacency and multi-hop association with compromised nodes.

**Safe Circle Interlock:** If the target Virtual Payment Address (VPA) is present in the sender's whitelisted Safe Circle, the Risk Engine bypasses all 3 layers immediately ($S = 0$, `verdict = PASS`, latency < 10ms).

---

## 1. Mathematical Scoring Formulation

The composite risk score $S_{\text{total}}$ is evaluated at transaction initiation:

$$S_{\text{raw}} = S_{\text{algo}} + S_{\text{community}} + S_{\text{graph}}$$

$$S_{\text{total}} = \begin{cases} 
0 & \text{if } \text{receiverVpa} \in \text{SafeCircle}(\text{senderId}) \\
\min(100, \max(0, S_{\text{raw}})) & \text{otherwise}
\end{cases}$$

```
┌─────────────────────────────────────────────────────────────┐
│                 Incoming Payment Initiation                 │
│         (senderId, receiverVpa, amountPaisa, time)          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                Is receiver in Safe Circle?
                               ├─────────────── YES ───▶ [ PASS: Score = 0 ] (<10ms)
                               │
                               NO
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               PARALLEL EVALUATION (Promise.all)             │
│                                                             │
│  ┌────────────────────┐ ┌────────────────┐ ┌─────────────┐  │
│  │    Layer 1: Algo   │ │  Layer 2: Comm │ │Layer 3: Graph│ │
│  │     (Max 55 pts)   │ │  (Max 50 pts)  │ │ (Max 15 pts)│  │
│  └─────────┬──────────┘ └───────┬────────┘ └──────┬──────┘  │
└────────────┼────────────────────┼─────────────────┼─────────┘
             │                    │                 │
             └────────────────────┼─────────────────┘
                                  ▼
                     Sum Scores: S_raw = L1 + L2 + L3
                     Clamp: S_total = min(100, S_raw)
                                  │
                                  ▼
                   Threshold Decision Matrix
       ┌───────────────┬──────────────────┬──────────────┐
       │ 0–49: PASS    │ 50–74: WARN      │ 75–89: CHAL  │ 90–100: BLOCK
       └───────────────┴──────────────────┴──────────────┴──────────────┘
```

---

## 2. Layer 1: Algorithmic Scorer ($S_{\text{algo}} \le 55$)

Layer 1 evaluates contextual signals directly from transaction metadata and historical database logs.

### 2.1 Signal Breakdown & Weights

| Signal Identifier | Weight | Condition / Logic | Max Contribution |
|---|---|---|---|
| `TYPOSQUAT_HANDLE` | **+20** | Levenshtein distance = 1 to known bank handles OR Jaro-Winkler similarity $\ge 0.88$ on handle suffix. | 20 |
| `HIGH_VALUE_FIRST_TXN` | **+15** | First-ever transaction between sender & receiver AND `amountPaisa` $\ge 500000$ (₹5,000). | 15 |
| `NEW_PAYEE` | **+10** | Zero prior completed transactions between sender and receiver (`amountPaisa` < ₹5,000). | 10 |
| `RAPID_VELOCITY` | **+10** | Sender initiated $\ge 3$ transactions in the last 60 seconds. | 10 |
| `ODD_HOURS` | **+5** | Transaction initiated between 23:00:00 and 05:00:00 local time (IST). | 5 |
| **Layer 1 Cap** | — | $\mathbf{S_{\text{algo}} = \min(55, \sum \text{signals})}$ | **55** |

### 2.2 Typosquatting Detection Algorithm

Scammers exploit visual similarities between fake and genuine Payment Service Provider (PSP) handles.

#### Legitimate Bank Handles Dictionary:
```typescript
const OFFICIAL_HANDLES = [
  'oksbi', 'okhdfcbank', 'okaxis', 'okicici', // Google Pay
  'paytm',                                     // Paytm
  'ybl', 'ibl', 'axl',                         // PhonePe
  'barodampay', 'aubank', 'pnb'               // Other Banks
] as const;
```

#### Spoofed Pattern Detection:
1. Extract handle suffix after `@` symbol (e.g., `bob@oksdi` $\to$ `oksdi`).
2. Compute Levenshtein distance against all `OFFICIAL_HANDLES`.
3. If $\text{dist} = 1$ (e.g., `oksdi` vs `oksbi`, `cdfc` vs `hdfc`, `pytm` vs `paytm`), flag as `TYPOSQUAT_HANDLE` (+20).
4. Suffix substitution checks:
   - Digit substitutions: `0` for `o`, `1` for `l`/`i` (e.g., `0ksbi` $\to$ `oksbi`).
   - Phonetic duplicates: `paytmm`, `yblp`, `sbiin`.

```typescript
function calculateLevenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
```

---

## 3. Layer 2: Community Signal Engine & Time Decay ($S_{\text{community}} \le 50$)

Layer 2 aggregates crowd-sourced complaint signals against the receiver's VPA.

### 3.1 Category Weights ($W_{\text{cat}}$)
| Category | Base Weight ($W_{\text{cat}}$) | Description |
|---|---|---|
| `FRAUD` | **25** | Direct financial theft, extortion, phishing scams |
| `IMPERSONATION` | **20** | Spoofed merchant identity, fake government/utility official |
| `HARASSMENT` | **10** | Coercive or abusive payment demands |
| `SPAM` | **5** | Unsolicited high-frequency payment collect requests |
| `OTHER` | **5** | General suspicious behavior |

### 3.2 Status Multiplier ($M_{\text{status}}$)
| Moderation Status | Multiplier ($M_{\text{status}}$) | Description |
|---|---|---|
| `VERIFIED` | **1.5x** | Manually reviewed and validated by admin/compliance officer |
| `PENDING` | **1.0x** | Community filed, under review (default state) |
| `REJECTED` | **0.0x** | False report or dismissed by admin |

### 3.3 Time-Decay Formulation ($D(t)$)
Old complaints gradually decay to allow reformed accounts or resolved disputes to recover:

$$D(t) = \begin{cases}
1.0 & \text{if } t \le 7 \text{ days} \\
0.75 & \text{if } 7 < t \le 30 \text{ days} \\
0.50 & \text{if } 30 < t \le 90 \text{ days} \\
0.20 & \text{if } t > 90 \text{ days}
\end{cases}$$

Where $t = \text{now}() - \text{complaint.createdAt}$.

### 3.4 Layer 2 Aggregation Formula
For all complaints $C_i$ filed against `receiverVpa`:

$$S_{\text{community}} = \min\left(50, \sum_{i=1}^{N} \left( W_{\text{cat}}(C_i) \times M_{\text{status}}(C_i) \times D(t_i) \right)\right)$$

---

## 4. Layer 3: Graph Adjacency & Mule Detection ($S_{\text{graph}} \le 15$)

Layer 3 detects money mule syndicates by traversing historical payment paths.

```
[ Compromised Account / Mule ] ───(Paid)───▶ [ Target Receiver VPA ]
[ Compromised Account / Mule ] ───(Paid)───▶ [ Target Receiver VPA ]
[ Compromised Account / Mule ] ───(Paid)───▶ [ Target Receiver VPA ]
                                                   │
                                          If count >= 3:
                                     Graph Bonus = +15 pts
```

### 4.1 Graph Rules

1. **Mule Node Definition:** Any account $U_{\text{mule}}$ that has $\ge 2$ `VERIFIED` fraud complaints OR has a personal `riskScore` $\ge 75$.
2. **Adjacency Rule:** Count distinct mule nodes that sent funds to `receiverVpa` within the last 180 days:
   $$\text{MuleInflowCount} = \left| \{ U_{\text{mule}} \mid \exists \text{ txn } U_{\text{mule}} \to \text{receiverVpa} \} \right|$$
3. **Scoring:**
   - If $\text{MuleInflowCount} \ge 3 \implies S_{\text{graph}} = \mathbf{15}$
   - If $\text{MuleInflowCount} \in [1, 2] \implies S_{\text{graph}} = \mathbf{8}$
   - If $\text{MuleInflowCount} = 0 \implies S_{\text{graph}} = \mathbf{0}$

---

## 5. Safe Circle Short-Circuit Logic (Pillar 4 Interlock)

When user $A$ attempts to pay $B$, the system checks $A$'s Safe Circle:

```typescript
const isWhitelisted = await prisma.safeCircleContact.findUnique({
  where: {
    userId_contactVpa: {
      userId: senderId,
      contactVpa: receiverVpa.toLowerCase()
    }
  }
});

if (isWhitelisted) {
  return {
    verdict: 'PASS',
    riskScore: 0,
    breakdown: { algoScore: 0, communityScore: 0, graphBonus: 0 },
    signals: [{
      type: 'SAFE_CIRCLE_BYPASS',
      weight: 0,
      reason: 'Receiver is in your trusted Safe Circle.'
    }],
    requiresLiveness: false
  };
}
```

### 5.1 Safety Net Banner Rule
Even if whitelisted, if `receiverVpa` has $\ge 10$ complaints platform-wide, the client renders an advisory warning on the Safe Circle screen, but the transaction still bypasses blocking:
`"⚠️ Notice: Your contact has accumulated multiple community reports."`

---

## 6. Verdict Classification & Threshold Matrix

```
  0                      50                  75             90            100
  ┌──────────────────────┬───────────────────┬──────────────┬──────────────┐
  │         PASS         │       WARN        │  CHALLENGE   │    BLOCK     │
  │    (Frictionless)    │ (Signal Banners)  │  (Liveness)  │  (Hard Stop) │
  └──────────────────────┴───────────────────┴──────────────┴──────────────┘
```

| Score Range | Verdict | UI Action & User Journey | Terminal State |
|---|---|---|---|
| **0 – 49** | `PASS` | Frictionless payment. Direct to standard UPI PIN entry. | Standard Payment |
| **50 – 74** | `WARN` | Yellow Warning Modal displays top 3 detected risk signals. User must explicitly click "I Understand the Risks — Proceed" to continue. | Requires User Acknowledgment |
| **75 – 89** | `CHALLENGE` | Orange Modal forces **Pillar 2 Hybrid Liveness Verification**. User must complete face landmark & blink detection before PIN entry is unlocked. | Requires Biometric Proof |
| **90 – 100** | `BLOCK` | Red Hard Block Screen. **Transaction rejected immediately**. No override permitted. PIN input disabled. One-click "File Fraud Complaint" CTA displayed. | Hard Failure / 403 Forbidden |

---

## 7. Execution Pipeline & End-to-End Orchestrator

The orchestrator executes all checks concurrently using `Promise.all` to maintain the P99 < 80ms performance SLA:

```
                          assessRisk(senderId, receiverVpa, amountPaisa)
                                                 │
                                                 ├──────────────────────┐
                                                 │                      │
                                         Redis Cache Hit?       Safe Circle Check?
                                                 │                      │
                                            (Return S)             (If yes -> PASS)
                                                 │                      │
                                                 └──────────┬───────────┘
                                                            │
                                                     Cache Miss & No Safe Circle
                                                            │
                                              ┌─────────────┴─────────────┐
                                              ▼                           ▼
                                      Algo Scorer (L1)          Community Scorer (L2)
                                              │                           │
                                              └─────────────┬─────────────┘
                                                            ▼
                                                   Graph Scorer (L3)
                                                            │
                                                            ▼
                                              Composite Calculation & Clamp
                                                            │
                                                            ▼
                                                Write Cache (TTL: 180s)
                                                            │
                                                            ▼
                                                Return RiskAssessmentDTO
```

---

## 8. Reference TypeScript Implementation

### 8.1 Data Types (`server/src/types/risk.types.ts`)

```typescript
export interface RiskSignal {
  type: string;
  weight: number;
  reason: string;
}

export interface RiskBreakdown {
  algoScore: number;
  communityScore: number;
  graphBonus: number;
}

export interface RiskAssessment {
  verdict: 'PASS' | 'WARN' | 'CHALLENGE' | 'BLOCK';
  riskScore: number;
  breakdown: RiskBreakdown;
  signals: RiskSignal[];
  requiresLiveness: boolean;
  isSafeCircleBypass: boolean;
}
```

### 8.2 Algorithmic Scorer (`server/src/services/risk/algorithmic.service.ts`)

```typescript
import { PrismaClient } from '@prisma/client';
import { RiskSignal } from '../../types/risk.types';

const OFFICIAL_HANDLES = [
  'oksbi', 'okhdfcbank', 'okaxis', 'okicici',
  'paytm', 'ybl', 'ibl', 'axl', 'barodampay'
];

export class AlgorithmicRiskService {
  constructor(private prisma: PrismaClient) {}

  public async evaluate(
    senderId: string,
    receiverVpa: string,
    amountPaisa: bigint
  ): Promise<{ score: number; signals: RiskSignal[] }> {
    const signals: RiskSignal[] = [];
    let score = 0;

    // 1. Typosquatting Check
    const handleParts = receiverVpa.toLowerCase().split('@');
    if (handleParts.length === 2) {
      const suffix = handleParts[1];
      for (const official of OFFICIAL_HANDLES) {
        if (suffix !== official) {
          const dist = this.levenshtein(suffix, official);
          if (dist === 1) {
            signals.push({
              type: 'TYPOSQUAT_HANDLE',
              weight: 20,
              reason: `Handle '@${suffix}' closely mimics official PSP handle '@${official}'.`
            });
            score += 20;
            break;
          }
        }
      }
    }

    // 2. Payee Novelty Check
    const previousTxnCount = await this.prisma.simTransaction.count({
      where: {
        senderId,
        receiverVpa: receiverVpa.toLowerCase(),
        status: 'SUCCESS'
      }
    });

    if (previousTxnCount === 0) {
      if (amountPaisa >= BigInt(500000)) { // >= ₹5,000
        signals.push({
          type: 'HIGH_VALUE_FIRST_TXN',
          weight: 15,
          reason: 'High-value transaction (≥₹5,000) to a new payee.'
        });
        score += 15;
      } else {
        signals.push({
          type: 'NEW_PAYEE',
          weight: 10,
          reason: 'First-time transaction with this receiver.'
        });
        score += 10;
      }
    }

    // 3. Odd Hours Check (11 PM to 5 AM IST = 17:30 to 23:30 UTC)
    const currentHourIST = (new Date().getUTCHours() + 5.5) % 24;
    if (currentHourIST >= 23 || currentHourIST < 5) {
      signals.push({
        type: 'ODD_HOURS',
        weight: 5,
        reason: 'Payment initiated during high-risk odd hours (11 PM - 5 AM IST).'
      });
      score += 5;
    }

    // 4. Velocity Bursts Check (>=3 txns in last 60 seconds)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentTxnCount = await this.prisma.simTransaction.count({
      where: {
        senderId,
        createdAt: { gte: oneMinuteAgo }
      }
    });

    if (recentTxnCount >= 3) {
      signals.push({
        type: 'RAPID_VELOCITY',
        weight: 10,
        reason: 'High transaction velocity detected (>3 attempts in 60s).'
      });
      score += 10;
    }

    return {
      score: Math.min(55, score),
      signals
    };
  }

  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}
```

### 8.3 Community Scorer (`server/src/services/risk/community.service.ts`)

```typescript
import { PrismaClient, ComplaintCategory, ComplaintStatus } from '@prisma/client';
import { RiskSignal } from '../../types/risk.types';

const CATEGORY_WEIGHTS: Record<ComplaintCategory, number> = {
  FRAUD: 25,
  IMPERSONATION: 20,
  HARASSMENT: 10,
  SPAM: 5,
  OTHER: 5
};

const STATUS_MULTIPLIERS: Record<ComplaintStatus, number> = {
  VERIFIED: 1.5,
  PENDING: 1.0,
  REJECTED: 0.0
};

export class CommunityRiskService {
  constructor(private prisma: PrismaClient) {}

  public async evaluate(receiverVpa: string): Promise<{ score: number; signals: RiskSignal[] }> {
    const signals: RiskSignal[] = [];
    const complaints = await this.prisma.complaint.findMany({
      where: {
        targetVpa: receiverVpa.toLowerCase(),
        status: { in: ['PENDING', 'VERIFIED'] }
      }
    });

    if (complaints.length === 0) {
      return { score: 0, signals: [] };
    }

    const now = Date.now();
    let accumulatedScore = 0;

    for (const c of complaints) {
      const baseWeight = CATEGORY_WEIGHTS[c.category] || 5;
      const statusMult = STATUS_MULTIPLIERS[c.status];
      const ageDays = (now - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);

      let timeDecay = 0.20;
      if (ageDays <= 7) timeDecay = 1.0;
      else if (ageDays <= 30) timeDecay = 0.75;
      else if (ageDays <= 90) timeDecay = 0.50;

      const effectiveWeight = Math.round(baseWeight * statusMult * timeDecay);
      accumulatedScore += effectiveWeight;

      signals.push({
        type: `COMMUNITY_${c.category}_REPORT`,
        weight: effectiveWeight,
        reason: `${c.status} ${c.category} complaint filed ${Math.floor(ageDays)}d ago.`
      });
    }

    return {
      score: Math.min(50, accumulatedScore),
      signals
    };
  }
}
```

### 8.4 Graph Adjacency Scorer (`server/src/services/risk/graph.service.ts`)

```typescript
import { PrismaClient } from '@prisma/client';
import { RiskSignal } from '../../types/risk.types';

export class GraphRiskService {
  constructor(private prisma: PrismaClient) {}

  public async evaluate(receiverVpa: string): Promise<{ score: number; signals: RiskSignal[] }> {
    const signals: RiskSignal[] = [];
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    // Find all senders who transferred funds to this VPA in last 180 days
    const pastInflowTxns = await this.prisma.simTransaction.findMany({
      where: {
        receiverVpa: receiverVpa.toLowerCase(),
        status: 'SUCCESS',
        createdAt: { gte: sixMonthsAgo }
      },
      select: { senderId: true },
      distinct: ['senderId']
    });

    if (pastInflowTxns.length === 0) {
      return { score: 0, signals: [] };
    }

    const senderIds = pastInflowTxns.map((t) => t.senderId);

    // Count how many of these senders have verified complaints against them
    const muleSendersCount = await this.prisma.user.count({
      where: {
        id: { in: senderIds },
        OR: [
          { riskScore: { gte: 75 } },
          { targetComplaints: { some: { status: 'VERIFIED' } } }
        ]
      }
    });

    let score = 0;
    if (muleSendersCount >= 3) {
      score = 15;
      signals.push({
        type: 'GRAPH_MULE_ASSOCIATION',
        weight: 15,
        reason: `Associated with ${muleSendersCount} known high-risk mule accounts.`
      });
    } else if (muleSendersCount >= 1) {
      score = 8;
      signals.push({
        type: 'GRAPH_SUSPECT_ADJACENCY',
        weight: 8,
        reason: `Direct transaction history with ${muleSendersCount} flagged account.`
      });
    }

    return { score, signals };
  }
}
```

### 8.5 Master Risk Engine Orchestrator (`server/src/services/risk/engine.service.ts`)

```typescript
import { PrismaClient } from '@prisma/client';
import { AlgorithmicRiskService } from './algorithmic.service';
import { CommunityRiskService } from './community.service';
import { GraphRiskService } from './graph.service';
import { RiskAssessment } from '../../types/risk.types';
import { Redis } from 'ioredis';

export class RiskEngineService {
  private algoService: AlgorithmicRiskService;
  private communityService: CommunityRiskService;
  private graphService: GraphRiskService;

  constructor(private prisma: PrismaClient, private redis?: Redis) {
    this.algoService = new AlgorithmicRiskService(prisma);
    this.communityService = new CommunityRiskService(prisma);
    this.graphService = new GraphRiskService(prisma);
  }

  public async assessRisk(
    senderId: string,
    receiverVpa: string,
    amountPaisa: bigint
  ): Promise<RiskAssessment> {
    const normalizedVpa = receiverVpa.toLowerCase().trim();

    // 1. Pillar 4: Safe Circle Short-Circuit Check (<10ms)
    const isSafeCircle = await this.prisma.safeCircleContact.findUnique({
      where: {
        userId_contactVpa: {
          userId: senderId,
          contactVpa: normalizedVpa
        }
      }
    });

    if (isSafeCircle) {
      return {
        verdict: 'PASS',
        riskScore: 0,
        breakdown: { algoScore: 0, communityScore: 0, graphBonus: 0 },
        signals: [{
          type: 'SAFE_CIRCLE_BYPASS',
          weight: 0,
          reason: 'Receiver is verified in your Safe Circle.'
        }],
        requiresLiveness: false,
        isSafeCircleBypass: true
      };
    }

    // 2. Parallel 3-Layer Evaluation
    const [algoRes, commRes, graphRes] = await Promise.all([
      this.algoService.evaluate(senderId, normalizedVpa, amountPaisa),
      this.communityService.evaluate(normalizedVpa),
      this.graphService.evaluate(normalizedVpa)
    ]);

    const rawScore = algoRes.score + commRes.score + graphRes.score;
    const finalScore = Math.min(100, Math.max(0, rawScore));
    const allSignals = [...algoRes.signals, ...commRes.signals, ...graphRes.signals];

    // 3. Verdict Determination
    let verdict: RiskAssessment['verdict'] = 'PASS';
    let requiresLiveness = false;

    if (finalScore >= 90) {
      verdict = 'BLOCK';
    } else if (finalScore >= 75) {
      verdict = 'CHALLENGE';
      requiresLiveness = true;
    } else if (finalScore >= 50) {
      verdict = 'WARN';
    }

    // 4. Record Audit Risk Events Asynchronously
    this.logRiskAudit(senderId, finalScore, allSignals).catch(console.error);

    return {
      verdict,
      riskScore: finalScore,
      breakdown: {
        algoScore: algoRes.score,
        communityScore: commRes.score,
        graphBonus: graphRes.score
      },
      signals: allSignals,
      requiresLiveness,
      isSafeCircleBypass: false
    };
  }

  private async logRiskAudit(userId: string, totalScore: number, signals: RiskSignal[]) {
    if (signals.length === 0) return;
    const records = signals.map((s) => ({
      userId,
      eventType: s.type,
      delta: s.weight,
      reason: s.reason,
      source: s.type.startsWith('COMMUNITY') ? 'COMMUNITY' : s.type.startsWith('GRAPH') ? 'GRAPH' : 'ALGO'
    }));

    await this.prisma.riskEvent.createMany({ data: records });
  }
}
```

---

## 9. Caching & Performance Optimization

```
                  ┌───────────────────────────────┐
                  │   Community Score Cache Map   │
                  │   Key: risk:comm:<vpa>        │
                  │   TTL: 180 seconds            │
                  └───────────────┬───────────────┘
                                  │
               Complaint Filed / Verified / Rejected
                                  │
                                  ▼
                     Cache Invalidation Pipeline
                       redis.del(`risk:comm:${vpa}`)
```

- **Redis Cache:** Layer 2 (Community) and Layer 3 (Graph) results are cached in Redis with a 180s TTL.
- **Cache Eviction:** When `POST /complaints` or `PATCH /admin/complaints/:id` executes, `redis.del("risk:comm:" + vpa)` is called immediately.
- **In-Memory Fallback:** If Redis fails, the engine queries PostgreSQL directly with 0 downtime.

---

## 10. Pre-Seeded Scenarios & Test Matrix

| Scenario Name | Target VPA | Inputs | Expected Layer Breakdown | Final Score | Expected Verdict |
|---|---|---|---|---|---|
| **Clean Transfer** | `bob@spyde` | ₹100, Daytime, Existing Payee | Algo: 0, Comm: 0, Graph: 0 | **0** | `PASS` |
| **Typosquatting Trap** | `bob@oksdi` | ₹500, New Payee | Algo: 30 (20+10), Comm: 0, Graph: 0 | **30** | `PASS` |
| **Typosquat + 1 Report** | `bob@oksdi` | ₹500, New Payee + 1 Fraud Report | Algo: 30, Comm: 25, Graph: 0 | **55** | `WARN` |
| **High Value + Reports** | `charlie@oksdi` | ₹10,000, New Payee + 2 Fraud Reports | Algo: 35 (20+15), Comm: 50, Graph: 0 | **85** | `CHALLENGE` |
| **Mule Syndicate Block** | `scammer99@cdfc` | ₹6,000, Spoof + 3 Verified Reports + Mule Link | Algo: 35, Comm: 50, Graph: 15 | **100** | `BLOCK` |
| **Safe Circle Immunity** | `compromised@cdfc`| ₹5,000, In Safe Circle | *Bypassed* | **0** | `PASS` |



**End of File 9 of 19 — `RISK_ENGINE.md`**



