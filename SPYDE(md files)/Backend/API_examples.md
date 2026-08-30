# SPYDE — Complete API Specification & Curl Examples

**Document Version:** 1.0 (Round 2 Production Build)
**Owner:** B2 (Backend Support)
**Base URL (Local):** `http://localhost:5000/api`
**Base URL (Production):** `https://api.spyde.dev/api`
**Status:** LOCKED — All route signatures, input schemas, and output contracts are strictly enforced.

---

## 0. Global Standards & Envelope Formats

### 0.1 Standard Headers
```http
Content-Type: application/json
Authorization: Bearer <ACCESS_TOKEN>
Idempotency-Key: <UUID_V4>          # Optional/Required for state-changing payment routes
```

### 0.2 Standard Success Response Envelope
All non-binary 2xx responses adhere to the standard JSON envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-02-23T14:32:00.123Z",
    "requestId": "req_cuid1234567890"
  }
}
```

### 0.3 Standard Error Response Envelope
All 4xx/5xx responses adhere to the standard error envelope:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Human-readable description of error.",
    "details": [
      {
        "field": "amountPaisa",
        "issue": "Amount must be at least 100 paisa (₹1)"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-02-23T14:32:00.123Z",
    "requestId": "req_cuid1234567890"
  }
}
```

### 0.4 Standard Error Codes
| Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing, malformed, or expired access token |
| `FORBIDDEN` | 403 | Insufficient permissions (e.g., non-admin hitting admin route) |
| `NOT_FOUND` | 404 | Entity not found |
| `VALIDATION_ERROR` | 400 | Payload fails Zod schema validation |
| `CONFLICT` | 409 | Duplicate entity (e.g., phone, VPA, complaint in 24h) |
| `RATE_LIMITED` | 429 | Rate limit threshold exceeded |
| `PAYMENT_BLOCKED` | 403 | Risk engine calculated riskScore ≥ 90 |
| `GONE` | 410 | Resource expired or consumed (e.g., face blob viewed) |
| `INTERNAL_ERROR` | 500 | Uncaught exception on server |

---

## 1. Authentication Endpoints

### 1.1 `POST /auth/register`
Creates a new user account, creates a primary simulated bank account (₹10,000 balance), and creates a primary UPI VPA handle.

- **Access:** Public
- **Rate Limit:** 5 requests / IP / hour

#### Request:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "email": "alice@example.com",
    "password": "SecurePassword123!",
    "name": "Alice Sharma",
    "desiredHandle": "alice"
  }'
```

#### Success Response (`201 Created`):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_clx9876543210001",
      "phone": "9876543210",
      "email": "alice@example.com",
      "name": "Alice Sharma",
      "riskScore": 0,
      "isAdmin": false,
      "createdAt": "2025-02-23T14:30:00.000Z"
    },
    "vpa": "alice@spyde",
    "bankAccount": {
      "id": "acc_clx9876543210002",
      "ifsc": "SBIN0000001",
      "accountNumberMasked": "XXXXXX4321",
      "balancePaisa": 1000000
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "ref_clx9876543210003_randomstring12345",
      "expiresIn": 900
    }
  },
  "meta": {
    "timestamp": "2025-02-23T14:30:00.100Z",
    "requestId": "req_clx9876543210004"
  }
}
```

#### Error Response (`409 Conflict`):
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "User with this phone number or UPI handle already exists."
  },
  "meta": {
    "timestamp": "2025-02-23T14:30:00.100Z",
    "requestId": "req_clx9876543210005"
  }
}
```

---

### 1.2 `POST /auth/login`
Authenticates a user via phone and password, issuing access and refresh tokens.

- **Access:** Public
- **Rate Limit:** 10 requests / IP / hour

#### Request:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "password": "SecurePassword123!"
  }'
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_clx9876543210001",
      "phone": "9876543210",
      "email": "alice@example.com",
      "name": "Alice Sharma",
      "riskScore": 0,
      "isAdmin": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "ref_clx9876543210003_randomstring12345",
      "expiresIn": 900
    }
  },
  "meta": {
    "timestamp": "2025-02-23T14:31:00.000Z",
    "requestId": "req_clx9876543210006"
  }
}
```

---

### 1.3 `POST /auth/refresh`
Exchanges a valid refresh token for a new access token and rotated refresh token.

- **Access:** Public (Token-bound)

#### Request:
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "ref_clx9876543210003_randomstring12345"
  }'
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new...",
      "refreshToken": "ref_clx9876543210007_newrandomstring67890",
      "expiresIn": 900
    }
  },
  "meta": {
    "timestamp": "2025-02-23T14:32:00.000Z",
    "requestId": "req_clx9876543210008"
  }
}
```

---

### 1.4 `POST /auth/logout`
Revokes the refresh token and invalidates active session cache.

- **Access:** Authenticated (Bearer Token)

#### Request:
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "ref_clx9876543210007_newrandomstring67890"
  }'
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully. Refresh token revoked."
  },
  "meta": {
    "timestamp": "2025-02-23T14:33:00.000Z",
    "requestId": "req_clx9876543210009"
  }
}
```

---

### 1.5 `GET /me`
Returns the logged-in user profile, all bank accounts, UPI handles, and active Safe Circle count.

- **Access:** Authenticated (Bearer Token)

#### Request:
```bash
curl -X GET http://localhost:5000/api/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "usr_clx9876543210001",
    "phone": "9876543210",
    "email": "alice@example.com",
    "name": "Alice Sharma",
    "riskScore": 0,
    "isAdmin": false,
    "bankAccounts": [
      {
        "id": "acc_clx9876543210002",
        "ifsc": "SBIN0000001",
        "accountNumberMasked": "XXXXXX4321",
        "accountType": "SAVINGS",
        "balancePaisa": 1000000
      }
    ],
    "upiHandles": [
      {
        "id": "hdl_clx9876543210001",
        "vpa": "alice@spyde",
        "isPrimary": true
      }
    ],
    "safeCircleCount": 3,
    "createdAt": "2025-02-23T14:30:00.000Z"
  },
  "meta": {
    "timestamp": "2025-02-23T14:34:00.000Z",
    "requestId": "req_clx9876543210010"
  }
}
```

---

## 2. VPA & Payment Flow Endpoints

### 2.1 `POST /vpa/resolve`
Resolves whether a target VPA exists, identifies the account owner display name, and runs an instantaneous pre-check for typosquatting warnings.

- **Access:** Authenticated (Bearer Token)

#### Request:
```bash
curl -X POST http://localhost:5000/api/vpa/resolve \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "vpa": "bob@oksdi"
  }'
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "vpa": "bob@oksdi",
    "exists": true,
    "name": "Bob (Spoofed SBI)",
    "isMerchant": false,
    "preCheck": {
      "isTypoSuspect": true,
      "suggestedVpa": "bob@oksbi",
      "warning": "The handle '@oksdi' resembles official bank handle '@oksbi'."
    }
  },
  "meta": {
    "timestamp": "2025-02-23T14:35:00.000Z",
    "requestId": "req_clx9876543210011"
  }
}
```

---

### 2.2 `POST /payment/initiate`
Initiates a transaction, executes the complete 3-layer Risk Engine assessment (Algo + Community + Graph), and records the pending transaction state.

- **Access:** Authenticated (Bearer Token)
- **Headers:** `Idempotency-Key` (Optional, Recommended)

#### Request (Normal Transfer - PASS):
```bash
curl -X POST http://localhost:5000/api/payment/initiate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Idempotency-Key: 7b31e9a7-582d-4224-a74e-4f012211910a" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverVpa": "bob@spyde",
    "amountPaisa": 50000,
    "note": "Dinner split"
  }'
```

#### Success Response (`200 OK` - Verdict: PASS):
```json
{
  "success": true,
  "data": {
    "transactionId": "tx_clx9876543210012",
    "status": "PENDING",
    "amountPaisa": 50000,
    "receiverVpa": "bob@spyde",
    "receiverName": "Bob Kumar",
    "riskAssessment": {
      "verdict": "PASS",
      "riskScore": 10,
      "breakdown": {
        "algoScore": 10,
        "communityScore": 0,
        "graphBonus": 0
      },
      "signals": [
        {
          "type": "NEW_PAYEE",
          "weight": 10,
          "reason": "First time transacting with this receiver."
        }
      ],
      "requiresLiveness": false,
      "challengeCode": null
    }
  },
  "meta": {
    "timestamp": "2025-02-23T14:36:00.000Z",
    "requestId": "req_clx9876543210013"
  }
}
```

#### Success Response (`200 OK` - Verdict: WARN):
```json
{
  "success": true,
  "data": {
    "transactionId": "tx_clx9876543210014",
    "status": "PENDING",
    "amountPaisa": 150000,
    "receiverVpa": "bob@oksdi",
    "receiverName": "Bob Typosquat",
    "riskAssessment": {
      "verdict": "WARN",
      "riskScore": 55,
      "breakdown": {
        "algoScore": 30,
        "communityScore": 25,
        "graphBonus": 0
      },
      "signals": [
        {
          "type": "TYPOSQUAT_HANDLE",
          "weight": 20,
          "reason": "Handle '@oksdi' has Levenshtein distance of 1 to '@oksbi'."
        },
        {
          "type": "NEW_PAYEE",
          "weight": 10,
          "reason": "First transaction with target account."
        },
        {
          "type": "COMMUNITY_REPORT",
          "weight": 25,
          "reason": "1 active FRAUD report filed against this handle."
        }
      ],
      "requiresLiveness": false,
      "challengeCode": null
    }
  },
  "meta": {
    "timestamp": "2025-02-23T14:37:00.000Z",
    "requestId": "req_clx9876543210015"
  }
}
```

#### Error Response (`403 Forbidden` - Verdict: BLOCK):
```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_BLOCKED",
    "message": "Payment blocked due to critical fraud risk. Risk score: 95.",
    "details": [
      {
        "type": "GRAPH_MULE_ASSOCIATION",
        "weight": 15,
        "reason": "Receiver received funds from 4 previously banned mule accounts."
      },
      {
        "type": "COMMUNITY_FRAUD_ACCUMULATION",
        "weight": 50,
        "reason": "Receiver has 6 verified fraud complaints in the last 7 days."
      },
      {
        "type": "HIGH_VALUE_FIRST_TXN",
        "weight": 15,
        "reason": "Large initial transaction to unverified account."
      },
      {
        "type": "TYPOSQUAT_HANDLE",
        "weight": 20,
        "reason": "Handle '@cdfc' mimics '@hdfc'."
      }
    ]
  },
  "meta": {
    "timestamp": "2025-02-23T14:38:00.000Z",
    "requestId": "req_clx9876543210016"
  }
}
```

---

### 2.3 `POST /payment/confirm`
Validates the simulated UPI PIN, moves funds atomically across sandbox ledgers, marks the transaction as SUCCESS, and automatically generates the signed cryptographic certificate.

- **Access:** Authenticated (Bearer Token)

#### Request:
```bash
curl -X POST http://localhost:5000/api/payment/confirm \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "tx_clx9876543210012",
    "pin": "1234"
  }'
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "transactionId": "tx_clx9876543210012",
    "status": "SUCCESS",
    "amountPaisa": 50000,
    "senderVpa": "alice@spyde",
    "receiverVpa": "bob@spyde",
    "balanceRemainingPaisa": 950000,
    "completedAt": "2025-02-23T14:39:00.000Z",
    "certificate": {
      "certificateId": "crt_clx9876543210017",
      "payloadHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "jwtSignature": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.signature...",
      "issuedAt": "2025-02-23T14:39:00.050Z"
    }
  },
  "meta": {
    "timestamp": "2025-02-23T14:39:00.100Z",
    "requestId": "req_clx9876543210018"
  }
}
```

#### Error Response (`400 Bad Request` - Wrong PIN):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid UPI PIN. 2 attempts remaining."
  },
  "meta": {
    "timestamp": "2025-02-23T14:39:05.000Z",
    "requestId": "req_clx9876543210019"
  }
}
```

---

### 2.4 `GET /payment/history`
Returns paginated transaction history for the authenticated user.

- **Access:** Authenticated (Bearer Token)
- **Query Params:** `page=1`, `limit=10`, `status=SUCCESS`

#### Request:
```bash
curl -X GET "http://localhost:5000/api/payment/history?page=1&limit=2" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx_clx9876543210012",
        "senderId": "usr_clx9876543210001",
        "senderVpa": "alice@spyde",
        "receiverVpa": "bob@spyde",
        "amountPaisa": 50000,
        "status": "SUCCESS",
        "riskVerdict": "PASS",
        "riskScore": 10,
        "certificateId": "crt_clx9876543210017",
        "createdAt": "2025-02-23T14:36:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalRecords": 1,
      "limit": 2
    }
  },
  "meta": {
    "timestamp": "2025-02-23T14:40:00.000Z",
    "requestId": "req_clx9876543210020"
  }
}
```

---

## 3. Safe Circle Endpoints (Pillar 4)

### 3.1 `GET /circle`
Returns all trusted contacts in the authenticated user's Safe Circle.

- **Access:** Authenticated (Bearer Token)

#### Request:
```bash
curl -X GET http://localhost:5000/api/circle \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "sc_clx9876543210021",
        "contactVpa": "bob@spyde",
        "contactName": "Bob (Brother)",
        "addedAt": "2025-02-20T10:00:00.000Z",
        "safetyNetWarning": false
      },
      {
        "id": "sc_clx9876543210022",
        "contactVpa": "compromised_charlie@spyde",
        "contactName": "Charlie Landlord",
        "addedAt": "2025-01-15T12:00:00.000Z",
        "safetyNetWarning": true,
        "safetyNetReason": "This contact has accumulated 12 recent fraud complaints."
      }
    ],
    "totalCount": 2,
    "maxLimit": 20
  },
  "meta": {
    "timestamp": "2025-02-23T14:41:00.000Z",
    "requestId": "req_clx9876543210023"
  }
}
```

---

### 3.2 `POST /circle/add`
Adds a verified contact to the Safe Circle (limit: 20 contacts).

- **Access:** Authenticated (Bearer Token)

#### Request:
```bash
curl -X POST http://localhost:5000/api/circle/add \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "contactVpa": "mom@spyde",
    "contactName": "Mom"
  }'
```

#### Success Response (`201 Created`):
```json
{
  "success": true,
  "data": {
    "contact": {
      "id": "sc_clx9876543210024",
      "contactVpa": "mom@spyde",
      "contactName": "Mom",
      "addedAt": "2025-02-23T14:42:00.000Z"
    },
    "message": "Contact added to Safe Circle. Payments to mom@spyde will skip risk screening."
  },
  "meta": {
    "timestamp": "2025-02-23T14:42:00.100Z",
    "requestId": "req_clx9876543210025"
  }
}
```

---

### 3.3 `DELETE /circle/:id`
Removes a contact from the Safe Circle.

- **Access:** Authenticated (Bearer Token)

#### Request:
```bash
curl -X DELETE http://localhost:5000/api/circle/sc_clx9876543210024 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "message": "Contact removed from Safe Circle successfully."
  },
  "meta": {
    "timestamp": "2025-02-23T14:43:00.000Z",
    "requestId": "req_clx9876543210026"
  }
}
```

---

## 4. Liveness Engine Endpoints (Pillar 2)

### 4.1 `POST /liveness/challenge`
Issues an ephemeral, server-signed 4-digit challenge code with a 60-second TTL in Redis.

- **Access:** Authenticated (Bearer Token)

#### Request:
```bash
curl -X POST http://localhost:5000/api/liveness/challenge \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "tx_clx9876543210014"
  }'
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "challengeId": "lch_clx9876543210027",
    "challengeCode": "8492",
    "expiresAt": "2025-02-23T14:45:00.000Z",
    "ttlSeconds": 60
  },
  "meta": {
    "timestamp": "2025-02-23T14:44:00.000Z",
    "requestId": "req_clx9876543210028"
  }
}
```

---

### 4.2 `POST /liveness/verify`
Receives the client-side computer vision scoring payload (face landmarks + blinks + YOLO anti-spoof) alongside the SHA-256 hash of face embeddings, combines with the server challenge credit (+25), and issues a PASS/FAIL verdict.

- **Access:** Authenticated (Bearer Token)

#### Request:
```bash
curl -X POST http://localhost:5000/api/liveness/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "challengeId": "lch_clx9876543210027",
    "challengeCode": "8492",
    "clientScore": 65,
    "blinkCount": 2,
    "faceEmbeddingHash": "8f462a2643f17440f353d93ec91374011ab7a28e4a774b377aedd2d664991650"
  }'
```

#### Success Response (`200 OK` - Liveness Verified):
```json
{
  "success": true,
  "data": {
    "sessionId": "lss_clx9876543210029",
    "verdict": "PASS",
    "totalScore": 90,
    "breakdown": {
      "clientScore": 65,
      "serverChallengeBonus": 25
    },
    "livenessToken": "liv_token_clx9876543210030_authorized",
    "message": "Liveness check passed. Proceed to transaction confirmation."
  },
  "meta": {
    "timestamp": "2025-02-23T14:44:35.000Z",
    "requestId": "req_clx9876543210031"
  }
}
```

#### Error Response (`400 Bad Request` - Score Below Threshold):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Liveness check failed. Total score 55 is below required threshold of 75.",
    "details": [
      {
        "field": "clientScore",
        "issue": "Insufficient blinks detected or spoof probability high."
      }
    ]
  },
  "meta": {
    "timestamp": "2025-02-23T14:44:35.000Z",
    "requestId": "req_clx9876543210032"
  }
}
```

---

## 5. QR Code Tamper Detection Endpoints (Pillar 3)

### 5.1 `POST /qr/verify`
Decodes an incoming raw UPI QR payload, matches it against the verified Merchant Registry, and calculates the Haversine geographic distance between device GPS coordinates and registered merchant coordinates.

- **Access:** Authenticated (Bearer Token)

#### Request 1: Legitimate Scan (Bengaluru Starbucks):
```bash
curl -X POST http://localhost:5000/api/qr/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "qrPayload": "upi://pay?pa=starbucks.indiranagar@spyde&pn=Starbucks%20Coffee&mc=5812&cu=INR",
    "deviceLat": 12.9784,
    "deviceLng": 77.6408
  }'
```

#### Success Response (`200 OK` - VERIFIED):
```json
{
  "success": true,
  "data": {
    "verdict": "VERIFIED",
    "merchant": {
      "businessName": "Starbucks Coffee (Indiranagar)",
      "vpa": "starbucks.indiranagar@spyde",
      "businessType": "RESTAURANT",
      "isVerified": true
    },
    "geoAnalysis": {
      "distanceMeters": 18,
      "allowedRadiusMeters": 100,
      "inRange": true
    },
    "message": "Official merchant QR verified."
  },
  "meta": {
    "timestamp": "2025-02-23T14:46:00.000Z",
    "requestId": "req_clx9876543210033"
  }
}
```

#### Request 2: Tampered Sticker Attack (QR spoofed 850 km away):
```bash
curl -X POST http://localhost:5000/api/qr/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "qrPayload": "upi://pay?pa=starbucks.indiranagar@spyde&pn=Starbucks%20Coffee&mc=5812&cu=INR",
    "deviceLat": 19.0760,
    "deviceLng": 72.8777
  }'
```

#### Success Response (`200 OK` - TAMPERED):
```json
{
  "success": true,
  "data": {
    "verdict": "TAMPERED",
    "merchant": {
      "businessName": "Starbucks Coffee (Indiranagar)",
      "vpa": "starbucks.indiranagar@spyde",
      "isVerified": true
    },
    "geoAnalysis": {
      "distanceMeters": 842150,
      "allowedRadiusMeters": 100,
      "inRange": false
    },
    "alert": {
      "severity": "CRITICAL",
      "title": "Sticker-Over-QR Tamper Detected",
      "explanation": "You are scanning a QR registered to Bengaluru while your device is located in Mumbai (842 km away). Do NOT pay."
    }
  },
  "meta": {
    "timestamp": "2025-02-23T14:47:00.000Z",
    "requestId": "req_clx9876543210034"
  }
}
```

---

## 6. Community Complaints System Endpoints

### 6.1 `POST /complaints`
Files a fraud complaint against a target VPA. Deduplicates requests within 24 hours and triggers community score re-computation.

- **Access:** Authenticated (Bearer Token)

#### Request:
```bash
curl -X POST http://localhost:5000/api/complaints \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "targetVpa": "scammer99@spyde",
    "category": "FRAUD",
    "description": "User pretended to be electricity board officer and demanded ₹2,500 deposit under threat of power cut.",
    "evidenceUrl": "https://evidence.spyde.dev/screens/proof_123.png",
    "transactionId": "tx_clx9876543210014"
  }'
```

#### Success Response (`201 Created`):
```json
{
  "success": true,
  "data": {
    "complaintId": "cmp_clx9876543210035",
    "targetVpa": "scammer99@spyde",
    "category": "FRAUD",
    "status": "PENDING",
    "createdAt": "2025-02-23T14:48:00.000Z",
    "message": "Complaint logged. Community fraud score updated for this handle."
  },
  "meta": {
    "timestamp": "2025-02-23T14:48:00.100Z",
    "requestId": "req_clx9876543210036"
  }
}
```

---

### 6.2 `GET /complaints/against/:vpa`
Returns aggregate community reputation statistics for any VPA (public safety query).

- **Access:** Authenticated (Bearer Token)

#### Request:
```bash
curl -X GET http://localhost:5000/api/complaints/against/scammer99@spyde \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "targetVpa": "scammer99@spyde",
    "totalComplaints": 4,
    "verifiedComplaints": 2,
    "breakdown": {
      "FRAUD": 3,
      "IMPERSONATION": 1,
      "SPAM": 0
    },
    "communityRiskWeight": 50,
    "firstReportedAt": "2025-02-10T08:00:00.000Z",
    "lastReportedAt": "2025-02-23T14:48:00.000Z"
  },
  "meta": {
    "timestamp": "2025-02-23T14:49:00.000Z",
    "requestId": "req_clx9876543210037"
  }
}
```

---

## 7. Digital Evidence Certificate & View-Once Face (Pillar 5)

### 7.1 `GET /certificates/:id`
Fetches a signed cryptographic evidence certificate for a completed transaction.

- **Access:** Authenticated (Bearer Token)

#### Request:
```bash
curl -X GET http://localhost:5000/api/certificates/crt_clx9876543210017 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "certificateId": "crt_clx9876543210017",
    "transactionId": "tx_clx9876543210012",
    "payloadHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "jwtSignature": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "payload": {
      "txId": "tx_clx9876543210012",
      "senderVpa": "alice@spyde",
      "receiverVpa": "bob@spyde",
      "amountPaisa": 50000,
      "riskVerdict": "PASS",
      "riskScore": 10,
      "timestamp": "2025-02-23T14:39:00.000Z"
    },
    "hasViewOnceFace": true,
    "faceBlobId": "fcb_clx9876543210038",
    "isFaceViewed": false,
    "issuedAt": "2025-02-23T14:39:00.050Z"
  },
  "meta": {
    "timestamp": "2025-02-23T14:50:00.000Z",
    "requestId": "req_clx9876543210039"
  }
}
```

---

### 7.2 `POST /certificates/verify`
Public verification endpoint. Checks whether a provided payload hash matches the server's cryptographic JWT signature.

- **Access:** Public

#### Request:
```bash
curl -X POST http://localhost:5000/api/certificates/verify \
  -H "Content-Type: application/json" \
  -d '{
    "certificateId": "crt_clx9876543210017",
    "payloadHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }'
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "issuedAt": "2025-02-23T14:39:00.050Z",
    "verifiedBy": "SPYDE Trust Authority v1.0",
    "message": "Certificate signature matches ledger state. Content is tamper-proof."
  },
  "meta": {
    "timestamp": "2025-02-23T14:51:00.000Z",
    "requestId": "req_clx9876543210040"
  }
}
```

---

### 7.3 `POST /face-blob`
Uploads a client-side AES-256-GCM encrypted 200x200 face capture with initialization vector and auth tag. Server never receives plaintext.

- **Access:** Authenticated (Bearer Token)

#### Request:
```bash
curl -X POST http://localhost:5000/api/face-blob \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "certificateId": "crt_clx9876543210017",
    "encryptedBase64": "G3k8u1x...[encrypted_bytes]...==",
    "ivBase64": "q83v1Xb/1m==",
    "authTagBase64": "k729/xL90mQ=="
  }'
```

#### Success Response (`201 Created`):
```json
{
  "success": true,
  "data": {
    "faceBlobId": "fcb_clx9876543210038",
    "expiresAt": "2025-02-24T14:52:00.000Z",
    "ttlHours": 24,
    "message": "Encrypted face blob stored. Viewable once by sender."
  },
  "meta": {
    "timestamp": "2025-02-23T14:52:00.100Z",
    "requestId": "req_clx9876543210041"
  }
}
```

---

### 7.4 `GET /face-blob/:id`
Retrieves the encrypted face blob. Sets `isViewed = true` upon first retrieval and initiates a 60-second deletion purge timer.

- **Access:** Authenticated (Bearer Token - Sender Only)

#### Request (First View):
```bash
curl -X GET http://localhost:5000/api/face-blob/fcb_clx9876543210038 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Success Response (`200 OK` - First View):
```json
{
  "success": true,
  "data": {
    "faceBlobId": "fcb_clx9876543210038",
    "encryptedBase64": "G3k8u1x...[encrypted_bytes]...==",
    "ivBase64": "q83v1Xb/1m==",
    "authTagBase64": "k729/xL90mQ==",
    "viewCountdownSeconds": 10,
    "autoDeleteInSeconds": 60,
    "warning": "Key and blob will be destroyed permanently after countdown."
  },
  "meta": {
    "timestamp": "2025-02-23T14:53:00.000Z",
    "requestId": "req_clx9876543210042"
  }
}
```

#### Error Response (`410 Gone` - Second View Attempt):
```json
{
  "success": false,
  "error": {
    "code": "GONE",
    "message": "This face confirmation was already viewed and has been permanently purged from server memory (DPDP Compliance)."
  },
  "meta": {
    "timestamp": "2025-02-23T14:53:30.000Z",
    "requestId": "req_clx9876543210043"
  }
}
```

---

## 8. Admin & Analytics Endpoints

### 8.1 `GET /admin/stats`
Returns system-wide operational metrics and fraud prevention totals.

- **Access:** Admin Role Only (`isAdmin: true`)

#### Request:
```bash
curl -X GET http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9_ADMIN_TOKEN..."
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 1240,
      "totalTransactions": 8940,
      "totalVolumePaisa": 4529000000,
      "blockedTransactions": 312,
      "preventedLossPaisa": 158000000
    },
    "riskMetrics": {
      "passCount": 7820,
      "warnCount": 618,
      "challengeCount": 190,
      "blockCount": 312
    },
    "complaints": {
      "totalFiled": 84,
      "pendingReview": 12,
      "verifiedFraud": 68,
      "rejected": 4
    }
  },
  "meta": {
    "timestamp": "2025-02-23T14:55:00.000Z",
    "requestId": "req_clx9876543210044"
  }
}
```

---

### 8.2 `GET /admin/top-flagged`
Returns the top 10 most reported VPAs across the platform for automated blocking or law-enforcement exports.

- **Access:** Admin Role Only (`isAdmin: true`)

#### Request:
```bash
curl -X GET http://localhost:5000/api/admin/top-flagged \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9_ADMIN_TOKEN..."
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "topFlagged": [
      {
        "vpa": "scammer99@spyde",
        "complaintCount": 14,
        "primaryCategory": "FRAUD",
        "calculatedRiskScore": 95,
        "blockedAttempts": 42,
        "lastActive": "2025-02-23T14:48:00.000Z"
      },
      {
        "vpa": "electricity_bill@cdfc",
        "complaintCount": 11,
        "primaryCategory": "IMPERSONATION",
        "calculatedRiskScore": 90,
        "blockedAttempts": 29,
        "lastActive": "2025-02-23T11:20:00.000Z"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-02-23T14:56:00.000Z",
    "requestId": "req_clx9876543210045"
  }
}
```

---

### 8.3 `PATCH /admin/complaints/:id`
Moderates a filed complaint by marking it `VERIFIED` (1.5x score weight) or `REJECTED` (0x score weight).

- **Access:** Admin Role Only (`isAdmin: true`)

#### Request:
```bash
curl -X PATCH http://localhost:5000/api/admin/complaints/cmp_clx9876543210035 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9_ADMIN_TOKEN..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "VERIFIED",
    "adminNote": "Evidence screenshot confirmed authentic mule pattern."
  }'
```

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "complaintId": "cmp_clx9876543210035",
    "status": "VERIFIED",
    "updatedAt": "2025-02-23T14:57:00.000Z",
    "message": "Complaint verified. Associated VPA risk weight updated."
  },
  "meta": {
    "timestamp": "2025-02-23T14:57:00.100Z",
    "requestId": "req_clx9876543210046"
  }
}
```

---

**End of File 8 of 19 — `API_EXAMPLES.md`**

