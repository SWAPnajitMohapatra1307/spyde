// client/src/components/layout/Header.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Bell, Menu } from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

export interface HeaderProps {
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user } = useAuthStore();
  const { data: notificationsData } = useNotifications();
  const unreadCount = notificationsData?.unreadCount ?? 0;
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'SP';

  const hasRiskScore = typeof user?.riskScore === 'number';
  const riskScore = user?.riskScore ?? 0;

  return (
    <header className="h-14 bg-spyde-surface-1 border-b border-spyde-hairline flex items-center justify-between px-4 sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="md:hidden p-1.5 rounded-pill hover:bg-spyde-surface-2 text-spyde-sand"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={(): void => navigate('/home')}
          className="flex items-center space-x-2"
        >
          <Shield className="w-6 h-6 text-spyde-jade" />
          <span className="text-heading-md font-light text-spyde-bone hidden sm:inline">
            SPYDE
          </span>
        </button>
      </div>

      <div className="flex items-center space-x-3">
        {/* Trust Score Badge */}
        {user && hasRiskScore && (
          <span
            className={cn(
              'px-2.5 py-1 rounded-pill text-caption tnum',
              riskScore <= 30
                ? 'bg-spyde-jade/15 text-spyde-jade'
                : riskScore <= 60
                  ? 'wash-amber text-spyde-amber'
                  : 'wash-ruby text-spyde-ruby'
            )}
          >
            Trust: {riskScore}
          </span>
        )}

        {/* Notification Bell */}
        <button
          type="button"
          onClick={(): void => navigate('/notifications')}
          className="relative p-2 rounded-pill hover:bg-spyde-surface-2 text-spyde-sand transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-canvas-card" />
          )}
        </button>

        {/* User Avatar */}
        <button
          type="button"
          onClick={(): void => navigate('/profile')}
          className="w-8 h-8 rounded-full bg-spyde-jade/15 flex items-center justify-center text-spyde-jade text-caption font-normal"
        >
          {initials}
        </button>
      </div>
    </header>
  );
};