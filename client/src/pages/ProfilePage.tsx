// client/src/pages/ProfilePage.tsx
import React from 'react';
import { User as UserIcon, Shield, Copy, Moon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuthStore } from '@/stores/authStore';
import type { User as AppUser, BankAccount, UpiHandle } from '@/types/app';

export const ProfilePage: React.FC = () => {
  const authUser = useAuthStore((s) => s.user);
  const user = authUser as AppUser | null;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted text-sm font-mono">Loading profile...</p>
      </div>
    );
  }

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'SP';

  const riskScore = user.riskScore ?? 0;

  const trustBadgeTone =
    riskScore <= 30 ? 'safe' : riskScore <= 60 ? 'warn' : 'danger';

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 py-4">
      <h1 className="text-xl font-bold text-on-dark font-sans">Profile & Settings</h1>

      {/* User Info Card */}
      <Card className="p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl font-bold font-mono mx-auto">
          {initials}
        </div>
        <h2 className="text-on-dark text-lg font-bold font-sans mt-3">{user.name}</h2>
        <p className="text-muted text-xs font-mono mt-1">{user.phone}</p>

        <div className="flex items-center justify-center gap-3 mt-4">
          <Badge tone={trustBadgeTone}>
            Trust: {riskScore}/100
          </Badge>
          {user.isAdmin && (
            <Badge tone="danger">Admin</Badge>
          )}
        </div>
      </Card>

      {/* Appearance & Theme Card */}
      <div>
        <h3 className="text-on-dark text-sm font-bold mb-3 flex items-center gap-2 font-sans">
          <Moon className="w-4 h-4 text-primary" />
          Appearance & Theme
        </h3>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-on-dark text-sm font-semibold font-sans">Theme Mode</p>
            <p className="text-muted text-xs mt-0.5">
              Switch between Binance Dark (Near-Black) and Light canvas modes
            </p>
          </div>
          <ThemeToggle variant="pill" />
        </Card>
      </div>

      {/* Bank Accounts */}
      <div>
        <h3 className="text-on-dark text-sm font-bold mb-3 flex items-center gap-2 font-sans">
          <Shield className="w-4 h-4 text-primary" />
          Bank Accounts
        </h3>
        <div className="space-y-2">
          {(user.bankAccounts ?? []).length > 0 ? (
            user.bankAccounts.map((account: BankAccount) => (
              <Card key={account.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-on-dark text-sm font-semibold font-sans">
                      {account.accountType === 'SAVINGS' ? 'Savings' : 'Current'} Account
                    </p>
                    <p className="text-muted text-xs font-mono mt-1">
                      {account.accountNumberMasked} · IFSC: {account.ifsc}
                    </p>
                  </div>
                  <p className="text-on-dark font-mono text-sm font-bold tnum">
                    ₹{Intl.NumberFormat('en-IN').format(account.balanceRupees)}
                  </p>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-4 text-center">
              <p className="text-muted text-xs">No bank accounts linked</p>
            </Card>
          )}
        </div>
      </div>

      {/* UPI Handles */}
      <div>
        <h3 className="text-on-dark text-sm font-bold mb-3 flex items-center gap-2 font-sans">
          <UserIcon className="w-4 h-4 text-primary" />
          UPI Handles
        </h3>
        <div className="space-y-2">
          {(user.upiHandles ?? []).length > 0 ? (
            user.upiHandles.map((handle: UpiHandle) => (
              <Card key={handle.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-on-dark text-sm font-mono font-medium">{handle.vpa}</p>
                  {handle.isPrimary && (
                    <Badge className="bg-trading-up/15 text-trading-up text-[10px] mt-1 border-trading-up/30">
                      Primary
                    </Badge>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(handle.vpa)}
                  className="p-2 text-muted hover:text-on-dark rounded-lg hover:bg-surface-elevated-dark transition-colors"
                  aria-label="Copy UPI VPA"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </Card>
            ))
          ) : (
            <Card className="p-4 text-center">
              <p className="text-muted text-xs">No UPI handles registered</p>
            </Card>
          )}
        </div>
      </div>

      {/* Face Enrollment CTA */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-on-dark text-sm font-semibold font-sans">Face Verification</p>
            <p className="text-muted text-xs mt-0.5">
              Enroll your face for biometric payment verification
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => window.location.href = '/cv/enroll'}>
            Enroll
          </Button>
        </div>
      </Card>

      {/* Account Info */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted font-mono uppercase text-[10px] tracking-wider font-semibold">Account ID</p>
            <p className="text-on-dark font-mono mt-0.5 font-medium">{user.id.slice(0, 12)}...</p>
          </div>
          <div>
            <p className="text-muted font-mono uppercase text-[10px] tracking-wider font-semibold">Role</p>
            <p className="text-on-dark font-mono mt-0.5 capitalize font-medium">{user.role || 'user'}</p>
          </div>
          <div>
            <p className="text-muted font-mono uppercase text-[10px] tracking-wider font-semibold">Email</p>
            <p className="text-on-dark font-mono mt-0.5 font-medium">{user.email || 'Not set'}</p>
          </div>
          <div>
            <p className="text-muted font-mono uppercase text-[10px] tracking-wider font-semibold">Created</p>
            <p className="text-on-dark font-mono mt-0.5 font-medium">
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-IN')
                : 'N/A'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};