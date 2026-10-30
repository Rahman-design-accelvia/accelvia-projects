// src/features/auth/AuthContext.tsx
// Comprehensive Authentication Context supporting Email/Password, Google OAuth, and Role Management

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserRole, UserProfile } from '../../types';
import { SEED_USERS, supabase, isSupabaseConfigured } from '../../lib/supabase/client';

export interface TeamMember {
  user_id: string;
  display_name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'invited';
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
  loginWithCredentials: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsRole: (role: UserRole) => void;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  teamMembers: TeamMember[];
  addTeamMember: (member: { display_name: string; email: string; role: UserRole }) => TeamMember;
  removeTeamMember: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_AUTH = 'accelvia_auth_session_v1';
const STORAGE_KEY_TEAM = 'accelvia_team_members_v1';

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
  // Team members roster (Super Admin can add admins & members)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    if (typeof window === 'undefined') return INITIAL_TEAM_MEMBERS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEAM);
      return saved ? JSON.parse(saved) : INITIAL_TEAM_MEMBERS;
    } catch {
      return INITIAL_TEAM_MEMBERS;
    }
  });

  // Persist team roster
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(teamMembers));
    } catch {}
  }, [teamMembers]);

  // Active Session State
  const [session, setSession] = useState<{
    isAuthenticated: boolean;
    role: UserRole;
    userId: string;
    email: string;
    displayName: string;
  }>(() => {
    if (typeof window === 'undefined') {
      return {
        isAuthenticated: true,
        role: 'super_admin',
        userId: 'sa-1',
        email: 'superadmin@accelvia.internal',
        displayName: 'Executive Director',
      };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    // Default logged in as Super Admin for smooth development
    return {
      isAuthenticated: true,
      role: 'super_admin',
      userId: 'sa-1',
      email: 'superadmin@accelvia.internal',
      displayName: 'Executive Director',
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
      display_name: session.displayName,
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

  // Switch role directly (e.g. for developer preview or user dropdown)
  const setRole = useCallback((newRole: UserRole) => {
    const cred = DEFAULT_CREDENTIALS[newRole];
    setSession({
      isAuthenticated: true,
      role: newRole,
      userId: newRole === 'super_admin' ? 'sa-1' : newRole === 'admin' ? 'admin-1' : 'member-1',
      email: cred.email,
      displayName: cred.display_name,
    });
  }, []);

  // 1-Click Role Login
  const loginAsRole = useCallback((role: UserRole) => {
    setRole(role);
  }, [setRole]);

  // Login with Email & Password
  const loginWithCredentials = useCallback(
    async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
      const normalizedEmail = email.trim().toLowerCase();

      // 1. Check against Default Credentials
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

      // 2. Check against team members added by Super Admin
      const matchedMember = teamMembers.find((m) => m.email.toLowerCase() === normalizedEmail);
      if (matchedMember) {
        setSession({
          isAuthenticated: true,
          role: matchedMember.role,
          userId: matchedMember.user_id,
          email: matchedMember.email,
          displayName: matchedMember.display_name,
        });
        return { success: true };
      }

      // 3. Try Supabase Auth if configured and password is provided
      if (isSupabaseConfigured && password) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
          if (!error && data.user) {
            // Check role from metadata or fallback to member
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
          if (error) {
            return { success: false, error: error.message };
          }
        } catch (err: any) {
          return { success: false, error: err?.message || 'Authentication failed' };
        }
      }

      return {
        success: false,
        error: `No account found for "${email}". Please use standard demo credentials or ask Super Admin to invite your email.`,
      };
    },
    [teamMembers]
  );

  // Google OAuth Login
  const loginWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Supabase URL and Key are required to initiate Google OAuth redirect.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Google OAuth failed to initialize.' };
    }
  }, []);

  // Sign out
  const logout = useCallback(() => {
    setSession({
      isAuthenticated: false,
      role: 'member',
      userId: 'guest',
      email: '',
      displayName: '',
    });
    if (isSupabaseConfigured) {
      supabase.auth.signOut().catch(() => {});
    }
  }, []);

  // Super Admin: Add Team Member (Admin or Member)
  const addTeamMember = useCallback(
    (member: { display_name: string; email: string; role: UserRole }): TeamMember => {
      const newMember: TeamMember = {
        user_id: `user-${Date.now()}`,
        display_name: member.display_name,
        email: member.email.trim().toLowerCase(),
        role: member.role,
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
      loginWithCredentials,
      loginAsRole,
      loginWithGoogle,
      logout,
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
      loginWithCredentials,
      loginAsRole,
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
