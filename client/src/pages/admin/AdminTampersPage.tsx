// client/src/pages/admin/AdminTampersPage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  ShieldX,
  Scan,
  MapPin,
  Clock,
} from "lucide-react";
import { useAdminTampers, TamperLog } from "../../hooks/useAdmin";

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const detectionBadge = (type: TamperLog["detectionType"]) => {
  switch (type) {
    case "OVERLAY_MISMATCH":
      return "bg-trading-down/15 text-trading-down border-trading-down/30";
    case "MALICIOUS_PAYLOAD":
      return "bg-primary-hover/15 text-primary-hover border-primary-hover/30";
    case "CHECKSUM_FAIL":
      return "bg-primary/15 text-primary border-primary/30";
    case "UNREGISTERED_ORIGIN":
      return "bg-surface-elevated-dark text-muted border-hairline-dark";
  }
};

export const AdminTampersPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useAdminTampers();

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
        <p className="text-sm font-medium text-on-dark">Failed to load QR tamper telemetry logs.</p>
        <p className="text-xs text-trading-down font-mono">{error?.message}</p>
      </div>
    );
  }

  const tampers = data?.tampers ?? [];
  const overlayAttacks = tampers.filter((t) => t.detectionType === "OVERLAY_MISMATCH").length;
  const blockedRate = tampers.length
    ? ((tampers.filter((t) => t.actionTaken === "BLOCKED").length / tampers.length) * 100).toFixed(0)
    : "100";

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="p-2 rounded-md hover:bg-surface-card-dark text-muted hover:text-on-dark transition-colors"
          aria-label="Back to admin"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-on-dark text-2xl font-bold font-sans">QR Tamper & Overlay Detection Log</h1>
          <p className="text-muted text-xs sm:text-sm mt-0.5">
            Audit physical sticker overlays, modified merchant payloads, and rogue QR signatures
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-card-dark rounded-xl p-4 border border-hairline-dark flex items-center gap-3 shadow-sm">
          <Scan size={20} className="text-primary" />
          <div>
            <p className="text-muted text-xs font-mono font-semibold uppercase">Total Intercepts</p>
            <p className="text-on-dark text-lg font-bold font-mono tnum">{tampers.length}</p>
          </div>
        </div>
        <div className="bg-surface-card-dark rounded-xl p-4 border border-hairline-dark flex items-center gap-3 shadow-sm">
          <ShieldX size={20} className="text-trading-down" />
          <div>
            <p className="text-muted text-xs font-mono font-semibold uppercase">Sticker Overlay Attacks</p>
            <p className="text-on-dark text-lg font-bold font-mono tnum">{overlayAttacks}</p>
          </div>
        </div>
        <div className="bg-surface-card-dark rounded-xl p-4 border border-hairline-dark flex items-center gap-3 shadow-sm">
          <ShieldCheck size={20} className="text-trading-up" />
          <div>
            <p className="text-muted text-xs font-mono font-semibold uppercase">Immediate Interception Rate</p>
            <p className="text-on-dark text-lg font-bold font-mono tnum">{blockedRate}%</p>
          </div>
        </div>
      </div>

      {/* Tampers List */}
      {tampers.length === 0 ? (
        <div className="bg-surface-card-dark rounded-xl p-12 border border-hairline-dark text-center shadow-sm">
          <ShieldCheck size={32} className="text-trading-up mx-auto mb-3" />
          <p className="text-on-dark font-semibold font-sans">No QR tampering incidents detected</p>
          <p className="text-muted text-xs mt-1">
            All scanned QR signatures match origin cryptographic records.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tampers.map((item) => (
            <div
              key={item.id}
              className="bg-surface-card-dark rounded-xl border border-hairline-dark p-5 flex flex-col gap-4 hover:border-muted/30 transition-colors shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline-dark pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-pill border ${detectionBadge(
                      item.detectionType
                    )}`}
                  >
                    {item.detectionType.replace(/_/g, " ")}
                  </span>
                  <span className="text-muted text-xs font-mono">ID: {item.id}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted font-mono">
                  {item.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={13} /> {item.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> {formatDate(item.detectedAt)}
                  </span>
                </div>
              </div>

              {/* Payload Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-canvas rounded-lg p-3 border border-hairline-dark flex flex-col gap-1">
                  <span className="text-muted text-[11px] font-mono font-semibold uppercase">Original Verified VPA</span>
                  <span className="text-trading-up font-mono text-sm font-semibold">
                    {item.originalVpa}
                  </span>
                </div>
                <div className="bg-canvas rounded-lg p-3 border border-trading-down/30 flex flex-col gap-1">
                  <span className="text-trading-down text-[11px] font-mono font-semibold uppercase">Tampered Intercepted Target</span>
                  <span className="text-on-dark font-mono text-sm font-semibold">
                    {item.tamperedVpa}
                  </span>
                </div>
              </div>

              {/* Raw Payload & Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-canvas p-3 rounded-lg border border-hairline-dark">
                <div className="truncate max-w-xl">
                  <span className="text-muted font-mono mr-2 font-semibold">Decoded QR String:</span>
                  <code className="text-muted font-mono">{item.qrPayload}</code>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted font-mono">Action Taken:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] font-mono ${
                      item.actionTaken === "BLOCKED"
                        ? "bg-trading-down/20 text-trading-down"
                        : "bg-primary/20 text-primary"
                    }`}
                  >
                    {item.actionTaken}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};