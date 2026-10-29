// src/lib/formatting/currency.ts
// Financial calculations and parallel currency formatting

export function formatHours(hours: number | null | undefined): string {
  if (hours == null || isNaN(hours)) return '0.00 hrs';
  return `${Number(hours).toFixed(2)} hrs`;
}

export function formatUSD(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatBDT(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '৳0.00';
  return `৳${new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export interface CalculatedTotals {
  totalHours: number;
  totalUsd: number;
  totalBdt: number;
}

/**
 * Calculates totals with strict decimal precision.
 * USD and BDT totals are calculated in parallel and never combined.
 */
export function calculateScopeTotals(
  items: Array<{ hours: number }>,
  rateUsdPerHour: number = 0,
  rateBdtPerHour: number = 0
): CalculatedTotals {
  // Sum hours
  const totalHours = items.reduce((acc, item) => {
    const h = Number(item.hours) || 0;
    return acc + Math.max(0, h);
  }, 0);

  // Parallel totals rounded to 2 decimal places
  const totalUsd = Math.round((totalHours * (Number(rateUsdPerHour) || 0) + Number.EPSILON) * 100) / 100;
  const totalBdt = Math.round((totalHours * (Number(rateBdtPerHour) || 0) + Number.EPSILON) * 100) / 100;

  return {
    totalHours: Math.round((totalHours + Number.EPSILON) * 100) / 100,
    totalUsd,
    totalBdt,
  };
}
