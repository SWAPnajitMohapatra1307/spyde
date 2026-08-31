import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Send,
  ScanLine,
  ShieldCheck,
  Clock,
  Bell,
  User,
  ShieldAlert,
  X,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/home', label: 'Home', icon: <Home className="w-5 h-5" /> },
  { to: '/payment/send', label: 'Send Money', icon: <Send className="w-5 h-5" /> },
  { to: '/qr', label: 'Scan QR', icon: <ScanLine className="w-5 h-5" /> },
  { to: '/circle', label: 'Safe Circle', icon: <ShieldCheck className="w-5 h-5" /> },
  { to: '/history', label: 'History', icon: <Clock className="w-5 h-5" /> },
  { to: '/notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
  { to: '/profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
];

const adminItems: NavItem[] = [
  { to: '/admin', label: 'Admin Console', icon: <ShieldAlert className="w-5 h-5" />, adminOnly: true },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();

  const linkClass = ({ isActive }: { isActive: boolean }): string =>
    cn(
      'flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150',
      isActive
        ? 'bg-primary text-on-primary font-bold shadow-sm'
        : 'text-muted hover:text-on-dark hover:bg-surface-elevated-dark'
    );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden"
          onClick={onClose}
          role="presentation"
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-surface-card-dark border-r border-hairline-dark z-50 transform transition-transform duration-200 md:translate-x-0 md:static md:z-auto flex flex-col justify-between',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div>
          {/* Sidebar Header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-hairline-dark">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-on-primary font-black text-sm">
                S
              </div>
              <span className="text-base font-bold text-on-dark font-sans">SPYDE</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg hover:bg-surface-elevated-dark text-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item: NavItem) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={linkClass}
                onClick={onClose}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}

            {/* Admin Section */}
            {user?.isAdmin && (
              <>
                <div className="pt-4 pb-2 px-3">
                  <span className="text-[10px] font-mono text-muted uppercase tracking-wider font-semibold">
                    Admin Control
                  </span>
                </div>
                {adminItems.map((item: NavItem) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={linkClass}
                    onClick={onClose}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </>
            )}
          </nav>
        </div>

        {/* Sidebar Footer: Theme Toggle */}
        <div className="p-3 border-t border-hairline-dark">
          <ThemeToggle variant="pill" className="w-full justify-between" />
        </div>
      </aside>
    </>
  );
};
