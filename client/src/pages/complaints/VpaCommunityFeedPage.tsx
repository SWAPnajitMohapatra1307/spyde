// client/src/pages/complaints/VpaCommunityFeedPage.tsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Flag,
  Calendar,
  Users,
} from "lucide-react";
import { useVpaComplaints, ComplaintCategory } from "@/hooks/useComplaints";

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));

const getCategoryLabel = (category: ComplaintCategory): string => {
  switch (category) {
    case "FRAUD":
      return "Financial Fraud / Scam";
    case "IMPERSONATION":
      return "Impersonation / Fake ID";
    case "PHISHING":
      return "Phishing / Fake Link";
    case "NON_DELIVERY":
      return "Goods Not Received";
    case "HARASSMENT":
      return "Harassment / Extortion";
    case "SUSPICIOUS_BEHAVIOR":
      return "Suspicious Activity";
    case "OTHER":
      return "Other Fraud";
  }
};

export const VpaCommunityFeedPage: React.FC = () => {
  const { vpa } = useParams<{ vpa: string }>();
  const navigate = useNavigate();
  const targetVpa = vpa ? decodeURIComponent(vpa) : "";

  const { data, isLoading, isError, error } = useVpaComplaints(targetVpa);

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
        <p className="text-sm">Failed to load community feed for this VPA.</p>
        <p className="text-xs text-accent-red">{error?.message}</p>
      </div>
    );
  }

  const reports = data?.complaints ?? [];
  const riskScore = data?.riskScore ?? 0;
  const totalReports = data?.totalReports ?? reports.length;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-4xl mx-auto">
      {/* Back button & Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-white/5 text-bone-muted transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-bone text-2xl font-bold">Community Fraud Feed</h1>
          <p className="text-bone-muted text-sm mt-0.5">
            Crowdsourced telemetry and reported incident signals
          </p>
        </div>
      </div>

      {/* Target VPA Banner & Risk Summary */}
      <div className="bg-canvas-card border border-white/10 rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div>
            <span className="text-bone-muted text-xs font-medium uppercase tracking-wider">
              Target Identifier
            </span>
            <h2 className="text-bone text-xl font-bold font-mono mt-1">{targetVpa}</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/complaints/new?vpa=${encodeURIComponent(targetVpa)}`)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-accent-red hover:bg-accent-red/90 text-white rounded-xl text-sm font-semibold transition-all"
          >
            <Flag size={15} />
            Report This VPA
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-canvas rounded-xl p-4 border border-white/5 flex items-center gap-3">
            {riskScore >= 0.6 ? (
              <ShieldAlert size={24} className="text-accent-red" />
            ) : (
              <ShieldCheck size={24} className="text-accent-green" />
            )}
            <div>
              <p className="text-bone-muted text-xs">Risk Index</p>
              <p
                className={`text-lg font-bold ${
                  riskScore >= 0.6 ? "text-accent-red" : "text-accent-green"
                }`}
              >
                {(riskScore * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          <div className="bg-canvas rounded-xl p-4 border border-white/5 flex items-center gap-3">
            <Users size={24} className="text-primary" />
            <div>
              <p className="text-bone-muted text-xs">Community Reports</p>
              <p className="text-bone text-lg font-bold">{totalReports}</p>
            </div>
          </div>

          <div className="bg-canvas rounded-xl p-4 border border-white/5 flex items-center gap-3">
            <Calendar size={24} className="text-bone-muted" />
            <div>
              <p className="text-bone-muted text-xs">Status Assessment</p>
              <p className="text-bone text-sm font-semibold mt-0.5">
                {riskScore >= 0.8
                  ? "High Risk — Blocked"
                  : riskScore >= 0.4
                  ? "Caution Advised"
                  : "Normal Standing"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Incident Feed */}
      <div className="flex flex-col gap-3">
        <h3 className="text-bone text-base font-semibold">Incident History ({reports.length})</h3>

        {reports.length === 0 ? (
          <div className="bg-canvas-card rounded-2xl p-10 border border-white/5 text-center flex flex-col items-center gap-2">
            <ShieldCheck size={32} className="text-accent-green" />
            <p className="text-bone font-medium">No community reports on record</p>
            <p className="text-bone-muted text-xs max-w-sm">
              This address has not been flagged by any SPYDE users or automated honeytraps.
            </p>
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className="bg-canvas-card border border-white/5 rounded-xl p-4 flex flex-col gap-2.5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-accent-red/10 text-accent-red border border-accent-red/20">
                  {getCategoryLabel(report.category)}
                </span>
                <span className="text-bone-muted text-xs">{formatDate(report.createdAt)}</span>
              </div>
              <p className="text-bone text-xs leading-relaxed bg-canvas p-3 rounded-lg border border-white/5">
                {report.description}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};