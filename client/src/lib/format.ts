/**
 * Formats paisa as an Indian rupee amount using the display conventions in the design system.
 */
export function formatRupees(amountPaisa: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountPaisa / 100);
}

/**
 * Returns a short visual label for a transaction amount without exposing internal paisa values.
 */
export function formatCompactRupees(amountPaisa: number): string {
  return formatRupees(amountPaisa).replace('.00', '');
}

/**
 * Returns initials for a display name used in avatars and receiver summaries.
 */
export function initialsFor(name: string): string {
  return name
    .split(' ')
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
