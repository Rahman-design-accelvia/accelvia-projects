// src/features/theme/theme.test.ts
// Unit tests for the SaaS Theme & Palette Engine (Slack, Discord, Accelvia)

import { describe, it, expect, beforeEach } from 'vitest';
import {
  THEME_PRESETS,
  CURATED_ACCENTS,
  hexToRgb,
  hexToRgbString,
  adjustBrightness,
  isValidHexColor,
  getThemePalette,
  ThemePreset,
} from './themePresets';

describe('Theme Presets & Palette Engine', () => {
  beforeEach(() => {
    // Mock window & localStorage in node environment
    const storage: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = String(value);
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((k) => delete storage[k]);
      },
      length: 0,
      key: () => null,
    };

    if (typeof window === 'undefined') {
      (globalThis as any).window = {
        localStorage: mockLocalStorage,
      };
    }
    (globalThis as any).localStorage = mockLocalStorage;
  });

  describe('1. Preset Catalog Integrity', () => {
    it('defines all required Slack and Discord design presets', () => {
      const expectedPresets: ThemePreset[] = [
        'classic-emerald',
        'discord-blurple',
        'discord-midnight',
        'slack-aubergine',
        'slack-nocturne',
        'slack-oolong',
      ];

      expectedPresets.forEach((presetId) => {
        const preset = THEME_PRESETS[presetId];
        expect(preset).toBeDefined();
        expect(preset.id).toBe(presetId);
        expect(preset.name.length).toBeGreaterThan(0);
        expect(preset.dark).toBeDefined();
        expect(preset.light).toBeDefined();
        expect(preset.defaultAccent).toMatch(/^#[A-Fa-f0-9]{6}$/);
      });
    });

    it('Slack Aubergine has iconic #3F0E40 sidebar and white text in light mode', () => {
      const slackAubergine = THEME_PRESETS['slack-aubergine'];
      expect(slackAubergine.brand).toBe('Slack');
      expect(slackAubergine.light.sidebarBg.toLowerCase()).toBe('#3f0e40');
      expect(slackAubergine.light.sidebarText).toBe('#ffffff');
      expect(slackAubergine.dark.sidebarBg.toLowerCase()).toBe('#350d36');
    });

    it('Discord Blurple uses #313338 dark canvas and #5865F2 Blurple accent', () => {
      const discordBlurple = THEME_PRESETS['discord-blurple'];
      expect(discordBlurple.brand).toBe('Discord');
      expect(discordBlurple.dark.canvasBg.toLowerCase()).toBe('#313338');
      expect(discordBlurple.dark.panelBg.toLowerCase()).toBe('#2b2d31');
      expect(discordBlurple.defaultAccent.toLowerCase()).toBe('#5865f2');
    });

    it('Discord Midnight uses pitch-black #000000 AMOLED canvas', () => {
      const discordMidnight = THEME_PRESETS['discord-midnight'];
      expect(discordMidnight.brand).toBe('Discord');
      expect(discordMidnight.dark.canvasBg).toBe('#000000');
      expect(discordMidnight.dark.sidebarBg).toBe('#111214');
    });
  });

  describe('2. Color Conversion & Shade Adjustment', () => {
    it('converts 6-digit and 3-digit hex to RGB correctly', () => {
      expect(hexToRgb('#5865F2')).toEqual({ r: 88, g: 101, b: 242 });
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('invalid')).toBeNull();
    });

    it('generates rgba string with requested alpha', () => {
      const rgba = hexToRgbString('#5865F2', 0.25);
      expect(rgba).toBe('rgba(88, 101, 242, 0.25)');
    });

    it('adjusts brightness up and down without out-of-bounds overflow', () => {
      const lightened = adjustBrightness('#101010', 50);
      expect(lightened).toBe('#181818');

      const darkened = adjustBrightness('#ffffff', -20);
      expect(darkened).toBe('#cccccc');

      const maxClamped = adjustBrightness('#ffffff', 50);
      expect(maxClamped).toBe('#ffffff');

      const minClamped = adjustBrightness('#000000', -50);
      expect(minClamped).toBe('#000000');
    });

    it('validates hex codes correctly', () => {
      expect(isValidHexColor('#5865F2')).toBe(true);
      expect(isValidHexColor('#4a154b')).toBe(true);
      expect(isValidHexColor('#0d9488')).toBe(true);
      expect(isValidHexColor('#fff')).toBe(true);
      expect(isValidHexColor('5865F2')).toBe(false);
      expect(isValidHexColor('#12345')).toBe(false);
      expect(isValidHexColor('#gggggg')).toBe(false);
    });
  });

  describe('3. Curated Accent Swatches', () => {
    it('includes Discord, Slack, and Accelvia brand accents in curated list', () => {
      const hexes = CURATED_ACCENTS.map((a) => a.hex.toLowerCase());
      expect(hexes).toContain('#5865f2'); // Discord Blurple
      expect(hexes).toContain('#4a154b'); // Slack Aubergine
      expect(hexes).toContain('#007a5a'); // Slack Green
      expect(hexes).toContain('#0d9488'); // Accelvia Emerald
      expect(hexes).toContain('#1d9bd1'); // Slack Nocturne Cyan
    });
  });

  describe('4. Palette Retrieval Fallback', () => {
    it('falls back to Accelvia Emerald if unknown preset is provided', () => {
      const palette = getThemePalette('unknown-preset' as any, 'dark');
      expect(palette).toEqual(THEME_PRESETS['classic-emerald'].dark);
    });

    it('returns light palette when mode is light', () => {
      const palette = getThemePalette('slack-aubergine', 'light');
      expect(palette).toEqual(THEME_PRESETS['slack-aubergine'].light);
    });
  });
});
