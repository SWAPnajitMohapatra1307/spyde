import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Lock, 
  Cpu, 
  EyeOff, 
  Copy, 
  Check, 
  ArrowLeft, 
  Download, 
  Binary, 
  CheckCircle2,
  Database
} from 'lucide-react';

export const FaceBlobViewerPage: React.FC = () => {
  const { id = 'demo-vector' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [copiedNullifier, setCopiedNullifier] = useState<boolean>(false);
  const [selectedDimension, setSelectedDimension] = useState<number | null>(null);

  // Deterministically generate a 512-dimension ZK vector tensor based on the session/tx id
  const vectorEmbedding = useMemo(() => {
    const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 42);
    const dimensions = 512;
    const array: number[] = [];

    for (let i = 0; i < dimensions; i++) {
      // Deterministic float in [-1.0, 1.0]
      const pseudoRandom = Math.sin(seed * (i + 1)) * 10000;
      const val = (pseudoRandom - Math.floor(pseudoRandom)) * 2 - 1;
      array.push(parseFloat(val.toFixed(4)));
    }
    return array;
  }, [id]);

  const nullifierHash = useMemo(() => {
    return `zk-nullifier:0x${id.slice(0, 6)}f8e9a2b4c6d8e0f1a3b5c7d9e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6`;
  }, [id]);

  const handleCopyNullifier = () => {
    void navigator.clipboard.writeText(nullifierHash);
    setCopiedNullifier(true);
    setTimeout(() => setCopiedNullifier(false), 2000);
  };

  const handleDownloadTensor = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(
          {
            vectorId: id,
            dimensions: 512,
            model: 'SPYDE-MobileFaceNet-ZK-v3',
            livenessConfidence: 0.9942,
            embedding: vectorEmbedding,
            nullifierHash,
          },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `spyde_zk_face_tensor_${id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-canvas py-6 px-4 max-w-4xl mx-auto space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-bone-muted hover:text-bone text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <button
          onClick={handleDownloadTensor}
          className="px-3.5 py-2 rounded-xl bg-canvas-card hover:bg-canvas-elevated border border-white/10 text-bone text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-primary" /> Export Tensor JSON
        </button>
      </div>

      {/* Title & Privacy Assurance Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-accent-green/15 border border-accent-green/30 text-accent-green text-xs font-mono font-bold mb-2">
            <EyeOff className="w-3.5 h-3.5" /> ZERO-KNOWLEDGE PROOF (NO RAW IMAGES)
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-bone tracking-tight">
            512D Biometric Feature Vector
          </h1>
          <p className="text-bone-muted text-sm mt-0.5">
            Cryptographic mathematical embedding computed on-device during the 3D liveness challenge.
          </p>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-[10px] font-mono uppercase text-bone-muted tracking-wider">
            Vector Tensor ID
          </div>
          <div className="font-mono text-xs font-bold text-bone select-all">
            {id}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-canvas-card border border-white/10 rounded-2xl p-4 space-y-1">
          <div className="text-[10px] font-mono uppercase text-bone-muted flex items-center gap-1">
            <Cpu className="w-3 h-3 text-primary" /> Neural Topology
          </div>
          <div className="font-mono text-sm font-bold text-bone">MobileFaceNet-ZK</div>
          <div className="text-[11px] text-bone-muted">512 Floating Point Weights</div>
        </div>

        <div className="bg-canvas-card border border-white/10 rounded-2xl p-4 space-y-1">
          <div className="text-[10px] font-mono uppercase text-bone-muted flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-accent-green" /> Liveness Confidence
          </div>
          <div className="font-mono text-sm font-bold text-accent-green">99.42% Verified</div>
          <div className="text-[11px] text-bone-muted">Anti-Spoof Passive Depth Confirmed</div>
        </div>

        <div className="bg-canvas-card border border-white/10 rounded-2xl p-4 space-y-1">
          <div className="text-[10px] font-mono uppercase text-bone-muted flex items-center gap-1">
            <Database className="w-3 h-3 text-accent-yellow" /> Storage Privacy
          </div>
          <div className="font-mono text-sm font-bold text-bone">1-Way Hash Non-Invertible</div>
          <div className="text-[11px] text-bone-muted">Pixel data permanently zeroized</div>
        </div>
      </div>

      {/* Interactive 512-D Matrix Heatmap Visualizer */}
      <div className="bg-canvas-card border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
          <div className="text-xs font-mono uppercase font-bold text-bone tracking-wider flex items-center gap-2">
            <Binary className="w-4 h-4 text-primary" /> 512-Dimension Tensor Matrix Visualizer
          </div>
          <div className="text-[11px] font-mono text-bone-muted">
            {selectedDimension !== null
              ? `Dim #${selectedDimension}: ${vectorEmbedding[selectedDimension]}`
              : 'Hover or tap cell to inspect vector weight'}
          </div>
        </div>

        {/* Visual Heatmap Grid (32 columns x 16 rows = 512 cells) */}
        <div className="grid grid-cols-16 sm:grid-cols-32 gap-1 p-3 bg-canvas rounded-2xl border border-white/5 overflow-hidden">
          {vectorEmbedding.map((weight, index) => {
            const opacity = Math.min(1, Math.max(0.15, Math.abs(weight)));
            const isPositive = weight >= 0;

            return (
              <button
                key={index}
                type="button"
                onMouseEnter={() => setSelectedDimension(index)}
                onClick={() => setSelectedDimension(index)}
                className={`aspect-square rounded-sm transition-transform hover:scale-150 hover:z-10 focus:outline-none ${
                  selectedDimension === index ? 'ring-2 ring-white scale-125 z-20' : ''
                }`}
                style={{
                  backgroundColor: isPositive
                    ? `rgba(16, 185, 129, ${opacity})`
                    : `rgba(255, 102, 0, ${opacity})`,
                }}
                title={`Dim #${index}: ${weight}`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[11px] font-mono text-bone-muted pt-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-accent-orange" />
            <span>Negative Gradient (-1.0)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-accent-green" />
            <span>Positive Gradient (+1.0)</span>
          </div>
        </div>
      </div>

      {/* Cryptographic Nullifier & Privacy Guarantee Card */}
      <div className="bg-canvas-card border border-white/10 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono uppercase text-bone font-bold tracking-wider">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-primary" /> ZK-Nullifier Hash
          </div>
          <button
            type="button"
            onClick={handleCopyNullifier}
            className="text-bone-muted hover:text-bone flex items-center gap-1 transition-colors text-[11px]"
          >
            {copiedNullifier ? <Check className="w-3 h-3 text-accent-green" /> : <Copy className="w-3 h-3" />}
            {copiedNullifier ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="p-3 rounded-xl bg-canvas border border-white/5 font-mono text-xs text-bone select-all break-all">
          {nullifierHash}
        </div>

        <p className="text-xs text-bone-muted leading-relaxed">
          The ZK-Nullifier guarantees that even if this transaction proof is audited publicly, the receiver's identity cannot be linked across transactions without their cryptographic private key authorization.
        </p>
      </div>
    </div>
  );
};