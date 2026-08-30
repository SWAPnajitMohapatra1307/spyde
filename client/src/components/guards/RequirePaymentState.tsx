import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePaymentStore, type PaymentStep } from '@/stores/paymentStore';

interface RequirePaymentStateProps {
  allowedSteps: PaymentStep[];
  children: React.ReactNode;
}

/** Map payment step → correct route so we never bounce to /payment/send mid-flow */
const STEP_ROUTE: Partial<Record<PaymentStep, string>> = {
  IDLE: '/payment/send',
  VPA_ENTRY: '/payment/send',
  SAFE_CIRCLE_CHECK: '/payment/confirm',
  CONFIRM: '/payment/confirm',
  EVALUATING: '/payment/confirm',
  FRICTION_PASS: '/payment/pin',
  FRICTION_WARN: '/payment/warning',
  FRICTION_CHALLENGE: '/payment/challenge',
  FRICTION_BLOCK: '/payment/blocked',
  PIN_ENTRY: '/payment/pin',
  LIVENESS_REDIRECT: '/payment/challenge',
  AWAITING_RECEIVER: '/payment/challenge',
  PROCESSING: '/payment/pin',
  SUCCESS: '/payment/success',
  FAILED: '/payment/failed',
  CANCELLED: '/payment/send',
};

export const RequirePaymentState: React.FC<RequirePaymentStateProps> = ({
  allowedSteps,
  children,
}) => {
  const step = usePaymentStore((s) => s.step);
  const location = useLocation();

  if (allowedSteps.includes(step)) {
    return <>{children}</>;
  }

  const target = STEP_ROUTE[step] || '/payment/send';

  // Already on the correct route for this step — render children (avoids loops)
  if (location.pathname === target) {
    return <>{children}</>;
  }

  return <Navigate to={target} replace />;
};