// src/lib/auth/authorization.ts
// Central Authorization and Role Governance Rules

import { UserRole } from '../../types';

export function canManageUsers(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canViewFinancialSettings(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canAccessAuditConsole(role: UserRole): boolean {
  return role === 'super_admin';
}

export function canCorrectHistoricalEventTime(role: UserRole): boolean {
  return role === 'super_admin';
}

export function canViewAllProjects(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function canGenerateWorkOrder(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function isEstimateVisibleToViewer(
  estimateStatus: string,
  viewerRole: UserRole
): boolean {
  // Members can only see estimates after approval from the admin
  if (viewerRole === 'member') {
    return estimateStatus === 'approved';
  }
  // Admins and Super Admins can see all statuses (draft, pending, approved, etc.)
  return true;
}

export function filterTeamRosterForViewer<T extends { role: UserRole }>(
  members: T[],
  viewerRole: UserRole
): T[] {
  if (viewerRole === 'super_admin') {
    return members;
  }
  // Admins and Members cannot see Super Admin accounts in the team roster
  return members.filter((m) => m.role !== 'super_admin');
}

export function maskSuperAdminAuthor(
  message: { author_user_id: string; author_role: UserRole; author_display_name: string },
  viewerRole: UserRole
): { author_id: string | null; display_name: string; is_management: boolean } {
  const isSuperAdminAuthor = message.author_role === 'super_admin';

  if (isSuperAdminAuthor) {
    if (viewerRole === 'super_admin') {
      return {
        author_id: message.author_user_id,
        display_name: message.author_display_name,
        is_management: true,
      };
    }
    // Masked for Admins and Members
    return {
      author_id: null,
      display_name: 'Management',
      is_management: true,
    };
  }

  return {
    author_id: message.author_user_id,
    display_name: message.author_display_name,
    is_management: false,
  };
}

export function sanitizeFinancialsForRole<T extends { total_usd_snapshot?: number | null; total_bdt_snapshot?: number | null }>(
  record: T,
  viewerRole: UserRole
): Omit<T, 'total_usd_snapshot' | 'total_bdt_snapshot'> & Partial<Pick<T, 'total_usd_snapshot' | 'total_bdt_snapshot'>> {
  if (viewerRole === 'member') {
    const sanitized = { ...record };
    delete sanitized.total_usd_snapshot;
    delete sanitized.total_bdt_snapshot;
    return sanitized;
  }
  return record;
}

/**
 * Super Admin can see (reveal/view) all users' passwords.
 * Non-Super Admins (Admin, Member) can only see their own designated account password.
 */
export function canViewUserPassword(
  viewerRole: UserRole,
  targetUserId: string,
  currentUserId: string
): boolean {
  if (viewerRole === 'super_admin') return true;
  return targetUserId === currentUserId;
}

/**
 * Super Admin can update any user's password.
 * Admin and Member can ONLY update the password for their own designated account.
 */
export function canUpdateUserPassword(
  viewerRole: UserRole,
  targetUserId: string,
  currentUserId: string
): boolean {
  if (viewerRole === 'super_admin') return true;
  return targetUserId === currentUserId;
}

/**
 * Only Super Admin can delete team accounts (Admin or Member).
 * Root Super Admin cannot be deleted.
 */
export function canDeleteUserAccount(
  viewerRole: UserRole,
  targetRole: UserRole
): boolean {
  if (viewerRole !== 'super_admin') return false;
  return targetRole !== 'super_admin';
}
