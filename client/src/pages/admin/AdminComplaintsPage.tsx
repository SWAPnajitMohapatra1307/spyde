// client/src/pages/admin/AdminComplaintsPage.tsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Search,
  MessageSquare,
} from "lucide-react";
import {
  useAdminComplaints,
  useUpdateComplaint,
  ComplaintStatus,
  AdminComplaintRecord,
} from "../../hooks/useAdmin";

const STATUS_FILTERS: Array<{ label: string; value: ComplaintStatus | "ALL" }> = [
  { label: "All Complaints", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Investigating", value: "INVESTIGATING" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Dismissed", value: "DISMISSED" },
];

const getStatusBadge = (status: ComplaintStatus) => {
  switch (status) {
    case "PENDING":
      return "bg-primary/15 text-primary border-primary/30";
    case "INVESTIGATING":
      return "bg-primary-hover/15 text-primary-hover border-primary-hover/30";
    case "RESOLVED":
      return "bg-trading-up/15 text-trading-up border-trading-up/30";
    case "DISMISSED":
      return "bg-surface-elevated-dark text-muted border-hairline-dark";
  }
};

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export const AdminComplaintsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useAdminComplaints();
  const updateMutation = useUpdateComplaint();

  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeComplaint, setActiveComplaint] = useState<AdminComplaintRecord | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [targetStatus, setTargetStatus] = useState<ComplaintStatus>("RESOLVED");

  const complaints = data?.complaints ?? [];

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchesStatus = selectedStatus === "ALL" || c.status === selectedStatus;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.targetVpa.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [complaints, selectedStatus, searchTerm]);

  const handleOpenModal = (complaint: AdminComplaintRecord) => {
    setActiveComplaint(complaint);
    setResolutionNotes(complaint.resolutionNotes ?? "");
    setTargetStatus(complaint.status === "PENDING" ? "INVESTIGATING" : complaint.status);
  };

  const handleCloseModal = () => {
    setActiveComplaint(null);
    setResolutionNotes("");
  };

  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplaint) return;

    await updateMutation.mutateAsync({
      complaintId: activeComplaint.id,
      status: targetStatus,
      resolutionNotes: resolutionNotes.trim() || undefined,
    });

    handleCloseModal();
  };

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
        <p className="text-sm font-medium text-on-dark">Failed to load complaints for moderation.</p>
        <p className="text-xs text-trading-down font-mono">{error?.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            <h1 className="text-on-dark text-2xl font-bold font-sans">Dispute & Complaint Moderation</h1>
            <p className="text-muted text-xs sm:text-sm mt-0.5">
              Review and adjudicate user reports and fraudulent VPA claims
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by VPA, Category, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-card-dark border border-hairline-dark rounded-lg text-on-dark text-xs placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setSelectedStatus(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedStatus === f.value
                  ? "bg-primary text-on-primary font-bold shadow-sm"
                  : "bg-surface-card-dark border border-hairline-dark text-muted hover:text-on-dark"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      {filteredComplaints.length === 0 ? (
        <div className="bg-surface-card-dark rounded-xl p-12 border border-hairline-dark text-center shadow-sm">
          <MessageSquare size={32} className="text-muted mx-auto mb-3" />
          <p className="text-on-dark font-semibold font-sans">No complaints found</p>
          <p className="text-muted text-xs mt-1">
            {searchTerm ? "Try adjusting your search criteria." : "No reports in this category."}
          </p>
        </div>
      ) : (
        <div className="bg-surface-card-dark rounded-xl border border-hairline-dark overflow-x-auto shadow-sm">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-hairline-dark bg-surface-elevated-dark/50">
                <th className="py-3 px-4 text-left text-muted text-xs font-semibold uppercase tracking-wider font-mono">
                  Target VPA
                </th>
                <th className="py-3 px-4 text-left text-muted text-xs font-semibold uppercase tracking-wider font-mono">
                  Category
                </th>
                <th className="py-3 px-4 text-left text-muted text-xs font-semibold uppercase tracking-wider font-mono">
                  Description
                </th>
                <th className="py-3 px-4 text-center text-muted text-xs font-semibold uppercase tracking-wider font-mono">
                  Status
                </th>
                <th className="py-3 px-4 text-left text-muted text-xs font-semibold uppercase tracking-wider font-mono">
                  Date
                </th>
                <th className="py-3 px-4 text-right text-muted text-xs font-semibold uppercase tracking-wider font-mono">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-hairline-dark hover:bg-surface-elevated-dark/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="text-on-dark font-mono font-medium text-xs">{item.targetVpa}</span>
                    {item.reporterMasked && (
                      <p className="text-muted text-[11px] font-mono">By: {item.reporterMasked}</p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-muted text-xs font-semibold uppercase px-2 py-0.5 rounded bg-surface-elevated-dark border border-hairline-dark font-mono">
                      {item.category.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <p className="text-on-dark text-xs truncate" title={item.description}>
                      {item.description}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-pill border ${getStatusBadge(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted text-xs font-mono">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(item)}
                      className="px-3 py-1 bg-surface-elevated-dark hover:bg-hairline-dark text-primary hover:underline rounded-md text-xs font-semibold transition-colors border border-hairline-dark"
                    >
                      Adjudicate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Triage & Resolution Modal */}
      {activeComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-card-dark border border-hairline-dark rounded-xl w-full max-w-lg p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-hairline-dark pb-4">
              <div>
                <h3 className="text-on-dark text-lg font-bold font-sans">Complaint Triage</h3>
                <p className="text-muted text-xs font-mono">ID: {activeComplaint.id}</p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-muted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-surface-elevated-dark rounded-lg p-4 flex flex-col gap-2 text-xs border border-hairline-dark">
              <div className="flex justify-between">
                <span className="text-muted">Target VPA:</span>
                <span className="text-on-dark font-mono font-semibold">{activeComplaint.targetVpa}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Category:</span>
                <span className="text-on-dark font-semibold">{activeComplaint.category}</span>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-muted text-[11px]">Report Detail:</span>
                <p className="text-on-dark text-xs bg-canvas rounded-lg p-2.5 border border-hairline-dark leading-relaxed">
                  {activeComplaint.description}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitResolution} className="flex flex-col gap-4">
              <div>
                <label className="text-on-dark text-xs font-semibold block mb-1.5 uppercase font-mono tracking-wider">
                  Update Case Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as ComplaintStatus)}
                  className="w-full px-3 py-2 bg-canvas border border-hairline-dark rounded-lg text-on-dark text-xs focus:outline-none focus:border-primary"
                >
                  <option value="INVESTIGATING">INVESTIGATING — In Progress</option>
                  <option value="RESOLVED">RESOLVED — Fraud Confirmed / Actioned</option>
                  <option value="DISMISSED">DISMISSED — Inconclusive / False Report</option>
                </select>
              </div>

              <div>
                <label className="text-on-dark text-xs font-semibold block mb-1.5 uppercase font-mono tracking-wider">
                  Resolution Notes & Audit Reason
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="State the findings, bank escalation reference, or remediation..."
                  className="w-full px-3 py-2 bg-canvas border border-hairline-dark rounded-lg text-on-dark text-xs placeholder:text-muted focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline-dark">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-md text-muted hover:text-on-dark text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-on-primary rounded-md text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-2 shadow-md"
                >
                  {updateMutation.isPending && <Loader2 size={16} className="animate-spin text-on-primary" />}
                  Save Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};