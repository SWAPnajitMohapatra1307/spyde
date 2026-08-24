import cors from 'cors';
import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';
import { prisma } from './db/prisma';
import adminRoutes from './routes/admin.routes';
import certificateRoutes from './routes/certificate.routes';
import complaintRoutes from './routes/complaint.routes';
import livenessRoutes from './routes/liveness.routes';
import qrRoutes from './routes/qr.routes';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN || '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('[INFO] :method :url :status - :response-time ms'));

// Attach request identifier for distributed tracing
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as unknown as { requestId: string }).requestId =
    'req_' + Math.random().toString(36).substring(2, 15);
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'HEALTHY',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

// Mount B2 sub-routers
app.use('/api/liveness', livenessRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);

// Global error handler
app.use(
  (
    err: Error & { statusCode?: number; code?: string; flatten?: () => { fieldErrors: unknown } },
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error(`[ERROR] Handled error: ${err.message} (code: ${err.code || 'UNKNOWN'})`);

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
      console.log(`[SUCCESS] Purged ${deleted.count} expired face blob records`);
    } else {
      console.log('[INFO] Face blob cleanup sweep complete: 0 expired records found');
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] Face blob cleanup sweep failed: ${message}`);
  }
};

const HOURLY_INTERVAL_MS = 3600000;
setInterval(faceBlobCleanupJob, HOURLY_INTERVAL_MS);
setTimeout(faceBlobCleanupJob, 5000);

app.listen(env.PORT, () => {
  console.log(`[INFO] SPYDE Server listening on port ${env.PORT}`);
});
