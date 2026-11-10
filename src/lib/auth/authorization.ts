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
 * Password Security: As per Google L5 enterprise security requirements,
 * existing user passwords and password hashes can NEVER be viewed by any role,
 * including Super Admin.
 */
export function canViewUserPassword(
  _viewerRole: UserRole,
  _targetUserId?: string,
  _currentUserId?: string
): boolean {
  return false;
}

/**
 * Super Admin can update/reset any user's password directly.
 * Admin can manage/reset Member passwords.
 * Members cannot independently update/reset without authorized workflow.
 */
export function canUpdateUserPassword(
  viewerRole: UserRole,
  targetUserId: string,
  currentUserId: string,
  targetUserRole?: UserRole
): boolean {
  if (viewerRole === 'super_admin') return true;
  if (viewerRole === 'admin') {
    // Admin can manage members, but cannot manage other admins or super admin
    if (targetUserRole === 'member') return true;
    return targetUserId === currentUserId;
  }
  return false;
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

// ============================================================================
// TASK 1: COMPANY NAME MANAGEMENT RBAC
// ============================================================================

/**
 * Admins and Super Admins can submit company name change requests.
 * Members cannot submit company name requests.
 */
export function canSubmitCompanyNameRequest(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin';
}

/**
 * Only Super Admin can approve company name requests.
 * Admins CANNOT approve their own or any other request.
 */
export function canApproveCompanyNameRequest(role: UserRole): boolean {
  return role === 'super_admin';
}

/**
 * Only Super Admin can reject company name requests.
 */
export function canRejectCompanyNameRequest(role: UserRole): boolean {
  return role === 'super_admin';
}

/**
 * Only Super Admin can directly update the global active company name.
 */
export function canDirectlyUpdateCompanyName(role: UserRole): boolean {
  return role === 'super_admin';
}

/**
 * Only Super Admin can delete company name request/history entries.
 */
export function canDeleteCompanyNameRequest(role: UserRole): boolean {
  return role === 'super_admin';
}

/**
 * Only Super Admin can view all submitted company name requests.
 * Admins can only view requests they submitted.
 */
export function canViewAllCompanyNameRequests(role: UserRole): boolean {
  return role === 'super_admin';
}

// ============================================================================
// TASK 2: PASSWORD MANAGEMENT & RESET RBAC
// ============================================================================

/**
 * Super Admin manages Admin password change & reset requests.
 * Admins cannot view or manage Admin requests.
 */
export function canManageAdminPasswordRequests(viewerRole: UserRole): boolean {
  return viewerRole === 'super_admin';
}

/**
 * Both Super Admin and Admin can manage Member password change & reset requests.
 * Members have no management authority.
 */
export function canManageMemberPasswordRequests(viewerRole: UserRole): boolean {
  return viewerRole === 'super_admin' || viewerRole === 'admin';
}

/**
 * Enforces authorization for approving or resetting a specific target request.
 */
export function canApprovePasswordResetRequest(
  viewerRole: UserRole,
  requesterRole: UserRole,
  viewerUserId: string,
  requesterUserId: string
): boolean {
  // Self-approval restriction: Nobody can approve their own password request
  if (viewerUserId === requesterUserId) return false;

  if (requesterRole === 'super_admin') return false; // Root SA handled through master setup
  if (requesterRole === 'admin') {
    return viewerRole === 'super_admin'; // Only Super Admin can approve Admin
  }
  if (requesterRole === 'member') {
    return viewerRole === 'super_admin' || viewerRole === 'admin'; // Admin or Super Admin
  }
  return false;
}

