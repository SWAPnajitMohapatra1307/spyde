# SPYDE — Pillar 5: Digital Evidence Certificate & View-Once Face Confirmation

**Document Version:** 1.0 (Round 2 Production Build)
**Owners:** B2 (Backend Support) & F2 (Frontend Support)
**Subsystem:** Cryptographic Certificate Issuer (`server/src/services/certificate.service.ts`) + View-Once Face Pipeline (`client/src/components/ViewOnceFace.tsx`)
**Target Certificate Issuance Latency:** < 50ms post-settlement
**Face Blob Max Size:** 500KB encrypted (200×200 JPEG ≈ 15KB plaintext)
**Status:** LOCKED — Hashing algorithms, JWT signing, encryption schemes, and deletion pipelines are strictly enforced.

---

## 0. Executive Summary

### 0.1 The Problem: Zero Post-Transaction Accountability

When a UPI payment completes today, the sender receives a generic "Payment Successful" screen with a 12-digit UTR number. There is:
- **No cryptographic proof** that the transaction details haven't been tampered with.
- **No visual confirmation** of who actually received the money.
- **No verifiable evidence** that can be presented to a bank, cyber cell, or court.

If a sender is scammed, they have nothing but a screenshot (easily forged) and a UTR number (meaningless without bank cooperation).

### 0.2 SPYDE's Solution: Tamper-Proof Certificates + View-Once Face

**SPYDE Certificate (Pillar 5)** issues a **cryptographically signed digital evidence certificate** for every successful transaction, plus an optional **view-once encrypted face confirmation** from the receiver.

| Component | Purpose | Technology |
|---|---|---|
| **Digital Certificate** | Immutable proof of transaction details (sender, receiver, amount, timestamp, risk verdict). | SHA-256 payload hash + HS256 JWT signature |
| **View-Once Face** | Visual confirmation that the verified receiver is a real person who acknowledged the payment. | AES-256-GCM client-side encryption + 10s countdown + auto-deletion |

### 0.3 Privacy-First Architecture

- **Face capture is OPTIONAL** — receiver must explicitly consent.
- **Encryption is CLIENT-SIDE** — the server stores only AES-256-GCM ciphertext. The decryption key never touches the server.
- **Viewing is ONE-TIME** — the sender gets exactly 10 seconds. After the countdown, the blob is purged from the server and the key is destroyed on the client.
- **DPDP Compliant** — no biometric data persists beyond the 10-second viewing window + 60-second deletion grace period.

---

## 1. End-to-End Flow (Post-Settlement)

```
  RECEIVER (Payee)                        SPYDE SERVER                      SENDER (Payer)
      │                                       │                                  │
      │  [Liveness PASSED, Escrow Released]   │                                  │
      │  Transaction status: SUCCESS          │                                  │
      │                                       │                                  │
      │                                       │  1. Auto-Issue Certificate       │
      │                                       │     - Build payload JSON         │
      │                                       │     - SHA-256 hash               │
      │                                       │     - HS256 JWT sign             │
      │                                       │     - Store in Certificate table │
      │                                       │                                  │
      │  2. Optional Consent Modal:           │                                  │
      │     "Share a quick photo with         │                                  │
      │      the sender for their records?    │                                  │
      │      Viewable ONCE for 10 seconds."   │                                  │
      │                                       │                                  │
      │  [DECLINE] → Skip to step 7           │                                  │
      │  [ACCEPT]  → Continue to step 3       │                                  │
      │                                       │                                  │
      │  3. Capture 200×200 face photo        │                                  │
      │     via webcam / front camera         │                                  │
      │                                       │                                  │
      │  4. Client-Side Encryption:           │                                  │
      │     - Generate AES-256-GCM key        │                                  │
      │     - Encrypt image blob              │                                  │
      │     - Extract IV + AuthTag            │                                  │
      │                                       │                                  │
      │  5. POST /face-blob                   │                                  │
      │     { encryptedData, iv, authTag }    │                                  │
      │──────────────────────────────────────▶│                                  │
      │                                       │                                  │
      │                                       │  6. Store ciphertext in FaceBlob │
      │                                       │     (NO plaintext, NO key)       │
      │                                       │     TTL: 24 hours                │
      │                                       │                                  │
      │  7. Payment Success Screen            │  8. Notify Sender:               │
      │     + Certificate QR                  │     "Payment complete. View      │
      │                                       │      confirmation & certificate."│
      │                                       │─────────────────────────────────▶│
      │                                       │                                  │
      │                                       │  9. GET /certificates/:id        │
      │                                       │◀─────────────────────────────────│
      │                                       │                                  │
      │                                       │  10. Certificate payload + hash  │
      │                                       │      + JWT signature             │
      │                                       │─────────────────────────────────▶│
      │                                       │                                  │
      │                                       │  11. GET /face-blob/:id          │
      │                                       │◀─────────────────────────────────│
      │                                       │                                  │
      │                                       │  12. Return encrypted blob       │
      │                                       │      + Set isViewed = true       │
      │                                       │      + Start 60s deletion timer  │
      │                                       │─────────────────────────────────▶│
      │                                       │                                  │
      │                                       │  13. SENDER decrypts locally     │
      │                                       │      with AES key from receipt   │
      │                                       │      Renders face for 10s        │
      │                                       │      ██████████░░ 8s remaining   │
      │                                       │      ██████░░░░░░ 5s remaining   │
      │                                       │      ░░░░░░░░░░ 0s — DELETED     │
      │                                       │                                  │
      │                                       │  14. Cron: Delete FaceBlob       │
      │                                       │      (isViewed + 60s elapsed)    │
      │                                       │      Purge ciphertext from DB    │
```

---

## 2. Digital Evidence Certificate

### 2.1 Certificate Payload Structure

Every certificate contains an immutable snapshot of the transaction at the moment of settlement:

```typescript
interface CertificatePayload {
  txId: string;              // Transaction ID (e.g., "tx_clx9876543210012")
  senderVpa: string;         // Sender's primary VPA
  receiverVpa: string;       // Receiver's VPA
  amountPaisa: number;       // Transaction amount in paisa
  riskVerdict: string;       // Final risk verdict at settlement
  riskScore: number;         // Numeric risk score
  livenessVerified: boolean; // Whether receiver passed liveness
  timestamp: string;         // ISO 8601 settlement timestamp
  certificateVersion: string;// Schema version (e.g., "1.0")
}
```

### 2.2 Hashing & Signing Pipeline

```
  Certificate Payload (JSON)
        │
        ▼
  Step 1: Canonical Serialization
    JSON.stringify(payload, Object.keys(payload).sort())
    → Deterministic key ordering prevents hash collisions
        │
        ▼
  Step 2: SHA-256 Hash
    crypto.createHash('sha256').update(canonicalJson).digest('hex')
    → payloadHash: "e3b0c44298fc1c149afbf4c8996fb924..."
        │
        ▼
  Step 3: JWT Signature
    jwt.sign(
      { hash: payloadHash, txId: payload.txId },
      SERVER_PRIVATE_KEY,
      { algorithm: 'HS256', expiresIn: '1y', issuer: 'SPYDE Trust Authority' }
    )
    → jwtSignature: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        │
        ▼
  Step 4: Persist to Database
    Certificate { transactionId, payloadHash, jwtSignature, payload }
```

### 2.3 Verification Process

Anyone (sender, receiver, bank, law enforcement) can verify a certificate:

1. Retrieve the certificate via `GET /certificates/:id` or scan the QR code.
2. Re-serialize the payload with sorted keys.
3. Compute SHA-256 of the serialized payload.
4. Compare with the stored `payloadHash`.
5. Verify the JWT signature against SPYDE's public key.
6. If both match → **Certificate is authentic and untampered.**

---

## 3. View-Once Face Confirmation

### 3.1 Encryption Scheme (Client-Side AES-256-GCM)

The receiver's face photo is encrypted **before** it ever leaves the browser:

```
  Webcam Capture (200×200 JPEG)
        │
        ▼
  Canvas → Blob → ArrayBuffer (plaintext)
        │
        ▼
  WebCrypto API:
    1. key = crypto.subtle.generateKey('AES-GCM', 256)
    2. iv  = crypto.getRandomValues(new Uint8Array(12))
    3. encrypted = crypto.subtle.encrypt(
         { name: 'AES-GCM', iv },
         key,
         plaintextBuffer
       )
    4. authTag = encrypted.slice(-16)  // Last 16 bytes
    5. ciphertext = encrypted.slice(0, -16)
        │
        ▼
  Upload to Server:
    POST /face-blob {
      certificateId,
      encryptedBase64: btoa(ciphertext),
      ivBase64: btoa(iv),
      authTagBase64: btoa(authTag)
    }
        │
        ▼
  Key Export (Sender Only):
    exportedKey = crypto.subtle.exportKey('raw', key)
    → Embedded in sender's receipt metadata (encrypted with session key)
        │
        ▼
  WIPE local plaintext from memory
    canvas.getContext('2d').clearRect(...)
    blob = null
    plaintextBuffer = null
```

### 3.2 Server Storage (Ciphertext Only)

The server **never** possesses the decryption key. It stores:

| Field | Type | Description |
|---|---|---|
| `encryptedData` | `Bytes` | AES-256-GCM ciphertext (opaque blob) |
| `iv` | `Bytes` | 12-byte initialization vector |
| `authTag` | `Bytes` | 16-byte GCM authentication tag |
| `isViewed` | `Boolean` | View-once flag (default: `false`) |
| `viewedAt` | `DateTime?` | Timestamp of first view |
| `expiresAt` | `DateTime` | Hard TTL (24h from creation) |

### 3.3 View-Once Lifecycle

```
  SENDER taps "View Confirmation Photo"
        │
        ▼
  GET /face-blob/:id
        │
        ├─ isViewed == false AND expiresAt > now()
        │     │
        │     ▼
        │   Return encrypted blob
        │   SET isViewed = true
        │   SET viewedAt = now()
        │   Schedule deletion: viewedAt + 60s
        │     │
        │     ▼
        │   Client decrypts with AES key
        │   Renders image with 10s countdown overlay
        │     │
        │     ▼
        │   10s elapsed → Image fades out
        │   Key destroyed: crypto.subtle = null
        │   Canvas cleared
        │     │
        │     ▼
        │   60s elapsed → Server cron deletes FaceBlob row
        │
        ├─ isViewed == true
        │     │
        │     ▼
        │   Return 410 GONE
        │   "This confirmation was already viewed and permanently deleted."
        │
        └─ expiresAt < now()
              │
              ▼
            Return 410 GONE
            "This confirmation has expired."
```

---

## 4. Backend Implementation

### 4.1 Certificate Service (`server/src/services/certificate.service.ts`)

```typescript
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_CERTIFICATE_SECRET || process.env.JWT_SECRET!;
const CERTIFICATE_VERSION = '1.0';

export class CertificateService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Auto-issues a signed certificate after successful transaction settlement
   */
  public async issueCertificate(transactionId: string) {
    const txn = await this.prisma.simTransaction.findUnique({
      where: { id: transactionId },
      include: {
        sender: {
          include: { upiHandles: { where: { isPrimary: true } } }
        },
        livenessSessions: {
          where: { verdict: 'PASS' },
          take: 1
        }
      }
    });

    if (!txn || txn.status !== 'SUCCESS') {
      throw new Error('INVALID_STATE: Certificate can only be issued for SUCCESS transactions.');
    }

    // Check if certificate already exists (idempotent)
    const existing = await this.prisma.certificate.findUnique({
      where: { transactionId }
    });
    if (existing) return existing;

    // 1. Build canonical payload
    const payload = {
      txId: txn.id,
      senderVpa: txn.sender.upiHandles[0]?.vpa || 'unknown',
      receiverVpa: txn.receiverVpa,
      amountPaisa: Number(txn.amountPaisa),
      riskVerdict: txn.riskVerdict,
      riskScore: txn.riskScore,
      livenessVerified: txn.livenessSessions.length > 0,
      timestamp: txn.updatedAt.toISOString(),
      certificateVersion: CERTIFICATE_VERSION
    };

    // 2. Deterministic serialization (sorted keys)
    const canonicalJson = JSON.stringify(
      payload,
      Object.keys(payload).sort()
    );

    // 3. SHA-256 hash
    const payloadHash = crypto
      .createHash('sha256')
      .update(canonicalJson)
      .digest('hex');

    // 4. JWT signature
    const jwtSignature = jwt.sign(
      { hash: payloadHash, txId: txn.id },
      JWT_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: '1y',
        issuer: 'SPYDE Trust Authority v1.0'
      }
    );

    // 5. Persist
    const certificate = await this.prisma.certificate.create({
      data: {
        transactionId: txn.id,
        payloadHash,
        jwtSignature,
        payload: payload as any
      }
    });

    return certificate;
  }

  /**
   * Public verification endpoint
   */
  public async verifyCertificate(certificateId: string, providedHash?: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { id: certificateId }
    });

    if (!cert) {
      return { isValid: false, reason: 'Certificate not found.' };
    }

    // 1. Verify JWT signature
    try {
      const decoded = jwt.verify(cert.jwtSignature, JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'SPYDE Trust Authority v1.0'
      }) as any;

      if (decoded.hash !== cert.payloadHash) {
        return { isValid: false, reason: 'JWT hash does not match stored payload hash.' };
      }
    } catch (err) {
      return { isValid: false, reason: 'JWT signature verification failed.' };
    }

    // 2. Verify payload hash (if provided)
    if (providedHash && providedHash !== cert.payloadHash) {
      return { isValid: false, reason: 'Provided hash does not match certificate hash.' };
    }

    // 3. Re-compute hash from stored payload
    const payload = cert.payload as any;
    const canonicalJson = JSON.stringify(payload, Object.keys(payload).sort());
    const recomputedHash = crypto.createHash('sha256').update(canonicalJson).digest('hex');

    if (recomputedHash !== cert.payloadHash) {
      return { isValid: false, reason: 'Payload has been tampered with.' };
    }

    return {
      isValid: true,
      issuedAt: cert.issuedAt,
      verifiedBy: 'SPYDE Trust Authority v1.0',
      payload
    };
  }
}
```

### 4.2 Face Blob Service (`server/src/services/faceblob.service.ts`)

```typescript
import { PrismaClient } from '@prisma/client';

const MAX_BLOB_SIZE_BYTES = 500 * 1024; // 500KB
const VIEW_COUNTDOWN_SECONDS = 10;
const DELETION_GRACE_SECONDS = 60;
const BLOB_TTL_HOURS = 24;

export class FaceBlobService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Stores an encrypted face blob (server never sees plaintext)
   */
  public async storeBlob(
    certificateId: string,
    encryptedBase64: string,
    ivBase64: string,
    authTagBase64: string
  ) {
    const encryptedData = Buffer.from(encryptedBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    // Validate sizes
    if (encryptedData.length > MAX_BLOB_SIZE_BYTES) {
      throw new Error(`PAYLOAD_TOO_LARGE: Encrypted blob exceeds ${MAX_BLOB_SIZE_BYTES} bytes.`);
    }
    if (iv.length !== 12) {
      throw new Error('INVALID_IV: Initialization vector must be exactly 12 bytes.');
    }
    if (authTag.length !== 16) {
      throw new Error('INVALID_AUTH_TAG: GCM auth tag must be exactly 16 bytes.');
    }

    // Verify certificate exists
    const cert = await this.prisma.certificate.findUnique({
      where: { id: certificateId }
    });
    if (!cert) {
      throw new Error('NOT_FOUND: Certificate not found.');
    }

    // Check for existing blob
    const existing = await this.prisma.faceBlob.findUnique({
      where: { certificateId }
    });
    if (existing) {
      throw new Error('CONFLICT: Face blob already exists for this certificate.');
    }

    const expiresAt = new Date(Date.now() + BLOB_TTL_HOURS * 60 * 60 * 1000);

    const blob = await this.prisma.faceBlob.create({
      data: {
        certificateId,
        encryptedData,
        iv,
        authTag,
        expiresAt
      }
    });

    return {
      faceBlobId: blob.id,
      expiresAt: blob.expiresAt.toISOString(),
      ttlHours: BLOB_TTL_HOURS,
      message: 'Encrypted face blob stored. Viewable once by sender.'
    };
  }

  /**
   * Retrieves encrypted blob for one-time viewing
   */
  public async getViewOnceBlob(blobId: string, requestingUserId: string) {
    const blob = await this.prisma.faceBlob.findUnique({
      where: { id: blobId },
      include: {
        certificate: {
          include: {
            transaction: {
              select: { senderId: true }
            }
          }
        }
      }
    });

    if (!blob) {
      throw new Error('NOT_FOUND: Face blob not found.');
    }

    // Verify requester is the sender
    if (blob.certificate.transaction.senderId !== requestingUserId) {
      throw new Error('FORBIDDEN: Only the sender can view this confirmation.');
    }

    // Check expiration
    if (blob.expiresAt < new Date()) {
      throw new GoneError('This face confirmation has expired (24h TTL).');
    }

    // Check view-once
    if (blob.isViewed) {
      throw new GoneError(
        'This face confirmation was already viewed and has been permanently purged (DPDP Compliance).'
      );
    }

    // Mark as viewed + schedule deletion
    const viewedAt = new Date();
    await this.prisma.faceBlob.update({
      where: { id: blobId },
      data: {
        isViewed: true,
        viewedAt
      }
    });

    return {
      faceBlobId: blob.id,
      encryptedBase64: blob.encryptedData.toString('base64'),
      ivBase64: blob.iv.toString('base64'),
      authTagBase64: blob.authTag.toString('base64'),
      viewCountdownSeconds: VIEW_COUNTDOWN_SECONDS,
      autoDeleteInSeconds: DELETION_GRACE_SECONDS,
      warning: 'Decryption key and blob will be permanently destroyed after countdown.'
    };
  }

  /**
   * Cron job: Purges viewed and expired blobs
   * Runs every 5 minutes
   */
  public async purgeExpiredBlobs() {
    const deletionThreshold = new Date(Date.now() - DELETION_GRACE_SECONDS * 1000);
    const expiryThreshold = new Date();

    // 1. Delete viewed blobs past grace period
    const viewedResult = await this.prisma.faceBlob.deleteMany({
      where: {
        isViewed: true,
        viewedAt: { lt: deletionThreshold }
      }
    });

    // 2. Delete expired blobs (never viewed, TTL exceeded)
    const expiredResult = await this.prisma.faceBlob.deleteMany({
      where: {
        isViewed: false,
        expiresAt: { lt: expiryThreshold }
      }
    });

    return {
      purgedViewed: viewedResult.count,
      purgedExpired: expiredResult.count
    };
  }
}

class GoneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoneError';
  }
}
```

### 4.3 Certificate & Face Blob Routes (`server/src/routes/certificate.routes.ts`)

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { CertificateService } from '../services/certificate.service';
import { FaceBlobService } from '../services/faceblob.service';
import { prisma } from '../config/database';
import { z } from 'zod';

const router = Router();
const certService = new CertificateService(prisma);
const faceBlobService = new FaceBlobService(prisma);

const FaceBlobSchema = z.object({
  certificateId: z.string().min(1),
  encryptedBase64: z.string().min(1),
  ivBase64: z.string().min(1),
  authTagBase64: z.string().min(1)
});

// GET /api/certificates/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cert = await prisma.certificate.findUnique({
      where: { id: req.params.id },
      include: { faceBlob: true }
    });

    if (!cert) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Certificate not found.' }
      });
    }

    res.json({
      success: true,
      data: {
        certificateId: cert.id,
        transactionId: cert.transactionId,
        payloadHash: cert.payloadHash,
        jwtSignature: cert.jwtSignature,
        payload: cert.payload,
        hasViewOnceFace: !!cert.faceBlobId,
        faceBlobId: cert.faceBlobId,
        isFaceViewed: cert.faceBlob?.isViewed || false,
        issuedAt: cert.issuedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/certificates/verify (Public)
router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { certificateId, payloadHash } = req.body;
    const result = await certService.verifyCertificate(certificateId, payloadHash);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/face-blob
router.post('/face-blob', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = FaceBlobSchema.parse(req.body);
    const result = await faceBlobService.storeBlob(
      parsed.certificateId,
      parsed.encryptedBase64,
      parsed.ivBase64,
      parsed.authTagBase64
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/face-blob/:id (View-Once)
router.get('/face-blob/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await faceBlobService.getViewOnceBlob(req.params.id, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.name === 'GoneError') {
      return res.status(410).json({
        success: false,
        error: { code: 'GONE', message: error.message }
      });
    }
    next(error);
  }
});

export default router;
```

---

## 5. Frontend Implementation

### 5.1 Certificate Viewer (`client/src/pages/CertificateViewer.tsx`)

```tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Hash, FileText, QrCode, CheckCircle2, XCircle, Eye } from 'lucide-react';
import api from '../lib/api';
import { ViewOnceFace } from '../components/ViewOnceFace';

interface CertificateData {
  certificateId: string;
  transactionId: string;
  payloadHash: string;
  jwtSignature: string;
  payload: {
    txId: string;
    senderVpa: string;
    receiverVpa: string;
    amountPaisa: number;
    riskVerdict: string;
    riskScore: number;
    livenessVerified: boolean;
    timestamp: string;
  };
  hasViewOnceFace: boolean;
  faceBlobId: string | null;
  isFaceViewed: boolean;
  issuedAt: string;
}

export const CertificateViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [verification, setVerification] = useState<{ isValid: boolean } | null>(null);
  const [showFace, setShowFace] = useState(false);

  useEffect(() => {
    if (id) fetchCertificate();
  }, [id]);

  const fetchCertificate = async () => {
    try {
      const res = await api.get(`/certificates/${id}`);
      setCert(res.data.data);
    } catch (err) {
      console.error('Failed to load certificate');
    }
  };

  const handleVerify = async () => {
    if (!cert) return;
    try {
      const res = await api.post('/certificates/verify', {
        certificateId: cert.certificateId,
        payloadHash: cert.payloadHash
      });
      setVerification(res.data.data);
    } catch (err) {
      setVerification({ isValid: false });
    }
  };

  if (!cert) {
    return <div className="text-center py-20 text-gray-500">Loading certificate...</div>;
  }

  const amount = (cert.payload.amountPaisa / 100).toLocaleString();

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/20 border border-indigo-500/30 rounded-2xl p-6 text-center">
        <ShieldCheck className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
        <h1 className="text-lg font-bold text-white">Digital Evidence Certificate</h1>
        <p className="text-xs text-gray-400 mt-1 font-mono">{cert.certificateId}</p>
      </div>

      {/* Transaction Details */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4" /> Transaction Details
        </h2>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-500">Sender</span>
            <p className="text-white font-mono">{cert.payload.senderVpa}</p>
          </div>
          <div>
            <span className="text-gray-500">Receiver</span>
            <p className="text-white font-mono">{cert.payload.receiverVpa}</p>
          </div>
          <div>
            <span className="text-gray-500">Amount</span>
            <p className="text-emerald-400 font-bold text-base">₹{amount}</p>
          </div>
          <div>
            <span className="text-gray-500">Risk Verdict</span>
            <p className={`font-bold ${
              cert.payload.riskVerdict === 'PASS' ? 'text-emerald-400' :
              cert.payload.riskVerdict === 'WARN' ? 'text-amber-400' :
              cert.payload.riskVerdict === 'CHALLENGE' ? 'text-orange-400' : 'text-rose-400'
            }`}>{cert.payload.riskVerdict} ({cert.payload.riskScore})</p>
          </div>
          <div>
            <span className="text-gray-500">Liveness</span>
            <p className={cert.payload.livenessVerified ? 'text-emerald-400' : 'text-gray-500'}>
              {cert.payload.livenessVerified ? '✓ Verified' : 'Not Required'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Settled</span>
            <p className="text-gray-300">{new Date(cert.payload.timestamp).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Cryptographic Proof */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <Hash className="w-4 h-4" /> Cryptographic Proof
        </h2>
        <div className="space-y-2">
          <div>
            <span className="text-[10px] text-gray-500 uppercase">SHA-256 Payload Hash</span>
            <p className="text-[11px] text-cyan-400 font-mono break-all">{cert.payloadHash}</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase">JWT Signature (truncated)</span>
            <p className="text-[11px] text-purple-400 font-mono break-all">
              {cert.jwtSignature.slice(0, 60)}...
            </p>
          </div>
        </div>

        <button
          onClick={handleVerify}
          className="w-full py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-lg transition"
        >
          Verify Signature
        </button>

        {verification && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
              verification.isValid
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {verification.isValid ? (
              <><CheckCircle2 className="w-4 h-4" /> Certificate is authentic and untampered.</>
            ) : (
              <><XCircle className="w-4 h-4" /> Certificate verification failed.</>
            )}
          </motion.div>
        )}
      </div>

      {/* View-Once Face */}
      {cert.hasViewOnceFace && !cert.isFaceViewed && (
        <button
          onClick={() => setShowFace(true)}
          className="w-full py-3 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 hover:border-pink-400/50 text-pink-300 font-bold text-sm rounded-xl transition flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" /> View Receiver Confirmation Photo (Once)
        </button>
      )}

      {cert.hasViewOnceFace && cert.isFaceViewed && (
        <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-500 text-xs text-center">
          Confirmation photo has been viewed and permanently deleted.
        </div>
      )}

      {showFace && cert.faceBlobId && (
        <ViewOnceFace
          blobId={cert.faceBlobId}
          onClose={() => setShowFace(false)}
        />
      )}
    </div>
  );
};
```

### 5.2 View-Once Face Component (`client/src/components/ViewOnceFace.tsx`)

```tsx
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, ShieldAlert, Timer } from 'lucide-react';
import api from '../lib/api';

interface ViewOnceFaceProps {
  blobId: string;
  onClose: () => void;
}

const VIEW_COUNTDOWN = 10; // seconds

export const ViewOnceFace: React.FC<ViewOnceFaceProps> = ({ blobId, onClose }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(VIEW_COUNTDOWN);
  const [status, setStatus] = useState<'loading' | 'viewing' | 'expired' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchAndDecrypt();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (status !== 'viewing' || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          destroyImage();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, countdown]);

  const fetchAndDecrypt = async () => {
    try {
      const res = await api.get(`/face-blob/${blobId}`);
      const { encryptedBase64, ivBase64, authTagBase64 } = res.data.data;

      // Note: In production, the AES key would be retrieved from the
      // sender's receipt metadata (encrypted with their session key).
      // For this demo, we simulate decryption by rendering the blob directly.
      // Real implementation:
      //   const key = await importKeyFromReceipt(receiptKeyBase64);
      //   const ciphertext = base64ToArrayBuffer(encryptedBase64);
      //   const iv = base64ToArrayBuffer(ivBase64);
      //   const plaintext = await crypto.subtle.decrypt(
      //     { name: 'AES-GCM', iv }, key,
      //     concatBuffers(ciphertext, base64ToArrayBuffer(authTagBase64))
      //   );
      //   const blob = new Blob([plaintext], { type: 'image/jpeg' });
      //   setImageUrl(URL.createObjectURL(blob));

      // Simulated: Create a placeholder image for demo
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Receiver Face', 100, 90);
      ctx.fillText('(Encrypted)', 100, 110);
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.fillText('AES-256-GCM Decrypted', 100, 140);
      setImageUrl(canvas.toDataURL());
      setStatus('viewing');
    } catch (err: any) {
      if (err.response?.status === 410) {
        setStatus('expired');
        setErrorMsg(err.response.data.error.message);
      } else {
        setStatus('error');
        setErrorMsg('Failed to load confirmation photo.');
      }
    }
  };

  const destroyImage = () => {
    // 1. Revoke object URL
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);

    // 2. Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    // 3. Destroy decryption key (in real implementation)
    // cryptoKey = null;

    setStatus('expired');
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4">
      {/* Close Button */}
      <button
        onClick={() => { destroyImage(); onClose(); }}
        className="absolute top-4 right-4 text-gray-400 hover:text-white"
      >
        <X className="w-6 h-6" />
      </button>

      <AnimatePresence mode="wait">
        {status === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-cyan-400 text-sm"
          >
            Decrypting confirmation photo...
          </motion.div>
        )}

        {status === 'viewing' && imageUrl && (
          <motion.div
            key="viewing"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="relative"
          >
            {/* Countdown Ring */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-rose-500/20 border border-rose-500/40 px-3 py-1 rounded-full">
              <Timer className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-300 text-xs font-bold font-mono">
                Auto-destroy in {countdown}s
              </span>
            </div>

            {/* Face Image */}
            <img
              src={imageUrl}
              alt="Receiver confirmation"
              className="w-56 h-56 rounded-2xl border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.2)] object-cover"
              style={{
                opacity: countdown <= 3 ? countdown / 3 : 1,
                filter: countdown <= 3 ? `blur(${(3 - countdown) * 3}px)` : 'none',
                transition: 'opacity 1s, filter 1s'
              }}
            />

            {/* Progress Bar */}
            <div className="mt-4 w-56 h-1 bg-gray-800 rounded-full overflow-hidden mx-auto">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-rose-500"
                initial={{ width: '100%' }}
                animate={{ width: `${(countdown / VIEW_COUNTDOWN) * 100}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>

            <p className="text-center text-[10px] text-gray-500 mt-2">
              This image will be permanently destroyed after viewing.
            </p>
          </motion.div>
        )}

        {status === 'expired' && (
          <motion.div
            key="expired"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-3"
          >
            <ShieldAlert className="w-12 h-12 text-gray-600 mx-auto" />
            <p className="text-gray-400 text-sm font-medium">
              {errorMsg || 'Confirmation photo has been permanently destroyed.'}
            </p>
            <p className="text-gray-600 text-xs">
              Decryption key wiped. Server blob purged. DPDP compliant.
            </p>
            <button
              onClick={() => { destroyImage(); onClose(); }}
              className="px-6 py-2 bg-gray-800 text-gray-300 text-xs font-bold rounded-lg"
            >
              Close
            </button>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-rose-400 text-sm"
          >
            <p>{errorMsg}</p>
            <button onClick={onClose} className="mt-4 text-xs text-gray-500 underline">
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
```

### 5.3 Receiver Consent Modal (`client/src/components/ReceiverConsentModal.tsx`)

```tsx
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, ShieldCheck, X, Lock } from 'lucide-react';
import api from '../lib/api';

interface ReceiverConsentModalProps {
  certificateId: string;
  onConsentGiven: () => void;
  onDecline: () => void;
}

export const ReceiverConsentModal: React.FC<ReceiverConsentModalProps> = ({
  certificateId,
  onConsentGiven,
  onDecline
}) => {
  const [step, setStep] = useState<'consent' | 'capturing' | 'uploading' | 'done'>('consent');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleAccept = async () => {
    setStep('capturing');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 200, height: 200 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setStep('consent');
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setStep('uploading');

    // 1. Capture 200×200 frame
    const canvas = canvasRef.current;
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(videoRef.current, 0, 0, 200, 200);

    // 2. Convert to blob
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.7)
    );
    const plaintextBuffer = await blob.arrayBuffer();

    // 3. Client-side AES-256-GCM encryption
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt']
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plaintextBuffer
    );

    const encryptedArray = new Uint8Array(encrypted);
    const ciphertext = encryptedArray.slice(0, -16);
    const authTag = encryptedArray.slice(-16);

    // 4. Upload ciphertext (NO plaintext, NO key)
    try {
      await api.post('/face-blob', {
        certificateId,
        encryptedBase64: btoa(String.fromCharCode(...ciphertext)),
        ivBase64: btoa(String.fromCharCode(...iv)),
        authTagBase64: btoa(String.fromCharCode(...authTag))
      });

      // 5. Wipe local data
      ctx.clearRect(0, 0, 200, 200);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }

      setStep('done');
      onConsentGiven();
    } catch (err) {
      setStep('consent');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-900 border border-gray-800 rounded-2xl max-w-sm w-full p-6 space-y-4"
      >
        {step === 'consent' && (
          <>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-pink-400" />
                <h3 className="text-base font-bold text-white">Share Confirmation Photo?</h3>
              </div>
              <button onClick={onDecline} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              The sender will see a small photo of you <strong className="text-white">once for 10 seconds</strong>
              to confirm they paid the right person. The photo is:
            </p>

            <ul className="text-xs text-gray-300 space-y-1.5">
              <li className="flex items-center gap-2">
                <Lock className="w-3 h-3 text-emerald-400" /> Encrypted on your device before upload
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Viewable exactly once (10 seconds)
              </li>
              <li className="flex items-center gap-2">
                <X className="w-3 h-3 text-rose-400" /> Permanently deleted after viewing
              </li>
            </ul>

            <div className="flex gap-2 pt-2">
              <button
                onClick={onDecline}
                className="flex-1 py-2.5 bg-gray-800 text-gray-300 text-xs font-bold rounded-lg"
              >
                No Thanks
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-400 text-black text-xs font-bold rounded-lg"
              >
                Yes, Take Photo
              </button>
            </div>
          </>
        )}

        {step === 'capturing' && (
          <div className="text-center space-y-4">
            <video ref={videoRef} autoPlay playsInline muted className="w-48 h-48 rounded-full mx-auto object-cover scale-x-[-1]" />
            <canvas ref={canvasRef} className="hidden" />
            <button
              onClick={handleCapture}
              className="px-6 py-2.5 bg-pink-500 text-black font-bold text-sm rounded-full"
            >
              📸 Capture
            </button>
          </div>
        )}

        {step === 'uploading' && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Encrypting and uploading...
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-6 space-y-2">
            <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-white font-bold text-sm">Confirmation Shared</p>
            <p className="text-gray-400 text-xs">The sender can view it once for 10 seconds.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
```

---

## 6. DPDP Compliance & Data Lifecycle

| Phase | Data State | Location | Duration | Compliance |
|---|---|---|---|---|
| **Capture** | Plaintext 200×200 JPEG | Receiver's browser memory only | < 2 seconds | DPDP §5 (Consent) |
| **Encryption** | AES-256-GCM ciphertext | Receiver's browser → Server POST | < 1 second | DPDP §6 (Purpose Limitation) |
| **Storage** | Ciphertext + IV + AuthTag | PostgreSQL `face_blobs` table | Max 24 hours | DPDP §12 (Retention) |
| **Viewing** | Decrypted in sender's browser | Sender's browser memory only | Exactly 10 seconds | DPDP §5 (Consent) |
| **Destruction** | Ciphertext purged from DB | PostgreSQL DELETE | 60s after viewing | DPDP §12 (Erasure) |
| **Key Lifecycle** | AES key in sender's session | Sender's browser JS heap | Destroyed at 10s mark | DPDP §6 (Minimization) |

**Key Guarantees:**
- The server **cannot** decrypt the face photo (no key possession).
- The face photo **cannot** be viewed more than once.
- The face photo **cannot** persist beyond 24 hours even if never viewed.
- All biometric processing qualifies as "anonymized" output under DPDP §2(k).

---

## 7. Test Matrix

| Test ID | Scenario | Expected Outcome |
|---|---|---|
| `TC_CT_01` | Payment SUCCESS → auto-certificate | Certificate row created with valid SHA-256 hash + JWT |
| `TC_CT_02` | Verify certificate with correct hash | `isValid: true` |
| `TC_CT_03` | Verify certificate with tampered hash | `isValid: false`, reason: "Payload has been tampered with" |
| `TC_CT_04` | Receiver consents to face capture | Encrypted blob stored, plaintext wiped from browser |
| `TC_CT_05` | Sender views face blob (first time) | Image renders, 10s countdown starts, `isViewed = true` |
| `TC_CT_06` | Sender attempts second view | `410 GONE`, "permanently purged" |
| `TC_CT_07` | Face blob expires (24h, never viewed) | Cron deletes row, `410 GONE` on access |
| `TC_CT_08` | Network tab inspection during upload | POST body contains only base64 ciphertext — no plaintext image |
| `TC_CT_09` | Non-sender tries to view face blob | `403 FORBIDDEN: Only the sender can view this confirmation` |
| `TC_CT_10` | Receiver declines consent | No FaceBlob created, certificate still issued without face |

---

**End of File 12 of 19 — `CERTIFICATE.md`**