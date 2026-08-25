export function toPaisa(rupees: number | string): bigint {
  const parsed = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(parsed) || parsed < 0) {
    throw new Error('Invalid rupee amount provided');
  }
  return BigInt(Math.round(parsed * 100));
}

export function toRupees(paisa: bigint | number): number {
  const numericPaisa = typeof paisa === 'bigint' ? Number(paisa) : paisa;
  return numericPaisa / 100;
}

export function formatINR(paisa: bigint | number): string {
  const rupees = toRupees(paisa);
  return 'INR ' + rupees.toFixed(2);
}
