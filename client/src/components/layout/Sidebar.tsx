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
      'flex items-center space-x-3 px-4 py-2.5 rounded-pill text-body-md transition-colors',
      isActive
        ? 'bg-spyde-jade/15 text-spyde-jade'
        : 'text-spyde-sand hover:text-spyde-bone hover:bg-spyde-surface-2'
    );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
          role="presentation"
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-spyde-surface-1 border-r border-spyde-hairline z-50 transform transition-transform duration-200 md:translate-x-0 md:static md:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-spyde-hairline">
          <span className="text-heading-md font-light text-spyde-bone">Navigation</span>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-1 rounded-pill hover:bg-spyde-surface-2 text-spyde-sand"
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
              <div className="pt-4 pb-2 px-4">
                <span className="text-caption text-spyde-muted font-normal uppercase tracking-wider">
                  Admin
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
      </aside>
    </>
  );
};