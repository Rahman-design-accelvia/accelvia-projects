// src/lib/formatting/currency.test.ts
import { describe, it, expect } from 'vitest';
import { formatHours, formatUSD, formatBDT, calculateScopeTotals } from './currency';

describe('Financial Formatting and Calculation Engine', () => {
  it('formats hours with two decimal places', () => {
    expect(formatHours(10)).toBe('10.00 hrs');
    expect(formatHours(42.5)).toBe('42.50 hrs');
    expect(formatHours(0)).toBe('0.00 hrs');
    expect(formatHours(null)).toBe('0.00 hrs');
  });

  it('formats USD currency with dollar sign and commas', () => {
    expect(formatUSD(4000)).toBe('$4,000.00');
    expect(formatUSD(1250.5)).toBe('$1,250.50');
    expect(formatUSD(0)).toBe('$0.00');
  });

  it('formats BDT currency with Taka symbol (৳)', () => {
    expect(formatBDT(480000)).toBe('৳480,000.00');
    expect(formatBDT(0)).toBe('৳0.00');
  });

  it('calculates totals with decimal precision without floating point drift', () => {
    const items = [
      { hours: 10.15 },
      { hours: 20.35 },
      { hours: 5.5 },
    ];
    // 10.15 + 20.35 + 5.5 = 36.00 hours
    // USD rate: 50.00 -> 36.00 * 50 = 1800.00
    // BDT rate: 6000.00 -> 36.00 * 6000 = 216000.00
    const totals = calculateScopeTotals(items, 50.00, 6000.00);

    expect(totals.totalHours).toBe(36.00);
    expect(totals.totalUsd).toBe(1800.00);
    expect(totals.totalBdt).toBe(216000.00);
  });

  it('handles zero or negative hours safely', () => {
    const items = [
      { hours: 15 },
      { hours: -5 }, // Should clamp or ignore negative
    ];
    const totals = calculateScopeTotals(items, 100, 12000);
    expect(totals.totalHours).toBe(15);
    expect(totals.totalUsd).toBe(1500);
  });
});
