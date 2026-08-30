// client/src/pages/HistoryPage.tsx
import React, { useState } from 'react';
import { Search, History } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { TransactionRow } from '@/components/history/TransactionRow';
import { demoTransactions } from '@/lib/demoData';

type FilterType = 'ALL' | 'PASS' | 'WARN' | 'CHALLENGE' | 'BLOCK';

export const HistoryPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');

  const visibleTransactions = demoTransactions.filter((transaction) => {
    const matchesFilter = filter === 'ALL' || (transaction.verdict || transaction.riskVerdict) === filter;
    
    const search = query.toLowerCase();
    const name = transaction.label || transaction.receiverName || '';
    const vpa = transaction.vpa || transaction.receiverVpa || '';
    const matchesSearch =
      search.length === 0 ||
      name.toLowerCase().includes(search) ||
      vpa.toLowerCase().includes(search);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-bone">Activity Log</h1>
        <Badge tone="neutral">{demoTransactions.length} items</Badge>
      </div>

      <Card padding="md" className="space-y-4">
        <Input
          id="history-search"
          label="Search transactions"
          icon={Search}
          placeholder="Enter a name or VPA..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(['ALL', 'PASS', 'WARN', 'CHALLENGE', 'BLOCK'] as FilterType[]).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                filter === type
                  ? 'bg-primary text-bone'
                  : 'bg-white/5 text-bone-muted hover:text-bone hover:bg-white/10'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </Card>

      <Card padding="none" className="divide-y divide-white/5">
        {visibleTransactions.length > 0 ? (
          visibleTransactions.map((tx) => (
            <TransactionRow key={tx.id} transaction={tx} />
          ))
        ) : (
          <div className="text-center py-12">
            <History className="w-10 h-10 text-bone-muted mx-auto mb-3" />
            <p className="text-bone text-sm font-medium">No activity matches filters</p>
            <p className="text-bone-muted text-xs mt-1">Try resetting search filters.</p>
          </div>
        )}
      </Card>
    </div>
  );
};