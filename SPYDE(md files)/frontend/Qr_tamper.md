# SPYDE — Pillar 3: Merchant QR Tamper Detection Engine

**Document Version:** 1.0 (Round 2 Production Build)
**Owners:** B2 (Backend Support) & F2 (Frontend Support)
**Subsystem:** QR Payload Decoder + Geo-Verification Pipeline (`server/src/services/qr.service.ts`) + Client Scanner (`client/src/components/QRScanner.tsx`)
**Target Scan-to-Verdict Latency:** < 500ms end-to-end
**Geo Accuracy Requirement:** ±50m (standard GPS on mid-range Android)
**Status:** LOCKED — Parsing rules, distance thresholds, and verdict logic are strictly enforced.

---

## 0. Executive Summary

### 0.1 The Problem: Sticker-Over-QR Fraud

One of the most prevalent physical UPI fraud vectors in India is the **sticker-over-QR attack**:

1. A legitimate merchant (e.g., a tea stall) displays a printed UPI QR code at their counter.
2. A fraudster visits the shop when the owner is distracted and pastes their **own QR sticker** directly over the merchant's genuine QR.
3. Unsuspecting customers scan the tampered QR and unknowingly pay the fraudster instead of the merchant.
4. The customer only realizes the fraud when the merchant says "I didn't receive the payment."

This attack is devastating because:
- **It exploits physical trust** — customers assume the QR on the counter is legitimate.
- **It bypasses all digital security** — the payment itself is technically valid (correct PIN, sufficient funds).
- **It is nearly undetectable by traditional systems** — the transaction looks like a normal P2P transfer.

### 0.2 SPYDE's Solution: Geo-Anchored QR Verification

**SPYDE QR Tamper Detection (Pillar 3)** verifies that the physical location of the scanning device matches the registered location of the merchant whose VPA is encoded in the QR code.

The core insight: **A legitimate merchant's QR should only be scanned from within their physical premises.** If a customer scans a QR registered to a Bengaluru Starbucks while their GPS shows Mumbai, the QR has almost certainly been tampered with.

### 0.3 Five-Step Verification Pipeline

```
  Customer Scans QR Code
        │
        ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Step 1: DECODE                                         │
  │  Parse raw QR string → Extract UPI fields               │
  │  (pa=, pn=, am=, cu=, mc=, tn=, tr=)                    │
  │  Validate VPA format                                    │
  └──────────────────────┬──────────────────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Step 2: GEO-LOCATE                                     │
  │  Request device GPS coordinates                         │
  │  (navigator.geolocation.getCurrentPosition)              │
  │  Accuracy check: reject if accuracy > 200m              │
  └──────────────────────┬──────────────────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Step 3: LOOKUP                                         │
  │  Query MerchantRegistry table by extracted VPA          │
  │  Retrieve: businessName, geoLat, geoLng, radiusMeters   │
  └──────────────────────┬──────────────────────────────────┘
                         │
                    VPA Found?
                    ├──── NO ────▶ VERDICT: UNVERIFIED (Yellow)
                    │              "This merchant is not registered."
                    │
                    YES
                    ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Step 4: DISTANCE CALCULATION                           │
  │  Haversine formula: device GPS vs. registered GPS       │
  │  Compare result against merchant's radiusMeters         │
  └──────────────────────┬──────────────────────────────────┘
                         │
                  Distance ≤ Radius?
                  ├──── NO ────▶ VERDICT: TAMPERED (Red)
                  │              "Location mismatch: 842 km away!"
                  │
                  YES
                  ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Step 5: VERDICT                                        │
  │  VERIFIED (Green)                                       │
  │  "Official merchant QR confirmed."                      │
  │  Display business name badge + Proceed to Pay           │
  └─────────────────────────────────────────────────────────┘
```

---

## 1. UPI QR Payload Specification

### 1.1 Standard UPI QR Format

UPI QR codes encode a URL-like string following the NPCI UPI Linking Specification:

```
upi://pay?pa=<VPA>&pn=<NAME>&mc=<MCC>&tr=<TXN_REF>&am=<AMOUNT>&cu=<CURRENCY>&tn=<NOTE>
```

### 1.2 Field Definitions

| Parameter | Required | Description | Example |
|---|---|---|---|
| `pa` | **YES** | Payee VPA (Virtual Payment Address) | `starbucks.indiranagar@spyde` |
| `pn` | **YES** | Payee Name (URL-encoded) | `Starbucks%20Coffee` |
| `mc` | No | Merchant Category Code (4-digit MCC) | `5812` (Restaurants) |
| `tr` | No | Transaction Reference ID | `TXN20250223001` |
| `am` | No | Fixed Amount (if pre-filled) | `250.00` |
| `cu` | No | Currency Code | `INR` |
| `tn` | No | Transaction Note (URL-encoded) | `Latte%20x2` |

### 1.3 Parsing Rules

1. Strip `upi://pay?` prefix.
2. Split remaining string by `&`.
3. Split each segment by `=` to get key-value pairs.
4. URL-decode all values.
5. Validate `pa` field against VPA regex: `^[a-z0-9._-]{2,30}@[a-z]{2,10}$` (case-insensitive).
6. If `pa` is missing or invalid → reject as non-UPI QR.

---

## 2. Haversine Distance Formula

The Haversine formula calculates the great-circle distance between two points on a sphere given their latitudes and longitudes. This is critical for determining whether the scanning device is physically near the registered merchant location.

### 2.1 Mathematical Definition

$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta\lambda}{2}\right)$$

$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$

$$d = R \cdot c$$

Where:
- $\phi_1, \phi_2$ = latitudes in radians
- $\Delta\phi = \phi_2 - \phi_1$
- $\Delta\lambda = \lambda_2 - \lambda_1$ (longitude difference)
- $R = 6,371,000$ meters (Earth's mean radius)
- $d$ = distance in meters

### 2.2 TypeScript Implementation

```typescript
const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c);
}
```

### 2.3 Distance Examples

| Scenario | Device Location | Merchant Location | Distance | Typical Radius | Verdict |
|---|---|---|---|---|---|
| **Legitimate scan** | 12.9784°N, 77.6408°E (Indiranagar) | 12.9783°N, 77.6410°E | **24m** | 100m | `VERIFIED` |
| **Same city, wrong branch** | 12.9352°N, 77.6245°E (Koramangala) | 12.9783°N, 77.6410°E (Indiranagar) | **5.1km** | 100m | `TAMPERED` |
| **Sticker attack (inter-city)** | 19.0760°N, 72.8777°E (Mumbai) | 12.9783°N, 77.6410°E (Bengaluru) | **842km** | 100m | `TAMPERED` |
| **Large venue (stadium)** | 28.6129°N, 77.2295°E | 28.6130°N, 77.2290°E | **55m** | 500m | `VERIFIED` |

---

## 3. Verdict Classification

### 3.1 Verdict Matrix

| Verdict | Condition | UI Color | User Action |
|---|---|---|---|
| `VERIFIED` | VPA found in registry AND distance ≤ radiusMeters | 🟢 Green | Show business badge, proceed to pay with confidence |
| `UNVERIFIED` | VPA **not** found in MerchantRegistry | 🟡 Yellow | "This merchant is not registered with SPYDE. Proceed with caution." User may continue. |
| `TAMPERED` | VPA found in registry BUT distance > radiusMeters | 🔴 Red | **Hard warning.** "Sticker-over-QR tamper detected. Location mismatch: X km. Do NOT pay." + File Complaint CTA |

### 3.2 Radius Configuration by Merchant Type

| Business Type | Default Radius | Rationale |
|---|---|---|
| `RETAIL` (Kirana, tea stall) | 50m | Small physical footprint |
| `RESTAURANT` (Café, restaurant) | 100m | Single location, moderate size |
| `MALL` (Shopping complex) | 300m | Large building, GPS drift indoors |
| `STADIUM` (Events, concerts) | 500m | Very large venue |
| `ONLINE` (E-commerce) | ∞ (skip geo check) | No physical location — always `UNVERIFIED` |
| `SERVICE` (Plumber, electrician) | 1000m | Mobile merchant, wider range |

---

## 4. Backend Implementation

### 4.1 QR Verification Service (`server/src/services/qr.service.ts`)

```typescript
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const EARTH_RADIUS_METERS = 6_371_000;

const UPI_QR_REGEX = /^upi:\/\/pay\?(.+)$/i;
const VPA_REGEX = /^[a-z0-9._-]{2,30}@[a-z]{2,10}$/i;

interface UpiQrFields {
  pa: string;   // Payee VPA
  pn: string;   // Payee Name
  mc?: string;  // Merchant Category Code
  tr?: string;  // Transaction Reference
  am?: string;  // Amount
  cu?: string;  // Currency
  tn?: string;  // Note
}

interface QrVerdictResult {
  verdict: 'VERIFIED' | 'UNVERIFIED' | 'TAMPERED';
  merchant?: {
    businessName: string;
    vpa: string;
    businessType: string;
    isVerified: boolean;
  };
  geoAnalysis?: {
    distanceMeters: number;
    allowedRadiusMeters: number;
    inRange: boolean;
  };
  alert?: {
    severity: 'CRITICAL' | 'WARNING';
    title: string;
    explanation: string;
  };
  message: string;
}

export class QrVerificationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Full 5-step QR verification pipeline
   */
  public async verifyQR(
    qrPayload: string,
    deviceLat: number,
    deviceLng: number
  ): Promise<QrVerdictResult> {
    // ─── Step 1: DECODE ──────────────────────────────────
    const fields = this.decodeUpiQr(qrPayload);

    if (!fields) {
      return {
        verdict: 'UNVERIFIED',
        message: 'Invalid or non-UPI QR code format.'
      };
    }

    const vpa = fields.pa.toLowerCase().trim();

    if (!VPA_REGEX.test(vpa)) {
      return {
        verdict: 'UNVERIFIED',
        message: `Invalid VPA format in QR: ${fields.pa}`
      };
    }

    // ─── Step 2: GEO-LOCATE (validated client-side) ──────
    if (
      typeof deviceLat !== 'number' ||
      typeof deviceLng !== 'number' ||
      Math.abs(deviceLat) > 90 ||
      Math.abs(deviceLng) > 180
    ) {
      return {
        verdict: 'UNVERIFIED',
        message: 'Invalid device GPS coordinates.'
      };
    }

    // ─── Step 3: LOOKUP ──────────────────────────────────
    const merchant = await this.prisma.merchantRegistry.findUnique({
      where: { vpa }
    });

    if (!merchant) {
      return {
        verdict: 'UNVERIFIED',
        message: `VPA '${vpa}' is not registered in the SPYDE Merchant Registry. Proceed with caution.`
      };
    }

    // Skip geo check for online merchants
    if (merchant.businessType === 'ONLINE') {
      return {
        verdict: 'VERIFIED',
        merchant: {
          businessName: merchant.businessName,
          vpa: merchant.vpa,
          businessType: merchant.businessType,
          isVerified: merchant.isVerified
        },
        message: 'Online merchant verified. No geo-check required.'
      };
    }

    // ─── Step 4: DISTANCE CALCULATION ────────────────────
    const distanceMeters = this.haversineDistance(
      deviceLat,
      deviceLng,
      merchant.geoLat,
      merchant.geoLng
    );

    const inRange = distanceMeters <= merchant.radiusMeters;

    // ─── Step 5: VERDICT ─────────────────────────────────
    if (inRange) {
      return {
        verdict: 'VERIFIED',
        merchant: {
          businessName: merchant.businessName,
          vpa: merchant.vpa,
          businessType: merchant.businessType,
          isVerified: merchant.isVerified
        },
        geoAnalysis: {
          distanceMeters,
          allowedRadiusMeters: merchant.radiusMeters,
          inRange: true
        },
        message: 'Official merchant QR verified. Location confirmed.'
      };
    } else {
      // Format distance for human readability
      const distanceDisplay =
        distanceMeters >= 1000
          ? `${(distanceMeters / 1000).toFixed(0)} km`
          : `${distanceMeters} m`;

      return {
        verdict: 'TAMPERED',
        merchant: {
          businessName: merchant.businessName,
          vpa: merchant.vpa,
          businessType: merchant.businessType,
          isVerified: merchant.isVerified
        },
        geoAnalysis: {
          distanceMeters,
          allowedRadiusMeters: merchant.radiusMeters,
          inRange: false
        },
        alert: {
          severity: 'CRITICAL',
          title: 'Sticker-Over-QR Tamper Detected',
          explanation:
            `You are scanning a QR registered to ${merchant.businessName} ` +
            `(${this.getLocationName(merchant.geoLat, merchant.geoLng)}) ` +
            `but your device is located ${distanceDisplay} away. ` +
            `This QR may have been physically tampered with. Do NOT pay.`
        },
        message: `TAMPERED: Location mismatch of ${distanceDisplay}.`
      };
    }
  }

  /**
   * Step 1: Decode UPI QR payload string into structured fields
   */
  private decodeUpiQr(rawPayload: string): UpiQrFields | null {
    const match = rawPayload.trim().match(UPI_QR_REGEX);
    if (!match) return null;

    const queryString = match[1];
    const params = new URLSearchParams(queryString);

    const pa = params.get('pa');
    const pn = params.get('pn');

    if (!pa || !pn) return null;

    return {
      pa: decodeURIComponent(pa),
      pn: decodeURIComponent(pn),
      mc: params.get('mc') || undefined,
      tr: params.get('tr') || undefined,
      am: params.get('am') || undefined,
      cu: params.get('cu') || undefined,
      tn: params.get('tn') ? decodeURIComponent(params.get('tn')!) : undefined
    };
  }

  /**
   * Step 4: Haversine great-circle distance in meters
   */
  private haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const toRad = (deg: number) => deg * (Math.PI / 180);
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(EARTH_RADIUS_METERS * c);
  }

  /**
   * Helper: Reverse geocode approximation for alert messages
   */
  private getLocationName(lat: number, lng: number): string {
    // In production, use a reverse geocoding API (Mapbox, Google Maps)
    // For demo, use rough coordinate ranges
    if (lat > 12.9 && lat < 13.0 && lng > 77.5 && lng < 77.7) return 'Bengaluru';
    if (lat > 19.0 && lat < 19.2 && lng > 72.8 && lng < 73.0) return 'Mumbai';
    if (lat > 28.5 && lat < 28.7 && lng > 77.1 && lng < 77.3) return 'Delhi';
    if (lat > 13.0 && lat < 13.1 && lng > 80.2 && lng < 80.3) return 'Chennai';
    if (lat > 22.5 && lat < 22.6 && lng > 88.3 && lng < 88.4) return 'Kolkata';
    return `${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E`;
  }
}
```

### 4.2 QR Verification Route (`server/src/routes/qr.routes.ts`)

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { QrVerificationService } from '../services/qr.service';
import { prisma } from '../config/database';
import { z } from 'zod';

const router = Router();
const qrService = new QrVerificationService(prisma);

const QrVerifySchema = z.object({
  qrPayload: z.string().min(10, 'QR payload too short').max(500),
  deviceLat: z.number().min(-90).max(90),
  deviceLng: z.number().min(-180).max(180),
  deviceAccuracy: z.number().optional() // GPS accuracy in meters
});

// POST /api/qr/verify
router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = QrVerifySchema.parse(req.body);

    // Reject poor GPS accuracy (>200m)
    if (parsed.deviceAccuracy && parsed.deviceAccuracy > 200) {
      return res.json({
        success: true,
        data: {
          verdict: 'UNVERIFIED',
          message: 'GPS accuracy too low for reliable verification. Please enable high-accuracy location.'
        }
      });
    }

    const result = await qrService.verifyQR(
      parsed.qrPayload,
      parsed.deviceLat,
      parsed.deviceLng
    );

    // Log TAMPERED events to RiskEvent for community scoring
    if (result.verdict === 'TAMPERED' && req.user) {
      await prisma.riskEvent.create({
        data: {
          userId: req.user.id,
          eventType: 'QR_TAMPER_DETECTED',
          delta: 0, // QR tamper doesn't affect sender's score
          reason: result.alert?.explanation || result.message,
          source: 'QR_VERIFIER'
        }
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
```

### 4.3 Merchant Registry Seed Data (`prisma/seed.ts` excerpt)

```typescript
// Seed 10 verified merchants across Indian cities
const merchants = [
  {
    vpa: 'starbucks.indiranagar@spyde',
    businessName: 'Starbucks Coffee (Indiranagar)',
    businessType: 'RESTAURANT',
    isVerified: true,
    geoLat: 12.9784,
    geoLng: 77.6408,
    radiusMeters: 100,
    address: '100 Feet Rd, Indiranagar, Bengaluru'
  },
  {
    vpa: 'bigbazaar.connaught@spyde',
    businessName: 'Big Bazaar (Connaught Place)',
    businessType: 'RETAIL',
    isVerified: true,
    geoLat: 28.6315,
    geoLng: 77.2167,
    radiusMeters: 200,
    address: 'Connaught Place, New Delhi'
  },
  {
    vpa: 'phoenix.mall@spyde',
    businessName: 'Phoenix Marketcity',
    businessType: 'MALL',
    isVerified: true,
    geoLat: 19.0760,
    geoLng: 72.8777,
    radiusMeters: 300,
    address: 'Kurla, Mumbai'
  },
  {
    vpa: 'chaiwala.koramangala@spyde',
    businessName: 'Chai Point (Koramangala)',
    businessType: 'RESTAURANT',
    isVerified: true,
    geoLat: 12.9352,
    geoLng: 77.6245,
    radiusMeters: 50,
    address: '80 Feet Rd, Koramangala, Bengaluru'
  },
  {
    vpa: 'dmart.andheri@spyde',
    businessName: 'DMart (Andheri West)',
    businessType: 'RETAIL',
    isVerified: true,
    geoLat: 19.1197,
    geoLng: 72.8464,
    radiusMeters: 150,
    address: 'Andheri West, Mumbai'
  },
  {
    vpa: 'dominos.hsr@spyde',
    businessName: "Domino's Pizza (HSR Layout)",
    businessType: 'RESTAURANT',
    isVerified: true,
    geoLat: 12.9121,
    geoLng: 77.6440,
    radiusMeters: 80,
    address: '27th Main, HSR Layout, Bengaluru'
  },
  {
    vpa: 'amazon.in@spyde',
    businessName: 'Amazon India (Online)',
    businessType: 'ONLINE',
    isVerified: true,
    geoLat: 0,
    geoLng: 0,
    radiusMeters: 0,
    address: 'Online Only'
  },
  {
    vpa: 'irctc@spyde',
    businessName: 'IRCTC Railway Booking',
    businessType: 'ONLINE',
    isVerified: true,
    geoLat: 0,
    geoLng: 0,
    radiusMeters: 0,
    address: 'Online Only'
  },
  {
    vpa: 'jio.mart@spyde',
    businessName: 'JioMart (Kolkata)',
    businessType: 'RETAIL',
    isVerified: true,
    geoLat: 22.5726,
    geoLng: 88.3639,
    radiusMeters: 200,
    address: 'Park Street, Kolkata'
  },
  {
    vpa: 'swiggy@spyde',
    businessName: 'Swiggy (Food Delivery)',
    businessType: 'SERVICE',
    isVerified: true,
    geoLat: 12.9716,
    geoLng: 77.5946,
    radiusMeters: 1000,
    address: 'Bengaluru HQ (Mobile Service)'
  }
];

for (const m of merchants) {
  await prisma.merchantRegistry.upsert({
    where: { vpa: m.vpa },
    update: m,
    create: m
  });
}
```

---

## 5. Frontend Implementation

### 5.1 QR Scanner Component (`client/src/components/QRScanner.tsx`)

```tsx
import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, MapPin, ShieldCheck, AlertTriangle, ShieldAlert, X, Loader2 } from 'lucide-react';
import api from '../lib/api';

interface QrVerdict {
  verdict: 'VERIFIED' | 'UNVERIFIED' | 'TAMPERED';
  merchant?: {
    businessName: string;
    vpa: string;
    businessType: string;
    isVerified: boolean;
  };
  geoAnalysis?: {
    distanceMeters: number;
    allowedRadiusMeters: number;
    inRange: boolean;
  };
  alert?: {
    severity: string;
    title: string;
    explanation: string;
  };
  message: string;
}

export const QRScanner: React.FC<{ onScanComplete: (vpa: string, verdict: QrVerdict) => void }> = ({
  onScanComplete
}) => {
  const [scanning, setScanning] = useState(false);
  const [verdict, setVerdict] = useState<QrVerdict | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    setScanning(true);
    setVerdict(null);
    setGpsError(null);

    try {
      const scanner = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // Stop scanning immediately on first detection
          await scanner.stop();
          setScanning(false);
          await verifyQR(decodedText);
        },
        () => {} // Ignore scan errors (continuous)
      );
    } catch (err) {
      setScanning(false);
      setGpsError('Camera access denied. Please enable camera permissions.');
    }
  };

  const verifyQR = async (qrPayload: string) => {
    setIsVerifying(true);

    try {
      // Step 2: Get device GPS
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        });
      });

      const { latitude, longitude, accuracy } = position.coords;

      // Call server verification
      const res = await api.post('/qr/verify', {
        qrPayload,
        deviceLat: latitude,
        deviceLng: longitude,
        deviceAccuracy: accuracy
      });

      setVerdict(res.data.data);
    } catch (err: any) {
      if (err.code === 1) {
        setGpsError('Location permission denied. Cannot verify QR authenticity.');
      } else {
        setGpsError('Verification failed. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleProceed = () => {
    if (verdict?.merchant) {
      onScanComplete(verdict.merchant.vpa, verdict);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Scanner Viewport */}
      {!scanning && !verdict && (
        <div className="text-center space-y-4 py-8">
          <QrCode className="w-16 h-16 text-cyan-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Scan Merchant QR</h2>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Point your camera at a UPI QR code. SPYDE will verify the merchant's
            identity and check for physical tampering.
          </p>
          <button
            onClick={startScanner}
            className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm rounded-xl transition shadow-lg shadow-cyan-500/20"
          >
            Open Camera Scanner
          </button>
        </div>
      )}

      {scanning && (
        <div className="relative">
          <div id="qr-reader" className="rounded-2xl overflow-hidden border-2 border-cyan-500/30" />
          <button
            onClick={async () => {
              await scannerRef.current?.stop();
              setScanning(false);
            }}
            className="absolute top-3 right-3 p-2 bg-black/60 rounded-full text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">
            Align QR code within the frame...
          </p>
        </div>
      )}

      {/* Verifying State */}
      {isVerifying && (
        <div className="text-center py-12 space-y-3">
          <Loader2 className="w-10 h-10 text-cyan-400 mx-auto animate-spin" />
          <p className="text-sm text-gray-300 font-medium">Verifying merchant identity...</p>
          <p className="text-xs text-gray-500">Checking GPS location against merchant registry</p>
        </div>
      )}

      {/* GPS Error */}
      {gpsError && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{gpsError}</p>
            <button
              onClick={startScanner}
              className="mt-2 underline text-amber-200"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Verdict Display */}
      <AnimatePresence>
        {verdict && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-5 space-y-4 border ${
              verdict.verdict === 'VERIFIED'
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : verdict.verdict === 'TAMPERED'
                ? 'bg-rose-500/10 border-rose-500/30'
                : 'bg-amber-500/10 border-amber-500/30'
            }`}
          >
            {/* Verdict Header */}
            <div className="flex items-center gap-3">
              {verdict.verdict === 'VERIFIED' && (
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              )}
              {verdict.verdict === 'UNVERIFIED' && (
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              )}
              {verdict.verdict === 'TAMPERED' && (
                <ShieldAlert className="w-8 h-8 text-rose-400" />
              )}
              <div>
                <h3 className={`font-bold text-base ${
                  verdict.verdict === 'VERIFIED' ? 'text-emerald-300' :
                  verdict.verdict === 'TAMPERED' ? 'text-rose-300' : 'text-amber-300'
                }`}>
                  {verdict.verdict === 'VERIFIED' && 'Merchant Verified ✓'}
                  {verdict.verdict === 'UNVERIFIED' && 'Unregistered Merchant'}
                  {verdict.verdict === 'TAMPERED' && 'TAMPER DETECTED'}
                </h3>
                <p className="text-xs text-gray-400">{verdict.message}</p>
              </div>
            </div>

            {/* Merchant Details */}
            {verdict.merchant && (
              <div className="bg-black/30 rounded-xl p-3 space-y-2">
                <p className="text-sm font-bold text-white">{verdict.merchant.businessName}</p>
                <p className="text-xs text-gray-400 font-mono">{verdict.merchant.vpa}</p>
                <div className="flex gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                    {verdict.merchant.businessType}
                  </span>
                  {verdict.merchant.isVerified && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      KYC VERIFIED
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Geo Analysis */}
            {verdict.geoAnalysis && (
              <div className="flex items-center gap-2 text-xs">
                <MapPin className={`w-4 h-4 ${
                  verdict.geoAnalysis.inRange ? 'text-emerald-400' : 'text-rose-400'
                }`} />
                <span className="text-gray-300">
                  Distance: <strong className={verdict.geoAnalysis.inRange ? 'text-emerald-400' : 'text-rose-400'}>
                    {verdict.geoAnalysis.distanceMeters >= 1000
                      ? `${(verdict.geoAnalysis.distanceMeters / 1000).toFixed(1)} km`
                      : `${verdict.geoAnalysis.distanceMeters} m`}
                  </strong>
                  {' / '}
                  Allowed: {verdict.geoAnalysis.allowedRadiusMeters}m
                </span>
              </div>
            )}

            {/* Tamper Alert */}
            {verdict.alert && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-lg">
                <p className="text-xs text-rose-200 font-medium">{verdict.alert.title}</p>
                <p className="text-[11px] text-rose-300/80 mt-1">{verdict.alert.explanation}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setVerdict(null); startScanner(); }}
                className="flex-1 py-2.5 bg-gray-800 text-gray-300 text-xs font-bold rounded-lg"
              >
                Scan Again
              </button>

              {verdict.verdict !== 'TAMPERED' && (
                <button
                  onClick={handleProceed}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-lg"
                >
                  Proceed to Pay
                </button>
              )}

              {verdict.verdict === 'TAMPERED' && (
                <button
                  onClick={() => {/* Navigate to complaint filing */}}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-black text-xs font-bold rounded-lg"
                >
                  Report This QR
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
```

---

## 6. Attack Vectors & Mitigations

| Attack Vector | Description | SPYDE Mitigation |
|---|---|---|
| **Sticker-Over-QR** | Fraudster pastes their QR over merchant's genuine QR | Geo-distance check: device location vs. registered merchant location. Mismatch → `TAMPERED`. |
| **GPS Spoofing (Mock Location)** | Attacker uses mock location apps to fake proximity | `enableHighAccuracy: true` + `deviceAccuracy` threshold (>200m rejected). Mock locations typically report accuracy >1000m. |
| **QR Code Injection** | Fraudster generates a fake UPI QR with a legitimate-looking VPA | VPA lookup against MerchantRegistry. Unregistered VPAs → `UNVERIFIED` warning. |
| **Replay QR Screenshot** | Attacker screenshots a legitimate QR and shares it remotely | Geo-check still applies. Remote scan from different city → `TAMPERED`. |
| **Merchant Collusion** | Merchant registers at fake location to bypass geo-check | Admin verification process for MerchantRegistry. Periodic geo-audits. |
| **Indoor GPS Drift** | GPS accuracy degrades inside malls/basements | Configurable `radiusMeters` per merchant type (malls get 300m). Accuracy threshold of 200m. |
| **Dynamic QR Manipulation** | Attacker intercepts dynamic QR generation and modifies VPA | SPYDE validates the decoded VPA against the registry, regardless of QR generation method. |

---

## 7. Performance & Accuracy Notes

| Metric | Target | Notes |
|---|---|---|
| QR decode time | < 200ms | `html5-qrcode` library with WASM decoder |
| GPS acquisition | < 5s (warm), < 10s (cold) | `enableHighAccuracy: true`, `maximumAge: 30s` |
| Server verification | < 50ms | Single indexed DB lookup + Haversine math |
| End-to-end latency | < 500ms | From scan to verdict display |
| False positive rate | < 2% | Tuned via `radiusMeters` per merchant type |
| False negative rate | < 0.1% | Sticker attacks >1km away always caught |
| GPS accuracy (outdoor) | ±5–15m | Standard on mid-range Android |
| GPS accuracy (indoor) | ±30–100m | Degraded; wider radius compensates |

---

## 8. Test Matrix

| Test ID | Scenario | QR Payload | Device GPS | Expected Verdict |
|---|---|---|---|---|
| `TC_QR_01` | Legitimate scan at Starbucks Indiranagar | `upi://pay?pa=starbucks.indiranagar@spyde&pn=Starbucks` | 12.9785°N, 77.6409°E (24m away) | `VERIFIED` |
| `TC_QR_02` | Sticker attack: Starbucks QR scanned from Mumbai | Same QR | 19.0760°N, 72.8777°E (842km away) | `TAMPERED` |
| `TC_QR_03` | Unregistered merchant VPA | `upi://pay?pa=random.person@spyde&pn=Random` | Any | `UNVERIFIED` |
| `TC_QR_04` | Online merchant (no geo check) | `upi://pay?pa=amazon.in@spyde&pn=Amazon` | Any | `VERIFIED` |
| `TC_QR_05` | Same city, wrong branch | `upi://pay?pa=starbucks.indiranagar@spyde&pn=Starbucks` | 12.9352°N, 77.6245°E (5.1km) | `TAMPERED` |
| `TC_QR_06` | Large venue (mall, 300m radius) | `upi://pay?pa=phoenix.mall@spyde&pn=Phoenix` | 19.0765°N, 72.8780°E (60m) | `VERIFIED` |
| `TC_QR_07` | Invalid QR format | `https://example.com/payment` | Any | `UNVERIFIED` ("Invalid or non-UPI QR") |
| `TC_QR_08` | GPS permission denied | Valid UPI QR | N/A | Error: "Location permission denied" |
| `TC_QR_09` | Poor GPS accuracy (>200m) | Valid UPI QR | Accuracy: 500m | `UNVERIFIED` ("GPS accuracy too low") |
| `TC_QR_10` | Mobile service merchant (1000m radius) | `upi://pay?pa=swiggy@spyde&pn=Swiggy` | 12.9720°N, 77.5950°E (50m) | `VERIFIED` |


**End of File 13 of 19 — `QR_TAMPER.md`**