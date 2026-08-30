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

// ── Row Component ────────────────────────────────────────────────────

interface FlaggedRowProps {
  entry: FlaggedVpa;
  rank: number;
}

const FlaggedRow: React.FC<FlaggedRowProps> = ({ entry, rank }) => {
  const risk = entry.riskScore ?? 0;
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <td className="py-3 px-4 text-bone-muted text-sm font-mono">
        #{rank}
      </td>
      <td className="py-3 px-4 text-bone font-medium text-sm font-mono">
        {entry.vpa}
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-bone text-sm font-semibold">
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
      <td className="py-3 px-4 text-center text-bone text-sm">
        {entry.blockedAttempts ?? 0}
      </td>
      <td className="py-3 px-4 text-bone-muted text-xs">
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
      {/* Header */}
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

      {/* Summary strip */}
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

      {/* Table */}
      {entries.length === 0 ? (
        <div className="bg-canvas-card rounded-xl p-12 border border-white/5 text-center">
          <ShieldAlert size={32} className="text-accent-green mx-auto mb-3" />
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