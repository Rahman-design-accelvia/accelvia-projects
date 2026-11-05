// src/features/theme/ThemeCustomizerModal.tsx
// High-Polish Theme & Appearance Customizer for Admin and Super Admin
// Inspired by Slack, Discord, and Modern SaaS design systems

import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeContext';
import {
  ThemeMode,
  ThemePreset,
  THEME_PRESETS,
  CURATED_ACCENTS,
  isValidHexColor,
  getThemePalette,
} from './themePresets';
import { useAuth } from '../auth/AuthContext';
import { useNotifications } from '../notifications/NotificationContext';
import {
  Palette,
  Sun,
  Moon,
  Sparkles,
  Check,
  RotateCcw,
  X,
  ShieldCheck,
  Layers,
  MessageSquare,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({ isOpen, onClose }) => {
  const { mode, preset, accentColor, updateThemeConfig, resetTheme } = useTheme();
  const { isSuperAdmin, isAdmin } = useAuth();
  const { notify } = useNotifications();

  // Local staging state so the user can tweak and live-preview before saving
  const [stagingMode, setStagingMode] = useState<ThemeMode>(mode);
  const [stagingPreset, setStagingPreset] = useState<ThemePreset>(preset);
  const [stagingAccent, setStagingAccent] = useState<string>(accentColor);
  const [customHexInput, setCustomHexInput] = useState<string>(accentColor);
  const [customHexError, setCustomHexError] = useState<string | null>(null);

  // Sync staging state whenever modal opens or global theme changes
  useEffect(() => {
    if (isOpen) {
      setStagingMode(mode);
      setStagingPreset(preset);
      setStagingAccent(accentColor);
      setCustomHexInput(accentColor);
      setCustomHexError(null);
    }
  }, [isOpen, mode, preset, accentColor]);

  if (!isOpen) return null;

  // Staged palette for real-time live preview window
  const stagingPalette = getThemePalette(stagingPreset, stagingMode);

  const handleSelectPreset = (newPreset: ThemePreset) => {
    setStagingPreset(newPreset);
    const def = THEME_PRESETS[newPreset];
    if (def) {
      setStagingAccent(def.defaultAccent);
      setCustomHexInput(def.defaultAccent);
      setCustomHexError(null);
    }
  };

  const handleSelectAccent = (hex: string) => {
    setStagingAccent(hex);
    setCustomHexInput(hex);
    setCustomHexError(null);
  };

  const handleCustomHexChange = (value: string) => {
    let clean = value.trim();
    if (!clean.startsWith('#') && clean.length > 0) {
      clean = '#' + clean;
    }
    setCustomHexInput(clean);

    if (isValidHexColor(clean)) {
      setStagingAccent(clean);
      setCustomHexError(null);
    } else {
      setCustomHexError('Please enter a valid 3 or 6 digit hex (e.g. #5865F2)');
    }
  };

  const handleApplyTheme = () => {
    updateThemeConfig({
      mode: stagingMode,
      preset: stagingPreset,
      accentColor: stagingAccent,
    });

    notify({
      title: '🎨 Theme & Appearance Updated',
      body: `Applied ${THEME_PRESETS[stagingPreset]?.name || 'Theme'} with accent ${stagingAccent.toUpperCase()}`,
      category: 'system',
    });

    onClose();
  };

  const handleReset = () => {
    resetTheme();
    setStagingMode('dark');
    setStagingPreset('classic-emerald');
    setStagingAccent('#0D9488');
    setCustomHexInput('#0D9488');
    setCustomHexError(null);

    notify({
      title: '🔄 Theme Reset to Default',
      body: 'Restored original Accelvia Emerald dark theme configuration.',
      category: 'system',
    });
  };

  const hasAdminRights = isSuperAdmin || isAdmin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl text-white shadow-md flex items-center justify-center transition-colors"
              style={{ backgroundColor: stagingAccent }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Theme & Appearance Studio
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Customize workspace styling, Discord & Slack presets, and primary brand accent color.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Close theme studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - 2 Columns on desktop */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Theme Presets, Base Mode & Color Picker (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {!hasAdminRights && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Theme styling customization is restricted to Admin and Super Admin roles.</span>
              </div>
            )}

            {/* 1. Base Appearance Mode */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                1. Base Appearance Mode
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  disabled={!hasAdminRights}
                  onClick={() => setStagingMode('light')}
                  className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                    stagingMode === 'light'
                      ? 'border-emerald-500 dark:border-teal-400 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <Sun className={`w-5 h-5 ${stagingMode === 'light' ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-semibold">Clean Light</span>
                  <span className="text-[10px] text-slate-400">High-contrast SaaS</span>
                </button>

                <button
                  type="button"
                  disabled={!hasAdminRights}
                  onClick={() => setStagingMode('dark')}
                  className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                    stagingMode === 'dark' && stagingPreset !== 'discord-midnight'
                      ? 'border-emerald-500 dark:border-teal-400 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <Moon className={`w-5 h-5 ${stagingMode === 'dark' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-semibold">Dark Mode</span>
                  <span className="text-[10px] text-slate-400">Comfortable depth</span>
                </button>

                <button
                  type="button"
                  disabled={!hasAdminRights}
                  onClick={() => {
                    setStagingMode('dark');
                    handleSelectPreset('discord-midnight');
                  }}
                  className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                    stagingPreset === 'discord-midnight' && stagingMode === 'dark'
                      ? 'border-emerald-500 dark:border-teal-400 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span className="text-xs font-semibold">AMOLED Pitch</span>
                  <span className="text-[10px] text-slate-400">#000000 black</span>
                </button>
              </div>
            </div>

            {/* 2. Theme Presets Gallery (Slack & Discord) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  2. Design Presets (Slack & Discord)
                </label>
                <span className="text-[11px] text-slate-500 font-medium">Click to apply palette</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.values(THEME_PRESETS).map((p) => {
                  const isSelected = stagingPreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!hasAdminRights}
                      onClick={() => handleSelectPreset(p.id)}
                      className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-slate-900 dark:border-slate-100 ring-2 ring-slate-900/10 dark:ring-slate-100/20 bg-slate-100/70 dark:bg-slate-800/80 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        {/* Header with Brand Chip */}
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            {p.name}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              p.brand === 'Slack'
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : p.brand === 'Discord'
                                ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                            }`}
                          >
                            {p.brand}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      </div>

                      {/* Mini 4-Bar Color Swatch Strip */}
                      <div className="flex items-center gap-1 mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800">
                        <div
                          className="h-3 w-5 rounded-xs border border-black/10"
                          style={{ backgroundColor: p.previewColors.sidebar }}
                          title={`Sidebar: ${p.previewColors.sidebar}`}
                        />
                        <div
                          className="h-3 w-5 rounded-xs border border-black/10"
                          style={{ backgroundColor: p.previewColors.canvas }}
                          title={`Canvas: ${p.previewColors.canvas}`}
                        />
                        <div
                          className="h-3 w-5 rounded-xs border border-black/10"
                          style={{ backgroundColor: p.previewColors.card }}
                          title={`Card: ${p.previewColors.card}`}
                        />
                        <div
                          className="h-3 w-5 rounded-xs border border-black/10 ml-auto"
                          style={{ backgroundColor: p.previewColors.accent }}
                          title={`Accent: ${p.previewColors.accent}`}
                        />
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-emerald-600 dark:bg-teal-400 text-white dark:text-slate-950 flex items-center justify-center shrink-0 shadow-xs ml-1">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Primary Accent Color Picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  3. Primary Accent Color
                </label>
                <span className="text-[11px] text-slate-500 font-mono">{stagingAccent}</span>
              </div>

              {/* Curated Swatches */}
              <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                {CURATED_ACCENTS.map((accent) => {
                  const isCuratedActive = stagingAccent.toLowerCase() === accent.hex.toLowerCase();
                  return (
                    <button
                      key={accent.hex}
                      type="button"
                      disabled={!hasAdminRights}
                      onClick={() => handleSelectAccent(accent.hex)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 relative ${
                        isCuratedActive
                          ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900 scale-105 shadow-md'
                          : 'opacity-90 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: accent.hex }}
                      title={`${accent.name} (${accent.brandRef}) - ${accent.hex}`}
                    >
                      {isCuratedActive && <Check className="w-4 h-4 text-white drop-shadow stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom Hex Color Picker */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative">
                    <input
                      type="color"
                      disabled={!hasAdminRights}
                      value={isValidHexColor(stagingAccent) ? stagingAccent : '#5865F2'}
                      onChange={(e) => handleCustomHexChange(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 bg-transparent p-0.5"
                      title="Open visual color palette"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      disabled={!hasAdminRights}
                      value={customHexInput}
                      onChange={(e) => handleCustomHexChange(e.target.value)}
                      placeholder="#5865F2"
                      maxLength={7}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!hasAdminRights}
                  onClick={() => {
                    const def = THEME_PRESETS[stagingPreset]?.defaultAccent || '#0D9488';
                    handleSelectAccent(def);
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  title="Align accent color to selected preset's default signature"
                >
                  Match Preset
                </button>
              </div>

              {customHexError && (
                <div className="text-[11px] text-rose-500 mt-1 font-medium">{customHexError}</div>
              )}
            </div>
          </div>

          {/* Right Column: Real-Time Interactive Preview Window (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Live Preview Studio
            </label>

            <div
              className="flex-1 rounded-2xl border p-4 shadow-xl flex flex-col justify-between transition-colors overflow-hidden relative"
              style={{
                backgroundColor: stagingPalette.canvasBg,
                borderColor: stagingPalette.borderColor,
                color: stagingPalette.textPrimary,
              }}
            >
              {/* Mini App Mockup Header */}
              <div>
                <div
                  className="rounded-xl p-2.5 border mb-3 flex items-center justify-between transition-colors shadow-xs"
                  style={{
                    backgroundColor: stagingPalette.headerBg,
                    borderColor: stagingPalette.borderColor,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white font-bold text-xs shadow-xs"
                      style={{ backgroundColor: stagingAccent }}
                    >
                      A
                    </div>
                    <div>
                      <div
                        className="text-xs font-bold leading-none truncate max-w-[100px]"
                        style={{ color: stagingPalette.textPrimary }}
                      >
                        Company Hub
                      </div>
                      <div className="text-[9px] font-mono opacity-60">ACCELVIA WMS</div>
                    </div>
                  </div>

                  <div
                    className="px-2 py-0.5 rounded-full text-[10px] font-mono border"
                    style={{
                      backgroundColor: stagingPalette.cardHover,
                      borderColor: stagingPalette.borderColor,
                      color: stagingPalette.textSecondary,
                    }}
                  >
                    BST: 15:30
                  </div>
                </div>

                {/* Mini Layout Simulation: Sidebar Item + Scope Card */}
                <div className="grid grid-cols-12 gap-2.5">
                  {/* Mini Sidebar Snippet */}
                  <div
                    className="col-span-4 rounded-xl p-2 border flex flex-col gap-1.5 transition-colors"
                    style={{
                      backgroundColor: stagingPalette.sidebarBg,
                      borderColor: stagingPalette.sidebarBorder || stagingPalette.borderColor,
                      color: stagingPalette.sidebarText || stagingPalette.textPrimary,
                    }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">Projects</div>
                    <div
                      className="px-1.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 text-white"
                      style={{ backgroundColor: stagingAccent }}
                    >
                      <Layers className="w-3 h-3 shrink-0" />
                      <span className="truncate">Core API</span>
                    </div>
                    <div
                      className="px-1.5 py-1 rounded-md text-[11px] opacity-75 truncate"
                      style={{ color: stagingPalette.sidebarText || stagingPalette.textSecondary }}
                    >
                      Mobile App
                    </div>
                  </div>

                  {/* Mini Workspace Content Snippet */}
                  <div className="col-span-8 flex flex-col gap-2">
                    {/* Simulated Estimate Card */}
                    <div
                      className="rounded-xl p-2.5 border shadow-xs transition-colors"
                      style={{
                        backgroundColor: stagingPalette.cardBg,
                        borderColor: stagingPalette.borderColor,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-[11px] font-bold truncate"
                          style={{ color: stagingPalette.textPrimary }}
                        >
                          Estimate v1.0
                        </span>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: stagingAccent }}
                        >
                          APPROVED
                        </span>
                      </div>
                      <div className="text-[10px] font-mono" style={{ color: stagingPalette.textSecondary }}>
                        45.0 hrs • $4,500.00
                      </div>
                    </div>

                    {/* Simulated Message Bubble */}
                    <div
                      className="rounded-xl p-2 border flex items-start gap-1.5 text-[10px] leading-tight"
                      style={{
                        backgroundColor: stagingPalette.cardHover,
                        borderColor: stagingPalette.borderColor,
                        color: stagingPalette.textPrimary,
                      }}
                    >
                      <MessageSquare className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="truncate">Client approved scope package revision.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini Action Buttons in Preview */}
              <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: stagingPalette.borderColor }}>
                <span className="text-[10px] font-mono opacity-70">
                  Preset: {THEME_PRESETS[stagingPreset]?.name}
                </span>
                <button
                  type="button"
                  className="px-3 py-1 rounded-lg text-xs font-bold text-white shadow-xs transition-all hover:opacity-95"
                  style={{ backgroundColor: stagingAccent }}
                >
                  + New Action
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between shrink-0">
          <button
            type="button"
            disabled={!hasAdminRights}
            onClick={handleReset}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Reset theme to Accelvia default settings"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!hasAdminRights}
              onClick={handleApplyTheme}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-all hover:opacity-95 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: stagingAccent }}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Apply & Save Theme</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
