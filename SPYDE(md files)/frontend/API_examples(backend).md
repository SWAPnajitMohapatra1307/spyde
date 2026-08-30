# 🌐 SPYDE — Unified API Contracts (B1 + B2)

**Base URL:** `http://localhost:5000/api` (Development)
**Security Standard:** DPDP Act (2023) Compliant • AES-256-GCM • SHA-256 Fingerprinting • HS256 JWT
**Global Auth:** All protected endpoints require header: `Authorization: Bearer <accessToken>`

---

## Table of Contents
1. [Authentication & User (B1)](#1-authentication--user-b1)
2. [Safe Circle (B1)](#2-safe-circle-b1)
3. [VPA & Payment Engine (B1)](#3-vpa--payment-engine-b1)
4. [Liveness & Escrow (B2)](#4-liveness--escrow-b2)
5. [QR Tamper Detection (B2)](#5-qr-tamper-detection-b2)
6. [Certificates & Face Blob (B2)](#6-certificates--face-blob-b2)
7. [Complaints & Admin (B2)](#7-complaints--admin-b2)
8. [Errors & Test Data](#8-errors--test-data)

---

## 1. Authentication & User (B1)

### POST `/api/auth/login`
```json
// Request
{ "phone": "9876543210", "password": "Password@123" }

// Response 200 OK
{
  "success": true,
  "data": {
    "user": { "id": "c...", "name": "Aarav Sharma", "phone": "+919876543210", "isAdmin": false },
    "accessToken": "eyJhbGciOiJIUz...",
    "refreshToken": "a1b2c3d4..." // Also set as httpOnly cookie
  }
}
```

### POST `/api/auth/register`
```json
// Request
{
  "name": "Priya Mehta",
  "phone": "9876543299",
  "password": "SecurePass@123",
  "vpa": "priya@okhdfc"
}

// Response 201 Created
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "Priya Mehta", "phone": "+919876543299", "vpa": "priya@okhdfc" },
    "accessToken": "eyJ...",
    "refreshToken": "a1b..."
  }
}
```

### POST `/api/auth/refresh`
*(Requires `refreshToken` in body OR `httpOnly` cookie)*
```json
// Response 200 OK
{
  "success": true,
  "data": {
    "accessToken": "eyJ...(new)",
    "refreshToken": "f6e...(new)"
  }
}
```

### GET `/api/auth/me`
```json
// Response 200 OK
{
  "success": true,
  "data": {
    "id": "c...",
    "name": "Aarav Sharma",
    "phone": "+919876543210",
    "email": "aarav@example.com",
    "riskScore": 5,
    "isAdmin": false,
    "createdAt": "2025-01-15T04:45:48.000Z",
    "bankAccounts": [
      {
        "id": "c...",
        "ifsc": "SBIN0000002",
        "accountNumberMasked": "XXXXXX3210",
        "accountType": "SAVINGS",
        "balancePaisa": "50000000",
        "balanceRupees": 500000
      }
    ],
    "upiHandles": [
      { "id": "c...", "vpa": "aarav@okaxis", "isPrimary": true }
    ]
  }
}
```

---

## 2. Safe Circle (B1)

### GET `/api/circle`
```json
// Response 200 OK
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "c...",
        "contactVpa": "aditya@okicici",
        "contactName": "Aditya Patel",
        "addedAt": "2025-01-15T10:00:00.000Z",
        "hasAnomaly": false
      }
    ],
    "total": 1
  }
}
```

### POST `/api/circle/add`
```json
// Request
{ "contactVpa": "rohan@okhdfc", "contactName": "Rohan Gupta" }

// Response 201 Created (409 if duplicate, 400 if limit 20 reached)
{
  "success": true,
  "data": {
    "id": "c...", "contactVpa": "rohan@okhdfc", "contactName": "Rohan Gupta", "hasAnomaly": false
  }
}
```

### DELETE `/api/circle/:id`
```json
// Response 200 OK
{ "success": true, "data": { "message": "Contact removed from Safe Circle" } }
```

---

## 3. VPA & Payment Engine (B1)

### POST `/api/vpa/resolve` (Public/Unauthenticated)
```json
// Request
{ "vpa": "challenge.test@oksdi" }

// Response 200 OK
{
  "success": true,
  "data": {
    "vpa": "challenge.test@oksdi",
    "name": "External Payee",
    "bank": "UPI Direct",
    "isRegistered": false,
    "riskVerdict": "WARN",
    "riskScore": 25,
    "signals": [
      { "type": "TYPO_DETECTED", "weight": 25, "reason": "Handle @oksdi is a typosquat of @oksbi" }
    ]
  }
}
```

### POST `/api/payment/initiate`
```json
// Request
{ "receiverVpa": "aditya@okicici", "amount": 250, "note": "Dinner" }

// Response 200 OK (CHALLENGE Example)
{
  "success": true,
  "data": {
    "transactionId": "cmt86me02000j1305stu901",
    "status": "PENDING",
    "verdict": "CHALLENGE",
    "riskScore": 85,
    "signals": [
      { "type": "COMMUNITY_REPORTS", "weight": 30, "reason": "2 active community complaints" }
    ],
    "amountRupees": 250,
    "challengeSessionId": "cmt86me03000k1305vwx234" // Note: Populated on CHALLENGE
  }
}
```

### POST `/api/payment/confirm`
```json
// Request (Note: PIN is strictly "1234")
{ "transactionId": "cmt86me...", "pin": "1234" }

// Response 200 OK
{
  "success": true,
  "data": {
    "transactionId": "cmt86me...",
    "status": "SUCCESS",
    "amountRupees": 250,
    "receiverVpa": "aditya@okicici",
    "timestamp": "2025-01-15T10:35:00.000Z"
  }
}
```

### GET `/api/payment/history`
```json
// Request: GET /api/payment/history?limit=10&offset=0
// Response 200 OK
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "c...",
        "senderId": "c...",
        "receiverVpa": "aditya@okicici",
        "amountRupees": 250,
        "status": "SUCCESS",
        "riskVerdict": "PASS",
        "riskScore": 0,
        "createdAt": "2025-01-15T10:30:00.000Z",
        "certificateId": "c...",
        "isSender": true
      }
    ],
    "total": 1,
    "limit": 10,
    "offset": 0
  }
}
```

---

## 4. Liveness & Escrow (B2)

### POST `/api/liveness/challenge`
```json
// Request
{ "transactionId": "cmt7cgj4r002yy6lt6ta9iai9" }

// Response 200 OK
{
  "success": true,
  "data": {
    "challengeId": "cmt7g94wk000113xjz1nwxk27",
    "challengeCode": "3543",
    "expiresAt": "2026-08-24T16:15:52.795Z",
    "ttlSeconds": 60
  }
}
```

### POST `/api/liveness/verify`
```json
// Request
{
  "challengeId": "cmt7g94wk...",
  "challengeCode": "3543",
  "clientScore": 90,
  "blinkCount": 2,
  "faceEmbeddingHash": "e3b0c442..."
}

// Response 200 OK
{
  "success": true,
  "data": {
    "sessionId": "cmt7g94wk...",
    "verdict": "PASS",
    "totalScore": 115,
    "breakdown": { "clientScore": 90, "serverChallengeBonus": 25 },
    "livenessToken": "liv_token...",
    "message": "Liveness check passed. Proceed to transaction confirmation."
  }
}
```

---

## 5. QR Tamper Detection (B2)

### POST `/api/qr/verify`
```json
// Request
{
  "qrPayload": "upi://pay?pa=haldirams@okhdfc&pn=Haldirams&am=250",
  "deviceLat": 28.613,
  "deviceLng": 77.209
}

// Response 200 OK (TAMPERED Case Example)
{
  "success": true,
  "data": {
    "verdict": "TAMPERED",
    "merchant": { "businessName": "Haldirams", "vpa": "haldirams@okhdfc", "isVerified": true },
    "geoAnalysis": { "distanceMeters": 3635, "allowedRadiusMeters": 100, "inRange": false },
    "alert": {
      "severity": "CRITICAL",
      "title": "Sticker-Over-QR Tamper Detected",
      "explanation": "You are scanning a QR registered to Haldirams while 3.6km away. Do NOT pay."
    }
  }
}
```

---

## 6. Certificates & Face Blob (B2)

### POST `/api/certificates/face-blob`
```json
// Request
{
  "certificateId": "cmt7cgjod003my6ltz9yr8gm9",
  "encryptedBase64": "ZW5j...",
  "ivBase64": "MTIz...",
  "authTagBase64": "MTIz..."
}

// Response 201 Created
{
  "success": true,
  "data": {
    "faceBlobId": "cmt7g95bz...",
    "expiresAt": "2026-08-25T16:14:52.795Z",
    "ttlHours": 24,
    "message": "Encrypted face blob stored. Viewable once by sender."
  }
}
```

### GET `/api/certificates/face-blob/:id`
```json
// Response 200 OK (First View)
{
  "success": true,
  "data": {
    "faceBlobId": "cmt7...",
    "encryptedBase64": "ZW5j...",
    "ivBase64": "MTIz...",
    "authTagBase64": "MTIz...",
    "viewCountdownSeconds": 10,
    "autoDeleteInSeconds": 60,
    "warning": "Key and blob will be destroyed permanently after countdown."
  }
}

// Response 410 GONE (Second View)
{
  "success": false,
  "error": {
    "code": "GONE",
    "message": "This face confirmation was already viewed and has been permanently purged."
  }
}
```

---

## 7. Complaints & Admin (B2)

### POST `/api/complaints`
```json
// Request
{
  "targetVpa": "haldirams@okhdfc",
  "category": "HARASSMENT",
  "description": "Received unsolicited payment requests repeatedly."
}

// Response 201 Created (409 if duplicate in 24h, 429 if >5/day)
{
  "success": true,
  "data": {
    "complaintId": "cmt7g...",
    "targetVpa": "haldirams@okhdfc",
    "category": "HARASSMENT",
    "status": "PENDING"
  }
}
```

### GET `/api/admin/stats`
```json
// Response 200 OK
{
  "success": true,
  "data": {
    "overview": { "totalUsers": 12, "totalTransactions": 30, "volumePaisa": 11802000, "blocked": 2 },
    "riskMetrics": { "passCount": 24, "warnCount": 1, "challengeCount": 3, "blockCount": 2 },
    "complaints": { "totalFiled": 17, "pendingReview": 16, "verifiedFraud": 1, "rejected": 0 }
  }
}
```

### GET `/api/admin/top-flagged`
```json
// Response 200 OK
{
  "success": true,
  "data": {
    "topFlagged": [
      {
        "vpa": "tanvi@okicici",
        "complaintCount": 8,
        "primaryCategory": "FRAUD",
        "calculatedRiskScore": 95,
        "blockedAttempts": 24
      }
    ]
  }
}
```

---

## 8. Errors & Test Data

**Standard Error Format:**
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST", // BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, GONE
    "message": "Human-readable explanation"
  }
}
```

**Seeded Accounts for Testing:**
*PIN is `1234` for all transactions.*

| Name | Phone | Password | VPA | Notes |
|------|-------|----------|-----|-------|
| Aarav Sharma | 9876543210 | Password@123 | aarav@okaxis | Standard User |
| Aditya Patel | 9876543211 | Password@123 | aditya@okicici | Standard User |
| Tanvi Joshi | 9876543219 | Password@123 | tanvi@okicici | High risk (88 score) |
| Admin Portal | 9999999999 | Password@123 | admin@spyde | Admin User |
```