// src/features/auth/AuthContext.tsx
// Unified Authentication Context:
// - Central database synchronization via Supabase 'app_users'
// - Multi-device/cross-browser support for Super Admin, Admins, and Members
// - Member/Admin registration with Super Admin approval workflow
// - Reliable Google / Gmail authentication

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  UserRole,
  UserProfile,
  DesignationRequest,
  PasswordResetRequest,
  PasswordAuditRecord,
} from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import {
  canUpdateUserPassword,
  canDeleteUserAccount,
  canManageAdminPasswordRequests,
  canManageMemberPasswordRequests,
  canApprovePasswordResetRequest,
} from '../../lib/auth/authorization';
import {
  hashPassword,
  verifyPassword,
  generateSecureTemporaryPassword,
  validatePasswordStrength,
} from '../../lib/auth/password-crypto';

export interface TeamMember {
  user_id: string;
  display_name: string;
  email: string;
  role: UserRole;
  requested_role?: UserRole;
  designation?: string;
  requested_designation?: string;
  password?: string;
  must_change_password?: boolean;
  status: 'active' | 'invited' | 'pending_approval' | 'suspended';
  created_at: string;
  notes?: string;
}

export interface SuperAdminProfile {
  user_id: string;
  display_name: string;
  email: string;
  created_at: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: UserProfile & { role: UserRole };
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isMember: boolean;
  canViewMoney: boolean;
  canManageUsers: boolean;
  canAccessAudit: boolean;
  canCorrectEventTime: boolean;
  // Super Admin Registration & First-Time Setup
  isSuperAdminRegistered: boolean;
  superAdminProfile: SuperAdminProfile | null;
  registerSuperAdmin: (data: { displayName: string; email: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
  registerUser: (data: { displayName: string; email: string; password?: string; requestedRole?: UserRole; notes?: string }) => Promise<{ success: boolean; status: 'active' | 'pending_approval'; error?: string }>;
  resetSuperAdminSetup: () => void;
  // Approvals (Super Admin authority)
  pendingRegistrations: TeamMember[];
  approveRegistration: (userId: string, assignedRole: UserRole) => Promise<void>;
  rejectRegistration: (userId: string) => Promise<void>;
  // Designation & Name Updates
  updateDisplayName: (newName: string) => Promise<{ success: boolean; error?: string }>;
  designationRequests: DesignationRequest[];
  pendingDesignationRequests: DesignationRequest[];
  submitDesignationRequest: (data: { requestedDesignation: string; requestedRole: UserRole; notes?: string }) => Promise<{ success: boolean; error?: string }>;
  approveDesignationRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  rejectDesignationRequest: (requestId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  superAdminUpdateUserDesignation: (userId: string, designation: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  // Standard Authentication
  loginWithCredentials: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsRole: (role: UserRole) => void;
  loginWithGoogleGmail: (gmail: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  // Team Roster Management
  teamMembers: TeamMember[];
  addTeamMember: (member: { display_name: string; email: string; role: UserRole; password?: string }) => Promise<TeamMember>;
  removeTeamMember: (userId: string) => Promise<void>;
  updateUserPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  // Task 2: Password Management & Reset Requests
  passwordResetRequests: PasswordResetRequest[];
  pendingPasswordRequests: PasswordResetRequest[];
  passwordAuditHistory: PasswordAuditRecord[];
  submitForgotPasswordRequest: (email: string) => Promise<{ success: boolean; message: string }>;
  submitPasswordChangeRequest: (notes?: string) => Promise<{ success: boolean; error?: string }>;
  approvePasswordResetRequest: (requestId: string, customPassword?: string) => Promise<{ success: boolean; error?: string; temporaryPassword?: string }>;
  rejectPasswordResetRequest: (requestId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  completeTemporaryPasswordChange: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  superAdminResetUserPassword: (userId: string, customPassword?: string) => Promise<{ success: boolean; error?: string; temporaryPassword?: string }>;
  mustChangePassword: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_AUTH = 'accelvia_auth_session_v5';
const STORAGE_KEY_TEAM = 'accelvia_team_members_v5';
const STORAGE_KEY_SUPER_ADMIN = 'accelvia_super_admin_profile_v5';
const STORAGE_KEY_PASSWORD_REQUESTS = 'accelvia_password_reset_requests_v1';
const STORAGE_KEY_PASSWORD_AUDIT = 'accelvia_password_audit_v1';

// Supabase shared JSON keys in app_workspace_data table
const SUPABASE_KEY_PASSWORD_REQUESTS = 'password_reset_requests';
const SUPABASE_KEY_PASSWORD_AUDIT = 'password_audit';

export const DEFAULT_CREDENTIALS = {
  super_admin: {
    email: 'gravityahmed11@gmail.com',
    password: 'Alpha@@2026',
    display_name: 'Super Admin (Ahmed)',
    role: 'super_admin' as UserRole,
  },
  admin: {
    email: 'musfiqurrahmanqa@gmail.com',
    password: 'Password123!',
    display_name: 'Musfiqur Rahman (QA)',
    role: 'admin' as UserRole,
  },
  member: {
    email: 'member@accelvia.internal',
    password: 'Password123!',
    display_name: 'Dev Alex',
    role: 'member' as UserRole,
  },
};

const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    user_id: 'sa-gravity',
    display_name: 'Super Admin (Ahmed)',
    email: 'gravityahmed11@gmail.com',
    role: 'super_admin',
    password: 'Alpha@@2026',
    status: 'active',
    created_at: '2026-10-30T00:00:00Z',
  },
  {
    user_id: 'user-1793962269072',
    display_name: 'Nahidur Abedin',
    email: 'nahidur.abedin@gmail.com',
    role: 'admin',
    designation: 'CEO / Project Director',
    password: 'Password123!',
    status: 'active',
    created_at: '2026-10-30T00:00:00Z',
  },
  {
    user_id: 'user-musfiqur',
    display_name: 'Musfiqur Rahman (QA)',
    email: 'musfiqurrahmanqa@gmail.com',
    role: 'admin',
    password: 'Password123!',
    status: 'active',
    created_at: '2026-10-30T00:00:00Z',
  },
  {
    user_id: 'user-musfiqur-s',
    display_name: 'Musfiqur Rahman (QA)',
    email: 'musfiqurrahmansqa@gmail.com',
    role: 'admin',
    password: 'Password123!',
    status: 'active',
    created_at: '2026-10-30T00:00:00Z',
  },
  {
    user_id: 'sa-1',
    display_name: 'Executive Director',
    email: 'superadmin@accelvia.internal',
    role: 'super_admin',
    password: 'Alpha@@2026',
    status: 'active',
    created_at: '2026-10-30T00:00:00Z',
  },
  {
    user_id: 'admin-1',
    display_name: 'Sarah Connor',
    email: 'admin@accelvia.internal',
    role: 'admin',
    password: 'Password123!',
    status: 'active',
    created_at: '2026-10-30T00:00:00Z',
  },
  {
    user_id: 'member-1',
    display_name: 'Dev Alex',
    email: 'member@accelvia.internal',
    role: 'member',
    password: 'Password123!',
    status: 'active',
    created_at: '2026-10-30T00:00:00Z',
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Registered Founding Super Admin Profile (Defaulted to gravityahmed11@gmail.com or persisted)
  const [superAdminProfile, setSuperAdminProfile] = useState<SuperAdminProfile | null>(() => {
    if (typeof window === 'undefined') {
      return {
        user_id: 'sa-gravity',
        display_name: 'Super Admin (Ahmed)',
        email: 'gravityahmed11@gmail.com',
        created_at: '2026-10-30T00:00:00Z',
      };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUPER_ADMIN);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      user_id: 'sa-gravity',
      display_name: 'Super Admin (Ahmed)',
      email: 'gravityahmed11@gmail.com',
      created_at: '2026-10-30T00:00:00Z',
    };
  });

  useEffect(() => {
    try {
      if (superAdminProfile) {
        localStorage.setItem(STORAGE_KEY_SUPER_ADMIN, JSON.stringify(superAdminProfile));
      } else {
        localStorage.removeItem(STORAGE_KEY_SUPER_ADMIN);
      }
    } catch {}
  }, [superAdminProfile]);

  const isSuperAdminRegistered = Boolean(superAdminProfile);

  // 2. Team Members Roster
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    if (typeof window === 'undefined') return INITIAL_TEAM_MEMBERS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEAM);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_TEAM_MEMBERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(teamMembers));
    } catch {}
  }, [teamMembers]);

  // Track last Supabase-synced JSON to avoid echo loops
  const lastCloudJson = useRef<Record<string, string>>({});

  const upsertWorkspaceKey = useCallback(async (key: string, value: unknown) => {
    if (!isSupabaseConfigured) return;
    const currentJson = JSON.stringify(value);
    if (lastCloudJson.current[key] === currentJson) return;
    lastCloudJson.current[key] = currentJson;
    try {
      await supabase.from('app_workspace_data').upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn(`[AuthSync] Could not upsert ${key} to Supabase:`, e);
    }
  }, []);

  // Synchronize users from Supabase database centrally
  const fetchSupabaseUsers = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase.from('app_users').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        // Find Super Admin
        const sa = data.find((u) => u.role === 'super_admin' && u.status === 'active');
        if (sa) {
          setSuperAdminProfile({
            user_id: sa.id,
            display_name: sa.display_name,
            email: sa.email,
            created_at: sa.created_at,
          });
        }

        const mapped: TeamMember[] = data.map((u) => ({
          user_id: u.id,
          display_name: u.display_name,
          email: u.email,
          role: u.role as UserRole,
          requested_role: u.requested_role as UserRole,
          designation: u.designation || (u.role === 'super_admin' ? 'Executive Director' : u.role === 'admin' ? 'Project Manager' : 'Specialist Engineer'),
          requested_designation: u.requested_designation,
          password: u.password,
          must_change_password: Boolean(u.must_change_password),
          status: u.status,
          created_at: u.created_at,
          notes: u.notes,
        }));

        setTeamMembers(mapped);
      }
    } catch (e) {
      console.warn('Error fetching Supabase app_users:', e);
    }
  }, []);

  useEffect(() => {
    fetchSupabaseUsers();
  }, [fetchSupabaseUsers]);

  // Realtime subscription for app_users table (cross-platform live sync)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('app_users_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_users' },
        () => {
          fetchSupabaseUsers();
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [fetchSupabaseUsers]);

  const pendingRegistrations = useMemo(() => {
    return teamMembers.filter((m) => m.status === 'pending_approval');
  }, [teamMembers]);

  // Designation Requests State
  const STORAGE_KEY_DESIGNATION_REQUESTS = 'accelvia_designation_requests_v1';
  const [designationRequests, setDesignationRequests] = useState<DesignationRequest[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DESIGNATION_REQUESTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DESIGNATION_REQUESTS, JSON.stringify(designationRequests));
    } catch {}
  }, [designationRequests]);

  const fetchDesignationRequests = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('app_designation_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        setDesignationRequests(data);
      }
    } catch (e) {
      console.warn('Could not fetch designation requests from Supabase:', e);
    }
  }, []);

  useEffect(() => {
    fetchDesignationRequests();
  }, [fetchDesignationRequests]);

  // Realtime subscription for designation requests
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('app_designation_requests_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_designation_requests' },
        () => {
          fetchDesignationRequests();
          fetchSupabaseUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDesignationRequests, fetchSupabaseUsers]);

  const pendingDesignationRequests = useMemo(() => {
    return designationRequests.filter((r) => r.status === 'pending');
  }, [designationRequests]);

  // Password Reset & Change Requests State
  const [passwordResetRequests, setPasswordResetRequests] = useState<PasswordResetRequest[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PASSWORD_REQUESTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PASSWORD_REQUESTS, JSON.stringify(passwordResetRequests));
    } catch {}
  }, [passwordResetRequests]);

  const [passwordAuditHistory, setPasswordAuditHistory] = useState<PasswordAuditRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PASSWORD_AUDIT);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PASSWORD_AUDIT, JSON.stringify(passwordAuditHistory));
    } catch {}
  }, [passwordAuditHistory]);

  // Initial fetch for password reset requests & audit history from Supabase
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('app_workspace_data')
          .select('*')
          .in('key', [SUPABASE_KEY_PASSWORD_REQUESTS, SUPABASE_KEY_PASSWORD_AUDIT]);

        if (!error && Array.isArray(data)) {
          data.forEach((row) => {
            const valJson = JSON.stringify(row.value);
            lastCloudJson.current[row.key] = valJson;
            if (row.key === SUPABASE_KEY_PASSWORD_REQUESTS && Array.isArray(row.value)) {
              setPasswordResetRequests(row.value);
              try { localStorage.setItem(STORAGE_KEY_PASSWORD_REQUESTS, valJson); } catch {}
            } else if (row.key === SUPABASE_KEY_PASSWORD_AUDIT && Array.isArray(row.value)) {
              setPasswordAuditHistory(row.value);
              try { localStorage.setItem(STORAGE_KEY_PASSWORD_AUDIT, valJson); } catch {}
            }
          });
        }
      } catch (e) {
        console.warn('[AuthSync] Initial fetch for password data failed:', e);
      }
    })();
  }, []);

  // Realtime subscription for password reset requests & audit history
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('auth_workspace_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_workspace_data' },
        (payload) => {
          const key = (payload.new as Record<string, unknown>)?.key as string;
          const value = (payload.new as Record<string, unknown>)?.value;
          if (!key || value === undefined) return;
          if (key !== SUPABASE_KEY_PASSWORD_REQUESTS && key !== SUPABASE_KEY_PASSWORD_AUDIT) return;

          const incomingJson = JSON.stringify(value);
          if (lastCloudJson.current[key] === incomingJson) return;
          lastCloudJson.current[key] = incomingJson;

          if (key === SUPABASE_KEY_PASSWORD_REQUESTS && Array.isArray(value)) {
            setPasswordResetRequests(value);
            try { localStorage.setItem(STORAGE_KEY_PASSWORD_REQUESTS, incomingJson); } catch {}
          } else if (key === SUPABASE_KEY_PASSWORD_AUDIT && Array.isArray(value)) {
            setPasswordAuditHistory(value);
            try { localStorage.setItem(STORAGE_KEY_PASSWORD_AUDIT, incomingJson); } catch {}
          }
        }
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, []);

  const addPasswordAuditRecord = useCallback((record: Omit<PasswordAuditRecord, 'id' | 'timestamp'>) => {
    const newRecord: PasswordAuditRecord = {
      ...record,
      id: `pwd-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    setPasswordAuditHistory((prev) => {
      const updated = [newRecord, ...prev];
      upsertWorkspaceKey(SUPABASE_KEY_PASSWORD_AUDIT, updated);
      return updated;
    });
  }, [upsertWorkspaceKey]);

  const pendingPasswordRequests = useMemo(() => {
    return passwordResetRequests.filter((r) => r.status === 'pending');
  }, [passwordResetRequests]);

  // 3. User Session State
  const [session, setSession] = useState<{
    isAuthenticated: boolean;
    role: UserRole;
    userId: string;
    email: string;
    displayName: string;
    designation?: string;
    mustChangePassword?: boolean;
  }>(() => {
    if (typeof window === 'undefined') {
      return {
        isAuthenticated: false,
        role: 'member',
        userId: 'guest',
        email: '',
        displayName: '',
        mustChangePassword: false,
      };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isAuthenticated) return parsed;
      }
    } catch {}
    return {
      isAuthenticated: false,
      role: 'member',
      userId: 'guest',
      email: '',
      displayName: '',
      mustChangePassword: false,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(session));
    } catch {}
  }, [session]);

  const currentRole = session.role;

  const currentUser: UserProfile & { role: UserRole } = useMemo(() => {
    const userInRoster = teamMembers.find((m) => m.user_id === session.userId || m.email === session.email);
    return {
      user_id: session.userId,
      organization_id: 'org-1',
      display_name: session.displayName || userInRoster?.display_name || 'Guest User',
      email: session.email,
      designation: userInRoster?.designation || session.designation || (session.role === 'super_admin' ? 'Executive Director' : session.role === 'admin' ? 'Project Manager' : 'Specialist Engineer'),
      requested_designation: userInRoster?.requested_designation,
      account_status: 'active',
      role: session.role,
      created_at: '2026-10-30T00:00:00Z',
      updated_at: '2026-10-30T00:00:00Z',
    };
  }, [session, teamMembers]);

  const isSuperAdmin = currentRole === 'super_admin';
  const isAdmin = currentRole === 'admin';
  const isMember = currentRole === 'member';

  const canViewMoney = isSuperAdmin || isAdmin;
  const canManageUsers = isSuperAdmin || isAdmin;
  const canAccessAudit = isSuperAdmin;
  const canCorrectEventTime = isSuperAdmin;

  // Role-gated team members: Zero plaintext passwords or hashes exposed
  const roleGatedTeamMembers = useMemo(() => {
    return teamMembers.map((m) => {
      const sanitized = { ...m };
      delete sanitized.password;
      return sanitized;
    });
  }, [teamMembers]);

  const setRole = useCallback((newRole: UserRole) => {
    if (newRole === 'super_admin' && superAdminProfile) {
      setSession({
        isAuthenticated: true,
        role: 'super_admin',
        userId: superAdminProfile.user_id,
        email: superAdminProfile.email,
        displayName: superAdminProfile.display_name,
      });
      return;
    }

    const cred = DEFAULT_CREDENTIALS[newRole];
    setSession({
      isAuthenticated: true,
      role: newRole,
      userId: newRole === 'super_admin' ? 'sa-1' : newRole === 'admin' ? 'admin-1' : 'member-1',
      email: cred.email,
      displayName: cred.display_name,
    });
  }, [superAdminProfile]);

  const loginAsRole = useCallback((role: UserRole) => {
    setRole(role);
  }, [setRole]);

  // Register Super Admin
  const registerSuperAdmin = useCallback(
    async (data: { displayName: string; email: string; password?: string }): Promise<{ success: boolean; error?: string }> => {
      const normalizedEmail = data.email.trim().toLowerCase();
      const displayName = data.displayName.trim() || normalizedEmail.split('@')[0];

      if (!normalizedEmail) {
        return { success: false, error: 'Please enter a valid Gmail address.' };
      }

      const newSuperAdmin: SuperAdminProfile = {
        user_id: `sa-${Date.now()}`,
        display_name: displayName,
        email: normalizedEmail,
        created_at: new Date().toISOString(),
      };

      setSuperAdminProfile(newSuperAdmin);

      const rawPassword = data.password?.trim() || 'Password123!';
      const hashedPassword = await hashPassword(rawPassword);

      const superAdminMember: TeamMember = {
        user_id: newSuperAdmin.user_id,
        display_name: displayName,
        email: normalizedEmail,
        role: 'super_admin',
        password: hashedPassword,
        must_change_password: false,
        status: 'active',
        created_at: newSuperAdmin.created_at,
      };

      setTeamMembers((prev) => [
        superAdminMember,
        ...prev.filter((m) => m.role !== 'super_admin'),
      ]);

      if (isSupabaseConfigured) {
        try {
          await supabase.from('app_users').upsert({
            id: newSuperAdmin.user_id,
            display_name: displayName,
            email: normalizedEmail,
            role: 'super_admin',
            password: hashedPassword,
            must_change_password: false,
            status: 'active',
          });
        } catch (e) {
          console.warn('Could not save Super Admin to Supabase:', e);
        }
      }

      setSession({
        isAuthenticated: true,
        role: 'super_admin',
        userId: newSuperAdmin.user_id,
        email: normalizedEmail,
        displayName,
      });

      return { success: true };
    },
    []
  );

  // General User Registration (Member or Admin)
  const registerUser = useCallback(
    async (data: { displayName: string; email: string; password?: string; requestedRole?: UserRole; notes?: string }): Promise<{ success: boolean; status: 'active' | 'pending_approval'; error?: string }> => {
      const normalizedEmail = data.email.trim().toLowerCase();
      const displayName = data.displayName.trim() || normalizedEmail.split('@')[0];

      if (!normalizedEmail) {
        return { success: false, status: 'pending_approval', error: 'Please enter a valid email or Gmail.' };
      }

      // Check if user already exists
      const existing = teamMembers.find((m) => m.email.toLowerCase() === normalizedEmail);
      if (existing) {
        if (existing.status === 'pending_approval') {
          return {
            success: false,
            status: 'pending_approval',
            error: 'A registration for this email is already awaiting Super Admin approval.',
          };
        }
        return {
          success: false,
          status: 'active',
          error: 'An account with this email is already active. Please sign in.',
        };
      }

      const rawPassword = data.password?.trim() || 'Password123!';
      const hashedPassword = await hashPassword(rawPassword);

      const newMember: TeamMember = {
        user_id: `user-${Date.now()}`,
        display_name: displayName,
        email: normalizedEmail,
        role: data.requestedRole || 'member',
        requested_role: data.requestedRole || 'member',
        password: hashedPassword,
        must_change_password: false,
        status: 'pending_approval',
        created_at: new Date().toISOString(),
        notes: data.notes,
      };

      setTeamMembers((prev) => [newMember, ...prev]);

      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase.from('app_users').insert({
            id: newMember.user_id,
            display_name: displayName,
            email: normalizedEmail,
            role: newMember.role,
            requested_role: newMember.requested_role,
            designation: newMember.role === 'admin' ? 'Project Manager' : 'Specialist Engineer',
            password: hashedPassword,
            must_change_password: false,
            status: 'pending_approval',
            notes: data.notes || null,
            created_at: newMember.created_at,
            updated_at: new Date().toISOString(),
          });
          if (error) {
            console.error('[Auth] Could not persist registration to Supabase:', error);
            return { success: false, status: 'pending_approval', error: error.message };
          }
        } catch (e: any) {
          console.error('[Auth] Exception persisting registration:', e);
          return { success: false, status: 'pending_approval', error: e?.message || 'Registration failed' };
        }
      }

      return { success: true, status: 'pending_approval' };
    },
    [teamMembers]
  );

  // Reset workspace setup
  const resetSuperAdminSetup = useCallback(() => {
    setSuperAdminProfile(null);
    setTeamMembers(INITIAL_TEAM_MEMBERS);
    setSession({
      isAuthenticated: false,
      role: 'member',
      userId: 'guest',
      email: '',
      displayName: '',
    });
    try {
      localStorage.removeItem(STORAGE_KEY_SUPER_ADMIN);
      localStorage.removeItem(STORAGE_KEY_AUTH);
      localStorage.removeItem(STORAGE_KEY_TEAM);
    } catch {}
  }, []);

  // Super Admin: Approve Registration
  const approveRegistration = useCallback(async (userId: string, assignedRole: UserRole) => {
    setTeamMembers((prev) =>
      prev.map((m) => {
        if (m.user_id === userId) {
          return {
            ...m,
            status: 'active',
            role: assignedRole,
          };
        }
        return m;
      })
    );

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('app_users')
          .update({ status: 'active', role: assignedRole })
          .eq('id', userId);
      } catch (e) {
        console.warn('Could not update user approval in Supabase:', e);
      }
    }
  }, []);

  // Super Admin: Reject Registration
  const rejectRegistration = useCallback(async (userId: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.user_id !== userId));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('app_users').delete().eq('id', userId);
      } catch (e) {
        console.warn('Could not delete user in Supabase:', e);
      }
    }
  }, []);

  // --------------------------------------------------------------------------
  // AUTHENTICATION & LOGIN FLOW
  // --------------------------------------------------------------------------
  const loginWithCredentials = useCallback(
    async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!password || !password.trim()) {
        return { success: false, error: 'Please enter your account password.' };
      }

      // 1. Authenticate against central Supabase database
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase
            .from('app_users')
            .select('*')
            .eq('email', normalizedEmail)
            .maybeSingle();

          if (data) {
            if (data.status === 'pending_approval') {
              return {
                success: false,
                error: 'Your registration is currently pending approval by the Super Admin. You will be able to log in once your account is activated.',
              };
            }
            if (data.status === 'suspended' || data.status === 'inactive') {
              return {
                success: false,
                error: 'This account has been deactivated or suspended by management. Please contact Super Admin.',
              };
            }

            const expectedPassword = data.password || 'Password123!';
            const isValid = await verifyPassword(password, expectedPassword);
            if (!isValid) {
              return {
                success: false,
                error: `Incorrect password for ${email}. Please check your credentials or contact the Super Admin.`,
              };
            }

            // Transparently upgrade legacy plaintext password to PBKDF2 hash on login
            if (!expectedPassword.startsWith('$pbkdf2$v1$100000$')) {
              try {
                const upgradedHash = await hashPassword(password);
                await supabase.from('app_users').update({ password: upgradedHash }).eq('id', data.id);
                setTeamMembers((prev) =>
                  prev.map((m) => (m.user_id === data.id ? { ...m, password: upgradedHash } : m))
                );
              } catch (upgradeErr) {
                console.warn('Auto-hash migration warning:', upgradeErr);
              }
            }

            setSession({
              isAuthenticated: true,
              role: data.role as UserRole,
              userId: data.id,
              email: data.email,
              displayName: data.display_name,
              designation: data.designation,
              mustChangePassword: Boolean(data.must_change_password),
            });
            return { success: true };
          }
        } catch (e) {
          console.warn('Supabase authentication lookup error:', e);
        }
      }

      // 2. Check local registered team roster
      const matchedMember = teamMembers.find((m) => m.email.toLowerCase() === normalizedEmail);
      if (matchedMember) {
        if (matchedMember.status === 'pending_approval') {
          return {
            success: false,
            error: 'Your registration is currently pending approval by the Super Admin. You will be able to log in once your account is activated.',
          };
        }
        if (matchedMember.status === 'suspended') {
          return {
            success: false,
            error: 'This account has been deactivated or suspended by management.',
          };
        }

        const expectedPassword = matchedMember.password || 'Password123!';
        const isValid = await verifyPassword(password, expectedPassword);
        if (!isValid) {
          return {
            success: false,
            error: `Incorrect password for ${email}. Please check your credentials or contact the Super Admin.`,
          };
        }

        // Transparently upgrade legacy plaintext password to PBKDF2 hash on login
        if (!expectedPassword.startsWith('$pbkdf2$v1$100000$')) {
          const upgradedHash = await hashPassword(password);
          setTeamMembers((prev) =>
            prev.map((m) => (m.user_id === matchedMember.user_id ? { ...m, password: upgradedHash } : m))
          );
        }

        setSession({
          isAuthenticated: true,
          role: matchedMember.role,
          userId: matchedMember.user_id,
          email: matchedMember.email,
          displayName: matchedMember.display_name,
          designation: matchedMember.designation,
          mustChangePassword: Boolean(matchedMember.must_change_password),
        });
        return { success: true };
      }

      // 3. Fallback demo credentials (Strictly verify password without bypass!)
      if (normalizedEmail === DEFAULT_CREDENTIALS.super_admin.email.toLowerCase()) {
        const isValid = await verifyPassword(password, DEFAULT_CREDENTIALS.super_admin.password);
        if (!isValid) {
          return {
            success: false,
            error: `Incorrect password for ${email}. Please check your credentials or contact the Super Admin.`,
          };
        }
        setSession({
          isAuthenticated: true,
          role: 'super_admin',
          userId: 'sa-gravity',
          email: DEFAULT_CREDENTIALS.super_admin.email,
          displayName: DEFAULT_CREDENTIALS.super_admin.display_name,
          mustChangePassword: false,
        });
        return { success: true };
      }

      if (
        normalizedEmail === DEFAULT_CREDENTIALS.admin.email.toLowerCase() ||
        normalizedEmail === 'musfiqurrahmansqa@gmail.com'
      ) {
        const isValid = await verifyPassword(password, DEFAULT_CREDENTIALS.admin.password);
        if (!isValid) {
          return {
            success: false,
            error: `Incorrect password for ${email}. Please check your credentials or contact the Super Admin.`,
          };
        }
        setSession({
          isAuthenticated: true,
          role: 'admin',
          userId: 'user-musfiqur',
          email: normalizedEmail,
          displayName: 'Musfiqur Rahman (QA)',
          mustChangePassword: false,
        });
        return { success: true };
      }

      if (normalizedEmail === DEFAULT_CREDENTIALS.member.email.toLowerCase()) {
        const isValid = await verifyPassword(password, DEFAULT_CREDENTIALS.member.password);
        if (!isValid) {
          return {
            success: false,
            error: `Incorrect password for ${email}. Please check your credentials or contact the Super Admin.`,
          };
        }
        setSession({
          isAuthenticated: true,
          role: 'member',
          userId: 'member-1',
          email: DEFAULT_CREDENTIALS.member.email,
          displayName: DEFAULT_CREDENTIALS.member.display_name,
          mustChangePassword: false,
        });
        return { success: true };
      }

      return {
        success: false,
        error: `No registered account found for "${email}". Please register to submit an account request for Super Admin approval.`,
      };
    },
    [teamMembers]
  );

  // Reliable Google / Gmail Sign In
  const loginWithGoogleGmail = useCallback(
    async (gmail: string): Promise<{ success: boolean; error?: string }> => {
      const normalizedEmail = gmail.trim().toLowerCase();

      // Check local team list or Supabase
      let matched = teamMembers.find((m) => m.email.toLowerCase() === normalizedEmail);

      if (!matched && isSupabaseConfigured) {
        try {
          const { data } = await supabase
            .from('app_users')
            .select('*')
            .eq('email', normalizedEmail)
            .maybeSingle();

          if (data) {
            matched = {
              user_id: data.id,
              display_name: data.display_name,
              email: data.email,
              role: data.role as UserRole,
              password: data.password,
              status: data.status,
              created_at: data.created_at,
            };

            setTeamMembers((prev) => {
              if (prev.some((m) => m.email.toLowerCase() === normalizedEmail)) return prev;
              return [matched!, ...prev];
            });
          }
        } catch (e) {
          console.warn('Supabase Gmail lookup error:', e);
        }
      }

      if (matched) {
        if (matched.status === 'pending_approval') {
          return {
            success: false,
            error: `Your account (${gmail}) has been registered, but is currently pending approval by the Super Admin.`,
          };
        }

        setSession({
          isAuthenticated: true,
          role: matched.role,
          userId: matched.user_id,
          email: matched.email,
          displayName: matched.display_name,
        });
        return { success: true };
      }

      // Check default credentials
      if (normalizedEmail === DEFAULT_CREDENTIALS.super_admin.email.toLowerCase()) {
        setSession({
          isAuthenticated: true,
          role: 'super_admin',
          userId: 'sa-gravity',
          email: DEFAULT_CREDENTIALS.super_admin.email,
          displayName: DEFAULT_CREDENTIALS.super_admin.display_name,
        });
        return { success: true };
      }

      if (
        normalizedEmail === DEFAULT_CREDENTIALS.admin.email.toLowerCase() ||
        normalizedEmail === 'musfiqurrahmansqa@gmail.com'
      ) {
        setSession({
          isAuthenticated: true,
          role: 'admin',
          userId: 'user-musfiqur',
          email: normalizedEmail,
          displayName: 'Musfiqur Rahman (QA)',
        });
        return { success: true };
      }

      return {
        success: false,
        error: `No active account found for Gmail "${gmail}". Please switch to the Register tab to submit an account request for Super Admin approval.`,
      };
    },
    [teamMembers]
  );

  const loginWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (superAdminProfile && superAdminProfile.email.includes('@')) {
      return loginWithGoogleGmail(superAdminProfile.email);
    }
    return {
      success: false,
      error: 'Please enter your Gmail address.',
    };
  }, [superAdminProfile, loginWithGoogleGmail]);

  // Sign out
  const logout = useCallback(() => {
    setSession({
      isAuthenticated: false,
      role: 'member',
      userId: 'guest',
      email: '',
      displayName: '',
    });
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    } catch {}
    if (isSupabaseConfigured) {
      supabase.auth.signOut().catch(() => {});
    }
  }, []);

  // Listen for account deletion broadcasts on PWA and browser tabs
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('accelvia_sync_channel');

    channel.onmessage = (event) => {
      const data = event.data;
      if (!data || !data.type) return;

      if (data.type === 'USER_DELETED') {
        if (data.userId === session.userId) {
          try {
            localStorage.setItem(
              'accelvia_account_terminated_notice',
              JSON.stringify({
                deletedBy: data.deletedBy || 'Super Admin',
                deletedName: data.deletedName,
                time: new Date().toISOString(),
              })
            );
          } catch {}
          logout();
        } else {
          setTeamMembers((prev) => prev.filter((m) => m.user_id !== data.userId));
        }
      }

      if (data.type === 'PASSWORD_RESET_REVOKE') {
        if (data.userId === session.userId) {
          try {
            localStorage.setItem(
              'accelvia_account_terminated_notice',
              JSON.stringify({
                deletedBy: data.resetBy || 'Management',
                deletedName: session.displayName,
                message: 'Your password was reset by an administrator. Active sessions have been revoked for your security. Please sign in with your temporary password.',
                time: new Date().toISOString(),
              })
            );
          } catch {}
          logout();
        }
      }
    };

    return () => {
      channel.close();
    };
  }, [session.userId, logout]);

  // Super Admin / Admin: Direct Provision Team Member
  const addTeamMember = useCallback(
    async (member: { display_name: string; email: string; role: UserRole; password?: string; designation?: string }): Promise<TeamMember> => {
      const cleanName = member.display_name.trim();
      const cleanEmail = member.email.trim().toLowerCase();
      const assignedPassword = member.password?.trim() || 'Password123!';
      const hashedPassword = await hashPassword(assignedPassword);
      const designation = member.designation?.trim() || (member.role === 'admin' ? 'Project Manager' : 'Specialist Engineer');

      const newMember: TeamMember = {
        user_id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        display_name: cleanName,
        email: cleanEmail,
        role: member.role,
        designation,
        password: hashedPassword,
        must_change_password: false,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      setTeamMembers((prev) => {
        const filtered = prev.filter((m) => m.email.toLowerCase() !== cleanEmail);
        return [newMember, ...filtered];
      });

      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase.from('app_users').upsert({
            id: newMember.user_id,
            display_name: newMember.display_name,
            email: newMember.email,
            role: newMember.role,
            designation: newMember.designation,
            password: hashedPassword,
            must_change_password: false,
            status: 'active',
            created_at: newMember.created_at,
            updated_at: new Date().toISOString(),
          });
          if (error) {
            console.error('[Auth] Could not save user to Supabase app_users:', error);
            throw new Error(`Database error: ${error.message}`);
          }
        } catch (e: any) {
          console.error('[Auth] Exception saving user to Supabase:', e);
          throw e;
        }
      }

      return newMember;
    },
    []
  );

  // Super Admin: Remove Team Member with Cross-Device Session Termination & Broadcast Alert
  const removeTeamMember = useCallback(
    async (userId: string) => {
      const memberToDelete = teamMembers.find((m) => m.user_id === userId);

      // Strict Role Enforcement: Only Super Admin can delete team accounts
      if (!canDeleteUserAccount(currentRole, memberToDelete?.role || 'member')) {
        throw new Error('Unauthorized: Only Super Admin can delete team accounts.');
      }

      setTeamMembers((prev) => prev.filter((m) => m.user_id !== userId));

      if (isSupabaseConfigured) {
        try {
          await supabase.from('app_users').delete().eq('id', userId);
        } catch (e) {
          console.warn('Could not remove user from Supabase:', e);
        }
      }

      // Broadcast across all PWA instances and open browser tabs
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('accelvia_sync_channel');
          channel.postMessage({
            type: 'USER_DELETED',
            userId,
            deletedName: memberToDelete?.display_name || 'Team Member',
            deletedEmail: memberToDelete?.email || '',
            deletedRole: memberToDelete?.role || 'member',
            deletedBy: currentUser.display_name,
          });
          channel.close();
        } catch (err) {
          console.warn('BroadcastChannel error on removeTeamMember:', err);
        }
      }
    },
    [teamMembers, currentRole, currentUser.display_name]
  );

  // Change Password: Super Admin can update any user; Admin and Member can ONLY update their designated account
  const updateUserPassword = useCallback(
    async (userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
      const trimmed = newPassword.trim();
      const strength = validatePasswordStrength(trimmed);
      if (!strength.valid) {
        return {
          success: false,
          error: strength.error || 'Password does not meet security requirements.',
        };
      }

      // Strict Role Rule: Admin and Member can ONLY update their own designated account
      if (!canUpdateUserPassword(currentRole, userId, currentUser.user_id)) {
        return {
          success: false,
          error: 'Unauthorized: Admins and Members can only update the password for their own designated account.',
        };
      }

      const hashedPassword = await hashPassword(trimmed);

      // Update in Supabase central database
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('app_users')
            .update({
              password: hashedPassword,
              must_change_password: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (error) {
            console.error('Failed to update password in Supabase:', error);
            return { success: false, error: error.message };
          }
        } catch (e: any) {
          console.error('Exception updating user password:', e);
          return { success: false, error: e?.message || 'Failed to update password' };
        }
      }

      // Update in local state with hashed password
      setTeamMembers((prev) =>
        prev.map((m) =>
          m.user_id === userId ? { ...m, password: hashedPassword, must_change_password: false } : m
        )
      );

      // Add audit history
      const targetUser = teamMembers.find((m) => m.user_id === userId);
      addPasswordAuditRecord({
        target_user_id: userId,
        target_user_email: targetUser?.email || currentUser.email,
        performed_by_id: currentUser.user_id,
        performed_by_name: currentUser.display_name,
        performed_by_role: currentRole,
        action: 'password_changed',
        details:
          userId === currentUser.user_id
            ? 'Password updated directly by account owner'
            : `Password directly updated by administrator ${currentUser.display_name}`,
      });

      // If user updated their own password, clear mustChangePassword in session
      if (userId === currentUser.user_id) {
        setSession((prev) => ({
          ...prev,
          mustChangePassword: false,
        }));
      }

      // Broadcast password update notice across tabs (without exposing password)
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const target = teamMembers.find((m) => m.user_id === userId);
          const channel = new BroadcastChannel('accelvia_sync_channel');
          channel.postMessage({
            type: 'PASSWORD_UPDATED',
            userId,
            userName: target?.display_name || currentUser.display_name,
            updatedBy: currentUser.display_name,
          });
          channel.close();
        } catch {}
      }

      return { success: true };
    },
    [currentRole, currentUser, teamMembers, addPasswordAuditRecord]
  );

  // Self-Service: All Admins & Members can change their own name immediately
  const updateDisplayName = useCallback(
    async (newName: string): Promise<{ success: boolean; error?: string }> => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed.length < 2) {
        return { success: false, error: 'Display name must be at least 2 characters long.' };
      }

      setSession((prev) => ({ ...prev, displayName: trimmed }));

      // Update in local team members roster
      setTeamMembers((prev) =>
        prev.map((m) =>
          m.user_id === session.userId || m.email.toLowerCase() === session.email.toLowerCase()
            ? { ...m, display_name: trimmed }
            : m
        )
      );

      // Persist to Supabase app_users table
      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('app_users')
            .update({
              display_name: trimmed,
              updated_at: new Date().toISOString(),
            })
            .eq('id', session.userId);
        } catch (e: any) {
          console.warn('Could not update display name in Supabase:', e);
        }
      }

      return { success: true };
    },
    [session.userId, session.email]
  );

  // Submit request for designation / role change
  const submitDesignationRequest = useCallback(
    async (data: { requestedDesignation: string; requestedRole: UserRole; notes?: string }): Promise<{ success: boolean; error?: string }> => {
      const trimmedDesignation = data.requestedDesignation.trim();
      if (!trimmedDesignation || trimmedDesignation.length < 2) {
        return { success: false, error: 'Please enter a valid requested designation.' };
      }

      const newReq: DesignationRequest = {
        id: `dreq-${Date.now()}`,
        applicant_id: currentUser.user_id,
        applicant_name: currentUser.display_name,
        applicant_email: currentUser.email,
        applicant_role: currentRole,
        current_designation: currentUser.designation || (currentRole === 'admin' ? 'Project Manager' : 'Specialist Engineer'),
        requested_designation: trimmedDesignation,
        requested_role: data.requestedRole || currentRole,
        notes: data.notes?.trim() || '',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setDesignationRequests((prev) => [
        newReq,
        ...prev.filter((r) => !(r.applicant_id === newReq.applicant_id && r.status === 'pending')),
      ]);

      if (isSupabaseConfigured) {
        try {
          await supabase.from('app_designation_requests').insert({
            id: newReq.id,
            applicant_id: newReq.applicant_id,
            applicant_name: newReq.applicant_name,
            applicant_email: newReq.applicant_email,
            applicant_role: newReq.applicant_role,
            current_designation: newReq.current_designation,
            requested_designation: newReq.requested_designation,
            requested_role: newReq.requested_role,
            notes: newReq.notes,
            status: 'pending',
            created_at: newReq.created_at,
            updated_at: newReq.updated_at,
          });

          await supabase.from('app_users').update({
            requested_designation: newReq.requested_designation,
            requested_role: newReq.requested_role,
            updated_at: new Date().toISOString(),
          }).eq('id', currentUser.user_id);
        } catch (e: any) {
          console.warn('Could not insert designation request:', e);
        }
      }

      setTeamMembers((prev) =>
        prev.map((m) =>
          m.user_id === currentUser.user_id
            ? { ...m, requested_designation: newReq.requested_designation, requested_role: newReq.requested_role }
            : m
        )
      );

      return { success: true };
    },
    [currentUser, currentRole]
  );

  // Approve designation request — with STRICT self-approval restriction
  const approveDesignationRequest = useCallback(
    async (requestId: string): Promise<{ success: boolean; error?: string }> => {
      const targetReq = designationRequests.find((r) => r.id === requestId);
      if (!targetReq) {
        return { success: false, error: 'Designation request not found.' };
      }

      // 🚨 CRITICAL RULE: The admin CANNOT approve their own designation request!
      // It must be approved by ANOTHER admin or a Super Admin!
      if (!isSuperAdmin && targetReq.applicant_id === currentUser.user_id) {
        return {
          success: false,
          error: 'Self-approval is strictly restricted. An Admin designation request must be reviewed and authorized by another Admin or a Super Admin.',
        };
      }

      const updatedReq: DesignationRequest = {
        ...targetReq,
        status: 'approved',
        reviewed_by_id: currentUser.user_id,
        reviewed_by_name: currentUser.display_name,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setDesignationRequests((prev) =>
        prev.map((r) => (r.id === requestId ? updatedReq : r))
      );

      if (isSupabaseConfigured) {
        try {
          await supabase.from('app_designation_requests').update({
            status: 'approved',
            reviewed_by_id: currentUser.user_id,
            reviewed_by_name: currentUser.display_name,
            reviewed_at: updatedReq.reviewed_at,
            updated_at: updatedReq.updated_at,
          }).eq('id', requestId);

          await supabase.from('app_users').update({
            designation: targetReq.requested_designation,
            role: targetReq.requested_role,
            requested_designation: null,
            requested_role: null,
            updated_at: new Date().toISOString(),
          }).eq('id', targetReq.applicant_id);
        } catch (e: any) {
          console.warn('Could not approve designation in Supabase:', e);
        }
      }

      setTeamMembers((prev) =>
        prev.map((m) =>
          m.user_id === targetReq.applicant_id
            ? {
                ...m,
                designation: targetReq.requested_designation,
                role: targetReq.requested_role,
                requested_designation: undefined,
                requested_role: undefined,
              }
            : m
        )
      );

      if (targetReq.applicant_id === currentUser.user_id) {
        setSession((prev) => ({
          ...prev,
          role: targetReq.requested_role,
          designation: targetReq.requested_designation,
        }));
      }

      return { success: true };
    },
    [designationRequests, isSuperAdmin, currentUser]
  );

  // Reject designation request
  const rejectDesignationRequest = useCallback(
    async (requestId: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
      const targetReq = designationRequests.find((r) => r.id === requestId);
      if (!targetReq) {
        return { success: false, error: 'Designation request not found.' };
      }

      // Self-rejection/manipulation guard
      if (!isSuperAdmin && targetReq.applicant_id === currentUser.user_id) {
        return {
          success: false,
          error: 'An Admin cannot reject their own designation request.',
        };
      }

      const updatedReq: DesignationRequest = {
        ...targetReq,
        status: 'rejected',
        notes: reason ? `${targetReq.notes || ''} [Rejected: ${reason}]`.trim() : targetReq.notes,
        reviewed_by_id: currentUser.user_id,
        reviewed_by_name: currentUser.display_name,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setDesignationRequests((prev) =>
        prev.map((r) => (r.id === requestId ? updatedReq : r))
      );

      if (isSupabaseConfigured) {
        try {
          await supabase.from('app_designation_requests').update({
            status: 'rejected',
            notes: updatedReq.notes,
            reviewed_by_id: currentUser.user_id,
            reviewed_by_name: currentUser.display_name,
            reviewed_at: updatedReq.reviewed_at,
            updated_at: updatedReq.updated_at,
          }).eq('id', requestId);

          await supabase.from('app_users').update({
            requested_designation: null,
            requested_role: null,
            updated_at: new Date().toISOString(),
          }).eq('id', targetReq.applicant_id);
        } catch (e: any) {
          console.warn('Could not reject designation in Supabase:', e);
        }
      }

      setTeamMembers((prev) =>
        prev.map((m) =>
          m.user_id === targetReq.applicant_id
            ? { ...m, requested_designation: undefined, requested_role: undefined }
            : m
        )
      );

      return { success: true };
    },
    [designationRequests, isSuperAdmin, currentUser]
  );

  // Super Admin direct designation update
  const superAdminUpdateUserDesignation = useCallback(
    async (userId: string, designation: string, role?: UserRole): Promise<{ success: boolean; error?: string }> => {
      const trimmed = designation.trim();
      if (!trimmed) return { success: false, error: 'Designation cannot be empty.' };

      if (isSupabaseConfigured) {
        try {
          const updatePayload: Record<string, any> = {
            designation: trimmed,
            updated_at: new Date().toISOString(),
          };
          if (role) updatePayload.role = role;

          await supabase.from('app_users').update(updatePayload).eq('id', userId);
        } catch (e: any) {
          console.warn('Could not directly update designation in Supabase:', e);
          return { success: false, error: e?.message || 'Database error' };
        }
      }

      setTeamMembers((prev) =>
        prev.map((m) =>
          m.user_id === userId
            ? { ...m, designation: trimmed, ...(role ? { role } : {}) }
            : m
        )
      );

      if (userId === currentUser.user_id) {
        setSession((prev) => ({
          ...prev,
          designation: trimmed,
          ...(role ? { role } : {}),
        }));
      }

      return { success: true };
    },
    [currentUser.user_id]
  );

  // --------------------------------------------------------------------------
  // TASK 2: PASSWORD MANAGEMENT & APPROVAL WORKFLOW
  // --------------------------------------------------------------------------

  // 1. Submit Forgot Password Request (From Public Login Screen)
  const submitForgotPasswordRequest = useCallback(
    async (email: string): Promise<{ success: boolean; message: string }> => {
      const normalizedEmail = email.trim().toLowerCase();
      const genericConfirmation =
        'If an account exists for this email address, a password reset request has been securely submitted for administrative review.';

      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        return { success: true, message: genericConfirmation };
      }

      // Check registered users in local roster or Supabase
      let targetUser = teamMembers.find((m) => m.email.toLowerCase() === normalizedEmail);

      if (!targetUser && isSupabaseConfigured) {
        try {
          const { data } = await supabase
            .from('app_users')
            .select('*')
            .eq('email', normalizedEmail)
            .maybeSingle();

          if (data) {
            targetUser = {
              user_id: data.id,
              display_name: data.display_name,
              email: data.email,
              role: data.role as UserRole,
              status: data.status,
              created_at: data.created_at,
            };
          }
        } catch (e) {
          console.warn('Error checking user for forgot password:', e);
        }
      }

      if (targetUser) {
        // Prevent duplicate pending requests for the same user
        const alreadyPending = passwordResetRequests.some(
          (r) => r.user_id === targetUser!.user_id && r.status === 'pending'
        );

        if (!alreadyPending) {
          const newReq: PasswordResetRequest = {
            id: `pwd-req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            user_id: targetUser.user_id,
            user_email: targetUser.email,
            user_name: targetUser.display_name,
            user_role: targetUser.role,
            request_type: 'forgot_password',
            status: 'pending',
            submitted_at: new Date().toISOString(),
          };

          setPasswordResetRequests((prev) => {
            const updated = [newReq, ...prev];
            upsertWorkspaceKey(SUPABASE_KEY_PASSWORD_REQUESTS, updated);
            return updated;
          });

          addPasswordAuditRecord({
            target_user_id: targetUser.user_id,
            target_user_email: targetUser.email,
            performed_by_id: 'anonymous',
            performed_by_name: 'Forgot Password Portal',
            performed_by_role: targetUser.role,
            action: 'request_submitted',
            details: 'External forgot password reset request submitted for review',
          });
        }
      }

      return { success: true, message: genericConfirmation };
    },
    [teamMembers, passwordResetRequests, addPasswordAuditRecord, upsertWorkspaceKey]
  );

  // 2. Submit Password Change Request (Authenticated Admin/Member Profile)
  const submitPasswordChangeRequest = useCallback(
    async (notes?: string): Promise<{ success: boolean; error?: string }> => {
      if (currentRole === 'super_admin') {
        return { success: false, error: 'Super Admin can update their password directly without approval.' };
      }

      const existingPending = passwordResetRequests.find(
        (r) => r.user_id === currentUser.user_id && r.status === 'pending'
      );

      if (existingPending) {
        return {
          success: false,
          error: 'You already have an active password change request pending approval by management.',
        };
      }

      const newReq: PasswordResetRequest = {
        id: `pwd-req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: currentUser.user_id,
        user_email: currentUser.email,
        user_name: currentUser.display_name,
        user_role: currentRole,
        request_type: 'change_password',
        status: 'pending',
        notes: notes?.trim() || 'Internal password change request',
        submitted_at: new Date().toISOString(),
      };

      setPasswordResetRequests((prev) => {
        const updated = [newReq, ...prev];
        upsertWorkspaceKey(SUPABASE_KEY_PASSWORD_REQUESTS, updated);
        return updated;
      });

      addPasswordAuditRecord({
        target_user_id: currentUser.user_id,
        target_user_email: currentUser.email,
        performed_by_id: currentUser.user_id,
        performed_by_name: currentUser.display_name,
        performed_by_role: currentRole,
        action: 'request_submitted',
        details: notes?.trim() || 'Internal password change request',
      });

      return { success: true };
    },
    [currentRole, currentUser, passwordResetRequests, addPasswordAuditRecord, upsertWorkspaceKey]
  );

  // 3. Approve Password Reset Request (Super Admin or Admin)
  const approvePasswordResetRequest = useCallback(
    async (
      requestId: string,
      customPassword?: string
    ): Promise<{ success: boolean; error?: string; temporaryPassword?: string }> => {
      const targetReq = passwordResetRequests.find((r) => r.id === requestId);
      if (!targetReq) {
        return { success: false, error: 'Password reset request not found.' };
      }

      // Check authorization & strict self-approval guard
      if (
        !canApprovePasswordResetRequest(
          currentRole,
          targetReq.user_role,
          targetReq.user_id,
          currentUser.user_id
        )
      ) {
        return {
          success: false,
          error:
            'Unauthorized: You do not have permission to approve this request (Admins cannot approve their own requests).',
        };
      }

      let temporaryPassword = customPassword?.trim();
      if (temporaryPassword) {
        const strength = validatePasswordStrength(temporaryPassword);
        if (!strength.valid) {
          return {
            success: false,
            error: strength.error || 'Custom password does not meet complexity requirements.',
          };
        }
      } else {
        temporaryPassword = generateSecureTemporaryPassword();
      }

      const hashedTempPassword = await hashPassword(temporaryPassword);

      // Update user in Supabase
      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('app_users')
            .update({
              password: hashedTempPassword,
              must_change_password: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetReq.user_id);
        } catch (e: any) {
          console.warn('Error updating temporary password in Supabase:', e);
        }
      }

      // Update team member in local roster
      setTeamMembers((prev) =>
        prev.map((m) =>
          m.user_id === targetReq.user_id
            ? { ...m, password: hashedTempPassword, must_change_password: true }
            : m
        )
      );

      // Mark request approved
      const updatedReq: PasswordResetRequest = {
        ...targetReq,
        status: 'approved',
        reviewed_by_id: currentUser.user_id,
        reviewed_by_name: currentUser.display_name,
        reviewed_by_role: currentRole,
        reviewed_at: new Date().toISOString(),
        temporary_password_issued: true,
      };

      setPasswordResetRequests((prev) => {
        const updated = prev.map((r) => (r.id === requestId ? updatedReq : r));
        upsertWorkspaceKey(SUPABASE_KEY_PASSWORD_REQUESTS, updated);
        return updated;
      });

      // Record Audit
      addPasswordAuditRecord({
        target_user_id: targetReq.user_id,
        target_user_email: targetReq.user_email,
        performed_by_id: currentUser.user_id,
        performed_by_name: currentUser.display_name,
        performed_by_role: currentRole,
        action: 'request_approved',
        details: `Temporary password generated and previous credentials invalidated by ${currentUser.display_name}`,
      });

      // Broadcast session revocation to forcibly terminate active sessions of this user
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('accelvia_sync_channel');
          channel.postMessage({
            type: 'PASSWORD_RESET_REVOKE',
            userId: targetReq.user_id,
            resetBy: currentUser.display_name,
          });
          channel.close();
        } catch {}
      }

      return { success: true, temporaryPassword };
    },
    [passwordResetRequests, currentRole, currentUser, addPasswordAuditRecord, upsertWorkspaceKey]
  );

  // 4. Reject Password Reset Request
  const rejectPasswordResetRequest = useCallback(
    async (requestId: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
      const targetReq = passwordResetRequests.find((r) => r.id === requestId);
      if (!targetReq) {
        return { success: false, error: 'Password reset request not found.' };
      }

      if (
        !canApprovePasswordResetRequest(
          currentRole,
          targetReq.user_role,
          targetReq.user_id,
          currentUser.user_id
        )
      ) {
        return {
          success: false,
          error: 'Unauthorized: You do not have permission to reject this request.',
        };
      }

      const updatedReq: PasswordResetRequest = {
        ...targetReq,
        status: 'rejected',
        notes: reason ? `${targetReq.notes || ''} [Rejected: ${reason}]`.trim() : targetReq.notes,
        reviewed_by_id: currentUser.user_id,
        reviewed_by_name: currentUser.display_name,
        reviewed_by_role: currentRole,
        reviewed_at: new Date().toISOString(),
      };

      setPasswordResetRequests((prev) => {
        const updated = prev.map((r) => (r.id === requestId ? updatedReq : r));
        upsertWorkspaceKey(SUPABASE_KEY_PASSWORD_REQUESTS, updated);
        return updated;
      });

      addPasswordAuditRecord({
        target_user_id: targetReq.user_id,
        target_user_email: targetReq.user_email,
        performed_by_id: currentUser.user_id,
        performed_by_name: currentUser.display_name,
        performed_by_role: currentRole,
        action: 'request_rejected',
        details: reason || 'Password request rejected by administrator',
      });

      return { success: true };
    },
    [passwordResetRequests, currentRole, currentUser, addPasswordAuditRecord, upsertWorkspaceKey]
  );

  // 5. Super Admin Direct Reset
  const superAdminResetUserPassword = useCallback(
    async (
      userId: string,
      customPassword?: string
    ): Promise<{ success: boolean; error?: string; temporaryPassword?: string }> => {
      if (!isSuperAdmin) {
        return { success: false, error: 'Only Super Admin can directly reset user passwords.' };
      }

      const target = teamMembers.find((m) => m.user_id === userId);
      if (!target) {
        return { success: false, error: 'User account not found.' };
      }

      let temporaryPassword = customPassword?.trim();
      if (temporaryPassword) {
        const strength = validatePasswordStrength(temporaryPassword);
        if (!strength.valid) {
          return {
            success: false,
            error: strength.error || 'Password does not meet complexity requirements.',
          };
        }
      } else {
        temporaryPassword = generateSecureTemporaryPassword();
      }

      const hashedTempPassword = await hashPassword(temporaryPassword);

      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('app_users')
            .update({
              password: hashedTempPassword,
              must_change_password: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        } catch (e) {
          console.warn('Error setting temp password in Supabase:', e);
        }
      }

      setTeamMembers((prev) =>
        prev.map((m) =>
          m.user_id === userId
            ? { ...m, password: hashedTempPassword, must_change_password: true }
            : m
        )
      );

      addPasswordAuditRecord({
        target_user_id: target.user_id,
        target_user_email: target.email,
        performed_by_id: currentUser.user_id,
        performed_by_name: currentUser.display_name,
        performed_by_role: 'super_admin',
        action: 'password_reset_direct',
        details: `Direct administrative reset initiated by Super Admin ${currentUser.display_name}`,
      });

      // Broadcast session revocation
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const channel = new BroadcastChannel('accelvia_sync_channel');
          channel.postMessage({
            type: 'PASSWORD_RESET_REVOKE',
            userId,
            resetBy: currentUser.display_name,
          });
          channel.close();
        } catch {}
      }

      return { success: true, temporaryPassword };
    },
    [isSuperAdmin, teamMembers, currentUser, addPasswordAuditRecord]
  );

  // 6. Complete Mandatory Temporary Password Change on First Login
  const completeTemporaryPasswordChange = useCallback(
    async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
      const trimmed = newPassword.trim();
      const strength = validatePasswordStrength(trimmed);
      if (!strength.valid) {
        return {
          success: false,
          error: strength.error || 'Password does not meet security requirements.',
        };
      }

      const hashedPassword = await hashPassword(trimmed);

      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('app_users')
            .update({
              password: hashedPassword,
              must_change_password: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', currentUser.user_id);
        } catch (e: any) {
          console.warn('Error clearing must_change_password in Supabase:', e);
        }
      }

      setTeamMembers((prev) =>
        prev.map((m) =>
          m.user_id === currentUser.user_id
            ? { ...m, password: hashedPassword, must_change_password: false }
            : m
        )
      );

      setSession((prev) => ({
        ...prev,
        mustChangePassword: false,
      }));

      addPasswordAuditRecord({
        target_user_id: currentUser.user_id,
        target_user_email: currentUser.email,
        performed_by_id: currentUser.user_id,
        performed_by_name: currentUser.display_name,
        performed_by_role: currentRole,
        action: 'password_changed',
        details: 'User successfully replaced temporary password with new permanent password',
      });

      return { success: true };
    },
    [currentUser, currentRole, addPasswordAuditRecord]
  );

  const value = useMemo(
    () => ({
      isAuthenticated: session.isAuthenticated,
      currentUser,
      currentRole,
      setRole,
      isSuperAdmin,
      isAdmin,
      isMember,
      canViewMoney,
      canManageUsers,
      canAccessAudit,
      canCorrectEventTime,
      isSuperAdminRegistered,
      superAdminProfile,
      registerSuperAdmin,
      registerUser,
      resetSuperAdminSetup,
      pendingRegistrations,
      approveRegistration,
      rejectRegistration,
      updateDisplayName,
      designationRequests,
      pendingDesignationRequests,
      submitDesignationRequest,
      approveDesignationRequest,
      rejectDesignationRequest,
      superAdminUpdateUserDesignation,
      loginWithCredentials,
      loginAsRole,
      loginWithGoogleGmail,
      loginWithGoogle,
      logout,
      teamMembers: roleGatedTeamMembers,
      addTeamMember,
      removeTeamMember,
      updateUserPassword,
      // Task 2: Password Management & Reset Requests
      passwordResetRequests,
      pendingPasswordRequests,
      passwordAuditHistory,
      submitForgotPasswordRequest,
      submitPasswordChangeRequest,
      approvePasswordResetRequest,
      rejectPasswordResetRequest,
      completeTemporaryPasswordChange,
      superAdminResetUserPassword,
      mustChangePassword: Boolean(session.mustChangePassword),
    }),
    [
      session.isAuthenticated,
      session.mustChangePassword,
      currentUser,
      currentRole,
      setRole,
      isSuperAdmin,
      isAdmin,
      isMember,
      canViewMoney,
      canManageUsers,
      canAccessAudit,
      canCorrectEventTime,
      isSuperAdminRegistered,
      superAdminProfile,
      registerSuperAdmin,
      registerUser,
      resetSuperAdminSetup,
      pendingRegistrations,
      approveRegistration,
      rejectRegistration,
      updateDisplayName,
      designationRequests,
      pendingDesignationRequests,
      submitDesignationRequest,
      approveDesignationRequest,
      rejectDesignationRequest,
      superAdminUpdateUserDesignation,
      loginWithCredentials,
      loginAsRole,
      loginWithGoogleGmail,
      loginWithGoogle,
      logout,
      roleGatedTeamMembers,
      addTeamMember,
      removeTeamMember,
      updateUserPassword,
      passwordResetRequests,
      pendingPasswordRequests,
      passwordAuditHistory,
      submitForgotPasswordRequest,
      submitPasswordChangeRequest,
      approvePasswordResetRequest,
      rejectPasswordResetRequest,
      completeTemporaryPasswordChange,
      superAdminResetUserPassword,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
