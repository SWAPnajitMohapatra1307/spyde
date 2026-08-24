import { prisma } from '../../db/prisma';
import { calculateHaversineDistance, isValidIndianCoordinates } from '../../utils/geo';
import type { QrVerifyRequest, QrVerifyResponse, DecodedQrData } from '../../types/b2';

export class QrService {
  decodeQrPayload(rawQr: string): DecodedQrData {
    try {
      const url = new URL(rawQr);
      const vpa = url.searchParams.get('pa') || '';
      const businessName = url.searchParams.get('pn') || 'Unknown Merchant';
      const merchantCategoryCode = url.searchParams.get('mc') || undefined;
      const currency = url.searchParams.get('cu') || 'INR';

      return { vpa, businessName, merchantCategoryCode, currency };
    } catch {
      return { vpa: '', businessName: 'Invalid QR' };
    }
  }

  async verifyQr(payload: QrVerifyRequest): Promise<QrVerifyResponse> {
    const { qrPayload, deviceLat, deviceLng } = payload;

    if (!isValidIndianCoordinates(deviceLat, deviceLng)) {
      const error = new Error('Device coordinates fall outside valid Indian territory bounds');
      (error as unknown as { code: string }).code = 'VALIDATION_ERROR';
      throw error;
    }

    const decoded = this.decodeQrPayload(qrPayload);
    if (!decoded.vpa) {
      return {
        verdict: 'UNVERIFIED',
        merchant: { businessName: 'Unknown', vpa: '', isVerified: false },
        geoAnalysis: { distanceMeters: 0, allowedRadiusMeters: 100, inRange: false },
        message: 'Malformed or unrecognized UPI QR code.',
      };
    }

    const merchant = await prisma.merchantRegistry.findUnique({
      where: { vpa: decoded.vpa },
    });

    if (!merchant) {
      return {
        verdict: 'UNVERIFIED',
        merchant: { businessName: decoded.businessName, vpa: decoded.vpa, isVerified: false },
        geoAnalysis: { distanceMeters: 0, allowedRadiusMeters: 100, inRange: false },
        message: 'Merchant is not registered in verified merchant directory.',
      };
    }

    const distance = Math.round(
      calculateHaversineDistance(deviceLat, deviceLng, merchant.geoLat, merchant.geoLng)
    );
    const inRange = distance <= merchant.radiusMeters;

    if (!inRange) {
      return {
        verdict: 'TAMPERED',
        merchant: {
          businessName: merchant.businessName,
          vpa: merchant.vpa,
          isVerified: merchant.isVerified,
        },
        geoAnalysis: {
          distanceMeters: distance,
          allowedRadiusMeters: merchant.radiusMeters,
          inRange: false,
        },
        alert: {
          severity: 'CRITICAL',
          title: 'Sticker-Over-QR Tamper Detected',
          explanation: `You are scanning a QR registered to ${merchant.businessName} while your device is ${Math.round(distance / 1000)} km away. Do NOT pay.`,
        },
      };
    }

    return {
      verdict: 'VERIFIED',
      merchant: {
        businessName: merchant.businessName,
        vpa: merchant.vpa,
        businessType: merchant.businessType,
        isVerified: merchant.isVerified,
      },
      geoAnalysis: {
        distanceMeters: distance,
        allowedRadiusMeters: merchant.radiusMeters,
        inRange: true,
      },
      message: 'Official merchant QR verified.',
    };
  }
}

export const qrService = new QrService();