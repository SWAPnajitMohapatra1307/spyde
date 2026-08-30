// client/src/pages/admin/AdminNetworkPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Network,
  ShieldAlert,
  Smartphone,
  Globe,
  CreditCard,
  User,
  Info,
} from "lucide-react";
import { useAdminNetwork, NetworkNode } from "../../hooks/useAdmin";

const getNodeIcon = (type: NetworkNode["type"]) => {
  switch (type) {
    case "VPA":
      return <CreditCard size={14} className="text-primary" />;
    case "USER":
      return <User size={14} className="text-accent-yellow" />;
    case "DEVICE":
      return <Smartphone size={14} className="text-accent-orange" />;
    case "IP":
      return <Globe size={14} className="text-bone-muted" />;
  }
};

export const AdminNetworkPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useAdminNetwork();
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);

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
        <p className="text-sm">Failed to load fraud ring network data.</p>
        <p className="text-xs text-accent-red">{error?.message}</p>
      </div>
    );
  }

  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];
  const highRiskNodes = nodes.filter((n) => n.riskScore >= 0.7);

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
          <h1 className="text-bone text-2xl font-bold">Fraud Ring & Entity Network Graph</h1>
          <p className="text-bone-muted text-sm mt-0.5">
            Identify mule accounts, shared hardware fingerprints, and coordinated fraud syndicates
          </p>
        </div>
      </div>

      {/* Grid: Graph Overview & Node Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Cluster Visual / Entities List */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-canvas-card rounded-xl border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Network size={18} className="text-primary" />
                <h3 className="text-bone font-semibold text-base">Detected Syndicate Clusters</h3>
              </div>
              <span className="text-bone-muted text-xs">
                {nodes.length} entities • {edges.length} linkages
              </span>
            </div>

            {/* Entity Nodes Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-1">
              {nodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`cursor-pointer rounded-xl p-3.5 border transition-all flex flex-col gap-2 ${
                    selectedNode?.id === node.id
                      ? "border-primary bg-primary/10"
                      : node.flagged
                      ? "border-accent-red/40 bg-accent-red/5 hover:border-accent-red"
                      : "border-white/5 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getNodeIcon(node.type)}
                      <span className="text-bone text-xs font-mono font-medium truncate max-w-[140px]">
                        {node.label}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        node.riskScore >= 0.7
                          ? "bg-accent-red/20 text-accent-red"
                          : node.riskScore >= 0.4
                          ? "bg-accent-yellow/20 text-accent-yellow"
                          : "bg-accent-green/20 text-accent-green"
                      }`}
                    >
                      {(node.riskScore * 100).toFixed(0)}% Risk
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-bone-muted">
                    <span>Type: {node.type}</span>
                    {node.totalVolume !== undefined && (
                      <span>₹{(node.totalVolume / 100).toLocaleString("en-IN")}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Relationship Edges Summary */}
          <div className="bg-canvas-card rounded-xl border border-white/5 p-5">
            <h4 className="text-bone font-semibold text-sm mb-3">Graph Edge Linkages</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {edges.map((edge) => (
                <div
                  key={edge.id}
                  className="flex items-center justify-between text-xs py-1.5 px-3 rounded bg-white/[0.02] border border-white/5"
                >
                  <div className="flex items-center gap-2 font-mono text-bone-muted">
                    <span className="text-bone truncate max-w-[110px]">{edge.source}</span>
                    <span>⟷</span>
                    <span className="text-bone truncate max-w-[110px]">{edge.target}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold">
                    {edge.relation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Node Inspector Panel */}
        <div className="flex flex-col gap-4">
          <div className="bg-canvas-card rounded-xl border border-white/5 p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <Info size={16} className="text-primary" />
              <h3 className="text-bone font-semibold text-sm">Entity Inspector</h3>
            </div>

            {selectedNode ? (
              <div className="flex flex-col gap-4 text-xs">
                <div>
                  <span className="text-bone-muted block mb-1">Entity Identifier</span>
                  <span className="text-bone font-mono text-sm font-semibold break-all">
                    {selectedNode.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-white/5 p-3 rounded-lg">
                  <div>
                    <span className="text-bone-muted">Entity Type</span>
                    <p className="text-bone font-medium mt-0.5">{selectedNode.type}</p>
                  </div>
                  <div>
                    <span className="text-bone-muted">Syndicate Risk</span>
                    <p
                      className={`font-semibold mt-0.5 ${
                        selectedNode.riskScore >= 0.7
                          ? "text-accent-red"
                          : selectedNode.riskScore >= 0.4
                          ? "text-accent-yellow"
                          : "text-accent-green"
                      }`}
                    >
                      {(selectedNode.riskScore * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                {selectedNode.flagged && (
                  <div className="bg-accent-red/10 border border-accent-red/30 p-3 rounded-lg flex items-start gap-2">
                    <ShieldAlert size={16} className="text-accent-red shrink-0 mt-0.5" />
                    <p className="text-accent-red text-xs leading-relaxed">
                      This entity has multiple high-confidence link patterns with confirmed scam VPAs.
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-bone-muted block mb-1.5 font-medium">Direct Associations</span>
                  <div className="space-y-1.5">
                    {edges
                      .filter(
                        (e) => e.source === selectedNode.id || e.target === selectedNode.id
                      )
                      .map((e) => {
                        const otherId = e.source === selectedNode.id ? e.target : e.source;
                        return (
                          <div
                            key={e.id}
                            className="bg-canvas border border-white/5 rounded p-2 flex justify-between items-center"
                          >
                            <span className="font-mono text-bone truncate max-w-[120px]">
                              {otherId}
                            </span>
                            <span className="text-[10px] text-bone-muted">{e.relation}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-bone-muted text-xs">
                <Network size={28} className="mx-auto mb-2 opacity-40" />
                Select an entity node from the cluster to view its syndicated relationships.
              </div>
            )}
          </div>

          {/* Risk Summary card */}
          <div className="bg-canvas-card rounded-xl border border-white/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-accent-red" />
              <span className="text-bone text-xs font-medium">High Risk Nodes</span>
            </div>
            <span className="text-bone font-bold text-sm">{highRiskNodes.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};