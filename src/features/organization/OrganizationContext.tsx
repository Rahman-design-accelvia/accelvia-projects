// src/features/organization/OrganizationContext.tsx
// Global Organization & Company Setup Context:
// Allows the tenant company to configure their own custom Company Name, Tagline, and Contact Branding
// across the entire Work Management System, PDF exports, and client review portals.

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface OrganizationSettings {
  companyName: string;
  tagline: string;
  website: string;
  contactEmail: string;
}

export const STORAGE_KEY_ORG = 'accelvia_organization_settings_v1';

export const DEFAULT_ORG_SETTINGS: OrganizationSettings = {
  companyName: 'Rahman Design',
  tagline: 'Engineering & Creative Client Delivery',
  website: 'https://rahmandesign.com',
  contactEmail: 'contact@rahmandesign.com',
};

/**
 * Synchronous reader for stored company settings, usable in non-React utilities (e.g. documentExporter.ts)
 */
export function getStoredCompanySettings(): OrganizationSettings {
  if (typeof window === 'undefined') return DEFAULT_ORG_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.companyName === 'string' && parsed.companyName.trim()) {
        return {
          ...DEFAULT_ORG_SETTINGS,
          ...parsed,
          companyName: parsed.companyName.trim(),
        };
      }
    }
  } catch {}
  return DEFAULT_ORG_SETTINGS;
}

interface OrganizationContextType {
  settings: OrganizationSettings;
  companyName: string;
  updateSettings: (newSettings: Partial<OrganizationSettings>) => void;
  resetSettings: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<OrganizationSettings>(() => getStoredCompanySettings());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ORG, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const updateSettings = (newSettings: Partial<OrganizationSettings>) => {
    setSettings((prev) => {
      const nextName = (newSettings.companyName !== undefined ? newSettings.companyName : prev.companyName).trim();
      const updated: OrganizationSettings = {
        ...prev,
        ...newSettings,
        companyName: nextName || 'My Company',
      };
      try {
        localStorage.setItem(STORAGE_KEY_ORG, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_ORG_SETTINGS);
    try {
      localStorage.setItem(STORAGE_KEY_ORG, JSON.stringify(DEFAULT_ORG_SETTINGS));
    } catch {}
  };

  return (
    <OrganizationContext.Provider
      value={{
        settings,
        companyName: settings.companyName,
        updateSettings,
        resetSettings,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = (): OrganizationContextType => {
  const context = useContext(OrganizationContext);
  if (!context) {
    // Resilient fallback for testing environments and isolated renders
    const fallback = getStoredCompanySettings();
    return {
      settings: fallback,
      companyName: fallback.companyName,
      updateSettings: () => {},
      resetSettings: () => {},
    };
  }
  return context;
};
