import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ScanLine, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/Button';

export interface QuickActionsProps {}

export const QuickActions: React.FC<QuickActionsProps> = () => {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Send Money',
      icon: <Send className="w-5 h-5" />,
      to: '/payment/send',
      variant: 'primary' as const,
    },
    {
      label: 'Scan QR',
      icon: <ScanLine className="w-5 h-5" />,
      to: '/qr',
      variant: 'secondary' as const,
    },
    {
      label: 'Safe Circle',
      icon: <ShieldCheck className="w-5 h-5" />,
      to: '/circle',
      variant: 'secondary' as const,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {actions.map((action) => (
        <Button
          key={action.to}
          variant={action.variant}
          className="flex-col gap-2 py-4 h-auto"
          onClick={(): void => navigate(action.to)}
        >
          {action.icon}
          <span className="text-caption">{action.label}</span>
        </Button>
      ))}
    </div>
  );
};