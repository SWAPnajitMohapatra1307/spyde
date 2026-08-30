// client/src/components/cv/EmbeddingVisualizer.tsx

import { useMemo } from 'react';
import type { FaceEmbedding } from '@/types/cv';

interface EmbeddingVisualizerProps {
  embedding: FaceEmbedding;
  width?: number;
  height?: number;
  colorScheme?: 'thermal' | 'ocean' | 'mono';
}

const colorSchemes = {
  thermal: (v: number): string => {
    if (v < 0.25) return `rgb(0, 0, ${Math.floor(v * 4 * 255)})`;
    if (v < 0.5) return `rgb(0, ${Math.floor((v - 0.25) * 4 * 255)}, 255)`;
    if (v < 0.75) return `rgb(${Math.floor((v - 0.5) * 4 * 255)}, 255, ${255 - Math.floor((v - 0.5) * 4 * 255)})`;
    return `rgb(255, ${255 - Math.floor((v - 0.75) * 4 * 255)}, 0)`;
  },
  ocean: (v: number): string => {
    const r = Math.floor(v * 50);
    const g = Math.floor(100 + v * 155);
    const b = Math.floor(150 + v * 105);
    return `rgb(${r}, ${g}, ${b})`;
  },
  mono: (v: number): string => {
    const c = Math.floor(v * 255);
    return `rgb(${c}, ${c}, ${c})`;
  },
};

export const EmbeddingVisualizer: React.FC<EmbeddingVisualizerProps> = ({
  embedding,
  width = 256,
  height = 64,
  colorScheme = 'thermal',
}) => {
  const canvasData = useMemo(() => {
    const dim = embedding.dimensions;
    const cols = Math.ceil(Math.sqrt(dim * (width / height)));
    const rows = Math.ceil(dim / cols);
    const cellW = width / cols;
    const cellH = height / rows;

    // Normalize to 0-1
    const min = Math.min(...embedding.vector);
    const max = Math.max(...embedding.vector);
    const range = max - min || 1;
    const normalized = embedding.vector.map((v) => (v - min) / range);

    const mapper = colorSchemes[colorScheme];

    return { normalized, cols, rows, cellW, cellH, mapper };
  }, [embedding, width, height, colorScheme]);

  const stats = useMemo(() => {
    const v = embedding.vector;
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    const std = Math.sqrt(
      v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length
    );
    const l2 = Math.sqrt(v.reduce((a, b) => a + b * b, 0));
    return { mean, std, l2, dimensions: embedding.dimensions };
  }, [embedding]);

  return (
    <div className="space-y-3">
      {/* Heatmap grid */}
      <div
        className="rounded-xl overflow-hidden border border-white/10"
        style={{ width, height }}
      >
        <svg width={width} height={height}>
          {canvasData.normalized.map((val, idx) => {
            const col = idx % canvasData.cols;
            const row = Math.floor(idx / canvasData.cols);
            return (
              <rect
                key={idx}
                x={col * canvasData.cellW}
                y={row * canvasData.cellH}
                width={canvasData.cellW + 0.5}
                height={canvasData.cellH + 0.5}
                fill={canvasData.mapper(val)}
              />
            );
          })}
        </svg>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        <StatBlock label="Dims" value={stats.dimensions.toString()} />
        <StatBlock label="μ" value={stats.mean.toFixed(4)} />
        <StatBlock label="σ" value={stats.std.toFixed(4)} />
        <StatBlock label="‖v‖₂" value={stats.l2.toFixed(2)} />
      </div>

      {/* Model info */}
      <div className="flex items-center justify-between text-[10px] text-bone-muted">
        <span className="font-mono">{embedding.model}</span>
        <span className="font-mono tabular-nums">
          {new Date(embedding.timestamp).toISOString()}
        </span>
      </div>
    </div>
  );
};

const StatBlock: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="bg-white/5 rounded-lg px-2 py-1.5 text-center">
    <p className="text-[10px] text-bone-muted">{label}</p>
    <p className="text-xs font-mono tabular-nums text-bone">{value}</p>
  </div>
);