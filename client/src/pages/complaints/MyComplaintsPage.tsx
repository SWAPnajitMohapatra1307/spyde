// client/src/pages/complaints/MyComplaintsPage.tsx
import React, { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  PlusCircle,
  FileQuestion,
  Search,
  ExternalLink,
} from "lucide-react";
import {
  useMyComplaints,
  ComplaintStatus,
  ComplaintRecord,
} from "@/hooks/useComplaints";

type StatusFilterType = "ALL" | "PENDING" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";

const getStatusBadge = (status: string): string => {
  switch (status) {
    case "PENDING":
      return "bg-accent-yellow/15 text-accent-yellow border-accent-yellow/30";
    case "INVESTIGATING":
      return "bg-accent-orange/15 text-accent-orange border-accent-orange/30";
    case "RESOLVED":
    case "VERIFIED":
      return "bg-accent-green/15 text-accent-green border-accent-green/30";
    case "DISMISSED":
    case "REJECTED":
    default:
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

export const MyComplaintsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useMyComplaints();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("ALL");

  const rawComplaints =
    (data as any)?.complaints ||
    (data as any)?.data?.complaints ||
    (data as any)?.data ||
    (Array.isArray(data) ? data : []);

  const complaints: ComplaintRecord[] = Array.isArray(rawComplaints) ? rawComplaints : [];

  const filteredComplaints = useMemo<ComplaintRecord[]>(() => {
    return complaints.filter((c: ComplaintRecord) => {
      // Map Prisma statuses (VERIFIED -> RESOLVED, REJECTED -> DISMISSED)
      let matchesStatus = statusFilter === "ALL";
      if (statusFilter === "PENDING") matchesStatus = c.status === "PENDING";
      if (statusFilter === "INVESTIGATING") matchesStatus = c.status === "INVESTIGATING";
      if (statusFilter === "RESOLVED") matchesStatus = c.status === "RESOLVED" || c.status === ("VERIFIED" as any);
      if (statusFilter === "DISMISSED") matchesStatus = c.status === "DISMISSED" || c.status === ("REJECTED" as any);

      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.targetVpa.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [complaints, statusFilter, searchTerm]);

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
        <p className="text-sm">Failed to load your complaints.</p>
        <p className="text-xs text-accent-red">{error?.message}</p>
      </div>
    );
  }

  const filterTabs: StatusFilterType[] = [
    "ALL",
    "PENDING",
    "INVESTIGATING",
    "RESOLVED",
    "DISMISSED",
  ];

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="p-2 rounded-lg hover:bg-white/5 text-bone-muted transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-bone text-2xl font-bold">My Fraud Reports</h1>
            <p className="text-bone-muted text-sm mt-0.5">
              Track the status and resolution of complaints you have filed
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/complaints/new")}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
        >
          <PlusCircle size={16} />
          File New Dispute
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone-muted" />
          <input
            type="text"
            placeholder="Search your reports..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-canvas-card border border-white/10 rounded-xl text-bone text-sm placeholder:text-bone-muted/60 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {filterTabs.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? "bg-primary text-white"
                  : "bg-canvas-card border border-white/5 text-bone-muted hover:text-bone"
              }`}
            >
              {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Complaints List */}
      {filteredComplaints.length === 0 ? (
        <div className="bg-canvas-card rounded-2xl p-12 border border-white/5 text-center flex flex-col items-center gap-3">
          <FileQuestion size={36} className="text-bone-muted opacity-40" />
          <p className="text-bone font-medium text-base">No complaints found</p>
          <p className="text-bone-muted text-sm max-w-sm">
            {searchTerm
              ? "No records match your search filter."
              : "You haven't filed any fraud reports or payment disputes yet."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredComplaints.map((item: ComplaintRecord) => (
            <div
              key={item.id}
              className="bg-canvas-card rounded-xl border border-white/5 p-5 flex flex-col gap-3.5 hover:border-white/10 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-pill font-medium border ${getStatusBadge(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                  <span className="text-bone-muted text-xs font-mono">Case #{item.id}</span>
                </div>
                <span className="text-bone-muted text-xs">{formatDate(item.createdAt)}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-bone-muted text-xs block">Reported Target VPA</span>
                  <Link
                    to={`/complaints/vpa/${encodeURIComponent(item.targetVpa)}`}
                    className="text-primary font-mono font-semibold text-sm hover:underline inline-flex items-center gap-1 mt-0.5"
                  >
                    {item.targetVpa}
                    <ExternalLink size={13} />
                  </Link>
                </div>
                <div>
                  <span className="text-bone-muted text-xs block sm:text-right">Category</span>
                  <span className="text-bone text-xs font-medium uppercase px-2 py-0.5 rounded bg-white/5 inline-block mt-0.5">
                    {item.category.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              <div className="bg-canvas rounded-lg p-3 border border-white/5">
                <span className="text-bone-muted text-xs font-medium block mb-1">
                  Your Description
                </span>
                <p className="text-bone text-xs leading-relaxed">{item.description}</p>
              </div>

              {item.resolutionNotes && (
                <div className="bg-accent-green/5 border border-accent-green/20 rounded-lg p-3">
                  <span className="text-accent-green text-xs font-semibold block mb-1">
                    Moderator Resolution Notes
                  </span>
                  <p className="text-bone text-xs leading-relaxed">{item.resolutionNotes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};