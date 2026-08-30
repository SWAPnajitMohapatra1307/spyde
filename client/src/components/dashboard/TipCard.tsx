import React, { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';

import { Card } from '@/components/ui/Card';

export interface TipCardProps {}

const tips: string[] = [
  'Typosquatting handles like @oksdi mimic legitimate bank handles (@oksbi). Always check the risk verdict badge before confirming.',
  'Safe Circle contacts bypass all risk checks in under 10ms. Add only people you trust with your money.',
  'Every SPYDE payment generates a tamper-proof Digital Evidence Certificate signed with SHA-256 + JWT.',
  'If a QR code looks physically tampered, scan it with SPYDE to verify the merchant GPS location.',
  'A CHALLENGE verdict means the receiver must verify their identity via liveness before your funds are released.',
];

export const TipCard: React.FC<TipCardProps> = () => {
  const [tipIndex, setTipIndex] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev: number) => (prev + 1) % tips.length);
    }, 15000);
    return (): void => clearInterval(interval);
  }, []);

  return (
    <Card level={2} className="p-4 flex items-start space-x-3">
      <Lightbulb className="w-5 h-5 text-spyde-amber flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-caption text-spyde-sand font-normal">
          <span className="text-spyde-bone">SPYDE Tip:</span> {tips[tipIndex]}
        </p>
      </div>
    </Card>
  );
};