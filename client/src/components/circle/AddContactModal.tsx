// client/src/components/circle/AddContactModal.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useResolveVpa } from '../../hooks/usePayment';
import { useAddContact } from '../../hooks/useSafeCircle';
import { Button } from '../ui/Button';
import type { VpaResolution } from '../../types/app';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({ isOpen, onClose }) => {
  const [vpaInput, setVpaInput] = useState('');
  const [resolved, setResolved] = useState<VpaResolution | null>(null);

  const resolveMutation = useResolveVpa();
  const addMutation = useAddContact();

  const handleResolve = async () => {
    if (!vpaInput.trim()) return;
    try {
      const result = (await resolveMutation.mutateAsync(vpaInput.trim())) as VpaResolution;
      setResolved(result);
    } catch {
      setResolved(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalVpa = resolved?.vpa || vpaInput.trim();
    const finalName = resolved?.name || finalVpa.split('@')[0];

    if (!finalVpa) return;

    try {
      await addMutation.mutateAsync({
        contactVpa: finalVpa,
        contactName: finalName,
      });
      setVpaInput('');
      setResolved(null);
      onClose();
    } catch (err) {
      console.error('Failed to add contact:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas-bg/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-canvas-card border border-canvas-border rounded-3xl p-6 space-y-5 shadow-2xl relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/15 text-primary">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-bone">Add to Safe Circle</h2>
                <p className="text-xs text-bone-muted">Trusted accounts bypass step-up friction</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-bone-muted hover:text-bone p-1.5 rounded-full hover:bg-canvas-subtle"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-bone uppercase tracking-wider block">
                Beneficiary UPI ID or Mobile
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={vpaInput}
                  onChange={(e) => {
                    setVpaInput(e.target.value);
                    setResolved(null);
                  }}
                  placeholder="e.g. mom@okhdfcbank or 9876543210"
                  className="w-full bg-canvas-bg border border-canvas-border rounded-xl px-4 py-3 pl-10 text-bone placeholder-bone-muted/40 font-mono text-sm focus:outline-none focus:border-primary transition-all"
                  required
                />
                <Search className="w-4 h-4 text-bone-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Resolve Button */}
            {!resolved && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                fullWidth
                isLoading={resolveMutation.isPending}
                disabled={!vpaInput.trim()}
                onClick={handleResolve}
              >
                Verify VPA Name
              </Button>
            )}

            {/* Resolved Preview */}
            {resolved && (
              <div className="p-3.5 rounded-2xl bg-canvas-subtle border border-primary/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-bone flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    {resolved.name}
                  </p>
                  <p className="text-[11px] font-mono text-bone-muted mt-0.5">{resolved.vpa}</p>
                </div>
                <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-pill bg-primary/10 border border-primary/20">
                  {resolved.bank || 'Verified'}
                </span>
              </div>
            )}

            {/* Error Feedback */}
            {addMutation.isError && (
              <div className="p-3 rounded-xl bg-accent-ruby/10 border border-accent-ruby/30 text-accent-ruby text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  {(addMutation.error as any)?.response?.data?.error?.message ||
                    (addMutation.error as any)?.response?.data?.message ||
                    'Failed to add contact to Safe Circle.'}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="button" variant="ghost" size="md" fullWidth onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                isLoading={addMutation.isPending}
                disabled={!vpaInput.trim()}
              >
                Add Contact
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};