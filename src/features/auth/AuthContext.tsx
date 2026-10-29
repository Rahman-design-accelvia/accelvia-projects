// src/features/auth/AuthContext.tsx
// Authentication and role context with active session and developer role switcher

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, UserProfile } from '../../types';
import { SEED_USERS } from '../../lib/supabase/client';

interface AuthContextType {
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to Super Admin for initial development exploration
  const [currentRole, setCurrentRole] = useState<UserRole>('super_admin');

  const userMap: Record<UserRole, UserProfile & { role: UserRole }> = {
    super_admin: SEED_USERS['sa-1'],
    admin: SEED_USERS['admin-1'],
    member: SEED_USERS['member-1'],
  };

  const currentUser = userMap[currentRole];

  const isSuperAdmin = currentRole === 'super_admin';
  const isAdmin = currentRole === 'admin';
  const isMember = currentRole === 'member';

  // Security bounds
  const canViewMoney = isSuperAdmin || isAdmin;
  const canManageUsers = isSuperAdmin;
  const canAccessAudit = isSuperAdmin;
  const canCorrectEventTime = isSuperAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        setRole: setCurrentRole,
        isSuperAdmin,
        isAdmin,
        isMember,
        canViewMoney,
        canManageUsers,
        canAccessAudit,
        canCorrectEventTime,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
