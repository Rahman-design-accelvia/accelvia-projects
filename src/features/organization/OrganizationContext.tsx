// src/features/organization/OrganizationContext.tsx
// Global Organization & Company Setup Context:
// - Central authoritative active company name
// - Admin proposed company name submission & tracking
// - Super Admin review, approval, rejection, editing, direct updates, and deletion
// - Full audit history for all company name operations
// - Cross-tab and real-time synchronization

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  CompanyNameRequest,
  CompanyNameAuditRecord,
  CompanyNameRequestStatus,
  UserRole,
} from '../../types';
import {
  canSubmitCompanyNameRequest,
  canApproveCompanyNameRequest,
  canRejectCompanyNameRequest,
  canDirectlyUpdateCompanyName,
  canDeleteCompanyNameRequest,
} from '../../lib/auth/authorization';

export interface OrganizationSettings {
  companyName: string;
  tagline: string;
  website: string;
  contactEmail: string;
}

export const STORAGE_KEY_ORG = 'accelvia_organization_settings_v1';
export const STORAGE_KEY_COMPANY_REQUESTS = 'accelvia_company_name_requests_v1';
export const STORAGE_KEY_COMPANY_AUDIT = 'accelvia_company_name_audit_v1';

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

/**
 * Synchronous reader for company name requests
 */
export function getStoredCompanyRequests(): CompanyNameRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMPANY_REQUESTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Synchronous reader for company name audit history
 */
export function getStoredCompanyAuditHistory(): CompanyNameAuditRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMPANY_AUDIT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

interface OrganizationContextType {
  settings: OrganizationSettings;
  companyName: string;
  updateSettings: (newSettings: Partial<OrganizationSettings>) => void;
  resetSettings: () => void;
  // Task 1: Company Name Management
  companyRequests: CompanyNameRequest[];
  pendingCompanyRequests: CompanyNameRequest[];
  companyAuditHistory: CompanyNameAuditRecord[];
  submitCompanyNameRequest: (
    proposedName: string,
    applicant: { id: string; name: string; email: string; role: UserRole }
  ) => Promise<{ success: boolean; error?: string; request?: CompanyNameRequest }>;
  approveCompanyNameRequest: (
    requestId: string,
    reviewer: { id: string; name: string; role: UserRole },
    editedName?: string
  ) => Promise<{ success: boolean; error?: string }>;
  rejectCompanyNameRequest: (
    requestId: string,
    reviewer: { id: string; name: string; role: UserRole },
    reason?: string
  ) => Promise<{ success: boolean; error?: string }>;
  directUpdateCompanyName: (
    newName: string,
    updater: { id: string; name: string; role: UserRole },
    extraBranding?: Partial<OrganizationSettings>
  ) => Promise<{ success: boolean; error?: string }>;
  editCompanyNameRequest: (
    requestId: string,
    newProposedName: string,
    editor: { id: string; name: string; role: UserRole }
  ) => Promise<{ success: boolean; error?: string }>;
  deleteCompanyNameRequest: (
    requestId: string,
    deleter: { id: string; name: string; role: UserRole }
  ) => Promise<{ success: boolean; error?: string }>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<OrganizationSettings>(() => getStoredCompanySettings());
  const [companyRequests, setCompanyRequests] = useState<CompanyNameRequest[]>(() => getStoredCompanyRequests());
  const [companyAuditHistory, setCompanyAuditHistory] = useState<CompanyNameAuditRecord[]>(() => getStoredCompanyAuditHistory());

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ORG, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // Save requests to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COMPANY_REQUESTS, JSON.stringify(companyRequests));
    } catch {}
  }, [companyRequests]);

  // Save audit history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COMPANY_AUDIT, JSON.stringify(companyAuditHistory));
    } catch {}
  }, [companyAuditHistory]);

  // Cross-tab synchronization via BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('accelvia_company_channel');

    channel.onmessage = (event) => {
      const data = event.data;
      if (!data || !data.type) return;

      if (data.type === 'COMPANY_NAME_UPDATED') {
        const freshSettings = getStoredCompanySettings();
        setSettings(freshSettings);
        setCompanyRequests(getStoredCompanyRequests());
        setCompanyAuditHistory(getStoredCompanyAuditHistory());
      } else if (data.type === 'COMPANY_REQUEST_SUBMITTED') {
        setCompanyRequests(getStoredCompanyRequests());
        setCompanyAuditHistory(getStoredCompanyAuditHistory());
      }
    };

    return () => {
      try {
        channel.close();
      } catch {}
    };
  }, []);

  const broadcastEvent = (type: string, payload?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('accelvia_company_channel');
        channel.postMessage({ type, ...payload });
        channel.close();
      } catch {}
    }
  };

  const addAuditRecord = (record: Omit<CompanyNameAuditRecord, 'id' | 'timestamp'>) => {
    const newRecord: CompanyNameAuditRecord = {
      ...record,
      id: `c-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    setCompanyAuditHistory((prev) => [newRecord, ...prev]);
  };

  const pendingCompanyRequests = useMemo(() => {
    return companyRequests.filter((r) => r.status === 'pending');
  }, [companyRequests]);

  // Submit proposed company name request (Admins & Super Admins)
  const submitCompanyNameRequest = useCallback(
    async (
      proposedName: string,
      applicant: { id: string; name: string; email: string; role: UserRole }
    ): Promise<{ success: boolean; error?: string; request?: CompanyNameRequest }> => {
      if (!canSubmitCompanyNameRequest(applicant.role)) {
        return { success: false, error: 'Unauthorized: Members cannot submit company name requests.' };
      }

      const cleanName = proposedName.trim();
      if (!cleanName) {
        return { success: false, error: 'Company name cannot be empty.' };
      }
      if (cleanName.length < 2 || cleanName.length > 100) {
        return { success: false, error: 'Company name must be between 2 and 100 characters.' };
      }
      if (cleanName.toLowerCase() === settings.companyName.toLowerCase()) {
        return { success: false, error: `"${cleanName}" is already the active company name.` };
      }
      // Basic HTML / script injection defense
      if (/<[a-z][\s\S]*>/i.test(cleanName)) {
        return { success: false, error: 'Company name contains invalid characters.' };
      }

      // Check if identical request is already pending
      const existingPending = companyRequests.find(
        (r) => r.status === 'pending' && r.proposed_name.toLowerCase() === cleanName.toLowerCase()
      );
      if (existingPending) {
        return { success: false, error: `A request for "${cleanName}" is already pending Super Admin approval.` };
      }

      const newRequest: CompanyNameRequest = {
        id: `req-cn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        proposed_name: cleanName,
        requested_by_id: applicant.id,
        requested_by_name: applicant.name,
        requested_by_email: applicant.email,
        requested_by_role: applicant.role,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      };

      setCompanyRequests((prev) => [newRequest, ...prev]);

      addAuditRecord({
        action: 'submit_request',
        previous_name: settings.companyName,
        new_name: cleanName,
        performed_by_id: applicant.id,
        performed_by_name: applicant.name,
        performed_by_role: applicant.role,
        target_request_id: newRequest.id,
        details: `Submitted proposed company name "${cleanName}" for Super Admin review.`,
      });

      broadcastEvent('COMPANY_REQUEST_SUBMITTED', { requestId: newRequest.id });

      return { success: true, request: newRequest };
    },
    [settings.companyName, companyRequests]
  );

  // Approve submitted company name request (Super Admin ONLY)
  const approveCompanyNameRequest = useCallback(
    async (
      requestId: string,
      reviewer: { id: string; name: string; role: UserRole },
      editedName?: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!canApproveCompanyNameRequest(reviewer.role)) {
        return { success: false, error: 'Unauthorized: Only Super Admin can approve company name requests.' };
      }

      const targetReq = companyRequests.find((r) => r.id === requestId);
      if (!targetReq) {
        return { success: false, error: 'Company name request not found.' };
      }
      if (targetReq.status !== 'pending') {
        return { success: false, error: `This request has already been ${targetReq.status}.` };
      }

      const finalName = (editedName && editedName.trim()) || targetReq.proposed_name.trim();
      if (!finalName || finalName.length < 2) {
        return { success: false, error: 'Approved company name must be at least 2 characters.' };
      }

      const previousName = settings.companyName;

      // 1. Update Global Active Company Name
      setSettings((prev) => {
        const updated: OrganizationSettings = {
          ...prev,
          companyName: finalName,
        };
        try {
          localStorage.setItem(STORAGE_KEY_ORG, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // 2. Mark Request as Approved
      const now = new Date().toISOString();
      setCompanyRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                proposed_name: finalName,
                status: 'approved' as CompanyNameRequestStatus,
                reviewed_by_id: reviewer.id,
                reviewed_by_name: reviewer.name,
                reviewed_by_role: reviewer.role,
                reviewed_at: now,
              }
            : r
        )
      );

      // 3. Record in Audit History
      addAuditRecord({
        action: 'approve_request',
        previous_name: previousName,
        new_name: finalName,
        performed_by_id: reviewer.id,
        performed_by_name: reviewer.name,
        performed_by_role: reviewer.role,
        target_request_id: requestId,
        details: `Approved company name request submitted by ${targetReq.requested_by_name}. Active name changed from "${previousName}" to "${finalName}".`,
      });

      broadcastEvent('COMPANY_NAME_UPDATED', { activeName: finalName });

      return { success: true };
    },
    [companyRequests, settings.companyName]
  );

  // Reject submitted company name request (Super Admin ONLY)
  const rejectCompanyNameRequest = useCallback(
    async (
      requestId: string,
      reviewer: { id: string; name: string; role: UserRole },
      reason?: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!canRejectCompanyNameRequest(reviewer.role)) {
        return { success: false, error: 'Unauthorized: Only Super Admin can reject company name requests.' };
      }

      const targetReq = companyRequests.find((r) => r.id === requestId);
      if (!targetReq) {
        return { success: false, error: 'Company name request not found.' };
      }
      if (targetReq.status !== 'pending') {
        return { success: false, error: `This request has already been ${targetReq.status}.` };
      }

      const now = new Date().toISOString();
      setCompanyRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                status: 'rejected' as CompanyNameRequestStatus,
                reviewed_by_id: reviewer.id,
                reviewed_by_name: reviewer.name,
                reviewed_by_role: reviewer.role,
                reviewed_at: now,
                review_notes: reason?.trim() || undefined,
              }
            : r
        )
      );

      // Note: Active company name remains UNCHANGED!
      addAuditRecord({
        action: 'reject_request',
        previous_name: settings.companyName,
        new_name: settings.companyName,
        performed_by_id: reviewer.id,
        performed_by_name: reviewer.name,
        performed_by_role: reviewer.role,
        target_request_id: requestId,
        details: `Rejected company name request for "${targetReq.proposed_name}" submitted by ${targetReq.requested_by_name}.${reason ? ` Reason: ${reason}` : ''}`,
      });

      broadcastEvent('COMPANY_REQUEST_SUBMITTED', { requestId });

      return { success: true };
    },
    [companyRequests, settings.companyName]
  );

  // Directly update active global company name (Super Admin ONLY)
  const directUpdateCompanyName = useCallback(
    async (
      newName: string,
      updater: { id: string; name: string; role: UserRole },
      extraBranding?: Partial<OrganizationSettings>
    ): Promise<{ success: boolean; error?: string }> => {
      if (!canDirectlyUpdateCompanyName(updater.role)) {
        return { success: false, error: 'Unauthorized: Only Super Admin can directly update the global company name.' };
      }

      const cleanName = newName.trim();
      if (!cleanName || cleanName.length < 2 || cleanName.length > 100) {
        return { success: false, error: 'Company name must be between 2 and 100 characters.' };
      }
      if (/<[a-z][\s\S]*>/i.test(cleanName)) {
        return { success: false, error: 'Company name contains invalid characters.' };
      }

      const previousName = settings.companyName;

      setSettings((prev) => {
        const updated: OrganizationSettings = {
          ...prev,
          ...extraBranding,
          companyName: cleanName,
        };
        try {
          localStorage.setItem(STORAGE_KEY_ORG, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      addAuditRecord({
        action: 'direct_update',
        previous_name: previousName,
        new_name: cleanName,
        performed_by_id: updater.id,
        performed_by_name: updater.name,
        performed_by_role: updater.role,
        details: `Super Admin directly updated active global company name from "${previousName}" to "${cleanName}".`,
      });

      broadcastEvent('COMPANY_NAME_UPDATED', { activeName: cleanName });

      return { success: true };
    },
    [settings]
  );

  // Edit a pending request's proposed name before approval (Super Admin ONLY)
  const editCompanyNameRequest = useCallback(
    async (
      requestId: string,
      newProposedName: string,
      editor: { id: string; name: string; role: UserRole }
    ): Promise<{ success: boolean; error?: string }> => {
      if (!canDirectlyUpdateCompanyName(editor.role)) {
        return { success: false, error: 'Unauthorized: Only Super Admin can edit company name requests.' };
      }

      const cleanName = newProposedName.trim();
      if (!cleanName || cleanName.length < 2) {
        return { success: false, error: 'Company name must be at least 2 characters.' };
      }

      const targetReq = companyRequests.find((r) => r.id === requestId);
      if (!targetReq) {
        return { success: false, error: 'Request not found.' };
      }

      setCompanyRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, proposed_name: cleanName } : r))
      );

      addAuditRecord({
        action: 'edit_request',
        previous_name: targetReq.proposed_name,
        new_name: cleanName,
        performed_by_id: editor.id,
        performed_by_name: editor.name,
        performed_by_role: editor.role,
        target_request_id: requestId,
        details: `Super Admin edited proposed name from "${targetReq.proposed_name}" to "${cleanName}".`,
      });

      return { success: true };
    },
    [companyRequests]
  );

  // Delete a request or history entry (Super Admin ONLY)
  const deleteCompanyNameRequest = useCallback(
    async (
      requestId: string,
      deleter: { id: string; name: string; role: UserRole }
    ): Promise<{ success: boolean; error?: string }> => {
      if (!canDeleteCompanyNameRequest(deleter.role)) {
        return { success: false, error: 'Unauthorized: Only Super Admin can delete company name records.' };
      }

      const targetReq = companyRequests.find((r) => r.id === requestId);
      if (!targetReq) {
        return { success: false, error: 'Request entry not found.' };
      }

      setCompanyRequests((prev) => prev.filter((r) => r.id !== requestId));

      addAuditRecord({
        action: 'delete_request',
        previous_name: targetReq.proposed_name,
        new_name: settings.companyName,
        performed_by_id: deleter.id,
        performed_by_name: deleter.name,
        performed_by_role: deleter.role,
        target_request_id: requestId,
        details: `Super Admin deleted request entry "${targetReq.proposed_name}" (${targetReq.status}).`,
      });

      return { success: true };
    },
    [companyRequests, settings.companyName]
  );

  // Legacy helper
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
        companyRequests,
        pendingCompanyRequests,
        companyAuditHistory,
        submitCompanyNameRequest,
        approveCompanyNameRequest,
        rejectCompanyNameRequest,
        directUpdateCompanyName,
        editCompanyNameRequest,
        deleteCompanyNameRequest,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = (): OrganizationContextType => {
  const context = useContext(OrganizationContext);
  if (!context) {
    const fallback = getStoredCompanySettings();
    return {
      settings: fallback,
      companyName: fallback.companyName,
      updateSettings: () => {},
      resetSettings: () => {},
      companyRequests: [],
      pendingCompanyRequests: [],
      companyAuditHistory: [],
      submitCompanyNameRequest: async () => ({ success: false, error: 'No context' }),
      approveCompanyNameRequest: async () => ({ success: false, error: 'No context' }),
      rejectCompanyNameRequest: async () => ({ success: false, error: 'No context' }),
      directUpdateCompanyName: async () => ({ success: false, error: 'No context' }),
      editCompanyNameRequest: async () => ({ success: false, error: 'No context' }),
      deleteCompanyNameRequest: async () => ({ success: false, error: 'No context' }),
    };
  }
  return context;
};
