// client/src/components/ui/ThemeToggle.tsx
import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { cn } from '@/lib/utils';

export interface ThemeToggleProps {
  className?: string;
  variant?: 'icon' | 'compact-pill' | 'pill';
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  variant = 'compact-pill',
  showLabel = false,
}) => {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          'flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg border border-hairline-dark bg-surface-card-dark text-on-dark text-xs font-semibold hover:bg-surface-elevated-dark hover:border-primary/40 transition-all duration-150 shadow-sm cursor-pointer',
          className
        )}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
        title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      >
        <span className="flex items-center gap-2">
          {isDark ? (
            <Sun className="w-4 h-4 text-primary animate-spin-slow" />
          ) : (
            <Moon className="w-4 h-4 text-primary" />
          )}
          <span>{isDark ? 'Dark Theme' : 'Light Theme'}</span>
        </span>
        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-surface-elevated-dark border border-hairline-dark text-primary">
          {isDark ? 'DARK' : 'LIGHT'}
        </span>
      </button>
    );
  }

  if (variant === 'compact-pill' || showLabel) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-hairline-dark bg-surface-card-dark hover:bg-surface-elevated-dark text-on-dark text-xs font-semibold hover:border-primary/50 transition-all duration-150 shadow-sm cursor-pointer group',
          className
        )}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
        title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      >
        {isDark ? (
          <>
            <Sun className="w-3.5 h-3.5 text-primary group-hover:rotate-45 transition-transform" />
            <span className="text-[11px] font-mono text-muted group-hover:text-on-dark hidden sm:inline">Light</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-primary group-hover:-rotate-12 transition-transform" />
            <span className="text-[11px] font-mono text-muted group-hover:text-on-dark hidden sm:inline">Dark</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'relative p-2 rounded-lg bg-surface-card-dark hover:bg-surface-elevated-dark border border-hairline-dark hover:border-primary/50 text-muted hover:text-on-dark transition-all duration-150 flex items-center justify-center group shadow-sm cursor-pointer',
        className
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-primary group-hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="w-4 h-4 text-primary group-hover:-rotate-12 transition-transform" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
};

