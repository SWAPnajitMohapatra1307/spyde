import type React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface AnomalyBannerProps {
  nickname: string;
  complaints: number;
}

/**
 * Highlights a compromised Safe Circle contact without preventing the user from making an informed payment.
 */
export const AnomalyBanner: React.FC<AnomalyBannerProps> = ({ nickname, complaints }) => {
  return (
    <div className="flex items-start gap-3 rounded-none bg-surface-900 px-4 py-3" role="alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn-400" aria-hidden="true" />
      <div>
        <p className="text-sm font-normal text-warn-400">Review {nickname}'s recent activity</p>
        <p className="mt-1 text-caption leading-relaxed text-neutral-400">This contact has received {complaints} complaints recently. Safe Circle access stays enabled, but proceed carefully.</p>
      </div>
    </div>
  );
};
