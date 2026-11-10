// src/lib/auth/authorization.test.ts
import { describe, it, expect } from 'vitest';
import { UserRole } from '../../types';
import {
  canManageUsers,
  canViewFinancialSettings,
  canAccessAuditConsole,
  canCorrectHistoricalEventTime,
  isEstimateVisibleToViewer,
  filterTeamRosterForViewer,
  maskSuperAdminAuthor,
  sanitizeFinancialsForRole,
  canViewUserPassword,
  canUpdateUserPassword,
  canDeleteUserAccount,
  canSubmitCompanyNameRequest,
  canApproveCompanyNameRequest,
  canRejectCompanyNameRequest,
  canDirectlyUpdateCompanyName,
  canDeleteCompanyNameRequest,
  canViewAllCompanyNameRequests,
  canManageAdminPasswordRequests,
  canManageMemberPasswordRequests,
  canApprovePasswordResetRequest,
} from './authorization';

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

  it('restricts estimate visibility for Members until after Admin approval', () => {
    expect(isEstimateVisibleToViewer('draft', 'member')).toBe(false);
    expect(isEstimateVisibleToViewer('pending', 'member')).toBe(false);
    expect(isEstimateVisibleToViewer('revision_requested', 'member')).toBe(false);
    expect(isEstimateVisibleToViewer('approved', 'member')).toBe(true);
    expect(isEstimateVisibleToViewer('draft', 'admin')).toBe(true);
    expect(isEstimateVisibleToViewer('pending', 'admin')).toBe(true);
    expect(isEstimateVisibleToViewer('approved', 'admin')).toBe(true);
    expect(isEstimateVisibleToViewer('draft', 'super_admin')).toBe(true);
  });

  it('ensures Member view contains ONLY scopes and hours with zero money/USD/BDT', () => {
    const approvedScopeVersion = {
      id: 'ver-approved-1',
      version_number: 1,
      status: 'approved',
      total_hours_snapshot: 145.0,
      total_usd_snapshot: 12325.0,
      total_bdt_snapshot: 1479000.0,
      items: [
        { title: 'Database Architecture & Security Configuration', hours: 40.0 },
        { title: 'Core Workspace Workflows & API Implementation', hours: 65.0 },
        { title: 'Automated Testing & Client QA Signoff', hours: 40.0 },
      ],
    };

    const memberView = sanitizeFinancialsForRole(approvedScopeVersion, 'member');
    expect(isEstimateVisibleToViewer(memberView.status, 'member')).toBe(true);
    expect(memberView.total_hours_snapshot).toBe(145.0);
    expect(memberView.items).toHaveLength(3);
    expect(memberView.items[0].hours).toBe(40.0);
    expect(memberView.total_usd_snapshot).toBeUndefined();
    expect(memberView.total_bdt_snapshot).toBeUndefined();
    expect((memberView as any).client_rate_usd_per_hour).toBeUndefined();
    expect((memberView as any).client_rate_bdt_per_hour).toBeUndefined();
  });

  it('prohibits viewing existing passwords or password hashes for ALL roles as per enterprise standard', () => {
    // Under Google L5 security standards, NO role (not even Super Admin) can view existing passwords
    expect(canViewUserPassword('super_admin', 'user-admin-1', 'sa-1')).toBe(false);
    expect(canViewUserPassword('super_admin', 'user-member-2', 'sa-1')).toBe(false);
    expect(canViewUserPassword('admin', 'user-admin-1', 'user-admin-1')).toBe(false);
    expect(canViewUserPassword('member', 'user-member-2', 'user-member-2')).toBe(false);
  });

  it('empowers Super Admin to update any user password, Admin to manage Member passwords, and denies unmanaged changes', () => {
    // Super Admin can update any account's password directly
    expect(canUpdateUserPassword('super_admin', 'user-admin-1', 'sa-1')).toBe(true);
    expect(canUpdateUserPassword('super_admin', 'user-member-2', 'sa-1')).toBe(true);
    expect(canUpdateUserPassword('super_admin', 'sa-1', 'sa-1')).toBe(true);

    // Admin can manage Member passwords
    expect(canUpdateUserPassword('admin', 'user-member-2', 'user-admin-1', 'member')).toBe(true);

    // Admin cannot change another Admin's or Super Admin's password
    expect(canUpdateUserPassword('admin', 'sa-1', 'user-admin-1', 'super_admin')).toBe(false);
    expect(canUpdateUserPassword('admin', 'user-other-admin', 'user-admin-1', 'admin')).toBe(false);

    // Member cannot update anyone without authorized workflow
    expect(canUpdateUserPassword('member', 'user-member-2', 'user-member-2')).toBe(false);
    expect(canUpdateUserPassword('member', 'user-admin-1', 'user-member-2')).toBe(false);
  });

  it('strictly restricts account deletion to Super Admin and prohibits deleting root Super Admin', () => {
    // Super Admin can delete Admin and Member accounts
    expect(canDeleteUserAccount('super_admin', 'admin')).toBe(true);
    expect(canDeleteUserAccount('super_admin', 'member')).toBe(true);

    // Super Admin cannot delete another Super Admin (root authority protection)
    expect(canDeleteUserAccount('super_admin', 'super_admin')).toBe(false);

    // Admin and Member cannot delete anyone
    expect(canDeleteUserAccount('admin', 'member')).toBe(false);
    expect(canDeleteUserAccount('admin', 'admin')).toBe(false);
    expect(canDeleteUserAccount('member', 'member')).toBe(false);
  });

  describe('Task 1: Company Name Management Authorization Boundaries', () => {
    it('allows Admin and Super Admin to submit company name requests, denying Member', () => {
      expect(canSubmitCompanyNameRequest('super_admin')).toBe(true);
      expect(canSubmitCompanyNameRequest('admin')).toBe(true);
      expect(canSubmitCompanyNameRequest('member')).toBe(false);
    });

    it('strictly restricts company name approval and rejection to Super Admin', () => {
      expect(canApproveCompanyNameRequest('super_admin')).toBe(true);
      expect(canApproveCompanyNameRequest('admin')).toBe(false);
      expect(canApproveCompanyNameRequest('member')).toBe(false);

      expect(canRejectCompanyNameRequest('super_admin')).toBe(true);
      expect(canRejectCompanyNameRequest('admin')).toBe(false);
      expect(canRejectCompanyNameRequest('member')).toBe(false);
    });

    it('strictly restricts direct company name updates and entry deletions to Super Admin', () => {
      expect(canDirectlyUpdateCompanyName('super_admin')).toBe(true);
      expect(canDirectlyUpdateCompanyName('admin')).toBe(false);
      expect(canDirectlyUpdateCompanyName('member')).toBe(false);

      expect(canDeleteCompanyNameRequest('super_admin')).toBe(true);
      expect(canDeleteCompanyNameRequest('admin')).toBe(false);
      expect(canDeleteCompanyNameRequest('member')).toBe(false);
    });

    it('restricts global company name request inspection to Super Admin', () => {
      expect(canViewAllCompanyNameRequests('super_admin')).toBe(true);
      expect(canViewAllCompanyNameRequests('admin')).toBe(false);
      expect(canViewAllCompanyNameRequests('member')).toBe(false);
    });
  });

  describe('Task 2: Password Reset & Change Request RBAC Boundaries', () => {
    it('restricts Admin password requests to Super Admin only', () => {
      expect(canManageAdminPasswordRequests('super_admin')).toBe(true);
      expect(canManageAdminPasswordRequests('admin')).toBe(false);
      expect(canManageAdminPasswordRequests('member')).toBe(false);
    });

    it('allows Super Admin and Admin to manage Member password requests, denying Member', () => {
      expect(canManageMemberPasswordRequests('super_admin')).toBe(true);
      expect(canManageMemberPasswordRequests('admin')).toBe(true);
      expect(canManageMemberPasswordRequests('member')).toBe(false);
    });

    it('enforces self-approval restriction: nobody can approve their own password reset request', () => {
      // Admin cannot approve own request
      expect(canApprovePasswordResetRequest('admin', 'admin', 'admin-1', 'admin-1')).toBe(false);
      // Member cannot approve own request
      expect(canApprovePasswordResetRequest('member', 'member', 'member-1', 'member-1')).toBe(false);
      // Super Admin cannot approve own request
      expect(canApprovePasswordResetRequest('super_admin', 'super_admin', 'sa-1', 'sa-1')).toBe(false);
    });

    it('enforces that Super Admin can approve Admin and Member requests, Admin can approve Member requests only', () => {
      // Super Admin approving Admin
      expect(canApprovePasswordResetRequest('super_admin', 'admin', 'sa-1', 'admin-1')).toBe(true);
      // Super Admin approving Member
      expect(canApprovePasswordResetRequest('super_admin', 'member', 'sa-1', 'member-1')).toBe(true);

      // Admin approving Member
      expect(canApprovePasswordResetRequest('admin', 'member', 'admin-1', 'member-1')).toBe(true);
      // Admin approving another Admin (prohibited!)
      expect(canApprovePasswordResetRequest('admin', 'admin', 'admin-1', 'admin-2')).toBe(false);
      // Admin approving Super Admin (prohibited!)
      expect(canApprovePasswordResetRequest('admin', 'super_admin', 'admin-1', 'sa-1')).toBe(false);
    });
  });
});
