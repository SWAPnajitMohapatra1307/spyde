// client/src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines Tailwind class names cleanly using clsx and tailwind-merge.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number according to the Indian Rupee numbering system (Lakhs / Crores).
 * Example: 150000 -> "1,50,000" or "₹1,50,000"
 */
export function formatIndianRupee(amount: number | string, showSymbol = true): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return showSymbol ? '₹0' : '0';

  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: numericAmount % 1 === 0 ? 0 : 2,
  }).format(numericAmount);

  return showSymbol ? `₹${formatted}` : formatted;
}

/**
 * Alias for formatIndianRupee (shows currency symbol by default).
 */
export function formatRupees(amount: number | string, showSymbol = true): string {
  return formatIndianRupee(amount, showSymbol);
}

/**
 * Generic currency formatter (alias to formatIndianRupee for INR).
 */
export function formatCurrency(amount: number | string): string {
  return formatIndianRupee(amount, true);
}

/**
 * Masks a bank account number, keeping only the last 4 digits visible.
 * Example: "123456789012" -> "•••• 9012"
 */
export function maskAccountNumber(accNumber?: string): string {
  if (!accNumber) return '•••• 0000';
  const clean = accNumber.toString().replace(/\s+/g, '');
  if (clean.length <= 4) return clean;
  return `•••• ${clean.slice(-4)}`;
}

/**
 * Masks a phone number, preserving the country code / first 2 and last 2 digits.
 * Example: "9876543210" -> "98••••••10"
 */
export function maskPhone(phone?: string): string {
  if (!phone) return '••••••••••';
  const clean = phone.toString().replace(/\D/g, '');
  if (clean.length < 6) return clean;
  return `${clean.slice(0, 2)}${'•'.repeat(clean.length - 4)}${clean.slice(-2)}`;
}

/**
 * Formats timestamps into standard human-readable format.
 */
export function formatDate(dateInput: string | number | Date): string {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Relative time formatter (e.g. "2 mins ago", "Yesterday", "3 days ago").
 */
export function formatRelativeTime(dateInput: string | number | Date): string {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  return formatDate(date);
}

/**
 * Extracts initials from names or VPA IDs (e.g., "Rohit Sharma" -> "RS").
 */
export function getInitials(name?: string): string {
  if (!name) return 'SP';
  const clean = name.replace(/@.+$/, '').trim();
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Truncates string with ellipsis.
 */
export function truncateText(text: string, maxLength = 20): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Formats a VPA/UPI string cleanly.
 */
export function formatVpa(vpa: string): string {
  return vpa ? vpa.trim().toLowerCase() : '';
}