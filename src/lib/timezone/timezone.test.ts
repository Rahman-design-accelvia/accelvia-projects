// src/lib/timezone/timezone.test.ts
import { describe, it, expect } from 'vitest';
import { formatDualTime, formatDualTimeInline, BANGLADESH_TIMEZONE } from './index';

describe('Canonical Timezone & Dual-Clock Engine', () => {
  it('formats dual time representing the identical instant in New York and Dhaka', () => {
    // 2026-10-30T12:00:00Z
    // In Dhaka (UTC+6): 6:00 PM (18:00)
    // In New York (EDT, UTC-4 in late October): 8:00 AM
    const instant = '2026-10-30T12:00:00Z';
    const dual = formatDualTime(instant, 'America/New_York');

    expect(dual.bangladeshTime).toMatch(/6:00\s*PM/i);
    expect(dual.clientTime).toMatch(/8:00\s*AM/i);
    expect(dual.canonicalUtc).toBe('2026-10-30T12:00:00.000Z');
  });

  it('detects date differences when crossing UTC midnight', () => {
    // 2026-10-30T22:30:00Z
    // In New York (EDT, UTC-4): 6:30 PM on Oct 30
    // In Dhaka (UTC+6): 4:30 AM on Oct 31 (next calendar day!)
    const instant = '2026-10-30T22:30:00Z';
    const dual = formatDualTime(instant, 'America/New_York');

    expect(dual.isSameDate).toBe(false);
    expect(dual.clientDate).toContain('Oct 30');
    expect(dual.bangladeshDate).toContain('Oct 31');
  });

  it('handles Australian timezones with Daylight Saving (e.g. Sydney)', () => {
    // Late October in Sydney is AEDT (UTC+11)
    const instant = '2026-10-30T04:00:00Z';
    const dual = formatDualTime(instant, 'Australia/Sydney');

    expect(dual.clientTime).toMatch(/3:00\s*PM/i);
    expect(dual.bangladeshTime).toMatch(/10:00\s*AM/i);
  });

  it('provides concise inline header string format', () => {
    const instant = '2026-10-30T14:30:00Z';
    const inline = formatDualTimeInline(instant, 'America/New_York');

    expect(inline).toContain('10:30 AM');
    expect(inline).toContain('BD:');
  });
});
