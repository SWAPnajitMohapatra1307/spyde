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
      return "bg-accent-red/15 text-accent-red border-accent-red/30";
    case "MALICIOUS_PAYLOAD":
      return "bg-accent-orange/15 text-accent-orange border-accent-orange/30";
    case "CHECKSUM_FAIL":
      return "bg-accent-yellow/15 text-accent-yellow border-accent-yellow/30";
    case "UNREGISTERED_ORIGIN":
      return "bg-bone-muted/15 text-bone border-white/10";
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
      <div className="flex flex-col items-center gap-3 h-64 justify-center text-bone-muted">
        <AlertTriangle size={24} className="text-accent-red" />
        <p className="text-sm">Failed to load QR tamper telemetry logs.</p>
        <p className="text-xs text-accent-red">{error?.message}</p>
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
          className="p-2 rounded-lg hover:bg-white/5 text-bone-muted transition-colors"
          aria-label="Back to admin"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-bone text-2xl font-bold">QR Tamper & Overlay Detection Log</h1>
          <p className="text-bone-muted text-sm mt-0.5">
            Audit physical sticker overlays, modified merchant payloads, and rogue QR signatures
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-canvas-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <Scan size={20} className="text-primary" />
          <div>
            <p className="text-bone-muted text-xs">Total Intercepts</p>
            <p className="text-bone text-lg font-semibold">{tampers.length}</p>
          </div>
        </div>
        <div className="bg-canvas-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <ShieldX size={20} className="text-accent-red" />
          <div>
            <p className="text-bone-muted text-xs">Sticker Overlay Attacks</p>
            <p className="text-bone text-lg font-semibold">{overlayAttacks}</p>
          </div>
        </div>
        <div className="bg-canvas-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
          <ShieldCheck size={20} className="text-accent-green" />
          <div>
            <p className="text-bone-muted text-xs">Immediate Interception Rate</p>
            <p className="text-bone text-lg font-semibold">{blockedRate}%</p>
          </div>
        </div>
      </div>

      {/* Tampers List */}
      {tampers.length === 0 ? (
        <div className="bg-canvas-card rounded-xl p-12 border border-white/5 text-center">
          <ShieldCheck size={32} className="text-accent-green mx-auto mb-3" />
          <p className="text-bone font-medium">No QR tampering incidents detected</p>
          <p className="text-bone-muted text-sm mt-1">
            All scanned QR signatures match origin cryptographic records.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tampers.map((item) => (
            <div
              key={item.id}
              className="bg-canvas-card rounded-xl border border-white/5 p-5 flex flex-col gap-4 hover:border-white/10 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-pill font-medium border ${detectionBadge(
                      item.detectionType
                    )}`}
                  >
                    {item.detectionType.replace(/_/g, " ")}
                  </span>
                  <span className="text-bone-muted text-xs font-mono">ID: {item.id}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-bone-muted">
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
                <div className="bg-canvas rounded-lg p-3 border border-white/5 flex flex-col gap-1">
                  <span className="text-bone-muted text-xs font-medium">Original Verified VPA</span>
                  <span className="text-accent-green font-mono text-sm font-semibold">
                    {item.originalVpa}
                  </span>
                </div>
                <div className="bg-accent-red/5 rounded-lg p-3 border border-accent-red/20 flex flex-col gap-1">
                  <span className="text-accent-red text-xs font-medium">Tampered Intercepted Target</span>
                  <span className="text-bone font-mono text-sm font-semibold">
                    {item.tamperedVpa}
                  </span>
                </div>
              </div>

              {/* Raw Payload & Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-white/[0.02] p-3 rounded-lg">
                <div className="truncate max-w-xl">
                  <span className="text-bone-muted font-medium mr-2">Decoded QR String:</span>
                  <code className="text-bone-muted font-mono">{item.qrPayload}</code>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-bone-muted">Action Taken:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded ${
                      item.actionTaken === "BLOCKED"
                        ? "bg-accent-red/20 text-accent-red"
                        : "bg-accent-yellow/20 text-accent-yellow"
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