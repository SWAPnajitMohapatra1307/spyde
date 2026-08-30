// client/src/components/safecircle/ContactCard.tsx
import React from 'react';
import { Trash2, MoreHorizontal } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { SafeContact } from '@/types/app';

interface ContactCardProps {
  contact: SafeContact;
  onRemove: (contact: SafeContact) => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({ contact, onRemove }) => {
  const displayName = contact.nickname || contact.name || 'Safe Contact';
  const complaints = contact.complaints ?? 0;

  return (
    <div className="bg-canvas-card border border-white/5 rounded-2xl p-4 group">
      <div className="flex items-center gap-3">
        <Avatar
          name={displayName}
          size="lg"
          status={complaints >= 10 ? 'warn' : 'safe'}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-normal text-bone">{displayName}</p>
            <Badge tone="safe" dot>Trusted</Badge>
          </div>
          <p className="mt-1 text-[10px] text-bone-muted">
            {contact.phone || contact.vpa} / {contact.addedDate || contact.addedAt}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(contact)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-bone-muted transition hover:bg-white/5 hover:text-accent-red"
          aria-label={`Remove ${displayName} from Safe Circle`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3">
        {complaints >= 10 ? (
          <span className="flex items-center gap-1.5 text-[10px] font-normal text-accent-yellow">
            <MoreHorizontal className="h-3.5 w-3.5" />
            {complaints} reports
          </span>
        ) : (
          <span className="text-[10px] text-bone-muted">No reports found</span>
        )}
      </div>
    </div>
  );
};