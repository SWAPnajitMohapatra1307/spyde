// client/src/App.tsx
import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/guards/ProtectedRoute';
import { PublicOnlyRoute } from '@/components/guards/PublicOnlyRoute';
import { RequireAdmin } from '@/components/guards/RequireAdmin';
import { RequirePaymentState } from '@/components/guards/RequirePaymentState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminTopFlaggedPage } from '@/pages/admin/AdminTopFlaggedPage';
import { AdminComplaintsPage } from '@/pages/admin/AdminComplaintsPage';
import { AdminTampersPage } from '@/pages/admin/AdminTampersPage';
import { AdminNetworkPage } from '@/pages/admin/AdminNetworkPage';

import { AuthPage } from '@/pages/AuthPage';
import { WelcomePage } from '@/pages/WelcomePage';
import { OtpPage } from '@/pages/OtpPage';
import { CertificatePage } from '@/pages/CertificatePage';
import { CreateComplaintPage } from '@/pages/complaints/CreateComplaintPage';
import { MyComplaintsPage } from '@/pages/complaints/MyComplaintsPage';
import { VpaCommunityFeedPage } from '@/pages/complaints/VpaCommunityFeedPage';

import { DashboardPage } from '@/pages/DashboardPage';
import { FaceBlobViewerPage } from '@/pages/FaceBlobViewerPage';
import { LivenessChallengePage } from '@/pages/LivenessChallengePage';
import { LivenessPendingPage } from '@/pages/LivenessPendingPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { PublicVerifyPage } from '@/pages/PublicVerifyPage';
import { QrResultPage } from '@/pages/QrResultPage';
import { QrScannerPage } from '@/pages/QrScannerPage';
import { QrGeneratorTestPage } from '@/pages/qr/QrGeneratorTestPage'; // Added Secure QR Lab Test Bench
import { SafeCirclePage } from '@/pages/SafeCirclePage';
import { SplashPage } from '@/pages/SplashPage';
import { TransactionDetailPage } from '@/pages/history/TransactionDetailPage';
import { TransactionHistoryPage } from '@/pages/history/TransactionHistoryPage';

// CV Pipeline Pages
import { CVPipelinePage } from '@/pages/cv/CVPipelinePage';
import { CVResultPage } from '@/pages/cv/CVResultPage';
import { FaceEnrollPage } from '@/pages/cv/FaceEnrollPage';

// Payment Pages
import { VpaEntryPage } from '@/pages/payment/VpaEntryPage';
import { ConfirmPaymentPage } from '@/pages/payment/ConfirmPaymentPage';
import { FrictionWarnPage } from '@/pages/payment/FrictionWarnPage';
import { FrictionChallengePage } from '@/pages/payment/FrictionChallengePage';
import { FrictionBlockedPage } from '@/pages/payment/FrictionBlockedPage';
import { PinPadPage } from '@/pages/payment/PinPadPage';
import { PaymentSuccessPage } from '@/pages/payment/PaymentSuccessPage';
import { PaymentFailedPage } from '@/pages/payment/PaymentFailedPage';

import { useAuthStore } from '@/stores/authStore';

export interface AppProps {}

export const App: React.FC<AppProps> = () => {
  const { isInitializing, initialize } = useAuthStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-muted">Loading SPYDE Secure Enclave...</span>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        {/* ── Public Routes ── */}
        <Route path="/" element={<SplashPage />} />
        <Route
          path="/welcome"
          element={
            <PublicOnlyRoute>
              <WelcomePage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <AuthPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <AuthPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/otp"
          element={
            <PublicOnlyRoute>
              <OtpPage />
            </PublicOnlyRoute>
          }
        />

        {/* ── Public Standalone Liveness Verification Route ── */}
        <Route path="/liveness/:sessionId" element={<LivenessChallengePage />} />
        <Route path="/verify/:id" element={<PublicVerifyPage />} />

        {/* ── Protected Routes (App Shell) ── */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/home" element={<DashboardPage />} />

          {/* ── Payment Flow ── */}
          <Route path="/payment/send" element={<VpaEntryPage />} />
          <Route
            path="/payment/confirm"
            element={
              <RequirePaymentState allowedSteps={['CONFIRM', 'SAFE_CIRCLE_CHECK']}>
                <ConfirmPaymentPage />
              </RequirePaymentState>
            }
          />
          <Route
            path="/payment/warning"
            element={
              <RequirePaymentState allowedSteps={['FRICTION_WARN']}>
                <FrictionWarnPage />
              </RequirePaymentState>
            }
          />
          <Route
            path="/payment/challenge"
            element={
              <RequirePaymentState
                allowedSteps={[
                  'FRICTION_CHALLENGE',
                  'LIVENESS_REDIRECT',
                  'AWAITING_RECEIVER',
                  'PIN_ENTRY',
                ]}
              >
                <FrictionChallengePage />
              </RequirePaymentState>
            }
          />
          <Route
            path="/payment/blocked"
            element={
              <RequirePaymentState allowedSteps={['FRICTION_BLOCK']}>
                <FrictionBlockedPage />
              </RequirePaymentState>
            }
          />
          <Route
            path="/payment/pin"
            element={
              <RequirePaymentState allowedSteps={['PIN_ENTRY']}>
                <PinPadPage />
              </RequirePaymentState>
            }
          />
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/failed" element={<PaymentFailedPage />} />

          {/* Safe Circle */}
          <Route path="/circle" element={<SafeCirclePage />} />

          {/* QR Scan & Security Verification Block */}
          <Route path="/qr" element={<QrScannerPage />} />
          <Route path="/qr/result" element={<QrResultPage />} />
          <Route path="/qr/generate-test" element={<QrGeneratorTestPage />} />

          {/* Liveness Pending */}
          <Route path="/liveness/pending" element={<LivenessPendingPage />} />

          {/* CV Pipeline */}
          <Route path="/cv/verify/:transactionId" element={<CVPipelinePage />} />
          <Route path="/cv/result/:sessionId" element={<CVResultPage />} />
          <Route path="/cv/enroll" element={<FaceEnrollPage />} />

          {/* Certificates & Face Blob */}
          <Route path="/certificates/:id" element={<CertificatePage />} />
          <Route path="/face-blob/:id" element={<FaceBlobViewerPage />} />

          {/* Complaints */}
          <Route path="/complaints/new" element={<CreateComplaintPage />} />
          <Route path="/complaints/mine" element={<MyComplaintsPage />} />
          <Route path="/complaints/vpa/:vpa" element={<VpaCommunityFeedPage />} />

          {/* History */}
          <Route path="/history" element={<TransactionHistoryPage />} />
          <Route path="/history/:id" element={<TransactionDetailPage />} />

          {/* Notifications & Profile */}
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Admin Console Suite */}
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminDashboardPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/flagged"
            element={
              <RequireAdmin>
                <AdminTopFlaggedPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/complaints"
            element={
              <RequireAdmin>
                <AdminComplaintsPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/tampers"
            element={
              <RequireAdmin>
                <AdminTampersPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/network"
            element={
              <RequireAdmin>
                <AdminNetworkPage />
              </RequireAdmin>
            }
          />
        </Route>

        {/* ── 404 Catch-All ── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
};