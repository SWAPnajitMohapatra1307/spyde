import cors from 'cors';
import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { env } from './config/env';
import { prisma } from './db/prisma';
import authRoutes from './routes/authRoutes';
import safeCircleRoutes from './routes/safeCircleRoutes';
import paymentRoutes from './routes/paymentRoutes';
import adminRoutes from './routes/admin.routes';
import certificateRoutes from './routes/certificate.routes';
import complaintRoutes from './routes/complaint.routes';
import livenessRoutes from './routes/liveness.routes';
import qrRoutes from './routes/qr.routes';
import notificationRoutes from './routes/notification.routes'; // ✅ G2, G3 Import
import { startEscrowCleanerJob } from './jobs/escrowCleaner';

const app = express();

// Security Headers (configured to allow cross-origin dev requests)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ✅ CORS FIX: Allows localhost origins with credentials without wildcard (*) conflict
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  env.CLIENT_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in development
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' })); // Increased limit for face biometric frames
app.use(morgan('[INFO] :method :url :status - :response-time ms'));

// 🔍 Real-time Terminal Request Logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  const time = new Date().toLocaleTimeString();
  console.log(`📡 [${time}] INCOMING: ${req.method} ${req.originalUrl}`);
  (req as unknown as { requestId: string }).requestId =
    'req_' + Math.random().toString(36).substring(2, 15);
  next();
});

// ✅ Both /health and /api/health work
app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'HEALTHY',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/circle', safeCircleRoutes);
app.use('/api', paymentRoutes);
app.use('/api/liveness', livenessRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notifications', notificationRoutes); // ✅ G2, G3 Mount
app.use('/api/admin', adminRoutes);

// Error Handling Middleware
app.use(
  (
    err: Error & { statusCode?: number; code?: string; flatten?: () => { fieldErrors: unknown } },
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error('[ERROR] Handled error: ' + err.message + ' (code: ' + (err.code || 'UNKNOWN') + ')');

    if (err.name === 'ZodError' && typeof err.flatten === 'function') {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid input fields provided',
        },
      });
      return;
    }

    let statusCode = err.statusCode;
    if (!statusCode) {
      switch (err.code) {
        case 'BAD_REQUEST':
        case 'VALIDATION_ERROR':
          statusCode = 400;
          break;
        case 'UNAUTHORIZED':
          statusCode = 401;
          break;
        case 'FORBIDDEN':
          statusCode = 403;
          break;
        case 'NOT_FOUND':
          statusCode = 404;
          break;
        case 'CONFLICT':
          statusCode = 409;
          break;
        case 'GONE':
          statusCode = 410;
          break;
        default:
          statusCode = 500;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected internal error occurred',
      },
    });
  }
);

// DPDP Compliance: Hourly purge of expired face biometric blobs
const faceBlobCleanupJob = async () => {
  console.log('[JOB] Executing scheduled face blob cleanup sweep...');
  try {
    const deleted = await prisma.faceBlob.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    if (deleted.count > 0) {
      console.log('[SUCCESS] Purged ' + deleted.count + ' expired face blob records');
    } else {
      console.log('[INFO] Face blob cleanup sweep complete: 0 expired records found');
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[ERROR] Face blob cleanup sweep failed: ' + message);
  }
};

const HOURLY_INTERVAL_MS = 3600000;
setInterval(faceBlobCleanupJob, HOURLY_INTERVAL_MS);
setTimeout(faceBlobCleanupJob, 5000);

// Start Escrow Cleanup Cron (every 60s)
startEscrowCleanerJob(60000);

export default app;