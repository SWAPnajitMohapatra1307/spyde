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
      return <User size={14} className="text-primary" />;
    case "DEVICE":
      return <Smartphone size={14} className="text-primary-hover" />;
    case "IP":
      return <Globe size={14} className="text-muted" />;
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
      <div className="flex flex-col items-center gap-3 h-64 justify-center text-muted">
        <AlertTriangle size={24} className="text-trading-down" />
        <p className="text-sm font-medium text-on-dark">Failed to load fraud ring network data.</p>
        <p className="text-xs text-trading-down font-mono">{error?.message}</p>
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
          className="p-2 rounded-md hover:bg-surface-card-dark text-muted hover:text-on-dark transition-colors"
          aria-label="Back to admin"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-on-dark text-2xl font-bold font-sans">Fraud Ring & Entity Network Graph</h1>
          <p className="text-muted text-xs sm:text-sm mt-0.5">
            Identify mule accounts, shared hardware fingerprints, and coordinated fraud syndicates
          </p>
        </div>
      </div>

      {/* Grid: Graph Overview & Node Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Cluster Visual / Entities List */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-surface-card-dark rounded-xl border border-hairline-dark p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Network size={18} className="text-primary" />
                <h3 className="text-on-dark font-bold text-sm sm:text-base font-sans">Detected Syndicate Clusters</h3>
              </div>
              <span className="text-muted text-xs font-mono">
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
                      ? "border-trading-down/40 bg-trading-down/5 hover:border-trading-down"
                      : "border-hairline-dark bg-canvas hover:border-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getNodeIcon(node.type)}
                      <span className="text-on-dark text-xs font-mono font-semibold truncate max-w-[140px]">
                        {node.label}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-pill font-bold ${
                        node.riskScore >= 0.7
                          ? "bg-trading-down/20 text-trading-down"
                          : node.riskScore >= 0.4
                          ? "bg-primary/20 text-primary"
                          : "bg-trading-up/20 text-trading-up"
                      }`}
                    >
                      {(node.riskScore * 100).toFixed(0)}% Risk
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted font-mono">
                    <span>Type: {node.type}</span>
                    {node.totalVolume !== undefined && (
                      <span className="tnum">₹{(node.totalVolume / 100).toLocaleString("en-IN")}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Relationship Edges Summary */}
          <div className="bg-surface-card-dark rounded-xl border border-hairline-dark p-5 shadow-sm">
            <h4 className="text-on-dark font-bold text-sm mb-3 font-sans">Graph Edge Linkages</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {edges.map((edge) => (
                <div
                  key={edge.id}
                  className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-canvas border border-hairline-dark"
                >
                  <div className="flex items-center gap-2 font-mono text-muted">
                    <span className="text-on-dark truncate max-w-[110px]">{edge.source}</span>
                    <span>⟷</span>
                    <span className="text-on-dark truncate max-w-[110px]">{edge.target}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold font-mono">
                    {edge.relation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Node Inspector Panel */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface-card-dark rounded-xl border border-hairline-dark p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-hairline-dark pb-3">
              <Info size={16} className="text-primary" />
              <h3 className="text-on-dark font-bold text-sm font-sans">Entity Inspector</h3>
            </div>

            {selectedNode ? (
              <div className="flex flex-col gap-4 text-xs">
                <div>
                  <span className="text-muted block mb-1 uppercase font-mono tracking-wider font-semibold text-[10px]">
                    Entity Identifier
                  </span>
                  <span className="text-on-dark font-mono text-sm font-semibold break-all">
                    {selectedNode.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-surface-elevated-dark p-3 rounded-lg border border-hairline-dark">
                  <div>
                    <span className="text-muted text-[11px] font-mono">Entity Type</span>
                    <p className="text-on-dark font-semibold mt-0.5">{selectedNode.type}</p>
                  </div>
                  <div>
                    <span className="text-muted text-[11px] font-mono">Syndicate Risk</span>
                    <p
                      className={`font-bold mt-0.5 font-mono ${
                        selectedNode.riskScore >= 0.7
                          ? "text-trading-down"
                          : selectedNode.riskScore >= 0.4
                          ? "text-primary"
                          : "text-trading-up"
                      }`}
                    >
                      {(selectedNode.riskScore * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                {selectedNode.flagged && (
                  <div className="bg-trading-down/10 border border-trading-down/30 p-3 rounded-lg flex items-start gap-2">
                    <ShieldAlert size={16} className="text-trading-down shrink-0 mt-0.5" />
                    <p className="text-trading-down text-xs leading-relaxed font-medium">
                      This entity has multiple high-confidence link patterns with confirmed scam VPAs.
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-muted block mb-1.5 font-mono uppercase tracking-wider font-semibold text-[10px]">
                    Direct Associations
                  </span>
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
                            className="bg-canvas border border-hairline-dark rounded-lg p-2 flex justify-between items-center"
                          >
                            <span className="font-mono text-on-dark truncate max-w-[120px]">
                              {otherId}
                            </span>
                            <span className="text-[10px] text-muted font-mono">{e.relation}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-muted text-xs">
                <Network size={28} className="mx-auto mb-2 opacity-40 text-primary" />
                Select an entity node from the cluster to view its syndicated relationships.
              </div>
            )}
          </div>

          {/* Risk Summary card */}
          <div className="bg-surface-card-dark rounded-xl border border-hairline-dark p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-trading-down" />
              <span className="text-on-dark text-xs font-semibold font-sans">High Risk Nodes</span>
            </div>
            <span className="text-trading-down font-bold text-sm font-mono tnum">{highRiskNodes.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};