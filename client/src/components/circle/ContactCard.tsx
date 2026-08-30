// client/src/components/circle/ContactCard.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Send, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn, getInitials, formatDate } from '../../lib/utils';
import type { SafeCircleContact } from '../../types/app';

interface ContactCardProps {
  contact: SafeCircleContact;
  onRemove: (id: string) => Promise<void>;
  isRemoving?: boolean;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onRemove,
  isRemoving = false,
}) => {
  const navigate = useNavigate();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleQuickPay = () => {
    navigate(`/payment/send?vpa=${encodeURIComponent(contact.contactVpa)}`);
  };

  const handleDelete = async () => {
    await onRemove(contact.id);
    setShowConfirmDelete(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'rounded-2xl border bg-canvas-card p-4 flex flex-col justify-between space-y-4 transition-all hover:border-canvas-muted relative overflow-hidden',
        contact.hasAnomaly
          ? 'border-accent-amber/40 bg-accent-amber/5'
          : 'border-canvas-border'
      )}
    >
      {/* Top Section */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-base shadow-inner">
              {getInitials(contact.contactName)}
            </div>
            <span
              title="Safe Circle Protected"
              className="absolute -bottom-1 -right-1 bg-primary text-bone rounded-full p-0.5 border-2 border-canvas-bg"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-bone font-semibold text-sm truncate">{contact.contactName}</h3>
              {contact.hasAnomaly && (
                <span
                  title="Unusual transaction velocity detected recently"
                  className="px-1.5 py-0.5 rounded-pill bg-accent-amber/15 text-accent-amber text-[10px] font-bold border border-accent-amber/30 flex items-center gap-1 shrink-0"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Anomaly
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-bone-muted truncate mt-0.5">
              {contact.contactVpa}
            </p>
            <p className="text-[10px] text-bone-muted/70 mt-1">
              Added {formatDate(contact.addedAt)}
            </p>
          </div>
        </div>

        {/* Delete Toggle */}
        {!showConfirmDelete && (
          <button
            type="button"
            onClick={() => setShowConfirmDelete(true)}
            className="text-bone-muted hover:text-accent-ruby transition-colors p-1.5 rounded-xl hover:bg-accent-ruby/10"
            title="Remove contact"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Action Footer */}
      {showConfirmDelete ? (
        <div className="p-2.5 rounded-xl bg-accent-ruby/10 border border-accent-ruby/30 flex items-center justify-between gap-2 text-xs">
          <span className="text-accent-ruby font-medium">Remove contact?</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowConfirmDelete(false)}
              className="text-bone-muted hover:text-bone text-xs font-semibold px-2 py-1"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isRemoving}
              onClick={handleDelete}
              className="bg-accent-ruby text-bone font-bold text-xs px-3 py-1 rounded-pill flex items-center gap-1 hover:bg-accent-ruby/90 disabled:opacity-50"
            >
              {isRemoving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleQuickPay}
          className="w-full h-9 rounded-pill bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-bold transition-all flex items-center justify-center gap-1.5 group"
        >
          <Send className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          Send Money
        </button>
      )}
    </motion.div>
  );
};