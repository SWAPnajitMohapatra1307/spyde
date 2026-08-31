// client/src/pages/admin/AdminTopFlaggedPage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  Flag,
  Calendar,
} from "lucide-react";
import { useTopFlagged } from "../../hooks/useAdmin";
import type { FlaggedVpa } from "../../hooks/useAdmin";

// ── Helpers ──────────────────────────────────────────────────────────

const formatRiskScore = (score: number = 0): string =>
  `${(score * 100).toFixed(0)}`;

const riskColor = (score: number = 0): string => {
  if (score >= 0.8) return "bg-trading-down";
  if (score >= 0.6) return "bg-primary-hover";
  if (score >= 0.3) return "bg-primary";
  return "bg-trading-up";
};

const riskLabel = (score: number = 0): string => {
  if (score >= 0.8) return "Critical";
  if (score >= 0.6) return "High";
  if (score >= 0.3) return "Medium";
  return "Low";
};

const riskTextColor = (score: number = 0): string => {
  if (score >= 0.8) return "text-trading-down";
  if (score >= 0.6) return "text-primary-hover";
  if (score >= 0.3) return "text-primary";
  return "text-trading-up";
};

const formatDate = (iso?: string): string => {
  if (!iso) return "N/A";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "N/A";
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "N/A";
  }
};

// ── Row Component ────────────────────────────────────────────────────

interface FlaggedRowProps {
  entry: FlaggedVpa;
  rank: number;
}

const FlaggedRow: React.FC<FlaggedRowProps> = ({ entry, rank }) => {
  const risk = entry.riskScore ?? 0;
  return (
    <tr className="border-b border-hairline-dark hover:bg-surface-elevated-dark/50 transition-colors">
      <td className="py-3 px-4 text-muted text-xs font-mono">
        #{rank}
      </td>
      <td className="py-3 px-4 text-on-dark font-medium text-xs font-mono">
        {entry.vpa}
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-on-dark text-xs font-mono font-semibold tnum">
          {entry.reportCount ?? 0}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-surface-elevated-dark overflow-hidden border border-hairline-dark">
            <div
              className={`h-full rounded-full ${riskColor(risk)}`}
              style={{ width: `${Math.min(risk * 100, 100)}%` }}
            />
          </div>
          <span className={`text-xs font-mono font-bold tnum ${riskTextColor(risk)}`}>
            {formatRiskScore(risk)}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-pill ${
            risk >= 0.8
              ? "bg-trading-down/15 text-trading-down border border-trading-down/30"
              : risk >= 0.6
                ? "bg-primary-hover/15 text-primary-hover border border-primary-hover/30"
                : "bg-primary/15 text-primary border border-primary/30"
          }`}
        >
          {riskLabel(risk)}
        </span>
      </td>
      <td className="py-3 px-4 text-center text-on-dark text-xs font-mono tnum">
        {entry.blockedAttempts ?? 0}
      </td>
      <td className="py-3 px-4 text-muted text-xs font-mono">
        {formatDate(entry.lastFlagged)}
      </td>
    </tr>
  );
};

// ── Page ─────────────────────────────────────────────────────────────

export const AdminTopFlaggedPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useTopFlagged();

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
        <p className="text-sm font-medium text-on-dark">Failed to load flagged VPA data.</p>
        <p className="text-xs text-trading-down font-mono">{error?.message}</p>
      </div>
    );
  }

  const entries = data?.topFlagged ?? [];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="p-2 rounded-md hover:bg-surface-card-dark text-muted hover:text-on-dark transition-colors"
          aria-label="Back to admin dashboard"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-on-dark text-2xl font-bold font-sans">Top Flagged VPAs</h1>
          <p className="text-muted text-xs sm:text-sm mt-0.5">
            Highest-risk virtual payment addresses by aggregate fraud signals
          </p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-card-dark rounded-xl p-4 border border-hairline-dark flex items-center gap-3 shadow-sm">
          <Flag size={18} className="text-trading-down" />
          <div>
            <p className="text-muted text-xs font-mono font-semibold uppercase">Total Flagged</p>
            <p className="text-on-dark text-lg font-bold font-mono tnum">
              {entries.length}
            </p>
          </div>
        </div>
        <div className="bg-surface-card-dark rounded-xl p-4 border border-hairline-dark flex items-center gap-3 shadow-sm">
          <ShieldAlert size={18} className="text-primary-hover" />
          <div>
            <p className="text-muted text-xs font-mono font-semibold uppercase">Critical (≥ 80)</p>
            <p className="text-on-dark text-lg font-bold font-mono tnum">
              {entries.filter((e) => (e.riskScore ?? 0) >= 0.8).length}
            </p>
          </div>
        </div>
        <div className="bg-surface-card-dark rounded-xl p-4 border border-hairline-dark flex items-center gap-3 shadow-sm">
          <Calendar size={18} className="text-primary" />
          <div>
            <p className="text-muted text-xs font-mono font-semibold uppercase">Total Blocked Attempts</p>
            <p className="text-on-dark text-lg font-bold font-mono tnum">
              {entries
                .reduce((sum, e) => sum + (e.blockedAttempts ?? 0), 0)
                .toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <div className="bg-surface-card-dark rounded-xl p-12 border border-hairline-dark text-center shadow-sm">
          <ShieldAlert size={32} className="text-trading-up mx-auto mb-3" />
          <p className="text-on-dark font-semibold font-sans">No flagged VPAs</p>
          <p className="text-muted text-xs mt-1">
            All clear — no addresses have crossed the risk threshold.
          </p>
        </div>
      ) : (
        <div className="bg-surface-card-dark rounded-xl border border-hairline-dark overflow-x-auto shadow-sm">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-hairline-dark bg-surface-elevated-dark/50">
                <th className="py-3 px-4 text-left text-muted text-xs font-semibold uppercase tracking-wider font-mono">
                  #
                </th>
                <th className="py-3 px-4 text-left text-muted text-xs font-semibold uppercase tracking-wider font-mono">
                  VPA
                </th>
                <th className="py-3 px-4 text-center text-muted text-xs font-semibold uppercase tracking-wider font-mono">
                  Reports
                </th>
                <th className="py-3 px-4 text-left text-muted text-xs font-semibold uppercase tracking-wider font-mono">
                  Risk Score
                </th>
                <th className="py-3 px-4 text-center text-muted text-xs font-semibold uppercase tracking-wider font-mono">
                  Level
                </th>
                <th className="py-3 px-4 text-center text-muted text-xs font-semibold uppercase tracking-wider font-mono">
                  Blocked
                </th>
                <th className="py-3 px-4 text-left text-muted text-xs font-semibold uppercase tracking-wider font-mono">
                  Last Flagged
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <FlaggedRow
                  key={entry.vpa || idx}
                  entry={entry}
                  rank={idx + 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};