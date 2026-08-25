import app from './app';
import { env } from './config/env';
import { prisma } from './db/prisma';

const server = app.listen(env.PORT, () => {
  console.log('====================================================');
  console.log('  SPYDE — B2B Fraud Prevention Middleware for UPI   ');
  console.log('  Backend Lead (B1) + Face Liveness/Cert (B2) Ready ');
  console.log('====================================================');
  console.log(`[SERVER] Listening on http://localhost:${env.PORT}`);
  console.log(`[SERVER] Environment: ${env.NODE_ENV}`);
});

async function gracefulShutdown(signal: string) {
  console.log(`\n[SHUTDOWN] Received ${signal}. Initiating graceful shutdown...`);
  server.close(async () => {
    console.log('[SHUTDOWN] HTTP server closed.');
    try {
      await prisma.$disconnect();
      console.log('[SHUTDOWN] Database connections closed.');
    } catch (err: unknown) {
      console.error('[ERROR] Error closing database connections:', err);
    }
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[SHUTDOWN] Forcing shutdown after 10s timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error: Error) => {
  console.error('[CRITICAL] Uncaught Exception:', error.message, error.stack);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[CRITICAL] Unhandled Promise Rejection:', reason);
});