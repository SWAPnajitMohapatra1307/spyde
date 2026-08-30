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
          className="flex flex-col items-center space-y-1.5 min-w-[56px]"
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-spyde-surface-2 border border-spyde-hairline flex items-center justify-center text-spyde-bone text-caption font-normal">
              {getInitials(contact.contactName)}
            </div>
            {contact.hasAnomaly && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-spyde-ruby border-2 border-spyde-surface-1" />
            )}
          </div>
          <span className="text-caption text-spyde-sand font-normal truncate max-w-[56px]">
            {contact.contactName.split(' ')[0]}
          </span>
        </button>
      ))}

      {/* Add Contact Tile */}
      <button
        type="button"
        onClick={(): void => navigate('/circle')}
        className="flex flex-col items-center space-y-1.5 min-w-[56px]"
      >
        <div className="w-12 h-12 rounded-full bg-spyde-surface-2 border border-dashed border-spyde-hairline flex items-center justify-center text-spyde-muted">
          <Plus className="w-5 h-5" />
        </div>
        <span className="text-caption text-spyde-muted font-normal">Add</span>
      </button>
    </div>
  );
};