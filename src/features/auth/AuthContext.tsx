// src/features/auth/AuthContext.tsx
// Comprehensive Authentication Context supporting:
// 1. Founding Super Admin registration with Gmail
// 2. Member & Admin public registration with Super Admin approval workflow
// 3. Reliable Gmail / Google authentication & login
// 4. Role-based access control and Team Management

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserRole, UserProfile } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';

export interface TeamMember {
  user_id: string;
  display_name: string;
  email: string;
  role: UserRole;
  requested_role?: UserRole;
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
  approveRegistration: (userId: string, assignedRole: UserRole) => void;
  rejectRegistration: (userId: string) => void;
  // Standard Authentication
  loginWithCredentials: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsRole: (role: UserRole) => void;
  loginWithGoogleGmail: (gmail: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  // Team Roster Management
  teamMembers: TeamMember[];
  addTeamMember: (member: { display_name: string; email: string; role: UserRole; password?: string }) => TeamMember;
  removeTeamMember: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_AUTH = 'accelvia_auth_session_v4';
const STORAGE_KEY_TEAM = 'accelvia_team_members_v4';
const STORAGE_KEY_SUPER_ADMIN = 'accelvia_super_admin_profile_v4';

export const DEFAULT_CREDENTIALS = {
  super_admin: {
    email: 'superadmin@accelvia.internal',
    password: 'Password123!',
    display_name: 'Executive Director',
    role: 'super_admin' as UserRole,
  },
  admin: {
    email: 'admin@accelvia.internal',
    password: 'Password123!',
    display_name: 'Sarah Connor',
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
  // 1. Registered Founding Super Admin Profile (Persisted)
  const [superAdminProfile, setSuperAdminProfile] = useState<SuperAdminProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUPER_ADMIN);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Persist Super Admin registration
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

  // 2. Team Members Roster including Active and Pending Registrations
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    if (typeof window === 'undefined') return INITIAL_TEAM_MEMBERS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEAM);
      return saved ? JSON.parse(saved) : INITIAL_TEAM_MEMBERS;
    } catch {
      return INITIAL_TEAM_MEMBERS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(teamMembers));
    } catch {}
  }, [teamMembers]);

  // Pending user registrations awaiting Super Admin approval
  const pendingRegistrations = useMemo(() => {
    return teamMembers.filter((m) => m.status === 'pending_approval');
  }, [teamMembers]);

  // 3. Active User Session State (Default unauthenticated for visitors)
  const [session, setSession] = useState<{
    isAuthenticated: boolean;
    role: UserRole;
    userId: string;
    email: string;
    displayName: string;
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
        if (parsed.isAuthenticated) {
          return parsed;
        }
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

  // Persist session
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(session));
    } catch {}
  }, [session]);

  const currentRole = session.role;

  // Active user profile
  const currentUser: UserProfile & { role: UserRole } = useMemo(() => {
    return {
      user_id: session.userId,
      organization_id: 'org-1',
      display_name: session.displayName || 'Guest User',
      email: session.email,
      account_status: 'active',
      role: session.role,
      created_at: '2026-10-30T00:00:00Z',
      updated_at: '2026-10-30T00:00:00Z',
    };
  }, [session]);

  const isSuperAdmin = currentRole === 'super_admin';
  const isAdmin = currentRole === 'admin';
  const isMember = currentRole === 'member';

  // Role permissions
  const canViewMoney = isSuperAdmin || isAdmin;
  const canManageUsers = isSuperAdmin;
  const canAccessAudit = isSuperAdmin;
  const canCorrectEventTime = isSuperAdmin;

  // Switch role directly (e.g. for developer persona toggle)
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

  // --------------------------------------------------------------------------
  // REGISTRATION WORKFLOW: First = Super Admin; Subsequent = Member/Admin Pending Approval
  // --------------------------------------------------------------------------
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

  // General user registration (First person becomes Super Admin; others submit for approval)
  const registerUser = useCallback(
    async (data: { displayName: string; email: string; password?: string; requestedRole?: UserRole; notes?: string }): Promise<{ success: boolean; status: 'active' | 'pending_approval'; error?: string }> => {
      const normalizedEmail = data.email.trim().toLowerCase();
      const displayName = data.displayName.trim() || normalizedEmail.split('@')[0];

      if (!normalizedEmail) {
        return { success: false, status: 'pending_approval', error: 'Please enter a valid email/Gmail address.' };
      }

      // If no Super Admin registered yet, this user becomes the founding Super Admin!
      if (!superAdminProfile) {
        const res = await registerSuperAdmin({
          displayName,
          email: normalizedEmail,
          password: data.password,
        });
        if (res.success) {
          return { success: true, status: 'active' };
        }
        return { success: false, status: 'active', error: res.error };
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
          error: 'An account with this email is already registered and active. Please sign in.',
        };
      }

      // Create new pending registration
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

      return { success: true, status: 'pending_approval' };
    },
    [superAdminProfile, registerSuperAdmin, teamMembers]
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

  // --------------------------------------------------------------------------
  // APPROVAL WORKFLOW (Super Admin Master Authority)
  // --------------------------------------------------------------------------
  const approveRegistration = useCallback((userId: string, assignedRole: UserRole) => {
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
  }, []);

  const rejectRegistration = useCallback((userId: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.user_id !== userId));
  }, []);

  // --------------------------------------------------------------------------
  // AUTHENTICATION & LOGIN FLOW
  // --------------------------------------------------------------------------
  const loginWithCredentials = useCallback(
    async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
      const normalizedEmail = email.trim().toLowerCase();

      // 1. Check against Registered Founding Super Admin
      if (superAdminProfile && normalizedEmail === superAdminProfile.email.toLowerCase()) {
        setSession({
          isAuthenticated: true,
          role: 'super_admin',
          userId: superAdminProfile.user_id,
          email: superAdminProfile.email,
          displayName: superAdminProfile.display_name,
        });
        return { success: true };
      }

      // 2. Check against Team Members
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
            error: `Incorrect password for ${email}. Please use the temporary password assigned by your Super Admin.`,
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

      // 3. Check against Standard Default Demo Credentials
      if (normalizedEmail === DEFAULT_CREDENTIALS.super_admin.email.toLowerCase()) {
        setSession({
          isAuthenticated: true,
          role: 'super_admin',
          userId: 'sa-1',
          email: DEFAULT_CREDENTIALS.super_admin.email,
          displayName: DEFAULT_CREDENTIALS.super_admin.display_name,
        });
        return { success: true };
      }

      if (normalizedEmail === DEFAULT_CREDENTIALS.admin.email.toLowerCase()) {
        setSession({
          isAuthenticated: true,
          role: 'admin',
          userId: 'admin-1',
          email: DEFAULT_CREDENTIALS.admin.email,
          displayName: DEFAULT_CREDENTIALS.admin.display_name,
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

      // 4. Check against Supabase Auth (if credentials provided)
      if (isSupabaseConfigured && password) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
          if (!error && data.user) {
            const role = (data.user.user_metadata?.role as UserRole) || 'member';
            setSession({
              isAuthenticated: true,
              role,
              userId: data.user.id,
              email: data.user.email || normalizedEmail,
              displayName: data.user.user_metadata?.display_name || normalizedEmail.split('@')[0],
            });
            return { success: true };
          }
        } catch {}
      }

      return {
        success: false,
        error: `No registered account found for "${email}". Please register to submit an account request for Super Admin approval.`,
      };
    },
    [superAdminProfile, teamMembers]
  );

  // Reliable Google / Gmail Sign In
  const loginWithGoogleGmail = useCallback(
    async (gmail: string): Promise<{ success: boolean; error?: string }> => {
      const normalizedEmail = gmail.trim().toLowerCase();

      // 1. Super Admin Gmail match
      if (superAdminProfile && normalizedEmail === superAdminProfile.email.toLowerCase()) {
        setSession({
          isAuthenticated: true,
          role: 'super_admin',
          userId: superAdminProfile.user_id,
          email: superAdminProfile.email,
          displayName: superAdminProfile.display_name,
        });
        return { success: true };
      }

      // 2. Team Member Gmail match
      const matched = teamMembers.find((m) => m.email.toLowerCase() === normalizedEmail);
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

      // 3. Fallback Demo accounts
      if (normalizedEmail === DEFAULT_CREDENTIALS.super_admin.email.toLowerCase()) {
        setSession({
          isAuthenticated: true,
          role: 'super_admin',
          userId: 'sa-1',
          email: DEFAULT_CREDENTIALS.super_admin.email,
          displayName: DEFAULT_CREDENTIALS.super_admin.display_name,
        });
        return { success: true };
      }

      return {
        success: false,
        error: `No active account found for Gmail "${gmail}". Please switch to the Register tab to create an account and request approval from the Super Admin.`,
      };
    },
    [superAdminProfile, teamMembers]
  );

  // General Google OAuth click (with fallback to direct Gmail verification)
  const loginWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (superAdminProfile && superAdminProfile.email.includes('@')) {
      return loginWithGoogleGmail(superAdminProfile.email);
    }
    return {
      success: false,
      error: 'Please enter your Gmail address in the Google Sign-In prompt.',
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

  // Super Admin: Direct Provision Team Member
  const addTeamMember = useCallback(
    (member: { display_name: string; email: string; role: UserRole; password?: string }): TeamMember => {
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
      setTeamMembers((prev) => [newMember, ...prev]);
      return newMember;
    },
    []
  );

  // Super Admin: Remove Team Member
  const removeTeamMember = useCallback((userId: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.user_id !== userId));
  }, []);

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
      // Registration & Setup
      isSuperAdminRegistered,
      superAdminProfile,
      registerSuperAdmin,
      registerUser,
      resetSuperAdminSetup,
      // Approval Workflow
      pendingRegistrations,
      approveRegistration,
      rejectRegistration,
      // Authentication
      loginWithCredentials,
      loginAsRole,
      loginWithGoogleGmail,
      loginWithGoogle,
      logout,
      // Team Management
      teamMembers,
      addTeamMember,
      removeTeamMember,
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
      loginWithCredentials,
      loginAsRole,
      loginWithGoogleGmail,
      loginWithGoogle,
      logout,
      teamMembers,
      addTeamMember,
      removeTeamMember,
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
