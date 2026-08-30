// client/src/components/safecircle/AddContactModal.tsx
import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { SafeContact } from '@/types/app';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (contact: SafeContact) => void;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [nickname, setNickname] = useState('');
  const [vpa, setVpa] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setError(undefined);

    if (!vpa.trim()) {
      setError('VPA is required');
      return;
    }

    if (!nickname.trim()) {
      setError('Nickname is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const newContact: SafeContact = {
        id: `sc_${Date.now()}`,
        name: nickname.trim(),
        nickname: nickname.trim(),
        vpa: vpa.trim(),
        bank: 'UPI Partner Bank',
        phone: '',
        addedAt: new Date().toISOString(),
        addedDate: new Date().toLocaleDateString('en-IN', {
          month: 'short',
          year: 'numeric',
        }),
        isVerified: true,
        complaints: 0,
      };

      onAdd(newContact);
      setNickname('');
      setVpa('');
      onClose();
    } catch {
      setError('Failed to add contact. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-canvas-card border border-white/10 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-bone text-base font-semibold">Add Safe Contact</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-bone-muted hover:text-bone hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <Input
            id="contact-nickname"
            label="Nickname"
            type="text"
            required
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. Mom, Priya"
          />

          <Input
            id="contact-vpa"
            label="UPI VPA"
            type="text"
            required
            value={vpa}
            onChange={(e) => setVpa(e.target.value)}
            placeholder="name@bank"
            className="font-mono"
          />

          {error && (
            <p className="text-xs text-accent-red">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-white/5">
          <Button
            type="button"
            variant="ghost"
            size="md"
            fullWidth
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            fullWidth
            isLoading={isSubmitting}
            disabled={isSubmitting || !vpa.trim() || !nickname.trim()}
            onClick={handleSubmit}
          >
            <UserPlus className="w-4 h-4" />
            Add Contact
          </Button>
        </div>
      </div>
    </div>
  );
};