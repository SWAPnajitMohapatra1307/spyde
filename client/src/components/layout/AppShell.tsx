// client/src/components/layout/AppShell.tsx
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, 
  Home, 
  Send, 
  QrCode, 
  Users, 
  FileWarning, 
  History, 
  Bell, 
  User as UserIcon, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X,
  Lock,
  ArrowRight
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { usePaymentStore } from '@/stores/paymentStore';
import { useNotifications } from '@/hooks/useNotifications';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';

export const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { step, amount } = usePaymentStore();
  const { data: notificationsData } = useNotifications();

  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const unreadCount = notificationsData?.unreadCount ?? 0;
  const isEscrowActive = step === 'LIVENESS_REDIRECT' || step === 'AWAITING_RECEIVER';
  
  const isAdmin = Boolean(
    (user as { role?: string; isAdmin?: boolean } | null)?.isAdmin ||
    (user as { role?: string; isAdmin?: boolean } | null)?.role === 'ADMIN' ||
    (user as { role?: string; isAdmin?: boolean } | null)?.role === 'admin'
  );

  const riskScore = user?.riskScore ?? 0;
  const hasRiskScore = typeof user?.riskScore === 'number';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/home', label: 'Dashboard', icon: Home },
    { to: '/payment/send', label: 'Send Money', icon: Send },
    { to: '/qr', label: 'Scan QR', icon: QrCode },
    { to: '/circle', label: 'Safe Circle', icon: Users },
    { to: '/complaints/mine', label: 'Complaints', icon: FileWarning },
    { to: '/history', label: 'History', icon: History },
  ];

  const adminItems = [
    { to: '/admin', label: 'Risk Console', icon: ShieldAlert },
    { to: '/admin/flagged', label: 'Top Flagged', icon: Shield },
    { to: '/admin/complaints', label: 'Disputes', icon: FileWarning },
  ];

  return (
    <div className="min-h-screen bg-canvas text-body flex flex-col antialiased selection:bg-primary selection:text-on-primary transition-colors">
      {/* ── Active Escrow Global Warning Banner ── */}
      {isEscrowActive && (
        <div className="bg-primary text-on-primary px-4 py-2 text-xs font-semibold font-mono flex items-center justify-between shadow-md sticky top-0 z-50">
          <div className="flex items-center gap-2 max-w-xl truncate">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>
              Escrow Hold Active: Receiver biometric liveness verification in progress
              {amount ? ` (₹${Intl.NumberFormat('en-IN').format(amount)})` : ''}.
            </span>
          </div>
          <button
            onClick={() => navigate('/liveness/pending')}
            className="px-3 py-1 rounded-pill bg-on-primary text-primary hover:bg-black text-[11px] font-mono font-bold inline-flex items-center gap-1 transition-colors flex-shrink-0 ml-2"
          >
            <span>View Vault</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Inner Responsive Panel Wrappers ── */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* ── Desktop Left Sidebar Navigation ── */}
        <aside className="hidden md:flex flex-col w-64 bg-surface-card-dark border-r border-hairline-dark p-4 justify-between shrink-0 transition-colors">
          <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary font-black text-xl shadow-sm">
                S
              </div>
              <div>
                <span className="font-bold text-lg tracking-wider text-on-dark font-sans">SPYDE</span>
                <span className="block text-[10px] text-muted tracking-widest uppercase font-mono">
                  UPI Fraud Shield
                </span>
              </div>
            </div>

            {/* Main Links */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-primary text-on-primary shadow-sm font-bold'
                        : 'text-muted hover:text-on-dark hover:bg-surface-elevated-dark'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Admin Dedicated Section */}
            {isAdmin && (
              <div className="pt-4 border-t border-hairline-dark space-y-1">
                <div className="text-[10px] font-mono uppercase text-muted tracking-wider px-3 mb-2 font-semibold">
                  Admin Control
                </div>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-mono transition-all duration-150 ${
                        isActive
                          ? 'bg-surface-elevated-dark text-primary border border-hairline-dark font-bold'
                          : 'text-muted hover:text-on-dark hover:bg-surface-elevated-dark'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar Footer: Theme Toggle, User Status Card & Logout */}
          <div className="pt-4 border-t border-hairline-dark space-y-3">
            {/* Theme Toggle Pill */}
            <ThemeToggle variant="pill" className="w-full justify-between" />

            <div className="flex items-center gap-3 px-2 pt-1">
              <div className="w-9 h-9 rounded-full bg-surface-elevated-dark border border-hairline-dark flex items-center justify-center font-bold text-xs text-primary font-mono">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : <UserIcon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-on-dark">{user?.name || 'User'}</p>
                <p className="text-[10px] font-mono text-muted truncate">
                  {user?.upiHandle || user?.phone}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-elevated-dark hover:bg-hairline-dark text-muted hover:text-on-dark text-xs font-semibold transition-colors border border-hairline-dark cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* ── Main Panel Viewport Layout ── */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Desktop Top Header Bar with Theme Toggle */}
          <header className="hidden md:flex items-center justify-between px-6 h-14 bg-surface-card-dark border-b border-hairline-dark sticky top-0 z-30 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase text-muted tracking-wider">
                Shield Status: <span className="text-trading-up font-bold">ACTIVE</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Trust Score Badge */}
              {user && hasRiskScore && (
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-pill text-[11px] font-mono font-semibold border tnum',
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

              {/* Top Bar Theme Toggle */}
              <ThemeToggle variant="compact-pill" />

              {/* Notifications */}
              <NavLink
                to="/notifications"
                className="relative p-2 rounded-lg bg-surface-card-dark hover:bg-surface-elevated-dark border border-hairline-dark text-muted hover:text-on-dark transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-surface-card-dark" />
                )}
              </NavLink>

              {/* Profile Avatar */}
              <NavLink
                to="/profile"
                className="w-8 h-8 rounded-full bg-surface-elevated-dark border border-hairline-dark flex items-center justify-center text-primary text-xs font-mono font-bold hover:border-primary transition-colors"
                aria-label="User Profile"
              >
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SP'}
              </NavLink>
            </div>
          </header>

          {/* Mobile Top Header */}
          <header className="md:hidden flex items-center justify-between px-4 h-14 bg-surface-card-dark border-b border-hairline-dark sticky top-0 z-30 transition-colors">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary font-black text-sm">
                S
              </div>
              <span className="font-bold text-base text-on-dark tracking-wide">SPYDE</span>
            </button>

            <div className="flex items-center gap-2">
              {/* Mobile Theme Toggle */}
              <ThemeToggle variant="icon" />

              {/* Notifications Link with Badge */}
              <NavLink
                to="/notifications"
                className="relative p-2 text-muted hover:text-on-dark rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-surface-card-dark" />
                )}
              </NavLink>

              {/* Burger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-muted hover:text-on-dark rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </header>

          {/* Mobile Slide-down Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-b border-hairline-dark bg-surface-card-dark px-4 py-4 space-y-2 absolute top-14 left-0 right-0 z-30 shadow-2xl">
              <div className="text-[10px] font-mono uppercase text-muted tracking-wider px-2 font-semibold">
                Navigation
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-primary text-on-primary font-bold'
                          : 'text-muted hover:text-on-dark'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}

              {/* Admin Links inside Mobile Slide Down */}
              {isAdmin && (
                <>
                  <div className="text-[10px] font-mono uppercase text-muted tracking-wider px-2 pt-2 border-t border-hairline-dark font-semibold">
                    Admin Control
                  </div>
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono text-primary hover:bg-surface-elevated-dark"
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </>
              )}

              {/* Mobile Slide-down Theme Toggle & Logout */}
              <div className="pt-2 border-t border-hairline-dark space-y-2">
                <ThemeToggle variant="pill" className="w-full justify-between" />

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-trading-down hover:bg-trading-down/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Nested Route Content Container */}
          <main className="flex-1 overflow-y-auto pb-20 md:pb-6 px-4 md:px-6 pt-4 md:pt-6">
            <Outlet />
          </main>

          {/* Sticky Mobile Bottom Navigation Bar */}
          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
};
