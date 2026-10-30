// src/features/auth/AuthContext.tsx
// Comprehensive Authentication Context supporting First Super Admin Registration with Gmail,
// Team Management, Google OAuth, and Role Authorization

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserRole, UserProfile } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';

export interface TeamMember {
  user_id: string;
  display_name: string;
  email: string;
  role: UserRole;
  password?: string;
  status: 'active' | 'invited';
  created_at: string;
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
  registerWithGoogleAsSuperAdmin: (gmailOverride?: string) => Promise<{ success: boolean; error?: string }>;
  resetSuperAdminSetup: () => void;
  // Standard Authentication
  loginWithCredentials: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsRole: (role: UserRole) => void;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  // Team Roster Management (Super Admin authority)
  teamMembers: TeamMember[];
  addTeamMember: (member: { display_name: string; email: string; role: UserRole; password?: string }) => TeamMember;
  removeTeamMember: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_AUTH = 'accelvia_auth_session_v3';
const STORAGE_KEY_TEAM = 'accelvia_team_members_v3';
const STORAGE_KEY_SUPER_ADMIN = 'accelvia_super_admin_profile_v3';

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

  // 2. Team Members Roster (Persisted)
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

  // 3. Active User Session State (Default unauthenticated so everyone sees login page!)
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
    // Unauthenticated by default for all fresh visitors
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

  // 1-Click Role Login
  const loginAsRole = useCallback((role: UserRole) => {
    setRole(role);
  }, [setRole]);

  // --------------------------------------------------------------------------
  // FIRST-TIME REGISTRATION: Founding Super Admin with Gmail
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

      // Register with Supabase Auth if online
      if (isSupabaseConfigured && data.password) {
        try {
          await supabase.auth.signUp({
            email: normalizedEmail,
            password: data.password,
            options: {
              data: {
                role: 'super_admin',
                display_name: displayName,
              },
            },
          });
        } catch {
          // Fall back gracefully to local persistence
        }
      }

      // Save Super Admin profile
      setSuperAdminProfile(newSuperAdmin);

      // Add to team roster
      const superAdminMember: TeamMember = {
        user_id: newSuperAdmin.user_id,
        display_name: displayName,
        email: normalizedEmail,
        role: 'super_admin',
        status: 'active',
        created_at: newSuperAdmin.created_at,
      };

      setTeamMembers((prev) => [
        superAdminMember,
        ...prev.filter((m) => m.role !== 'super_admin'),
      ]);

      // Automatically sign in as Super Admin
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

  // Register Founding Super Admin with Google (Gmail)
  const registerWithGoogleAsSuperAdmin = useCallback(
    async (gmailOverride?: string): Promise<{ success: boolean; error?: string }> => {
      if (gmailOverride) {
        return registerSuperAdmin({
          displayName: gmailOverride.split('@')[0],
          email: gmailOverride,
        });
      }

      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
              queryParams: {
                access_type: 'offline',
                prompt: 'consent',
              },
            },
          });
          if (error) return { success: false, error: error.message };
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err?.message || 'Google OAuth failed to initialize.' };
        }
      }

      return {
        success: false,
        error: 'Please enter your Gmail address to register as Super Admin.',
      };
    },
    [registerSuperAdmin]
  );

  // Reset workspace setup (allow changing or re-registering Super Admin)
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
  // LOGIN FLOW (For Everyone: Super Admin, Admins, Members)
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

      // 2. Check against Team Members added by Super Admin
      const matchedMember = teamMembers.find((m) => m.email.toLowerCase() === normalizedEmail);
      if (matchedMember) {
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
          if (error) {
            return { success: false, error: error.message };
          }
        } catch (err: any) {
          return { success: false, error: err?.message || 'Authentication failed' };
        }
      }

      return {
        success: false,
        error: `No account found for "${email}". If you are an Admin or Member, please ask your Super Admin to invite your email.`,
      };
    },
    [superAdminProfile, teamMembers]
  );

  // Google OAuth / Gmail Login
  const loginWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    // If Super Admin profile is registered with a Gmail, log in as Super Admin
    if (superAdminProfile && superAdminProfile.email.includes('@')) {
      setSession({
        isAuthenticated: true,
        role: 'super_admin',
        userId: superAdminProfile.user_id,
        email: superAdminProfile.email,
        displayName: superAdminProfile.display_name,
      });
      return { success: true };
    }

    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Supabase URL and Key are required to initiate Google OAuth redirect.',
      };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
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
  }, [superAdminProfile]);

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

  // Super Admin: Add Team Member (Admin or Member)
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
      // First Registration
      isSuperAdminRegistered,
      superAdminProfile,
      registerSuperAdmin,
      registerWithGoogleAsSuperAdmin,
      resetSuperAdminSetup,
      // Authentication
      loginWithCredentials,
      loginAsRole,
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
      registerWithGoogleAsSuperAdmin,
      resetSuperAdminSetup,
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
