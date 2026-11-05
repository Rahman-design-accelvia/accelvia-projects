// src/features/workspace/rates-blinking.test.ts
// Unit tests for the blinking animation condition on Rates button until BDT or USD rate is set

import { describe, it, expect } from 'vitest';
import { ProjectFinancialSettings } from '../../types';

export function isRatesBlinkingActive(settings?: Partial<ProjectFinancialSettings>): boolean {
  const usd = settings?.client_rate_usd_per_hour;
  const bdt = settings?.client_rate_bdt_per_hour;
  const hasUsd = usd != null && !isNaN(Number(usd)) && Number(usd) > 0;
  const hasBdt = bdt != null && !isNaN(Number(bdt)) && Number(bdt) > 0;
  const hasRateSet = Boolean(hasUsd || hasBdt);
  return !hasRateSet;
}

describe('Rates Button Blinking Animation Condition', () => {
  it('activates blinking animation when financial settings are uninitialized (empty)', () => {
    expect(isRatesBlinkingActive(undefined)).toBe(true);
    expect(isRatesBlinkingActive({})).toBe(true);
  });

  it('activates blinking animation when only internal budget hours are set without rates', () => {
    const settings: Partial<ProjectFinancialSettings> = {
      internal_budget_hours: 80,
      client_rate_usd_per_hour: null,
      client_rate_bdt_per_hour: null,
    };
    expect(isRatesBlinkingActive(settings)).toBe(true);
  });

  it('activates blinking animation when rates are 0 or NaN', () => {
    const zeroSettings: Partial<ProjectFinancialSettings> = {
      client_rate_usd_per_hour: 0,
      client_rate_bdt_per_hour: 0,
    };
    expect(isRatesBlinkingActive(zeroSettings)).toBe(true);

    const nanSettings: Partial<ProjectFinancialSettings> = {
      client_rate_usd_per_hour: NaN,
      client_rate_bdt_per_hour: NaN,
    };
    expect(isRatesBlinkingActive(nanSettings)).toBe(true);
  });

  it('stops blinking animation immediately when USD rate is configured (> 0)', () => {
    const usdConfigured: Partial<ProjectFinancialSettings> = {
      client_rate_usd_per_hour: 75,
      client_rate_bdt_per_hour: null,
    };
    expect(isRatesBlinkingActive(usdConfigured)).toBe(false);
  });

  it('stops blinking animation immediately when BDT rate is configured (> 0)', () => {
    const bdtConfigured: Partial<ProjectFinancialSettings> = {
      client_rate_usd_per_hour: null,
      client_rate_bdt_per_hour: 9000,
    };
    expect(isRatesBlinkingActive(bdtConfigured)).toBe(false);
  });

  it('stops blinking animation when both USD and BDT rates are configured', () => {
    const dualRates: Partial<ProjectFinancialSettings> = {
      client_rate_usd_per_hour: 50,
      client_rate_bdt_per_hour: 6000,
    };
    expect(isRatesBlinkingActive(dualRates)).toBe(false);
  });
});
