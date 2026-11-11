// src/features/organization/OrganizationContext.tsx
// Global Organization & Company Setup Context:
// - Central authoritative active company name
// - Admin proposed company name submission & tracking
// - Super Admin review, approval, rejection, editing, direct updates, and deletion
// - Full audit history for all company name operations
// - Cross-tab and real-time synchronization (Supabase-backed for cross-user/cross-device)

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';

export interface OrganizationSettings {
  companyName: string;
  tagline: string;
  website: string;
  contactEmail: string;
}

export const STORAGE_KEY_ORG = 'accelvia_organization_settings_v1';
export const STORAGE_KEY_COMPANY_REQUESTS = 'accelvia_company_name_requests_v1';
export const STORAGE_KEY_COMPANY_AUDIT = 'accelvia_company_name_audit_v1';

// Supabase keys used in app_workspace_data table
const SUPABASE_KEY_ORG_SETTINGS = 'org_settings';
const SUPABASE_KEY_COMPANY_REQUESTS = 'company_name_requests';
const SUPABASE_KEY_COMPANY_AUDIT = 'company_name_audit';

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

  // Track last Supabase-synced JSON to avoid echo loops (same pattern as WorkspaceLayout)
  const lastCloudJson = useRef<Record<string, string>>({});

  // ─── Supabase: persist to cloud & update localStorage ─────────────────────

  const upsertToSupabase = useCallback(async (key: string, value: unknown) => {
    if (!isSupabaseConfigured) return;
    const currentJson = JSON.stringify(value);
    if (lastCloudJson.current[key] === currentJson) return; // skip unchanged
    lastCloudJson.current[key] = currentJson;
    try {
      await supabase.from('app_workspace_data').upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn(`[OrgSync] Could not upsert ${key} to Supabase:`, e);
    }
  }, []);

  // ─── Persist to localStorage (always) ─────────────────────────────────────

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_ORG, JSON.stringify(settings)); } catch {}
  }, [settings]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_COMPANY_REQUESTS, JSON.stringify(companyRequests)); } catch {}
  }, [companyRequests]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_COMPANY_AUDIT, JSON.stringify(companyAuditHistory)); } catch {}
  }, [companyAuditHistory]);

  // ─── Supabase: initial fetch on mount ─────────────────────────────────────

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('app_workspace_data')
          .select('*')
          .in('key', [SUPABASE_KEY_ORG_SETTINGS, SUPABASE_KEY_COMPANY_REQUESTS, SUPABASE_KEY_COMPANY_AUDIT]);

        if (error || !Array.isArray(data)) return;

        data.forEach((row) => {
          const valJson = JSON.stringify(row.value);
          lastCloudJson.current[row.key] = valJson;

          if (row.key === SUPABASE_KEY_ORG_SETTINGS && row.value && typeof row.value === 'object') {
            const incoming = row.value as OrganizationSettings;
            if (incoming.companyName && incoming.companyName.trim()) {
              setSettings({ ...DEFAULT_ORG_SETTINGS, ...incoming, companyName: incoming.companyName.trim() });
              try { localStorage.setItem(STORAGE_KEY_ORG, valJson); } catch {}
            }
          } else if (row.key === SUPABASE_KEY_COMPANY_REQUESTS && Array.isArray(row.value)) {
            setCompanyRequests(row.value as CompanyNameRequest[]);
            try { localStorage.setItem(STORAGE_KEY_COMPANY_REQUESTS, valJson); } catch {}
          } else if (row.key === SUPABASE_KEY_COMPANY_AUDIT && Array.isArray(row.value)) {
            setCompanyAuditHistory(row.value as CompanyNameAuditRecord[]);
            try { localStorage.setItem(STORAGE_KEY_COMPANY_AUDIT, valJson); } catch {}
          }
        });
      } catch (e) {
        console.warn('[OrgSync] Initial fetch failed:', e);
      }
    })();
  }, []);

  // ─── Supabase: Realtime subscription for cross-user/cross-device sync ─────

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('org_settings_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_workspace_data' },
        (payload) => {
          const key = (payload.new as Record<string, unknown>)?.key as string;
          const value = (payload.new as Record<string, unknown>)?.value;
          if (!key || value === undefined) return;

          // Only handle org-related keys
          if (
            key !== SUPABASE_KEY_ORG_SETTINGS &&
            key !== SUPABASE_KEY_COMPANY_REQUESTS &&
            key !== SUPABASE_KEY_COMPANY_AUDIT
          ) return;

          const incomingJson = JSON.stringify(value);
          // Drop self-echoes
          if (lastCloudJson.current[key] === incomingJson) return;
          lastCloudJson.current[key] = incomingJson;

          if (key === SUPABASE_KEY_ORG_SETTINGS && value && typeof value === 'object') {
            const incoming = value as OrganizationSettings;
            if (incoming.companyName && incoming.companyName.trim()) {
              setSettings({ ...DEFAULT_ORG_SETTINGS, ...incoming, companyName: incoming.companyName.trim() });
              try { localStorage.setItem(STORAGE_KEY_ORG, incomingJson); } catch {}
            }
          } else if (key === SUPABASE_KEY_COMPANY_REQUESTS && Array.isArray(value)) {
            setCompanyRequests(value as CompanyNameRequest[]);
            try { localStorage.setItem(STORAGE_KEY_COMPANY_REQUESTS, incomingJson); } catch {}
          } else if (key === SUPABASE_KEY_COMPANY_AUDIT && Array.isArray(value)) {
            setCompanyAuditHistory(value as CompanyNameAuditRecord[]);
            try { localStorage.setItem(STORAGE_KEY_COMPANY_AUDIT, incomingJson); } catch {}
          }
        }
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, []);

  // ─── Cross-tab BroadcastChannel (same browser, different tabs) ─────────────

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
      try { channel.close(); } catch {}
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

  const addAuditRecord = useCallback((record: Omit<CompanyNameAuditRecord, 'id' | 'timestamp'>): CompanyNameAuditRecord => {
    const newRecord: CompanyNameAuditRecord = {
      ...record,
      id: `c-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    setCompanyAuditHistory((prev) => {
      const updated = [newRecord, ...prev];
      // Persist to Supabase asynchronously
      upsertToSupabase(SUPABASE_KEY_COMPANY_AUDIT, updated);
      return updated;
    });
    return newRecord;
  }, [upsertToSupabase]);

  const pendingCompanyRequests = useMemo(() => {
    return companyRequests.filter((r) => r.status === 'pending');
  }, [companyRequests]);

  // ─── Submit proposed company name request (Admins & Super Admins) ──────────

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
      if (/<[a-z][\s\S]*>/i.test(cleanName)) {
        return { success: false, error: 'Company name contains invalid characters.' };
      }

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

      const auditEntry: CompanyNameAuditRecord = {
        id: `c-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        action: 'submit_request',
        previous_name: settings.companyName,
        new_name: cleanName,
        performed_by_id: applicant.id,
        performed_by_name: applicant.name,
        performed_by_role: applicant.role,
        target_request_id: newRequest.id,
        details: `Submitted proposed company name "${cleanName}" for Super Admin review.`,
      };

      setCompanyRequests((prev) => {
        const updated = [newRequest, ...prev];
        // Persist to Supabase so Super Admin sees it immediately
        upsertToSupabase(SUPABASE_KEY_COMPANY_REQUESTS, updated);
        return updated;
      });

      setCompanyAuditHistory((prev) => {
        const updated = [auditEntry, ...prev];
        upsertToSupabase(SUPABASE_KEY_COMPANY_AUDIT, updated);
        return updated;
      });

      broadcastEvent('COMPANY_REQUEST_SUBMITTED', { requestId: newRequest.id });

      return { success: true, request: newRequest };
    },
    [settings.companyName, companyRequests, upsertToSupabase]
  );

  // ─── Approve submitted company name request (Super Admin ONLY) ────────────

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
      const now = new Date().toISOString();

      // 1. Update Global Active Company Name & persist to Supabase
      setSettings((prev) => {
        const updated: OrganizationSettings = { ...prev, companyName: finalName };
        try { localStorage.setItem(STORAGE_KEY_ORG, JSON.stringify(updated)); } catch {}
        upsertToSupabase(SUPABASE_KEY_ORG_SETTINGS, updated);
        return updated;
      });

      // 2. Mark Request as Approved & persist to Supabase
      setCompanyRequests((prev) => {
        const updated = prev.map((r) =>
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
        );
        upsertToSupabase(SUPABASE_KEY_COMPANY_REQUESTS, updated);
        return updated;
      });

      // 3. Record in Audit History & persist to Supabase
      const auditEntry: CompanyNameAuditRecord = {
        id: `c-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now,
        action: 'approve_request',
        previous_name: previousName,
        new_name: finalName,
        performed_by_id: reviewer.id,
        performed_by_name: reviewer.name,
        performed_by_role: reviewer.role,
        target_request_id: requestId,
        details: `Approved company name request submitted by ${targetReq.requested_by_name}. Active name changed from "${previousName}" to "${finalName}".`,
      };
      setCompanyAuditHistory((prev) => {
        const updated = [auditEntry, ...prev];
        upsertToSupabase(SUPABASE_KEY_COMPANY_AUDIT, updated);
        return updated;
      });

      broadcastEvent('COMPANY_NAME_UPDATED', { activeName: finalName });

      return { success: true };
    },
    [companyRequests, settings.companyName, upsertToSupabase]
  );

  // ─── Reject submitted company name request (Super Admin ONLY) ─────────────

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

      setCompanyRequests((prev) => {
        const updated = prev.map((r) =>
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
        );
        upsertToSupabase(SUPABASE_KEY_COMPANY_REQUESTS, updated);
        return updated;
      });

      // Active company name remains UNCHANGED
      const auditEntry: CompanyNameAuditRecord = {
        id: `c-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now,
        action: 'reject_request',
        previous_name: settings.companyName,
        new_name: settings.companyName,
        performed_by_id: reviewer.id,
        performed_by_name: reviewer.name,
        performed_by_role: reviewer.role,
        target_request_id: requestId,
        details: `Rejected company name request for "${targetReq.proposed_name}" submitted by ${targetReq.requested_by_name}.${reason ? ` Reason: ${reason}` : ''}`,
      };
      setCompanyAuditHistory((prev) => {
        const updated = [auditEntry, ...prev];
        upsertToSupabase(SUPABASE_KEY_COMPANY_AUDIT, updated);
        return updated;
      });

      broadcastEvent('COMPANY_REQUEST_SUBMITTED', { requestId });

      return { success: true };
    },
    [companyRequests, settings.companyName, upsertToSupabase]
  );

  // ─── Directly update active global company name (Super Admin ONLY) ─────────

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
        try { localStorage.setItem(STORAGE_KEY_ORG, JSON.stringify(updated)); } catch {}
        // Persist to Supabase so all users see the new branding immediately
        upsertToSupabase(SUPABASE_KEY_ORG_SETTINGS, updated);
        return updated;
      });

      const auditEntry: CompanyNameAuditRecord = {
        id: `c-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        action: 'direct_update',
        previous_name: previousName,
        new_name: cleanName,
        performed_by_id: updater.id,
        performed_by_name: updater.name,
        performed_by_role: updater.role,
        details: `Super Admin directly updated active global company name from "${previousName}" to "${cleanName}".`,
      };
      setCompanyAuditHistory((prev) => {
        const updated = [auditEntry, ...prev];
        upsertToSupabase(SUPABASE_KEY_COMPANY_AUDIT, updated);
        return updated;
      });

      broadcastEvent('COMPANY_NAME_UPDATED', { activeName: cleanName });

      return { success: true };
    },
    [settings, upsertToSupabase]
  );

  // ─── Edit a pending request's proposed name (Super Admin ONLY) ─────────────

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

      setCompanyRequests((prev) => {
        const updated = prev.map((r) => (r.id === requestId ? { ...r, proposed_name: cleanName } : r));
        upsertToSupabase(SUPABASE_KEY_COMPANY_REQUESTS, updated);
        return updated;
      });

      const auditEntry: CompanyNameAuditRecord = {
        id: `c-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        action: 'edit_request',
        previous_name: targetReq.proposed_name,
        new_name: cleanName,
        performed_by_id: editor.id,
        performed_by_name: editor.name,
        performed_by_role: editor.role,
        target_request_id: requestId,
        details: `Super Admin edited proposed name from "${targetReq.proposed_name}" to "${cleanName}".`,
      };
      setCompanyAuditHistory((prev) => {
        const updated = [auditEntry, ...prev];
        upsertToSupabase(SUPABASE_KEY_COMPANY_AUDIT, updated);
        return updated;
      });

      return { success: true };
    },
    [companyRequests, upsertToSupabase]
  );

  // ─── Delete a request or history entry (Super Admin ONLY) ──────────────────

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

      setCompanyRequests((prev) => {
        const updated = prev.filter((r) => r.id !== requestId);
        upsertToSupabase(SUPABASE_KEY_COMPANY_REQUESTS, updated);
        return updated;
      });

      const auditEntry: CompanyNameAuditRecord = {
        id: `c-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        action: 'delete_request',
        previous_name: targetReq.proposed_name,
        new_name: settings.companyName,
        performed_by_id: deleter.id,
        performed_by_name: deleter.name,
        performed_by_role: deleter.role,
        target_request_id: requestId,
        details: `Super Admin deleted request entry "${targetReq.proposed_name}" (${targetReq.status}).`,
      };
      setCompanyAuditHistory((prev) => {
        const updated = [auditEntry, ...prev];
        upsertToSupabase(SUPABASE_KEY_COMPANY_AUDIT, updated);
        return updated;
      });

      return { success: true };
    },
    [companyRequests, settings.companyName, upsertToSupabase]
  );

  // ─── Legacy helper ──────────────────────────────────────────────────────────

  const updateSettings = (newSettings: Partial<OrganizationSettings>) => {
    setSettings((prev) => {
      const nextName = (newSettings.companyName !== undefined ? newSettings.companyName : prev.companyName).trim();
      const updated: OrganizationSettings = {
        ...prev,
        ...newSettings,
        companyName: nextName || 'My Company',
      };
      try { localStorage.setItem(STORAGE_KEY_ORG, JSON.stringify(updated)); } catch {}
      upsertToSupabase(SUPABASE_KEY_ORG_SETTINGS, updated);
      return updated;
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_ORG_SETTINGS);
    try { localStorage.setItem(STORAGE_KEY_ORG, JSON.stringify(DEFAULT_ORG_SETTINGS)); } catch {}
    upsertToSupabase(SUPABASE_KEY_ORG_SETTINGS, DEFAULT_ORG_SETTINGS);
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
