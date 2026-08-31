// client/src/components/layout/Header.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useNotifications } from '@/hooks/useNotifications';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
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
    <header className="h-14 bg-surface-card-dark border-b border-hairline-dark flex items-center justify-between px-4 sticky top-0 z-30 transition-colors">
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="md:hidden p-1.5 rounded-lg hover:bg-surface-elevated-dark text-muted hover:text-on-dark transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={(): void => navigate('/home')}
          className="flex items-center space-x-2"
        >
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-on-primary font-black text-sm">
            S
          </div>
          <span className="text-base font-bold text-on-dark hidden sm:inline font-sans">
            SPYDE
          </span>
        </button>
      </div>

      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Trust Score Badge */}
        {user && hasRiskScore && (
          <span
            className={cn(
              'px-2.5 py-0.5 rounded-pill text-[11px] font-mono font-semibold border tnum hidden xs:inline-flex',
              riskScore <= 30
                ? 'bg-trading-up/15 text-trading-up border-trading-up/30'
                : riskScore <= 60
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-trading-down/15 text-trading-down border-trading-down/30'
            )}
          >
            Trust: {riskScore}/100
          </span>
        )}

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Notification Bell */}
        <button
          type="button"
          onClick={(): void => navigate('/notifications')}
          className="relative p-2 rounded-lg bg-surface-card-dark hover:bg-surface-elevated-dark border border-hairline-dark text-muted hover:text-on-dark transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-surface-card-dark" />
          )}
        </button>

        {/* User Avatar */}
        <button
          type="button"
          onClick={(): void => navigate('/profile')}
          className="w-8 h-8 rounded-full bg-surface-elevated-dark border border-hairline-dark flex items-center justify-center text-primary text-xs font-mono font-bold hover:border-primary transition-colors"
          aria-label="User profile"
        >
          {initials}
        </button>
      </div>
    </header>
  );
};
