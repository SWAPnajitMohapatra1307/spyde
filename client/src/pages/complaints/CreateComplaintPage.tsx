// client/src/pages/complaints/CreateComplaintPage.tsx
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import {
  useCreateComplaint,
  ComplaintCategory,
} from "@/hooks/useComplaints";

interface CategoryOption {
  value: ComplaintCategory;
  label: string;
  description: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    value: "FRAUD",
    label: "Financial Fraud / Scam",
    description: "Unauthorized transaction or direct financial deception",
  },
  {
    value: "IMPERSONATION",
    label: "Impersonation",
    description: "Claimed to be someone else or a verified entity",
  },
  {
    value: "PHISHING",
    label: "Phishing / Malicious QR",
    description: "Fake link, QR sticker overlay, or deceptive request",
  },
  {
    value: "NON_DELIVERY",
    label: "Non-Delivery of Goods/Service",
    description: "Paid money but merchant/receiver never fulfilled service",
  },
  {
    value: "HARASSMENT",
    label: "Harassment / Extortion",
    description: "Threats, blackmail, or abusive payment requests",
  },
  {
    value: "SUSPICIOUS_BEHAVIOR",
    label: "Suspicious Activity",
    description: "Unusual pressure, inconsistent details, or high-risk behavior",
  },
  {
    value: "OTHER",
    label: "Other Fraud Issue",
    description: "Any other safety concern not listed above",
  },
];

export const CreateComplaintPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialVpa = searchParams.get("vpa") ?? "";

  const [targetVpa, setTargetVpa] = useState(initialVpa);
  const [category, setCategory] = useState<ComplaintCategory>("FRAUD");
  const [description, setDescription] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  const { fileComplaintAsync, isFiling, fileError } = useCreateComplaint();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetVpa.trim() || !description.trim()) return;

    try {
      const res = await fileComplaintAsync({
        targetVpa: targetVpa.trim().toLowerCase(),
        category,
        description: description.trim(),
      });
      setCreatedCaseId(res.id);
      setIsSuccess(true);
    } catch {
      // Handled via fileError
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8 max-w-lg mx-auto text-center">
        <div className="p-4 rounded-full bg-accent-green/10 text-accent-green mb-4">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-bone text-2xl font-bold">Dispute Report Filed</h2>
        <p className="text-bone-muted text-sm mt-2 max-w-sm">
          Your complaint against <span className="text-bone font-mono">{targetVpa}</span> has been
          logged into the SPYDE network telemetry.
        </p>

        {createdCaseId && (
          <div className="my-5 px-4 py-2.5 bg-canvas-card border border-white/10 rounded-xl font-mono text-xs text-bone">
            Case ID: {createdCaseId}
          </div>
        )}

        <div className="flex items-center gap-3 mt-4 w-full">
          <button
            type="button"
            onClick={() => navigate("/complaints/mine")}
            className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-all"
          >
            View My Reports
          </button>
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="flex-1 py-2.5 px-4 bg-canvas-card hover:bg-white/5 text-bone border border-white/10 rounded-xl text-sm font-medium transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
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
          <h1 className="text-bone text-2xl font-bold">Report Fraudulent VPA</h1>
          <p className="text-bone-muted text-sm mt-0.5">
            Submit crowdsourced evidence to trigger collective fraud defenses
          </p>
        </div>
      </div>

      {fileError && (
        <div className="bg-accent-red/10 border border-accent-red/30 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle size={18} className="text-accent-red shrink-0 mt-0.5" />
          <p className="text-accent-red text-xs leading-relaxed">
            {fileError.message || "Failed to submit fraud report. Please try again."}
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Target VPA */}
        <div className="flex flex-col gap-1.5">
          <label className="text-bone text-sm font-medium">Target VPA / UPI ID</label>
          <input
            type="text"
            required
            placeholder="e.g. suspect@upi"
            value={targetVpa}
            onChange={(e) => setTargetVpa(e.target.value)}
            className="w-full px-4 py-2.5 bg-canvas-card border border-white/10 rounded-xl text-bone text-sm font-mono placeholder:text-bone-muted/50 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Category Radio Cards */}
        <div className="flex flex-col gap-2">
          <label className="text-bone text-sm font-medium">Complaint Category</label>
          <div className="grid grid-cols-1 gap-2.5">
            {CATEGORY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                onClick={() => setCategory(opt.value)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  category === opt.value
                    ? "border-primary bg-primary/10"
                    : "border-white/5 bg-canvas-card hover:border-white/15"
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={opt.value}
                  checked={category === opt.value}
                  onChange={() => setCategory(opt.value)}
                  className="mt-1 accent-primary"
                />
                <div className="flex flex-col">
                  <span className="text-bone text-sm font-semibold">{opt.label}</span>
                  <span className="text-bone-muted text-xs mt-0.5">{opt.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-bone text-sm font-medium">Incident Details</label>
          <textarea
            required
            rows={4}
            placeholder="Describe what happened: date/time, context, chat platforms involved, or any claims made..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 bg-canvas-card border border-white/10 rounded-xl text-bone text-sm placeholder:text-bone-muted/50 focus:outline-none focus:border-primary transition-colors leading-relaxed"
          />
        </div>

        {/* Advisory */}
        <div className="bg-canvas-card p-4 rounded-xl border border-white/5 flex items-start gap-3 text-xs text-bone-muted">
          <ShieldAlert size={18} className="text-accent-yellow shrink-0 mt-0.5" />
          <p>
            Your report is cryptographically timestamped and evaluated by SPYDE automated risk
            models. Malicious false reports may lower your trust score.
          </p>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isFiling || !targetVpa.trim() || !description.trim()}
          className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
        >
          {isFiling && <Loader2 size={16} className="animate-spin" />}
          Submit Fraud Report
        </button>
      </form>
    </div>
  );
};