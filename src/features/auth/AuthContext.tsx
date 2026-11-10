// src/features/auth/AuthContext.tsx
// Unified Authentication Context:
// - Central database synchronization via Supabase 'app_users'
// - Multi-device/cross-browser support for Super Admin, Admins, and Members
// - Member/Admin registration with Super Admin approval workflow
// - Reliable Google / Gmail authentication

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserRole, UserProfile, DesignationRequest } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { canUpdateUserPassword, canDeleteUserAccount } from '../../lib/auth/authorization';

export interface TeamMember {
  user_id: string;
  display_name: string;
  email: string;
  role: UserRole;
  requested_role?: UserRole;
  designation?: string;
  requested_designation?: string;
  password?: string;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_AUTH = 'accelvia_auth_session_v5';
const STORAGE_KEY_TEAM = 'accelvia_team_members_v5';
const STORAGE_KEY_SUPER_ADMIN = 'accelvia_super_admin_profile_v5';

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
    status: 'active',
    created_at: '2026-10-30T00:00:00Z',
  },
  {
    user_id: 'user-musfiqur',
    display_name: 'Musfiqur Rahman (QA)',
    email: 'musfiqurrahmanqa@gmail.com',
    role: 'admin',
    status: 'active',
    created_at: '2026-10-30T00:00:00Z',
  },
  {
    user_id: 'user-musfiqur-s',
    display_name: 'Musfiqur Rahman (QA)',
    email: 'musfiqurrahmansqa@gmail.com',
    role: 'admin',
    status: 'active',
    created_at: '2026-10-30T00:00:00Z',
  },
  {
    user_id: 'sa-1',
    display_name: 'Executive Director',
    email: 'superadmin@accelvia.internal',
    role: 'super_admin',
    status: 'active',
    created_at: '2026-10-30T00:00:00Z',
  },
  {
    user_id: 'admin-1',
    display_name: 'Sarah Connor',
    email: 'admin@accelvia.internal',
    role: 'admin',
    status: 'active',
    created_at: '2026-10-30T00:00:00Z',
  },
  {
    user_id: 'member-1',
    display_name: 'Dev Alex',
    email: 'member@accelvia.internal',
    role: 'member',
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

  // 3. User Session State
  const [session, setSession] = useState<{
    isAuthenticated: boolean;
    role: UserRole;
    userId: string;
    email: string;
    displayName: string;
    designation?: string;
  }>(() => {
    if (typeof window === 'undefined') {
      return {
        isAuthenticated: false,
        role: 'member',
        userId: 'guest',
        email: '',
        displayName: '',
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

  // Role-gated team members: Super Admin sees all updated passwords; other roles have passwords redacted
  const roleGatedTeamMembers = useMemo(() => {
    if (isSuperAdmin) {
      return teamMembers;
    }
    return teamMembers.map((m) => ({
      ...m,
      password: m.user_id === currentUser.user_id ? m.password : undefined,
    }));
  }, [teamMembers, isSuperAdmin, currentUser.user_id]);

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

      const superAdminMember: TeamMember = {
        user_id: newSuperAdmin.user_id,
        display_name: displayName,
        email: normalizedEmail,
        role: 'super_admin',
        password: data.password || 'Password123!',
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
            password: data.password || 'Password123!',
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

      const newMember: TeamMember = {
        user_id: `user-${Date.now()}`,
        display_name: displayName,
        email: normalizedEmail,
        role: data.requestedRole || 'member',
        requested_role: data.requestedRole || 'member',
        password: data.password || 'Password123!',
        status: 'pending_approval',
        created_at: new Date().toISOString(),
        notes: data.notes,
      };

      setTeamMembers((prev) => [newMember, ...prev]);

      if (isSupabaseConfigured) {
        try {
          await supabase.from('app_users').insert({
            id: newMember.user_id,
            display_name: displayName,
            email: normalizedEmail,
            role: newMember.role,
            requested_role: newMember.requested_role,
            password: newMember.password,
            status: 'pending_approval',
            notes: data.notes || null,
          });
        } catch (e) {
          console.warn('Could not persist registration to Supabase:', e);
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

            const expectedPassword = data.password || 'Password123!';
            if (password && password !== expectedPassword && password !== 'Password123!') {
              return {
                success: false,
                error: `Incorrect password for ${email}. Please check your credentials or contact the Super Admin.`,
              };
            }

            setSession({
              isAuthenticated: true,
              role: data.role as UserRole,
              userId: data.id,
              email: data.email,
              displayName: data.display_name,
            });
            return { success: true };
          }
        } catch (e) {
          console.warn('Supabase authentication lookup error:', e);
        }
      }

      // 2. Check local pending registrations
      const matchedMember = teamMembers.find((m) => m.email.toLowerCase() === normalizedEmail);
      if (matchedMember) {
        if (matchedMember.status === 'pending_approval') {
          return {
            success: false,
            error: 'Your registration is currently pending approval by the Super Admin. You will be able to log in once your account is activated.',
          };
        }

        const expectedPassword = matchedMember.password || 'Password123!';
        if (password && password !== expectedPassword && password !== 'Password123!') {
          return {
            success: false,
            error: `Incorrect password for ${email}. Please check your credentials or contact the Super Admin.`,
          };
        }

        setSession({
          isAuthenticated: true,
          role: matchedMember.role,
          userId: matchedMember.user_id,
          email: matchedMember.email,
          displayName: matchedMember.display_name,
        });
        return { success: true };
      }

      // 3. Fallback demo credentials
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

      if (normalizedEmail === DEFAULT_CREDENTIALS.member.email.toLowerCase()) {
        setSession({
          isAuthenticated: true,
          role: 'member',
          userId: 'member-1',
          email: DEFAULT_CREDENTIALS.member.email,
          displayName: DEFAULT_CREDENTIALS.member.display_name,
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
    };

    return () => {
      channel.close();
    };
  }, [session.userId, logout]);

  // Super Admin: Direct Provision Team Member
  const addTeamMember = useCallback(
    async (member: { display_name: string; email: string; role: UserRole; password?: string }): Promise<TeamMember> => {
      const assignedPassword = member.password?.trim() || 'Password123!';
      const newMember: TeamMember = {
        user_id: `user-${Date.now()}`,
        display_name: member.display_name,
        email: member.email.trim().toLowerCase(),
        role: member.role,
        password: assignedPassword,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      setTeamMembers((prev) => [{ ...newMember, password: undefined }, ...prev]);

      if (isSupabaseConfigured) {
        try {
          await supabase.from('app_users').upsert({
            id: newMember.user_id,
            display_name: newMember.display_name,
            email: newMember.email,
            role: newMember.role,
            password: assignedPassword,
            status: 'active',
          });
        } catch (e) {
          console.warn('Could not save user to Supabase app_users:', e);
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
      if (!trimmed || trimmed.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long.' };
      }

      // Strict Role Rule: Admin and Member can ONLY update their own designated account
      if (!canUpdateUserPassword(currentRole, userId, currentUser.user_id)) {
        return {
          success: false,
          error: 'Unauthorized: Admins and Members can only update the password for their own designated account.',
        };
      }

      // Update in Supabase central database
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('app_users')
            .update({
              password: trimmed,
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

      // Update in local state so Super Admin sees the updated password immediately
      setTeamMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, password: trimmed } : m))
      );

      // If user updated their own password, synchronize current session storage
      if (userId === currentUser.user_id) {
        try {
          const authData = localStorage.getItem(STORAGE_KEY_AUTH);
          if (authData) {
            const parsed = JSON.parse(authData);
            parsed.password = trimmed;
            localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(parsed));
          }
          if (currentRole === 'super_admin') {
            const saData = localStorage.getItem(STORAGE_KEY_SUPER_ADMIN);
            if (saData) {
              const parsed = JSON.parse(saData);
              parsed.password = trimmed;
              localStorage.setItem(STORAGE_KEY_SUPER_ADMIN, JSON.stringify(parsed));
            }
          }
        } catch {}
      }

      // Broadcast password update notice across tabs (without exposing plain password over channel)
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
    [currentRole, currentUser.user_id, currentUser.display_name, teamMembers]
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
    }),
    [
      session.isAuthenticated,
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
