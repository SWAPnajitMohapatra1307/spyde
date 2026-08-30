// client/src/components/cv/FaceDetectionOverlay.tsx

import { useEffect, useRef } from 'react';
import { useCVStore } from '@/stores/cvStore';
import type { FaceDetectionBox, FaceQualityMetrics } from '@/types/cv';

interface FaceDetectionOverlayProps {
  width: number;
  height: number;
  mirrored?: boolean;
}

const qualityColor: Record<FaceQualityMetrics['quality'], string> = {
  poor: '#EF4444',
  fair: '#F59E0B',
  good: '#22C55E',
  excellent: '#06B6D4',
};

export const FaceDetectionOverlay: React.FC<FaceDetectionOverlayProps> = ({
  width,
  height,
  mirrored = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrame = useRef<number>(0);

  const { faceDetected, boundingBox, qualityMetrics, status } = useCVStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw guide oval
      drawGuideOval(ctx, width, height, faceDetected);

      // Draw bounding box if face detected
      if (faceDetected && boundingBox) {
        drawBoundingBox(ctx, boundingBox, qualityMetrics, width, height, mirrored);
      }

      // Draw quality indicator
      if (qualityMetrics) {
        drawQualityBadge(ctx, qualityMetrics, width);
      }

      // Draw status text
      drawStatusText(ctx, status, faceDetected, width, height);

      animFrame.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrame.current);
    };
  }, [width, height, faceDetected, boundingBox, qualityMetrics, status, mirrored]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ width, height }}
    />
  );
};

const drawGuideOval = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  faceDetected: boolean
) => {
  const cx = width / 2;
  const cy = height * 0.4;
  const rx = width * 0.25;
  const ry = height * 0.3;

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = faceDetected
    ? 'rgba(34, 197, 94, 0.6)'
    : 'rgba(255, 102, 0, 0.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash(faceDetected ? [] : [8, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Dim area outside oval
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fill();
  ctx.restore();
};

const drawBoundingBox = (
  ctx: CanvasRenderingContext2D,
  box: FaceDetectionBox,
  quality: FaceQualityMetrics | null,
  canvasWidth: number,
  _canvasHeight: number,
  mirrored: boolean
) => {
  const x = mirrored ? canvasWidth - box.x - box.width : box.x;
  const color = quality ? qualityColor[quality.quality] : '#FF6600';
  const cornerLen = 15;
  const r = 4;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  // Top-left corner
  ctx.beginPath();
  ctx.moveTo(x, box.y + cornerLen);
  ctx.lineTo(x, box.y + r);
  ctx.arcTo(x, box.y, x + r, box.y, r);
  ctx.lineTo(x + cornerLen, box.y);
  ctx.stroke();

  // Top-right corner
  ctx.beginPath();
  ctx.moveTo(x + box.width - cornerLen, box.y);
  ctx.lineTo(x + box.width - r, box.y);
  ctx.arcTo(x + box.width, box.y, x + box.width, box.y + r, r);
  ctx.lineTo(x + box.width, box.y + cornerLen);
  ctx.stroke();

  // Bottom-left corner
  ctx.beginPath();
  ctx.moveTo(x, box.y + box.height - cornerLen);
  ctx.lineTo(x, box.y + box.height - r);
  ctx.arcTo(x, box.y + box.height, x + r, box.y + box.height, r);
  ctx.lineTo(x + cornerLen, box.y + box.height);
  ctx.stroke();

  // Bottom-right corner
  ctx.beginPath();
  ctx.moveTo(x + box.width, box.y + box.height - cornerLen);
  ctx.lineTo(x + box.width, box.y + box.height - r);
  ctx.arcTo(
    x + box.width,
    box.y + box.height,
    x + box.width - r,
    box.y + box.height,
    r
  );
  ctx.lineTo(x + box.width - cornerLen, box.y + box.height);
  ctx.stroke();

  // Confidence label
  ctx.fillStyle = color;
  ctx.font = '11px monospace';
  ctx.fillText(
    `${(box.confidence * 100).toFixed(0)}%`,
    x + box.width + 4,
    box.y + 12
  );
};

const drawQualityBadge = (
  ctx: CanvasRenderingContext2D,
  metrics: FaceQualityMetrics,
  canvasWidth: number
) => {
  const color = qualityColor[metrics.quality];
  const label = metrics.quality.toUpperCase();
  const x = canvasWidth - 80;
  const y = 16;

  ctx.fillStyle = color + '22';
  ctx.beginPath();
  ctx.roundRect(x, y, 68, 22, 11);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, 68, 22, 11);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + 34, y + 15);
  ctx.textAlign = 'start';
};

const drawStatusText = (
  ctx: CanvasRenderingContext2D,
  status: string,
  faceDetected: boolean,
  width: number,
  height: number
) => {
  let text = '';

  switch (status) {
    case 'detecting_face':
      text = faceDetected ? 'Aligning face...' : 'Position your face in the oval';
      break;
    case 'face_aligned':
      text = 'Face aligned — hold steady';
      break;
    case 'challenge_active':
      text = 'Follow the instruction';
      break;
    case 'processing':
      text = 'Verifying...';
      break;
    default:
      return;
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  const textWidth = ctx.measureText(text).width + 24;
  ctx.beginPath();
  ctx.roundRect((width - textWidth) / 2, height - 52, textWidth, 28, 14);
  ctx.fill();

  ctx.fillStyle = '#F5F0E8';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, width / 2, height - 34);
  ctx.textAlign = 'start';
};