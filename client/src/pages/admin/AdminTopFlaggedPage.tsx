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
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <td className="py-3 px-4 text-bone-muted text-sm font-mono">#{rank}</td>
      <td className="py-3 px-4 text-bone font-medium text-sm font-mono">
        {entry.vpa}
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-bone text-sm font-semibold">
          {entry.reportCount ?? 0}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3 min-w-[140px]">
          {/* Wider visible track */}
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
      <td className="py-3 px-4 text-center text-bone text-sm">
        {entry.blockedAttempts ?? 0}
      </td>
      <td className="py-3 px-4 text-bone-muted text-xs">
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
      <div className="flex flex-col items-center gap-3 h-64 justify-center text-bone-muted">
        <AlertTriangle size={24} className="text-accent-red" />
        <p className="text-sm">Failed to load flagged VPA data.</p>
        <p className="text-xs text-accent-red">{error?.message}</p>
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
          className="p-2 rounded-lg hover:bg-white/5 text-bone-muted transition-colors"
          aria-label="Back to admin dashboard"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-bone text-2xl font-bold">Top Flagged VPAs</h1>
          <p className="text-bone-muted text-sm mt-0.5">
            Highest-risk virtual payment addresses by aggregate fraud signals
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-canvas-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <Flag size={18} className="text-red-400" />
          <div>
            <p className="text-bone-muted text-xs">Total Flagged</p>
            <p className="text-bone text-lg font-semibold">{entries.length}</p>
          </div>
        </div>
        <div className="bg-canvas-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <ShieldAlert size={18} className="text-orange-400" />
          <div>
            <p className="text-bone-muted text-xs">Critical (≥ 80)</p>
            <p className="text-bone text-lg font-semibold">
              {entries.filter((e) => (e.riskScore ?? 0) >= 0.8).length}
            </p>
          </div>
        </div>
        <div className="bg-canvas-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <Calendar size={18} className="text-primary" />
          <div>
            <p className="text-bone-muted text-xs">Total Blocked Attempts</p>
            <p className="text-bone text-lg font-semibold">
              {entries
                .reduce((sum, e) => sum + (e.blockedAttempts ?? 0), 0)
                .toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="bg-canvas-card rounded-xl p-12 border border-white/5 text-center">
          <ShieldAlert size={32} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-bone font-medium">No flagged VPAs</p>
          <p className="text-bone-muted text-sm mt-1">
            All clear — no addresses have crossed the risk threshold.
          </p>
        </div>
      ) : (
        <div className="bg-canvas-card rounded-xl border border-white/5 overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 px-4 text-left text-bone-muted text-xs font-medium uppercase tracking-wider">
                  #
                </th>
                <th className="py-3 px-4 text-left text-bone-muted text-xs font-medium uppercase tracking-wider">
                  VPA
                </th>
                <th className="py-3 px-4 text-center text-bone-muted text-xs font-medium uppercase tracking-wider">
                  Reports
                </th>
                <th className="py-3 px-4 text-left text-bone-muted text-xs font-medium uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="py-3 px-4 text-center text-bone-muted text-xs font-medium uppercase tracking-wider">
                  Level
                </th>
                <th className="py-3 px-4 text-center text-bone-muted text-xs font-medium uppercase tracking-wider">
                  Blocked
                </th>
                <th className="py-3 px-4 text-left text-bone-muted text-xs font-medium uppercase tracking-wider">
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