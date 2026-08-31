// client/src/components/payment/PinPad.tsx
import React from 'react';
import { Delete } from 'lucide-react';

export interface PinPadProps {
  pin: string;
  onPinChange: (newPin: string) => void;
  maxLength?: number;
  disabled?: boolean;
}

export const PinPad: React.FC<PinPadProps> = ({
  pin,
  onPinChange,
  maxLength = 4,
  disabled = false,
}) => {
  const handleDigit = (digit: string) => {
    if (disabled || pin.length >= maxLength) return;
    onPinChange(pin + digit);
  };

  const handleDelete = () => {
    if (disabled || pin.length === 0) return;
    onPinChange(pin.slice(0, -1));
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* PIN Dots */}
      <div className="flex items-center gap-4">
        {Array.from({ length: maxLength }).map((_, idx) => {
          const filled = idx < pin.length;
          return (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                filled
                  ? 'bg-primary ring-4 ring-primary/20 scale-110'
                  : 'bg-surface-elevated-dark border border-hairline-dark'
              }`}
            />
          );
        })}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={disabled || pin.length >= maxLength}
            onClick={() => handleDigit(digit)}
            className="h-14 rounded-xl bg-surface-card-dark border border-hairline-dark hover:bg-surface-elevated-dark active:bg-surface-elevated-dark text-on-dark font-mono font-bold text-xl transition-all duration-100 disabled:opacity-40 select-none"
          >
            {digit}
          </button>
        ))}

        {/* Empty spot */}
        <div />

        {/* 0 digit */}
        <button
          type="button"
          disabled={disabled || pin.length >= maxLength}
          onClick={() => handleDigit('0')}
          className="h-14 rounded-xl bg-surface-card-dark border border-hairline-dark hover:bg-surface-elevated-dark active:bg-surface-elevated-dark text-on-dark font-mono font-bold text-xl transition-all duration-100 disabled:opacity-40 select-none"
        >
          0
        </button>

        {/* Delete */}
        <button
          type="button"
          disabled={disabled || pin.length === 0}
          onClick={handleDelete}
          className="h-14 rounded-xl bg-surface-card-dark border border-hairline-dark hover:bg-surface-elevated-dark active:bg-surface-elevated-dark text-muted hover:text-white flex items-center justify-center transition-all duration-100 disabled:opacity-30 select-none"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};