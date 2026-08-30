// client/src/pages/ProfilePage.tsx
import React from 'react';
import { User as UserIcon, Shield, Copy } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import type { User as AppUser, BankAccount, UpiHandle } from '@/types/app';

export const ProfilePage: React.FC = () => {
  const authUser = useAuthStore((s) => s.user);
  const user = authUser as AppUser | null;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-bone-muted text-sm">Loading profile...</p>
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
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-bone">Profile</h1>

      {/* User Info Card */}
      <Card className="p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl font-bold font-mono mx-auto">
          {initials}
        </div>
        <h2 className="text-bone text-lg font-semibold mt-3">{user.name}</h2>
        <p className="text-bone-muted text-xs font-mono mt-1">{user.phone}</p>

        <div className="flex items-center justify-center gap-3 mt-4">
          <Badge tone={trustBadgeTone}>
            Trust: {riskScore}
          </Badge>
          {user.isAdmin && (
            <Badge tone="danger">Admin</Badge>
          )}
        </div>
      </Card>

      {/* Bank Accounts */}
      <div>
        <h3 className="text-bone text-sm font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Bank Accounts
        </h3>
        <div className="space-y-2">
          {(user.bankAccounts ?? []).length > 0 ? (
            user.bankAccounts.map((account: BankAccount) => (
              <Card key={account.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-bone text-sm font-medium">
                      {account.accountType === 'SAVINGS' ? 'Savings' : 'Current'} Account
                    </p>
                    <p className="text-bone-muted text-xs font-mono mt-1">
                      {account.accountNumberMasked} · IFSC: {account.ifsc}
                    </p>
                  </div>
                  <p className="text-bone font-mono text-sm tabular-nums">
                    ₹{Intl.NumberFormat('en-IN').format(account.balanceRupees)}
                  </p>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-4 text-center">
              <p className="text-bone-muted text-xs">No bank accounts linked</p>
            </Card>
          )}
        </div>
      </div>

      {/* UPI Handles */}
      <div>
        <h3 className="text-bone text-sm font-semibold mb-3 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-primary" />
          UPI Handles
        </h3>
        <div className="space-y-2">
          {(user.upiHandles ?? []).length > 0 ? (
            user.upiHandles.map((handle: UpiHandle) => (
              <Card key={handle.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-bone text-sm font-mono">{handle.vpa}</p>
                  {handle.isPrimary && (
                    <Badge className="bg-accent-green/15 text-accent-green text-[10px] mt-1">
                      Primary
                    </Badge>
                  )}
                </div>
                <button className="p-2 text-bone-muted hover:text-bone rounded-lg hover:bg-white/5 transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </Card>
            ))
          ) : (
            <Card className="p-4 text-center">
              <p className="text-bone-muted text-xs">No UPI handles registered</p>
            </Card>
          )}
        </div>
      </div>

      {/* Face Enrollment CTA */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-bone text-sm font-medium">Face Verification</p>
            <p className="text-bone-muted text-[10px] mt-1">
              Enroll your face for biometric payment verification
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/cv/enroll'}>
            Enroll
          </Button>
        </div>
      </Card>

      {/* Account Info */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-bone-muted">Account ID</p>
            <p className="text-bone font-mono mt-0.5">{user.id.slice(0, 12)}...</p>
          </div>
          <div>
            <p className="text-bone-muted">Role</p>
            <p className="text-bone font-mono mt-0.5 capitalize">{user.role || 'user'}</p>
          </div>
          <div>
            <p className="text-bone-muted">Email</p>
            <p className="text-bone font-mono mt-0.5">{user.email || 'Not set'}</p>
          </div>
          <div>
            <p className="text-bone-muted">Created</p>
            <p className="text-bone font-mono mt-0.5">
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