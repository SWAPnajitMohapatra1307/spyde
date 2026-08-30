import React from 'react';

export interface AmountDisplayProps {
  amount: number | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showSymbol?: boolean;
  colorClass?: string;
}

export const formatInrCurrency = (val: number | string): string => {
  const numericVal = typeof val === 'string' ? parseFloat(val) || 0 : val;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: Number.isInteger(numericVal) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(numericVal);
};

export const AmountDisplay: React.FC<AmountDisplayProps> = ({
  amount,
  size = 'lg',
  className = '',
  showSymbol = true,
  colorClass = 'text-bone',
}) => {
  const formatted = formatInrCurrency(amount);

  const sizeClasses = {
    sm: 'text-lg font-semibold tracking-tight',
    md: 'text-2xl font-bold tracking-tight',
    lg: 'text-3xl sm:text-4xl font-extrabold tracking-tight',
    xl: 'text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight',
  };

  const symbolSizes = {
    sm: 'text-base mr-0.5',
    md: 'text-xl mr-1',
    lg: 'text-2xl sm:text-3xl mr-1.5',
    xl: 'text-3xl sm:text-4xl mr-2',
  };

  return (
    <span className={`inline-flex items-baseline tnum font-sans ${colorClass} ${sizeClasses[size]} ${className}`}>
      {showSymbol && (
        <span className={`font-medium opacity-80 select-none ${symbolSizes[size]}`}>
          ₹
        </span>
      )}
      <span>{formatted}</span>
    </span>
  );
};