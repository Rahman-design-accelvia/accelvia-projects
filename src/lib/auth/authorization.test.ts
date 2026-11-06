// src/lib/auth/authorization.test.ts
import { describe, it, expect } from 'vitest';
import { UserRole, SafeMessage, ProjectFinancialSettings } from '../../types';

// Role capability checks based on ADR 0006 and Section 4 of build spec
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

describe('Role & Permission Authorization Boundary Tests', () => {
  it('allows Super Admin and Admin to add members and admins, denying Member', () => {
    expect(canManageUsers('super_admin')).toBe(true);
    expect(canManageUsers('admin')).toBe(true);
    expect(canManageUsers('member')).toBe(false);
  });

  it('restricts financial settings to Super Admin and Admin, denying Member', () => {
    expect(canViewFinancialSettings('super_admin')).toBe(true);
    expect(canViewFinancialSettings('admin')).toBe(true);
    expect(canViewFinancialSettings('member')).toBe(false);
  });

  it('restricts audit console to Super Admin only', () => {
    expect(canAccessAuditConsole('super_admin')).toBe(true);
    expect(canAccessAuditConsole('admin')).toBe(false);
    expect(canAccessAuditConsole('member')).toBe(false);
  });

  it('restricts event_at historical correction to Super Admin only', () => {
    expect(canCorrectHistoricalEventTime('super_admin')).toBe(true);
    expect(canCorrectHistoricalEventTime('admin')).toBe(false);
    expect(canCorrectHistoricalEventTime('member')).toBe(false);
  });

  it('masks Super Admin identity as Management for Admins and Members', () => {
    const rawMsg = {
      author_user_id: 'sa-uuid-secret-999',
      author_role: 'super_admin' as UserRole,
      author_display_name: 'CEO Alice',
    };

    // Viewer is Member
    const memberView = maskSuperAdminAuthor(rawMsg, 'member');
    expect(memberView.author_id).toBeNull();
    expect(memberView.display_name).toBe('Management');
    expect(memberView.is_management).toBe(true);

    // Viewer is Admin
    const adminView = maskSuperAdminAuthor(rawMsg, 'admin');
    expect(adminView.author_id).toBeNull();
    expect(adminView.display_name).toBe('Management');

    // Viewer is Super Admin (can inspect self)
    const saView = maskSuperAdminAuthor(rawMsg, 'super_admin');
    expect(saView.author_id).toBe('sa-uuid-secret-999');
    expect(saView.display_name).toBe('CEO Alice');
  });

  it('strips monetary snapshot fields from Member query projections', () => {
    const scopeVersion = {
      id: 'ver-100',
      total_hours_snapshot: 45.0,
      total_usd_snapshot: 2250.0,
      total_bdt_snapshot: 270000.0,
    };

    // For Member: monetary fields must be undefined/stripped
    const memberResult = sanitizeFinancialsForRole(scopeVersion, 'member');
    expect(memberResult.total_hours_snapshot).toBe(45.0);
    expect(memberResult.total_usd_snapshot).toBeUndefined();
    expect(memberResult.total_bdt_snapshot).toBeUndefined();

    // For Admin: monetary fields retained
    const adminResult = sanitizeFinancialsForRole(scopeVersion, 'admin');
    expect(adminResult.total_usd_snapshot).toBe(2250.0);
    expect(adminResult.total_bdt_snapshot).toBe(270000.0);
  });

  it('hides Super Admin accounts from Admin in team management roster', () => {
    const mockRoster = [
      { id: 'sa-1', role: 'super_admin' as UserRole, name: 'Super Admin (Ahmed)' },
      { id: 'admin-1', role: 'admin' as UserRole, name: 'Musfiqur Rahman (QA)' },
      { id: 'member-1', role: 'member' as UserRole, name: 'Dev Alex' },
    ];

    // Admin viewer must NOT see Super Admin
    const adminRoster = filterTeamRosterForViewer(mockRoster, 'admin');
    expect(adminRoster.length).toBe(2);
    expect(adminRoster.some((m) => m.role === 'super_admin')).toBe(false);
    expect(adminRoster.map((m) => m.name)).toEqual(['Musfiqur Rahman (QA)', 'Dev Alex']);

    // Super Admin viewer can see everyone including self
    const superAdminRoster = filterTeamRosterForViewer(mockRoster, 'super_admin');
    expect(superAdminRoster.length).toBe(3);
    expect(superAdminRoster.some((m) => m.role === 'super_admin')).toBe(true);
  });
});
