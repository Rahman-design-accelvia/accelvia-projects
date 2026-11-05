// src/features/theme/themePresets.ts
// Visual Preset Definitions and Color Engine inspired by Slack and Discord SaaS interfaces

export type ThemeMode = 'dark' | 'light';

export type ThemePreset =
  | 'classic-emerald'
  | 'discord-blurple'
  | 'discord-midnight'
  | 'slack-aubergine'
  | 'slack-nocturne'
  | 'slack-oolong';

export interface ThemePalette {
  canvasBg: string;
  panelBg: string;
  sidebarBg: string;
  headerBg: string;
  cardBg: string;
  cardHover: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  sidebarText?: string;
  sidebarBorder?: string;
  badgeBg?: string;
}

export interface PresetDefinition {
  id: ThemePreset;
  name: string;
  brand: 'Slack' | 'Discord' | 'Accelvia';
  tagline: string;
  description: string;
  defaultAccent: string;
  previewColors: {
    sidebar: string;
    canvas: string;
    card: string;
    accent: string;
  };
  dark: ThemePalette;
  light: ThemePalette;
}

export interface AccentColorOption {
  hex: string;
  name: string;
  brandRef: string;
}

// Curated SaaS Accent Swatches (Slack, Discord, Accelvia, Modern Design Systems)
export const CURATED_ACCENTS: AccentColorOption[] = [
  { hex: '#5865F2', name: 'Blurple', brandRef: 'Discord Signature' },
  { hex: '#4A154B', name: 'Aubergine', brandRef: 'Slack Classic' },
  { hex: '#007A5A', name: 'Forest Green', brandRef: 'Slack Emerald' },
  { hex: '#0D9488', name: 'Modern Teal', brandRef: 'Accelvia Emerald' },
  { hex: '#6366F1', name: 'Royal Indigo', brandRef: 'Modern SaaS' },
  { hex: '#1D9BD1', name: 'Slack Cyan', brandRef: 'Slack Nocturne' },
  { hex: '#E57842', name: 'Terracotta', brandRef: 'Slack Oolong' },
  { hex: '#E11D48', name: 'Rose Red', brandRef: 'Discord Hype' },
  { hex: '#F59E0B', name: 'Amber Gold', brandRef: 'Warm Solar' },
  { hex: '#8B5CF6', name: 'Neon Violet', brandRef: 'Cyberpunk' },
];

export const THEME_PRESETS: Record<ThemePreset, PresetDefinition> = {
  'classic-emerald': {
    id: 'classic-emerald',
    name: 'Accelvia Emerald',
    brand: 'Accelvia',
    tagline: 'Modern High-Density SaaS',
    description: 'Crisp slate canvas with elevated dark panels and vibrant emerald-teal highlights.',
    defaultAccent: '#0D9488',
    previewColors: {
      sidebar: '#0b1120',
      canvas: '#090d16',
      card: '#1e293b',
      accent: '#0d9488',
    },
    dark: {
      canvasBg: '#090d16',
      panelBg: '#0f172a',
      sidebarBg: '#0b1120',
      headerBg: '#0f172a',
      cardBg: '#1e293b',
      cardHover: '#243248',
      borderColor: 'rgba(51, 65, 85, 0.7)',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
    },
    light: {
      canvasBg: '#f8fafc',
      panelBg: '#ffffff',
      sidebarBg: '#ffffff',
      headerBg: '#ffffff',
      cardBg: '#ffffff',
      cardHover: '#f1f5f9',
      borderColor: '#e2e8f0',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
    },
  },

  'discord-blurple': {
    id: 'discord-blurple',
    name: 'Discord Blurple',
    brand: 'Discord',
    tagline: 'Iconic Discord Dark & Light',
    description: 'Discord signature #313338 dark theme with #2B2D31 channels and energetic Blurple accents.',
    defaultAccent: '#5865F2',
    previewColors: {
      sidebar: '#2b2d31',
      canvas: '#313338',
      card: '#2b2d31',
      accent: '#5865f2',
    },
    dark: {
      canvasBg: '#313338',
      panelBg: '#2b2d31',
      sidebarBg: '#1e1f22',
      headerBg: '#1e1f22',
      cardBg: '#2b2d31',
      cardHover: '#35373c',
      borderColor: '#3f4147',
      textPrimary: '#f2f3f5',
      textSecondary: '#b5bac1',
      textMuted: '#949ba4',
    },
    light: {
      canvasBg: '#f2f3f5',
      panelBg: '#ffffff',
      sidebarBg: '#e3e5e8',
      headerBg: '#ffffff',
      cardBg: '#ffffff',
      cardHover: '#f8f9fa',
      borderColor: '#d1d5db',
      textPrimary: '#060607',
      textSecondary: '#4e5058',
      textMuted: '#80848e',
    },
  },

  'discord-midnight': {
    id: 'discord-midnight',
    name: 'Discord Midnight',
    brand: 'Discord',
    tagline: 'AMOLED Pitch Black',
    description: 'True black #000000 AMOLED interface designed for maximum contrast and zero eye fatigue.',
    defaultAccent: '#5865F2',
    previewColors: {
      sidebar: '#111214',
      canvas: '#000000',
      card: '#141518',
      accent: '#5865f2',
    },
    dark: {
      canvasBg: '#000000',
      panelBg: '#090a0c',
      sidebarBg: '#111214',
      headerBg: '#111214',
      cardBg: '#141518',
      cardHover: '#1c1e22',
      borderColor: '#27272a',
      textPrimary: '#ffffff',
      textSecondary: '#a1a1aa',
      textMuted: '#71717a',
    },
    light: {
      canvasBg: '#ffffff',
      panelBg: '#ffffff',
      sidebarBg: '#f4f4f5',
      headerBg: '#ffffff',
      cardBg: '#ffffff',
      cardHover: '#f4f4f5',
      borderColor: '#e4e4e7',
      textPrimary: '#09090b',
      textSecondary: '#52525b',
      textMuted: '#71717a',
    },
  },

  'slack-aubergine': {
    id: 'slack-aubergine',
    name: 'Slack Aubergine',
    brand: 'Slack',
    tagline: 'Classic Slack Signature',
    description: 'Legendary deep aubergine sidebar (#3F0E40) paired with modern crisp light & dark workspace.',
    defaultAccent: '#4A154B',
    previewColors: {
      sidebar: '#3f0e40',
      canvas: '#1a1d21',
      card: '#222529',
      accent: '#4a154b',
    },
    dark: {
      canvasBg: '#1a1d21',
      panelBg: '#222529',
      sidebarBg: '#350d36',
      headerBg: '#222529',
      cardBg: '#222529',
      cardHover: '#2b2e33',
      borderColor: '#383f45',
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      sidebarText: '#ffffff',
      sidebarBorder: '#4a154b',
    },
    light: {
      canvasBg: '#f8fafc',
      panelBg: '#ffffff',
      sidebarBg: '#3f0e40',
      headerBg: '#350d36',
      cardBg: '#ffffff',
      cardHover: '#f1f5f9',
      borderColor: '#e2e8f0',
      textPrimary: '#1d1c1d',
      textSecondary: '#616061',
      textMuted: '#868686',
      sidebarText: '#ffffff',
      sidebarBorder: '#522653',
    },
  },

  'slack-nocturne': {
    id: 'slack-nocturne',
    name: 'Slack Nocturne',
    brand: 'Slack',
    tagline: 'Deep Charcoal & Cyan',
    description: 'Sleek Slack dark workspace with deep charcoal tones (#1A1D21) and cyan accents.',
    defaultAccent: '#1D9BD1',
    previewColors: {
      sidebar: '#191b1e',
      canvas: '#1a1d21',
      card: '#222529',
      accent: '#1d9bd1',
    },
    dark: {
      canvasBg: '#1a1d21',
      panelBg: '#222529',
      sidebarBg: '#191b1e',
      headerBg: '#191b1e',
      cardBg: '#222529',
      cardHover: '#2a2d33',
      borderColor: '#35373b',
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
    },
    light: {
      canvasBg: '#f8fafc',
      panelBg: '#ffffff',
      sidebarBg: '#f1f5f9',
      headerBg: '#ffffff',
      cardBg: '#ffffff',
      cardHover: '#f8fafc',
      borderColor: '#e2e8f0',
      textPrimary: '#1d1c1d',
      textSecondary: '#616061',
      textMuted: '#868686',
    },
  },

  'slack-oolong': {
    id: 'slack-oolong',
    name: 'Slack Oolong',
    brand: 'Slack',
    tagline: 'Warm Espresso & Terracotta',
    description: 'Sophisticated espresso dark palette (#1F1A18) with warm terracotta accents.',
    defaultAccent: '#E57842',
    previewColors: {
      sidebar: '#1a1614',
      canvas: '#1f1a18',
      card: '#28221f',
      accent: '#e57842',
    },
    dark: {
      canvasBg: '#1f1a18',
      panelBg: '#28221f',
      sidebarBg: '#1a1614',
      headerBg: '#1a1614',
      cardBg: '#28221f',
      cardHover: '#332b27',
      borderColor: '#3d332d',
      textPrimary: '#fbf7f4',
      textSecondary: '#d5c7bf',
      textMuted: '#a39288',
    },
    light: {
      canvasBg: '#faf7f5',
      panelBg: '#ffffff',
      sidebarBg: '#f4ede7',
      headerBg: '#ffffff',
      cardBg: '#ffffff',
      cardHover: '#fdfbfa',
      borderColor: '#e7dfd8',
      textPrimary: '#261e19',
      textSecondary: '#6b5c53',
      textMuted: '#9c8c82',
    },
  },
};

// Color Utility Functions
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
    };
  }
  return null;
}

export function hexToRgbString(hex: string, alpha = 1): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(13, 148, 136, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const adjust = (val: number) => Math.min(255, Math.max(0, Math.round(val + (val * percent) / 100)));
  const r = adjust(rgb.r).toString(16).padStart(2, '0');
  const g = adjust(rgb.g).toString(16).padStart(2, '0');
  const b = adjust(rgb.b).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function isValidHexColor(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex.trim());
}

export function getThemePalette(presetId: ThemePreset, mode: ThemeMode): ThemePalette {
  const preset = THEME_PRESETS[presetId] || THEME_PRESETS['classic-emerald'];
  return mode === 'dark' ? preset.dark : preset.light;
}
