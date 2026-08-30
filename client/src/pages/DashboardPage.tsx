import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useTransactionHistory } from '@/hooks/usePayment';
import { useSafeCircle } from '@/hooks/useSafeCircle';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { QuickPayCarousel } from '@/components/dashboard/QuickPayCarousel';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { TipCard } from '@/components/dashboard/TipCard';
import { Skeleton } from '@/components/ui/Skeleton';

export interface DashboardPageProps {}

export const DashboardPage: React.FC<DashboardPageProps> = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: historyData, isLoading: historyLoading } = useTransactionHistory(5, 0);
  const { data: circleData, isLoading: circleLoading } = useSafeCircle();

  const bankAccount = user?.bankAccounts?.[0];
  const primaryVpa = user?.upiHandles?.find((h) => h.isPrimary)?.vpa ?? '';

  if (authLoading) {
    return (
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-36 w-full rounded-card" />
        <Skeleton className="h-20 w-full rounded-card" />
        <Skeleton className="h-48 w-full rounded-card" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      {/* Balance Card */}
      <BalanceCard
        balanceRupees={bankAccount?.balanceRupees ?? 0}
        bankName="State Bank of India"
        ifsc={bankAccount?.ifsc}
        accountNumberMasked={bankAccount?.accountNumberMasked}
        primaryVpa={primaryVpa}
      />

      {/* Escrow Banner Placeholder — wired in Phase 6/12 */}

      {/* Quick Actions */}
      <QuickActions />

      {/* Quick Pay Carousel */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-heading-md font-light text-spyde-bone">Trusted Payees</h3>
          <button
            type="button"
            onClick={(): void => navigate('/circle')}
            className="text-caption text-spyde-sand hover:text-spyde-bone transition-colors flex items-center gap-1 font-normal"
          >
            See All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {circleLoading ? (
          <div className="flex space-x-4">
            {[1, 2, 3, 4].map((i: number) => (
              <Skeleton key={i} className="w-12 h-12 rounded-full" />
            ))}
          </div>
        ) : (
          <QuickPayCarousel contacts={circleData?.contacts ?? []} />
        )}
      </section>

      {/* Recent Transactions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-heading-md font-light text-spyde-bone">Recent Transactions</h3>
          <button
            type="button"
            onClick={(): void => navigate('/history')}
            className="text-caption text-spyde-sand hover:text-spyde-bone transition-colors flex items-center gap-1 font-normal"
          >
            See All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {historyLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i: number) => (
              <Skeleton key={i} className="h-16 w-full rounded-card" />
            ))}
          </div>
        ) : (
          <RecentTransactions transactions={historyData?.transactions ?? []} />
        )}
      </section>

      {/* SPYDE Tip */}
      <TipCard />
    </div>
  );
};