import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

import type { SafeCircleContact } from '@/types/app';

export interface QuickPayCarouselProps {
  contacts: SafeCircleContact[];
}

export const QuickPayCarousel: React.FC<QuickPayCarouselProps> = ({ contacts }) => {
  const navigate = useNavigate();

  const handleContactTap = (contact: SafeCircleContact): void => {
    navigate(
      `/payment/send?vpa=${encodeURIComponent(contact.contactVpa)}&name=${encodeURIComponent(
        contact.contactName
      )}`
    );
  };

  const getInitials = (name: string): string =>
    name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
      {contacts.slice(0, 5).map((contact: SafeCircleContact) => (
        <button
          key={contact.id}
          type="button"
          onClick={(): void => handleContactTap(contact)}
          className="flex flex-col items-center space-y-1.5 min-w-[56px] group"
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-surface-elevated-dark border border-hairline-dark group-hover:border-primary flex items-center justify-center text-on-dark text-xs font-mono font-bold transition-colors">
              {getInitials(contact.contactName)}
            </div>
            {contact.hasAnomaly && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-trading-down border-2 border-surface-card-dark" />
            )}
          </div>
          <span className="text-xs text-muted group-hover:text-body font-medium truncate max-w-[56px] transition-colors">
            {contact.contactName.split(' ')[0]}
          </span>
        </button>
      ))}

      {/* Add Contact Tile */}
      <button
        type="button"
        onClick={(): void => navigate('/circle')}
        className="flex flex-col items-center space-y-1.5 min-w-[56px] group"
      >
        <div className="w-12 h-12 rounded-full bg-surface-card-dark border border-dashed border-hairline-dark group-hover:border-primary flex items-center justify-center text-muted group-hover:text-primary transition-colors">
          <Plus className="w-5 h-5" />
        </div>
        <span className="text-xs text-muted group-hover:text-primary font-medium transition-colors">Add</span>
      </button>
    </div>
  );
};