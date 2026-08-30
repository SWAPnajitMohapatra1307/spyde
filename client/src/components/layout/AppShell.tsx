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
    <div className="min-h-screen bg-canvas text-bone flex flex-col antialiased selection:bg-primary/30 selection:text-white">
      {/* ── Active Escrow Global Warning Banner ── */}
      {isEscrowActive && (
        <div className="bg-gradient-to-r from-accent-orange via-primary to-accent-orange text-canvas px-4 py-2 text-xs font-bold font-mono flex items-center justify-between shadow-lg sticky top-0 z-50 animate-pulse">
          <div className="flex items-center gap-2 max-w-xl truncate">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>
              Escrow Hold Active: Receiver biometric liveness verification in progress
              {amount ? ` (₹${Intl.NumberFormat('en-IN').format(amount)})` : ''}.
            </span>
          </div>
          <button
            onClick={() => navigate('/liveness/pending')}
            className="px-2.5 py-1 rounded-pill bg-canvas text-bone hover:bg-canvas-card text-[11px] font-mono font-bold inline-flex items-center gap-1 transition-colors flex-shrink-0 ml-2"
          >
            <span>View Vault</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Inner Responsive Panel Wrappers ── */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* ── Desktop Left Sidebar Navigation ── */}
        <aside className="hidden md:flex flex-col w-64 bg-canvas-card border-r border-white/5 p-4 justify-between shrink-0">
          <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-orange flex items-center justify-center text-canvas font-black text-lg shadow-md">
                S
              </div>
              <div>
                <span className="font-bold text-lg tracking-wider text-bone">SPYDE</span>
                <span className="block text-[10px] text-bone-muted tracking-widest uppercase">
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
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-bone shadow-lg shadow-primary/20'
                        : 'text-bone-muted hover:text-bone hover:bg-white/5'
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
              <div className="pt-4 border-t border-white/5 space-y-1">
                <div className="text-[10px] font-mono uppercase text-bone-muted tracking-wider px-3 mb-2">
                  Admin Control
                </div>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono transition-colors ${
                        isActive
                          ? 'bg-canvas-elevated text-primary border border-white/10 font-bold'
                          : 'text-bone-muted hover:text-bone hover:bg-white/5'
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

          {/* User Status Card & Logout */}
          <div className="pt-4 border-t border-white/5 space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs text-primary font-mono">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : <UserIcon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-bone">{user?.name || 'User'}</p>
                <p className="text-[10px] font-mono text-bone-muted truncate">
                  {user?.upiHandle || user?.phone}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-bone-muted hover:text-bone text-xs transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* ── Main Panel Viewport Layout ── */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Mobile Top Header */}
          <header className="md:hidden flex items-center justify-between px-4 h-14 bg-canvas-card border-b border-white/5 sticky top-0 z-30">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent-orange flex items-center justify-center text-canvas font-black text-sm">
                S
              </div>
              <span className="font-bold text-base text-bone tracking-wide">SPYDE</span>
            </button>

            <div className="flex items-center gap-1.5">
              {/* Notifications Link with Badge */}
              <NavLink
                to="/notifications"
                className="relative p-2 text-bone-muted hover:text-bone rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-canvas-card" />
                )}
              </NavLink>

              {/* Burger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-bone-muted hover:text-bone rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </header>

          {/* Mobile Slide-down Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-b border-white/10 bg-canvas-card/95 backdrop-blur-lg px-4 py-4 space-y-2 absolute top-14 left-0 right-0 z-30 shadow-2xl">
              <div className="text-[10px] font-mono uppercase text-bone-muted tracking-wider px-2">
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
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-canvas-elevated text-primary border border-white/10 font-bold'
                          : 'text-bone-muted hover:text-bone'
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
                  <div className="text-[10px] font-mono uppercase text-bone-muted tracking-wider px-2 pt-2 border-t border-white/5">
                    Admin Control
                  </div>
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-primary hover:bg-white/5"
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </>
              )}

              <div className="pt-2 border-t border-white/5">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-accent-red hover:bg-accent-red/10 transition-colors"
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

          {/* Sticky Mobile Bottom Navigation Bar (Visible only on md-and-down screens) */}
          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
};