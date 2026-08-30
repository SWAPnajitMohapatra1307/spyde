// client/src/pages/SafeCirclePage.tsx
import React, { useState } from 'react';
import { ShieldCheck, Plus, Search, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { useSafeCircle, useRemoveContact } from '../hooks/useSafeCircle';
import { ContactCard } from '../components/circle/ContactCard';
import { AddContactModal } from '../components/circle/AddContactModal';
import { Button } from '../components/ui/Button';

export const SafeCirclePage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, isError, refetch } = useSafeCircle();
  const removeMutation = useRemoveContact();

  const contacts = data?.contacts || [];
  const total = data?.total || contacts.length;
  const maxCapacity = 10;

  const filteredContacts = contacts.filter(
    (c) =>
      c.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactVpa.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemove = async (contactId: string) => {
    await removeMutation.mutateAsync(contactId);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black font-heading text-bone flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-primary" />
            Safe Circle
          </h1>
          <p className="text-xs text-bone-muted mt-1 max-w-xl leading-relaxed">
            Manage your trusted circle of family, friends, and verified payees. Transactions to Safe
            Circle contacts bypass friction checks while maintaining active anomaly monitoring.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="shrink-0"
        >
          Add Contact
        </Button>
      </div>

      {/* Network Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-canvas-border bg-canvas-card p-4 space-y-1">
          <span className="text-[11px] font-semibold text-bone-muted uppercase tracking-wider block">
            Circle Network Capacity
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-heading text-bone tnum">
              {total} / {maxCapacity}
            </span>
            <span className="text-xs font-semibold text-primary">Active Slots</span>
          </div>
        </div>

        <div className="rounded-2xl border border-canvas-border bg-canvas-card p-4 space-y-1">
          <span className="text-[11px] font-semibold text-bone-muted uppercase tracking-wider block">
            Friction Status
          </span>
          <span className="text-sm font-bold text-primary block">Step-Up Bypassed</span>
          <p className="text-[10px] text-bone-muted">Instant PIN routing active</p>
        </div>

        <div className="rounded-2xl border border-canvas-border bg-canvas-card p-4 space-y-1">
          <span className="text-[11px] font-semibold text-bone-muted uppercase tracking-wider block">
            Active Anomalies
          </span>
          <span className="text-sm font-bold text-bone block">
            {contacts.filter((c) => c.hasAnomaly).length} Flagged
          </span>
          <p className="text-[10px] text-bone-muted">Automated velocity monitor</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      {contacts.length > 0 && (
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contact by name or UPI ID..."
            className="w-full bg-canvas-card border border-canvas-border rounded-xl px-4 py-3 pl-10 text-bone placeholder-bone-muted/40 text-xs focus:outline-none focus:border-primary transition-all"
          />
          <Search className="w-4 h-4 text-bone-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-36 rounded-2xl bg-canvas-subtle border border-canvas-border animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error Fallback */}
      {isError && (
        <div className="rounded-2xl border border-accent-ruby/30 bg-accent-ruby/10 p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-accent-ruby mx-auto" />
          <p className="text-xs font-semibold text-accent-ruby">
            Failed to load Safe Circle contacts.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Contact Cards Grid */}
      {!isLoading && !isError && filteredContacts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onRemove={handleRemove}
              isRemoving={removeMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && contacts.length === 0 && (
        <div className="rounded-2xl border border-canvas-border bg-canvas-card p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-canvas-subtle border border-canvas-border flex items-center justify-center mx-auto text-primary">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-bone">Your Safe Circle is Empty</h3>
            <p className="text-xs text-bone-muted max-w-sm mx-auto mt-1">
              Add your family members and frequent transfer contacts to streamline future payments.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add First Contact
          </Button>
        </div>
      )}

      {/* Add Contact Modal */}
      <AddContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};