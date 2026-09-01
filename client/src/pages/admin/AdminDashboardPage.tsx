// client/src/pages/admin/AdminDashboardPage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  ShieldAlert,
  FileWarning,
  ArrowUpRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useAdminStats } from "../../hooks/useAdmin";
import type {
  AdminOverview,
  AdminRiskMetrics,
  AdminComplaintsSummary,
} from "../../hooks/useAdmin";

const paisaToRupees = (paisa: number = 0): string =>
  `₹${((paisa || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const toPercent = (rate: number = 0): string =>
  `${((rate || 0) * 100).toFixed(1)}%`;

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, accent }) => (
  <div className="bg-surface-card-dark rounded-xl p-5 flex flex-col gap-3 border border-hairline-dark shadow-sm">
    <div className="flex items-center justify-between">
      <span className="text-muted text-xs uppercase tracking-wider font-mono font-semibold">{label}</span>
      <span className={`${accent} p-2 rounded-lg bg-surface-elevated-dark`}>{icon}</span>
    </div>
    <span className="text-bone text-2xl font-semibold tracking-tight">
      {value}
    </span>
  </div>
);

interface RiskBarProps {
  label: string;
  rate: number;
  /** Tailwind bg class, e.g. bg-accent-green */
  colorClass: string;
  /** Fallback hex if theme tokens fail */
  colorHex: string;
}

const RiskBar: React.FC<RiskBarProps> = ({ label, rate = 0, color }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between text-sm">
      <span className="text-bone-muted">{label}</span>
      <span className="text-bone font-medium">{toPercent(rate)}</span>
    </div>
    <div className="h-2 w-full rounded-pill bg-white/5 overflow-hidden">
      <div
        className={`h-full rounded-pill ${color}`}
        style={{ width: `${Math.min((rate || 0) * 100, 100)}%` }}
      />
    </div>
  </div>
);

// ── Section Renderers ────────────────────────────────────────────────

const OverviewSection: React.FC<{ data?: AdminOverview }> = ({ data }) => (
  <section className="flex flex-col gap-4">
    <h2 className="text-on-dark text-base font-bold font-sans">Overview</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Transactions"
        value={(data?.totalTransactions || 0).toLocaleString("en-IN")}
        icon={<BarChart3 size={18} />}
        accent="text-primary"
      />
      <StatCard
        label="Total Volume"
        value={paisaToRupees(data?.totalVolume)}
        icon={<ArrowUpRight size={18} />}
        accent="text-trading-up"
      />
      <StatCard
        label="Successful"
        value={(data?.successfulTransactions || 0).toLocaleString("en-IN")}
        icon={<ShieldAlert size={18} />}
        accent="text-trading-up"
      />
      <StatCard
        label="Blocked"
        value={(data?.blockedTransactions || 0).toLocaleString("en-IN")}
        icon={<ShieldAlert size={18} />}
        accent="text-trading-down"
      />
    </div>
  </section>
);

const RiskSection: React.FC<{ data?: AdminRiskMetrics }> = ({ data }) => (
  <section className="flex flex-col gap-4">
    <h2 className="text-bone text-lg font-semibold">Risk Distribution</h2>
    <div className="bg-canvas-card rounded-xl p-5 border border-white/5 flex flex-col gap-4">
      <RiskBar label="PASS" rate={data?.passRate || 0} color="bg-accent-green" />
      <RiskBar label="WARN" rate={data?.warnRate || 0} color="bg-accent-yellow" />
      <RiskBar
        label="CHALLENGE"
        rate={data?.challengeRate || 0}
        color="bg-accent-orange"
      />
      <RiskBar label="BLOCK" rate={data?.blockRate || 0} color="bg-accent-red" />
    </div>
  </section>
);

const ComplaintsSection: React.FC<{ data?: AdminComplaintsSummary }> = ({
  data,
}) => (
  <section className="flex flex-col gap-4">
    <h2 className="text-on-dark text-base font-bold font-sans">Complaints</h2>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        label="Total"
        value={(data?.total || 0).toLocaleString("en-IN")}
        icon={<FileWarning size={18} />}
        accent="text-primary"
      />
      <StatCard
        label="Open"
        value={(data?.open || 0).toLocaleString("en-IN")}
        icon={<AlertTriangle size={18} />}
        accent="text-primary"
      />
      <StatCard
        label="Resolved"
        value={(data?.resolved || 0).toLocaleString("en-IN")}
        icon={<ShieldAlert size={18} />}
        accent="text-trading-up"
      />
    </div>
  </section>
);

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useAdminStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 h-64 justify-center text-muted">
        <AlertTriangle size={24} className="text-trading-down" />
        <p className="text-sm font-medium text-on-dark">Failed to load admin statistics.</p>
        <p className="text-xs text-trading-down font-mono">{error?.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 px-4 py-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-on-dark text-2xl font-bold font-sans">Admin Console</h1>
          <p className="text-muted text-xs sm:text-sm mt-1">
            Fraud prevention overview and risk analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/flagged")}
            className="text-sm text-primary hover:underline font-semibold"
          >
            Flagged VPAs →
          </button>
        </div>
      </div>

      <OverviewSection data={data?.overview} />
      <RiskSection data={data?.riskMetrics} />
      <ComplaintsSection data={data?.complaints} />
    </div>
  );
};
