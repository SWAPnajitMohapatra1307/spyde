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

const formatRiskScore = (score: number = 0): string =>
  `${Math.round((score || 0) * 100)}`;

const riskHex = (score: number = 0): string => {
  if (score >= 0.8) return "#ef4444";
  if (score >= 0.6) return "#f97316";
  if (score >= 0.3) return "#facc15";
  return "#10b981";
};

const riskLabel = (score: number = 0): string => {
  if (score >= 0.8) return "Critical";
  if (score >= 0.6) return "High";
  if (score >= 0.3) return "Medium";
  return "Low";
};

const riskTextColor = (score: number = 0): string => {
  if (score >= 0.8) return "text-red-400";
  if (score >= 0.6) return "text-orange-400";
  if (score >= 0.3) return "text-yellow-400";
  return "text-emerald-400";
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

interface FlaggedRowProps {
  entry: FlaggedVpa;
  rank: number;
}

const FlaggedRow: React.FC<FlaggedRowProps> = ({ entry, rank }) => {
  const risk = entry.riskScore ?? 0;
  const pct = Math.min(Math.max(risk * 100, 0), 100);

  return (
    <tr className="border-b border-hairline-dark hover:bg-white/[0.02] transition-colors">
      <td className="py-3 px-4 text-muted text-sm font-mono">#{rank}</td>
      <td className="py-3 px-4 text-on-dark font-medium text-sm font-mono">{entry.vpa}</td>
      <td className="py-3 px-4 text-center">
        <span className="text-on-dark text-xs font-mono font-semibold tnum">
          {entry.reportCount ?? 0}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3 min-w-[140px]">
          <div className="relative h-2.5 w-28 rounded-full bg-white/10 overflow-hidden border border-white/5">
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${pct}%`,
                backgroundColor: riskHex(risk),
                minWidth: pct > 0 ? "4px" : "0px",
              }}
            />
          </div>
          <span className={`text-xs font-bold tabular-nums ${riskTextColor(risk)}`}>
            {formatRiskScore(risk)}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            risk >= 0.8
              ? "bg-red-500/15 text-red-400"
              : risk >= 0.6
                ? "bg-orange-500/15 text-orange-400"
                : risk >= 0.3
                  ? "bg-yellow-500/15 text-yellow-400"
                  : "bg-emerald-500/15 text-emerald-400"
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-card-dark rounded-xl p-4 border border-hairline-dark flex items-center gap-3 shadow-sm">
          <Flag size={18} className="text-red-400" />
          <div>
            <p className="text-muted text-xs font-mono font-semibold uppercase">Total Flagged</p>
            <p className="text-on-dark text-lg font-bold font-mono tnum">{entries.length}</p>
          </div>
        </div>
        <div className="bg-surface-card-dark rounded-xl p-4 border border-hairline-dark flex items-center gap-3 shadow-sm">
          <ShieldAlert size={18} className="text-orange-400" />
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
            <p className="text-muted text-xs font-mono font-semibold uppercase">
              Total Blocked Attempts
            </p>
            <p className="text-on-dark text-lg font-bold font-mono tnum">
              {entries
                .reduce((sum, e) => sum + (e.blockedAttempts ?? 0), 0)
                .toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-surface-card-dark rounded-xl p-12 border border-hairline-dark text-center shadow-sm">
          <ShieldAlert size={32} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-on-dark font-medium">No flagged VPAs</p>
          <p className="text-muted text-sm mt-1">
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
                <FlaggedRow key={entry.vpa || idx} entry={entry} rank={idx + 1} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};