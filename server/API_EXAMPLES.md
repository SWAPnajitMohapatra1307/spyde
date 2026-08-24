# SPYDE — B2 API Examples & Contract Reference

**Base URL:** `http://localhost:5000/api` (Development)  
**Security Standard:** DPDP Act (2023) Compliant • AES-256-GCM • SHA-256 Fingerprinting • HS256 JWT

---

## 1. QR Tamper Detection (Pillar 3)

### `POST /api/qr/verify`
Evaluates a scanned UPI deep-link QR code payload against the Merchant Registry and device GPS coordinates using Haversine distance.

#### Request (VERIFIED Case)
```json
{
  "qrPayload": "upi://pay?pa=haldirams@okhdfc&pn=Haldirams%20Restaurant&am=250",
  "deviceLat": 28.613,
  "deviceLng": 77.209
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "verdict": "VERIFIED",
    "merchant": {
      "businessName": "Haldirams Restaurant",
      "vpa": "haldirams@okhdfc",
      "businessType": "RETAIL",
      "isVerified": true
    },
    "geoAnalysis": {
      "distanceMeters": 0,
      "allowedRadiusMeters": 100,
      "inRange": true
    },
    "message": "Official merchant QR verified."
  }
}
```

#### Request (TAMPERED Case — 3.6km discrepancy)
```json
{
  "qrPayload": "upi://pay?pa=haldirams@okhdfc&pn=Haldirams%20Restaurant&am=250",
  "deviceLat": 28.640,
  "deviceLng": 77.230
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "verdict": "TAMPERED",
    "merchant": {
      "businessName": "Haldirams Restaurant",
      "vpa": "haldirams@okhdfc",
      "isVerified": true
    },
    "geoAnalysis": {
      "distanceMeters": 3635,
      "allowedRadiusMeters": 100,
      "inRange": false
    },
    "alert": {
      "severity": "CRITICAL",
      "title": "Sticker-Over-QR Tamper Detected",
      "explanation": "You are scanning a QR registered to Haldirams Restaurant while your device is 4 km away. Do NOT pay."
    }
  }
}
```

---

## 2. Interactive Liveness API (Pillar 2)

### `POST /api/liveness/challenge`
Generates a 4-digit challenge code with a 60-second TTL linked to an escrowed transaction.

#### Headers
`Authorization: Bearer <JWT_TOKEN>`

#### Request
```json
{
  "transactionId": "cmt7cgj4r002yy6lt6ta9iai9"
}
```

#### Response (`200 OK`)
```json
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

### `POST /api/liveness/verify`
Validates face embedding hash, blink count, and challenge code. Releases escrow atomically upon passing.

#### Request
```json
{
  "challengeId": "cmt7g94wk000113xjz1nwxk27",
  "challengeCode": "3543",
  "clientScore": 90,
  "blinkCount": 3,
  "faceEmbeddingHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "sessionId": "cmt7g94wk000113xjz1nwxk27",
    "verdict": "PASS",
    "totalScore": 115,
    "breakdown": {
      "clientScore": 90,
      "serverChallengeBonus": 25
    },
    "livenessToken": "liv_token_cmt7g94wk000113xjz1nwxk27_authorized",
    "message": "Liveness check passed. Proceed to transaction confirmation."
  }
}
```

---

## 3. View-Once Face Biometrics & DPDP Purge (Pillar 5)

### `POST /api/certificates/face-blob`
Uploads AES-256-GCM encrypted biometric confirmation blob (max 500KB).

#### Request
```json
{
  "certificateId": "cmt7cgjod003my6ltz9yr8gm9",
  "encryptedBase64": "ZW5jcnlwdGVkX2ZhY2VfcGF5bG9hZF9kZW1v",
  "ivBase64": "MTIzNDU2Nzg5MDEy",
  "authTagBase64": "MTIzNDU2Nzg5MDEyMzQ1Ng=="
}
```

#### Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "faceBlobId": "cmt7g95bz000313xj07raw3yr",
    "expiresAt": "2026-08-25T16:14:52.795Z",
    "ttlHours": 24,
    "message": "Encrypted face blob stored. Viewable once by sender."
  }
}
```

### `GET /api/certificates/face-blob/:id` (First View — 200 OK)
```json
{
  "success": true,
  "data": {
    "faceBlobId": "cmt7g95bz000313xj07raw3yr",
    "encryptedBase64": "ZW5jcnlwdGVkX2ZhY2VfcGF5bG9hZF9kZW1v",
    "ivBase64": "MTIzNDU2Nzg5MDEy",
    "authTagBase64": "MTIzNDU2Nzg5MDEyMzQ1Ng==",
    "viewCountdownSeconds": 10,
    "autoDeleteInSeconds": 60,
    "warning": "Key and blob will be destroyed permanently after countdown."
  }
}
```

### `GET /api/certificates/face-blob/:id` (Second View — 410 Gone)
```json
{
  "success": false,
  "error": {
    "code": "GONE",
    "message": "This face confirmation was already viewed and has been permanently purged from server memory (DPDP Compliance)."
  }
}
```

---

## 4. Complaints System (24-Hour Rate Limiting)

### `POST /api/complaints`
Registers a community fraud complaint against a VPA.

#### Request
```json
{
  "targetVpa": "haldirams@okhdfc",
  "category": "HARASSMENT",
  "description": "Received unsolicited payment requests repeatedly."
}
```

#### Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "complaintId": "cmt7g967x000513xj5g9fozea",
    "targetVpa": "haldirams@okhdfc",
    "category": "HARASSMENT",
    "status": "PENDING",
    "createdAt": "2026-08-24T16:14:55.120Z",
    "message": "Complaint logged. Community fraud score updated for this handle."
  }
}
```

#### Response on Duplicate within 24h (`409 Conflict`)
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "A complaint for this category was already filed against this VPA within the last 24 hours."
  }
}
```

---

## 5. Admin Dashboard APIs

### `GET /api/admin/stats`
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 12,
      "totalTransactions": 30,
      "totalVolumePaisa": 11802000,
      "blockedTransactions": 2,
      "preventedLossPaisa": 3500000
    },
    "riskMetrics": {
      "passCount": 24,
      "warnCount": 1,
      "challengeCount": 3,
      "blockCount": 2
    },
    "complaints": {
      "totalFiled": 17,
      "pendingReview": 16,
      "verifiedFraud": 1,
      "rejected": 0
    }
  }
}
```

### `GET /api/admin/top-flagged`
```json
{
  "success": true,
  "data": {
    "topFlagged": [
      {
        "vpa": "tanvi@okicici",
        "complaintCount": 8,
        "primaryCategory": "FRAUD",
        "calculatedRiskScore": 95,
        "blockedAttempts": 24,
        "lastActive": "2026-08-24T15:14:50.278Z"
      }
    ]
  }
}
```
