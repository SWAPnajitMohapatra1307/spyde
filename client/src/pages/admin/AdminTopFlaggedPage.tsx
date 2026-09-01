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

/** riskScore from API is 0–1 */
const formatRiskScore = (score: number = 0): string =>
  `${Math.round((score || 0) * 100)}`;

const riskColor = (score: number = 0): string => {
  if (score >= 0.8) return "bg-accent-red";
  if (score >= 0.6) return "bg-accent-orange";
  if (score >= 0.3) return "bg-accent-yellow";
  return "bg-accent-green";
};

const riskLabel = (score: number = 0): string => {
  if (score >= 0.8) return "Critical";
  if (score >= 0.6) return "High";
  if (score >= 0.3) return "Medium";
  return "Low";
};

const riskTextColor = (score: number = 0): string => {
  if (score >= 0.8) return "text-accent-red";
  if (score >= 0.6) return "text-accent-orange";
  if (score >= 0.3) return "text-accent-yellow";
  return "text-accent-green";
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
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <td className="py-3 px-4 text-bone-muted text-sm font-mono">
        #{rank}
      </td>
      <td className="py-3 px-4 text-bone font-medium text-sm font-mono">
        {entry.vpa}
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-on-dark text-xs font-mono font-semibold tnum">
          {entry.reportCount ?? 0}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 rounded-pill bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-pill ${riskColor(risk)}`}
              style={{ width: `${Math.min(risk * 100, 100)}%` }}
            />
          </div>
          <span className={`text-xs font-semibold ${riskTextColor(risk)}`}>
            {formatRiskScore(risk)}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-pill ${
            risk >= 0.8
              ? "bg-accent-red/15 text-accent-red"
              : risk >= 0.6
                ? "bg-accent-orange/15 text-accent-orange"
                : "bg-accent-yellow/15 text-accent-yellow"
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
        <div className="bg-canvas-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <Flag size={18} className="text-accent-red" />
          <div>
            <p className="text-bone-muted text-xs">Total Flagged</p>
            <p className="text-bone text-lg font-semibold">
              {entries.length}
            </p>
          </div>
        </div>
        <div className="bg-canvas-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <ShieldAlert size={18} className="text-accent-orange" />
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

      {entries.length === 0 ? (
        <div className="bg-canvas-card rounded-xl p-12 border border-white/5 text-center">
          <ShieldAlert size={32} className="text-accent-green mx-auto mb-3" />
          <p className="text-bone font-medium">No flagged VPAs</p>
          <p className="text-bone-muted text-sm mt-1">
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
