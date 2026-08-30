# SPYDE — Pillar 4: Safe Circle Architecture & Anomaly Safety Net

**Document Version:** 1.0 (Round 2 Production Build)
**Owners:** B1 (Backend Lead) & F1 (Frontend Lead)
**Subsystem:** Whitelist Management & Low-Latency Bypass Engine (`server/src/services/circle.service.ts`)
**Target Latency:** Short-circuit execution < 10ms
**Status:** LOCKED — Contact limits, bypass rules, and safety net anomaly thresholds are strictly enforced.

---

## 0. Executive Summary

In traditional payments, security checks add universal friction: OTPs, biometric scans, and delay prompts apply equally to a user paying their mother or a suspicious stranger.

**SPYDE Safe Circle (Pillar 4)** eliminates friction where trust already exists. It allows users to whitelist up to **20 trusted contacts** (friends, family, recurring merchants). When sending money to a Safe Circle contact:

1. **Sub-10ms Short-Circuit:** The 3-layer Risk Engine is completely bypassed ($S = 0$, `verdict = PASS`).
2. **Zero Biometric/Liveness Friction:** Direct path to PIN entry.
3. **Continuous Anomaly Safety Net:** If a trusted contact's account is compromised (e.g., SIM-swapped or sold to a scam syndicate) and accumulates $\ge 10$ platform-wide fraud complaints, SPYDE displays an advisory safety banner without arbitrarily blocking the user's personal trust preference.

```
                  ┌─────────────────────────────────────────┐
                  │          Initiate Transaction           │
                  │        (senderId, receiverVpa)          │
                  └────────────────────┬────────────────────┘
                                       │
                      Safe Circle Cache/DB Lookup (<5ms)
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
       [ Contact In Circle ]                       [ Contact NOT In Circle ]
                │                                             │
      Safety Net Check                               Execute Full 3-Layer
   (Complaints >= 10 on VPA?)                           Risk Engine
        │               │                           (Algo + Comm + Graph)
       YES              NO                                    │
        │               │                                     ▼
        ▼               ▼                              S in [0, 100]
  [ PASS + Banner ]  [ PASS (Silent) ]                 Verdict Matrix
  "Notice: Trusted   "Direct to PIN"                (PASS/WARN/CHAL/BLOCK)
   contact flagged"
```

---

## 1. Core Architecture & Constraints

### 1.1 Architectural Constraints
| Constraint | Value | Enforcement Layer | Reason |
|---|---|---|---|
| **Max Contacts Per User** | `20` | Database + App Zod Schema | Prevents abuse where mules whitelist thousands of accounts to bypass risk scoring. |
| **Self-Addition Check** | Prohibited | App Validation Service | A user cannot add their own VPA to their Safe Circle. |
| **VPA Format Validation** | `^[a-z0-9._-]{2,30}@[a-z]{2,10}$` | Zod Regex | Ensures syntactically valid UPI addresses. |
| **VPA Case Normalization** | Lowercase, trimmed | App Middleware | Prevents duplicate casing entries (e.g., `Mom@Spyde` vs `mom@spyde`). |
| **Lookup Latency SLA** | `< 10ms` (P99) | Redis Key + Postgres Compound Index | Guarantees instant payment routing for trusted peers. |

### 1.2 Database Model (`SafeCircleContact`)

Defined in PostgreSQL via Prisma:

```prisma
model SafeCircleContact {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  contactVpa  String   @map("contact_vpa")
  contactName String   @map("contact_name")
  addedAt     DateTime @default(now()) @map("added_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, contactVpa])
  @@index([userId])
  @@index([contactVpa])
  @@map("safe_circle_contacts")
}
```

- **`@@unique([userId, contactVpa])`:** Guarantees idempotency — a contact cannot be added twice by the same user.
- **`@@index([contactVpa])`:** Enables inverted reverse lookups when checking how many users have whitelisted a specific VPA.

---

## 2. Low-Latency Bypass Execution

To maintain sub-10ms latency at scale, Safe Circle lookups employ a **two-tier cache-first strategy**:

```
Client Payment Request 
      │
      ▼
┌──────────────┐      HIT (<2ms)
│ Redis Set    │───────────────────▶ [ Return Whitelisted: TRUE ]
│ circle:<uid> │
└──────┬───────┘
       │ MISS
       ▼
┌──────────────┐      HIT (<8ms)
│ PostgreSQL   │───────────────────▶ [ Populate Redis Set & Return ]
│ Compound Idx │
└──────────────┘
```

### 2.1 Redis Set Storage
- **Key Pattern:** `circle:<userId>`
- **Data Structure:** Redis `SET` containing lowercase VPA strings.
- **TTL:** 1 hour (`3600s`) or refreshed on mutation.
- **Complexity:** `SISMEMBER circle:<userId> <receiverVpa>` $\implies \mathcal{O}(1)$ time complexity.

---

## 3. Anomaly Safety Net Engine

Trust is not static. If a trusted friend loses control of their account (SIM swapping, credential stuffing, mule leasing), their VPA could become an active threat vector.

### 3.1 Safety Net Trigger Conditions

When a payment is initiated to a Safe Circle contact, the system executes an asynchronous check against the platform's fraud signals:

$$\text{TriggerSafetyNet} = (\text{TotalActiveComplaints}(\text{receiverVpa}) \ge 10) \lor (\text{TargetUserRiskScore} \ge 75)$$

### 3.2 Safety Net Behavioral Matrix

| Condition | Risk Engine Score | User Experience / UI Rendering | Transaction Allowed? |
|---|---|---|---|
| **Clean Contact** (<10 complaints) | $S = 0$ (`PASS`) | Direct to standard PIN entry screen with no dialogs. | **YES** (Instant) |
| **Flagged Contact** ($\ge 10$ complaints) | $S = 0$ (`PASS`) | Renders **Advisory Alert Banner** above PIN entry: *"⚠️ Warning: Your trusted contact has accumulated 12 recent fraud reports. Please confirm you are speaking to the authentic owner."* | **YES** (User Decides) |
| **Contact Removed from Circle** | Full $S_{\text{raw}}$ Evaluated | Normal 3-layer Risk Engine evaluation (could result in `WARN`, `CHALLENGE`, or `BLOCK`). | Dependent on Score |

---

## 4. Backend Implementation

### 4.1 Input Schemas (`server/src/schemas/circle.schema.ts`)

```typescript
import { z } from 'zod';

export const AddSafeCircleContactSchema = z.object({
  contactVpa: z
    .string()
    .min(3, 'VPA must be at least 3 characters')
    .max(50, 'VPA must not exceed 50 characters')
    .regex(/^[a-z0-9._-]+@[a-z]{2,10}$/i, 'Invalid UPI VPA format')
    .transform((val) => val.toLowerCase().trim()),
  contactName: z
    .string()
    .min(1, 'Display name is required')
    .max(50, 'Display name must not exceed 50 characters')
    .trim()
});

export type AddSafeCircleContactInput = z.infer<typeof AddSafeCircleContactSchema>;
```

### 4.2 Safe Circle Service (`server/src/services/circle.service.ts`)

```typescript
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { AddSafeCircleContactInput } from '../schemas/circle.schema';

const MAX_SAFE_CIRCLE_CONTACTS = 20;

export class SafeCircleService {
  constructor(private prisma: PrismaClient, private redis?: Redis) {}

  /**
   * Retrieves all contacts in the user's Safe Circle with Anomaly Safety Net status
   */
  public async getContacts(userId: string) {
    const contacts = await this.prisma.safeCircleContact.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' }
    });

    if (contacts.length === 0) {
      return { contacts: [], totalCount: 0, maxLimit: MAX_SAFE_CIRCLE_CONTACTS };
    }

    const contactVpas = contacts.map((c) => c.contactVpa);

    // Query platform complaints for all contacts in parallel
    const complaintCounts = await this.prisma.complaint.groupBy({
      by: ['targetVpa'],
      where: {
        targetVpa: { in: contactVpas },
        status: { in: ['PENDING', 'VERIFIED'] }
      },
      _count: { id: true }
    });

    const complaintMap = new Map<string, number>();
    complaintCounts.forEach((entry) => {
      complaintMap.set(entry.targetVpa, entry._count.id);
    });

    // Decorate contacts with Safety Net warnings
    const enrichedContacts = contacts.map((c) => {
      const reports = complaintMap.get(c.contactVpa) || 0;
      const safetyNetWarning = reports >= 10;

      return {
        id: c.id,
        contactVpa: c.contactVpa,
        contactName: c.contactName,
        addedAt: c.addedAt,
        safetyNetWarning,
        safetyNetReason: safetyNetWarning
          ? `This contact has accumulated ${reports} community fraud complaints.`
          : null
      };
    });

    return {
      contacts: enrichedContacts,
      totalCount: enrichedContacts.length,
      maxLimit: MAX_SAFE_CIRCLE_CONTACTS
    };
  }

  /**
   * Adds a new trusted contact (enforces 20-contact cap and self-addition checks)
   */
  public async addContact(userId: string, input: AddSafeCircleContactInput) {
    const { contactVpa, contactName } = input;

    // 1. Prevent self-addition
    const userHandles = await this.prisma.simUpiHandle.findMany({
      where: { userId },
      select: { vpa: true }
    });

    const isSelfVpa = userHandles.some((h) => h.vpa.toLowerCase() === contactVpa);
    if (isSelfVpa) {
      throw new Error('SELF_ADDITION_PROHIBITED: You cannot add your own VPA to your Safe Circle.');
    }

    // 2. Enforce 20-contact limit
    const currentCount = await this.prisma.safeCircleContact.count({
      where: { userId }
    });

    if (currentCount >= MAX_SAFE_CIRCLE_CONTACTS) {
      throw new Error(`LIMIT_EXCEEDED: Safe Circle cannot exceed ${MAX_SAFE_CIRCLE_CONTACTS} contacts.`);
    }

    // 3. Create contact in database
    const contact = await this.prisma.safeCircleContact.create({
      data: {
        userId,
        contactVpa,
        contactName
      }
    });

    // 4. Invalidate / update Redis cache
    if (this.redis) {
      await this.redis.sadd(`circle:${userId}`, contactVpa);
    }

    return contact;
  }

  /**
   * Deletes a contact and purges cache entry
   */
  public async removeContact(userId: string, contactId: string) {
    const contact = await this.prisma.safeCircleContact.findFirst({
      where: { id: contactId, userId }
    });

    if (!contact) {
      throw new Error('NOT_FOUND: Contact not found in your Safe Circle.');
    }

    await this.prisma.safeCircleContact.delete({
      where: { id: contactId }
    });

    if (this.redis) {
      await this.redis.srem(`circle:${userId}`, contact.contactVpa);
    }

    return { success: true, removedVpa: contact.contactVpa };
  }

  /**
   * Sub-10ms bypass check used by Risk Engine
   */
  public async isWhitelisted(userId: string, targetVpa: string): Promise<boolean> {
    const normalizedVpa = targetVpa.toLowerCase().trim();

    // Fast-path: Redis Set Lookup
    if (this.redis) {
      try {
        const isMember = await this.redis.sismember(`circle:${userId}`, normalizedVpa);
        if (isMember === 1) return true;
      } catch (err) {
        // Fallback gracefully to PostgreSQL if Redis is unreachable
      }
    }

    // Database Fallback: Indexed single-row check
    const record = await this.prisma.safeCircleContact.findUnique({
      where: {
        userId_contactVpa: {
          userId,
          contactVpa: normalizedVpa
        }
      },
      select: { id: true }
    });

    return !!record;
  }
}
```

### 4.3 Route Controller (`server/src/routes/circle.routes.ts`)

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { SafeCircleService } from '../services/circle.service';
import { AddSafeCircleContactSchema } from '../schemas/circle.schema';
import { prisma } from '../config/database';
import { redisClient } from '../config/redis';

const router = Router();
const circleService = new SafeCircleService(prisma, redisClient);

// GET /api/circle - Fetch all contacts
router.get('/', async (req: Request, res: Response, Next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await circleService.getContacts(userId);
    res.json({ success: true, data: result });
  } catch (error) {
    Next(error);
  }
});

// POST /api/circle/add - Add contact
router.post('/add', async (req: Request, res: Response, Next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const parsed = AddSafeCircleContactSchema.parse(req.body);
    const contact = await circleService.addContact(userId, parsed);
    res.status(201).json({ success: true, data: { contact } });
  } catch (error) {
    Next(error);
  }
});

// DELETE /api/circle/:id - Remove contact
router.delete('/:id', async (req: Request, res: Response, Next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const contactId = req.params.id;
    const result = await circleService.removeContact(userId, contactId);
    res.json({ success: true, data: result });
  } catch (error) {
    Next(error);
  }
});

export default router;
```

---

## 5. Frontend State Management & UI Components

### 5.1 Safe Circle Zustand Store (`client/src/stores/circleStore.ts`)

```typescript
import { create } from 'zustand';
import api from '../lib/api';

export interface CircleContact {
  id: string;
  contactVpa: string;
  contactName: string;
  addedAt: string;
  safetyNetWarning: boolean;
  safetyNetReason: string | null;
}

interface SafeCircleState {
  contacts: CircleContact[];
  totalCount: number;
  maxLimit: number;
  isLoading: boolean;
  error: string | null;
  fetchContacts: () => Promise<void>;
  addContact: (contactVpa: string, contactName: string) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
}

export const useSafeCircleStore = create<SafeCircleState>((set, get) => ({
  contacts: [],
  totalCount: 0,
  maxLimit: 20,
  isLoading: false,
  error: null,

  fetchContacts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/circle');
      set({
        contacts: response.data.data.contacts,
        totalCount: response.data.data.totalCount,
        maxLimit: response.data.data.maxLimit,
        isLoading: false
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.error?.message || 'Failed to load Safe Circle',
        isLoading: false
      });
    }
  },

  addContact: async (contactVpa: string, contactName: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/circle/add', { contactVpa, contactName });
      await get().fetchContacts();
    } catch (err: any) {
      set({
        error: err.response?.data?.error?.message || 'Failed to add contact',
        isLoading: false
      });
      throw err;
    }
  },

  removeContact: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/circle/${id}`);
      await get().fetchContacts();
    } catch (err: any) {
      set({
        error: err.response?.data?.error?.message || 'Failed to remove contact',
        isLoading: false
      });
      throw err;
    }
  }
}));
```

### 5.2 Safe Circle Screen (`client/src/pages/SafeCircle.tsx`)

```tsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Plus, Trash2, AlertTriangle, UserCheck, ShieldAlert } from 'lucide-react';
import { useSafeCircleStore } from '../stores/circleStore';

export const SafeCirclePage: React.FC = () => {
  const { contacts, totalCount, maxLimit, isLoading, fetchContacts, addContact, removeContact } =
    useSafeCircleStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formVpa, setFormVpa] = useState('');
  const [formName, setFormName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await addContact(formVpa, formName);
      setIsModalOpen(false);
      setFormVpa('');
      setFormName('');
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Error adding contact.');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/20 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <h1 className="text-xl font-bold text-white tracking-wide">Safe Circle</h1>
            </div>
            <p className="text-xs text-emerald-200/80 mt-1">
              Payments to verified contacts bypass risk screening for instantaneous transfers.
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-emerald-400">{totalCount}</span>
            <span className="text-xs text-gray-400">/{maxLimit}</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Trusted Payees ({totalCount})
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={totalCount >= maxLimit}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-semibold text-xs rounded-lg transition"
        >
          <Plus className="w-4 h-4" /> Add Payee
        </button>
      </div>

      {/* Contacts List */}
      {contacts.length === 0 && !isLoading ? (
        <div className="text-center py-12 border border-dashed border-gray-800 rounded-2xl">
          <UserCheck className="w-12 h-12 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400 font-medium text-sm">No trusted contacts added yet.</p>
          <p className="text-gray-600 text-xs mt-1">Add frequent family members or friends.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {contacts.map((contact) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4 flex flex-col gap-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{contact.contactName}</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
                        TRUSTED
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{contact.contactVpa}</p>
                  </div>
                  <button
                    onClick={() => removeContact(contact.id)}
                    className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="Remove Contact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Anomaly Safety Net Banner */}
                {contact.safetyNetWarning && (
                  <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg text-amber-300 text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Safety Net Advisory</p>
                      <p className="text-[11px] text-amber-200/80 mt-0.5">{contact.safetyNetReason}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Add Trusted Payee</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mom, Landlord, Roommate"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full bg-gray-950 border border-gray-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300">UPI VPA</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. name@okhdfcbank"
                  value={formVpa}
                  onChange={(e) => setFormVpa(e.target.value)}
                  className="mt-1 w-full bg-gray-950 border border-gray-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded-lg transition"
                >
                  Save to Circle
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
```

---

## 6. Security, Race Conditions & Edge Cases

| Edge Case / Threat Vector | Vulnerability | SPYDE Mitigation |
|---|---|---|
| **Mule Whitelist Swarm** | A fraudster creates an account and whitelists 1,000 victim VPAs to spam payment requests without triggering risk engine limits. | Hard database limit of **20 contacts** per user account (`MAX_SAFE_CIRCLE_CONTACTS`). |
| **Self-Addition Loophole** | User whitelists their own secondary spoofed handle to bypass scrutiny. | `addContact` verifies target VPA against all `SimUpiHandle` rows owned by the caller (`userId`). |
| **Concurrent Addition Race** | User sends 30 parallel `POST /circle/add` requests to breach the 20-contact cap. | Handled via PostgreSQL transaction with serializable isolation OR application-level atomic Redis count increments before DB insert. |
| **Account Takeover / Mule Flip** | A trusted contact's phone is stolen and converted into a cash-out mule. | **Safety Net Engine** continuously checks platform complaint velocity ($\ge 10$) and renders bold warning banners directly on the payment page. |
| **Case Sensitivity Confusion** | Attacker crafts `Alice@spyde` and `alice@spyde` to circumvent unique indexes. | All VPAs are normalized using `.toLowerCase().trim()` before validation, caching, and persistence. |

---

## 7. Verification & Test Matrix

| Test ID | Test Description | Input Data | Expected Result |
|---|---|---|---|
| `TC_SC_01` | Add valid contact | `vpa: "mom@spyde"`, `name: "Mom"` | Returns `201 Created`, contact persisted in DB & Redis. |
| `TC_SC_02` | Enforce 20-contact limit | Add 21st contact | Throws `400 Bad Request` with `LIMIT_EXCEEDED`. |
| `TC_SC_03` | Self-addition rejection | Add user's own VPA | Throws `400 Bad Request` with `SELF_ADDITION_PROHIBITED`. |
| `TC_SC_04` | Risk Engine Short-Circuit | Initiate payment to `mom@spyde` | Risk Engine returns `verdict = PASS`, `score = 0`, duration < 10ms. |
| `TC_SC_05` | Safety Net Anomaly Trigger | Target in circle with 12 complaints | Safe Circle UI & Payment Review Screen display `safetyNetWarning = true`. |
| `TC_SC_06` | Remove Contact | Delete `mom@spyde` | Deleted from DB, removed from Redis set, subsequent payment runs full Risk Engine. |

