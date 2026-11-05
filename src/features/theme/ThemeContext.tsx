// src/features/theme/ThemeContext.tsx
// Global SaaS Theme & Palette Engine supporting Slack, Discord, and Accelvia custom aesthetics

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  ThemeMode,
  ThemePreset,
  ThemePalette,
  THEME_PRESETS,
  getThemePalette,
  hexToRgb,
  adjustBrightness,
} from './themePresets';

export type Theme = ThemeMode; // Backward-compatibility alias

export interface ThemeConfig {
  mode: ThemeMode;
  preset: ThemePreset;
  accentColor: string;
}

interface ThemeContextType {
  theme: ThemeMode;
  mode: ThemeMode;
  preset: ThemePreset;
  accentColor: string;
  palette: ThemePalette;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  setMode: (mode: ThemeMode) => void;
  setPreset: (preset: ThemePreset) => void;
  setAccentColor: (color: string) => void;
  updateThemeConfig: (config: Partial<ThemeConfig>) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY_MODE = 'accelvia_theme_mode';
const STORAGE_KEY_PRESET = 'accelvia_theme_preset';
const STORAGE_KEY_ACCENT = 'accelvia_theme_accent';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initial State from localStorage
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      if (typeof window === 'undefined') return 'dark';
      const stored = localStorage.getItem(STORAGE_KEY_MODE);
      return stored === 'light' || stored === 'dark' ? stored : 'dark';
    } catch {
      return 'dark';
    }
  });

  const [preset, setPresetState] = useState<ThemePreset>(() => {
    try {
      if (typeof window === 'undefined') return 'classic-emerald';
      const stored = localStorage.getItem(STORAGE_KEY_PRESET) as ThemePreset;
      return stored && THEME_PRESETS[stored] ? stored : 'classic-emerald';
    } catch {
      return 'classic-emerald';
    }
  });

  const [accentColor, setAccentColorState] = useState<string>(() => {
    try {
      if (typeof window === 'undefined') return THEME_PRESETS['classic-emerald'].defaultAccent;
      const stored = localStorage.getItem(STORAGE_KEY_ACCENT);
      if (stored && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(stored)) {
        return stored;
      }
      const initialPreset = (localStorage.getItem(STORAGE_KEY_PRESET) as ThemePreset) || 'classic-emerald';
      return THEME_PRESETS[initialPreset]?.defaultAccent || '#0D9488';
    } catch {
      return '#0D9488';
    }
  });

  // Current calculated palette
  const palette = useMemo(() => getThemePalette(preset, mode), [preset, mode]);

  // Apply CSS custom properties and classes to DOM
  const applyThemeToDOM = (activeMode: ThemeMode, activePreset: ThemePreset, activeAccent: string) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const currentPalette = getThemePalette(activePreset, activeMode);
    const rgb = hexToRgb(activeAccent) || { r: 13, g: 148, b: 136 };
    const hoverAccent = adjustBrightness(activeAccent, activeMode === 'dark' ? 14 : -14);

    // 1. Classes & Data Attributes
    root.classList.remove('dark', 'light');
    root.classList.add(activeMode);
    root.setAttribute('data-theme', activeMode);
    root.setAttribute('data-preset', activePreset);

    // 2. CSS Custom Properties for Dynamic Accent Injection
    root.style.setProperty('--theme-accent', activeAccent);
    root.style.setProperty('--theme-accent-hover', hoverAccent);
    root.style.setProperty('--theme-accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    root.style.setProperty('--theme-accent-subtle', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`);
    root.style.setProperty('--theme-accent-subtle-border', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.28)`);

    // 3. CSS Custom Properties for Surface Palettes
    root.style.setProperty('--theme-canvas-bg', currentPalette.canvasBg);
    root.style.setProperty('--theme-panel-bg', currentPalette.panelBg);
    root.style.setProperty('--theme-sidebar-bg', currentPalette.sidebarBg);
    root.style.setProperty('--theme-header-bg', currentPalette.headerBg);
    root.style.setProperty('--theme-card-bg', currentPalette.cardBg);
    root.style.setProperty('--theme-card-hover', currentPalette.cardHover);
    root.style.setProperty('--theme-border', currentPalette.borderColor);
    root.style.setProperty('--theme-text-primary', currentPalette.textPrimary);
    root.style.setProperty('--theme-text-secondary', currentPalette.textSecondary);
    root.style.setProperty('--theme-text-muted', currentPalette.textMuted);

    if (currentPalette.sidebarText) {
      root.style.setProperty('--theme-sidebar-text', currentPalette.sidebarText);
    } else {
      root.style.removeProperty('--theme-sidebar-text');
    }

    if (currentPalette.sidebarBorder) {
      root.style.setProperty('--theme-sidebar-border', currentPalette.sidebarBorder);
    } else {
      root.style.removeProperty('--theme-sidebar-border');
    }

    // 4. Update browser chrome meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', currentPalette.headerBg);
    }
  };

  useEffect(() => {
    applyThemeToDOM(mode, preset, accentColor);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_MODE, mode);
        localStorage.setItem(STORAGE_KEY_PRESET, preset);
        localStorage.setItem(STORAGE_KEY_ACCENT, accentColor);
      }
    } catch {
      // Ignore quota error if storage restricted
    }
  }, [mode, preset, accentColor]);

  // Handler functions
  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const setTheme = (newTheme: ThemeMode) => {
    setModeState(newTheme);
  };

  const toggleTheme = () => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setPreset = (newPreset: ThemePreset) => {
    setPresetState(newPreset);
    // Auto-align accent color to new preset's default
    const def = THEME_PRESETS[newPreset];
    if (def) {
      setAccentColorState(def.defaultAccent);
    }
  };

  const setAccentColor = (newColor: string) => {
    setAccentColorState(newColor);
  };

  const updateThemeConfig = (config: Partial<ThemeConfig>) => {
    if (config.mode) setModeState(config.mode);
    if (config.preset) setPresetState(config.preset);
    if (config.accentColor) setAccentColorState(config.accentColor);
  };

  const resetTheme = () => {
    const defaultDef = THEME_PRESETS['classic-emerald'];
    setModeState('dark');
    setPresetState('classic-emerald');
    setAccentColorState(defaultDef.defaultAccent);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: mode,
        mode,
        preset,
        accentColor,
        palette,
        isDark: mode === 'dark',
        toggleTheme,
        setTheme,
        setMode,
        setPreset,
        setAccentColor,
        updateThemeConfig,
        resetTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
