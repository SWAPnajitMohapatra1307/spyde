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
      return "bg-accent-yellow/15 text-accent-yellow border-accent-yellow/30";
    case "INVESTIGATING":
      return "bg-accent-orange/15 text-accent-orange border-accent-orange/30";
    case "RESOLVED":
      return "bg-accent-green/15 text-accent-green border-accent-green/30";
    case "DISMISSED":
      return "bg-white/10 text-bone-muted border-white/10";
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
      <div className="flex flex-col items-center gap-3 h-64 justify-center text-bone-muted">
        <AlertTriangle size={24} className="text-accent-red" />
        <p className="text-sm">Failed to load complaints for moderation.</p>
        <p className="text-xs text-accent-red">{error?.message}</p>
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
            className="p-2 rounded-lg hover:bg-white/5 text-bone-muted transition-colors"
            aria-label="Back to admin"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-bone text-2xl font-bold">Dispute & Complaint Moderation</h1>
            <p className="text-bone-muted text-sm mt-0.5">
              Review and adjudicate user reports and fraudulent VPA claims
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone-muted" />
          <input
            type="text"
            placeholder="Search by VPA, Category, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-canvas-card border border-white/10 rounded-xl text-bone text-sm placeholder:text-bone-muted/60 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setSelectedStatus(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedStatus === f.value
                  ? "bg-primary text-white"
                  : "bg-canvas-card border border-white/5 text-bone-muted hover:text-bone"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      {filteredComplaints.length === 0 ? (
        <div className="bg-canvas-card rounded-xl p-12 border border-white/5 text-center">
          <MessageSquare size={32} className="text-bone-muted mx-auto mb-3" />
          <p className="text-bone font-medium">No complaints found</p>
          <p className="text-bone-muted text-sm mt-1">
            {searchTerm ? "Try adjusting your search criteria." : "No reports in this category."}
          </p>
        </div>
      ) : (
        <div className="bg-canvas-card rounded-xl border border-white/5 overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 px-4 text-left text-bone-muted text-xs font-medium uppercase tracking-wider">
                  Target VPA
                </th>
                <th className="py-3 px-4 text-left text-bone-muted text-xs font-medium uppercase tracking-wider">
                  Category
                </th>
                <th className="py-3 px-4 text-left text-bone-muted text-xs font-medium uppercase tracking-wider">
                  Description
                </th>
                <th className="py-3 px-4 text-center text-bone-muted text-xs font-medium uppercase tracking-wider">
                  Status
                </th>
                <th className="py-3 px-4 text-left text-bone-muted text-xs font-medium uppercase tracking-wider">
                  Date
                </th>
                <th className="py-3 px-4 text-right text-bone-muted text-xs font-medium uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="text-bone font-mono font-medium text-sm">{item.targetVpa}</span>
                    {item.reporterMasked && (
                      <p className="text-bone-muted text-xs font-mono">By: {item.reporterMasked}</p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-bone-muted text-xs font-medium uppercase px-2 py-0.5 rounded bg-white/5">
                      {item.category.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <p className="text-bone text-sm truncate" title={item.description}>
                      {item.description}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-pill border ${getStatusBadge(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-bone-muted text-xs">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(item)}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 text-primary hover:underline rounded-lg text-xs font-medium transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-canvas-card border border-white/10 rounded-2xl w-full max-w-lg p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-bone text-lg font-bold">Complaint Triage</h3>
                <p className="text-bone-muted text-xs font-mono">ID: {activeComplaint.id}</p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-bone-muted hover:text-bone text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-white/5 rounded-xl p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-bone-muted">Target VPA:</span>
                <span className="text-bone font-mono font-medium">{activeComplaint.targetVpa}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-bone-muted">Category:</span>
                <span className="text-bone font-medium">{activeComplaint.category}</span>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-bone-muted text-xs">Report Detail:</span>
                <p className="text-bone text-xs bg-canvas rounded-lg p-2.5 border border-white/5 leading-relaxed">
                  {activeComplaint.description}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitResolution} className="flex flex-col gap-4">
              <div>
                <label className="text-bone text-xs font-medium block mb-1.5">
                  Update Case Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as ComplaintStatus)}
                  className="w-full px-3 py-2 bg-canvas border border-white/10 rounded-xl text-bone text-sm focus:outline-none focus:border-primary"
                >
                  <option value="INVESTIGATING">INVESTIGATING — In Progress</option>
                  <option value="RESOLVED">RESOLVED — Fraud Confirmed / Actioned</option>
                  <option value="DISMISSED">DISMISSED — Inconclusive / False Report</option>
                </select>
              </div>

              <div>
                <label className="text-bone text-xs font-medium block mb-1.5">
                  Resolution Notes & Audit Reason
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="State the findings, bank escalation reference, or remediation..."
                  className="w-full px-3 py-2 bg-canvas border border-white/10 rounded-xl text-bone text-sm placeholder:text-bone-muted/60 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-bone-muted hover:text-bone text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {updateMutation.isPending && <Loader2 size={16} className="animate-spin" />}
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