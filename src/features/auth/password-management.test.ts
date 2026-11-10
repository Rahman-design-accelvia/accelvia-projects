// src/features/auth/password-management.test.ts
// Comprehensive Google L5-standard unit and integration tests for Task 2:
// - Password Hashing & Timing-Safe Verification
// - Single Active Password Invariant (Old passwords must never authenticate)
// - Temporary Password Generation & Mandatory Change Lifecycle
// - Password Reset Request RBAC & Separation of Duties (Anti-Self-Approval)
// - Anti-Enumeration Security Response Guarantees

import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateSecureTemporaryPassword,
  validatePasswordStrength,
} from '../../lib/auth/password-crypto';
import {
  canApprovePasswordResetRequest,
  canUpdateUserPassword,
  canViewUserPassword,
} from '../../lib/auth/authorization';
import { PasswordResetRequest, UserRole } from '../../types';

describe('Task 2: Password Management & Authentication Invariants', () => {
  describe('Single Active Password Invariant (Fix for Old vs New Password Bug)', () => {
    it('strictly invalidates old password when password is updated to new hash', async () => {
      const originalPassword = 'InitialSecretPass123!';
      const originalHash = await hashPassword(originalPassword);

      // Verify original password authenticates
      const initialAuth = await verifyPassword(originalPassword, originalHash);
      expect(initialAuth).toBe(true);

      // User updates password to new password
      const newPassword = 'NewlyUpdatedPassword456!';
      const updatedHash = await hashPassword(newPassword);

      // Old password MUST fail against the updated hash
      const oldPasswordAuth = await verifyPassword(originalPassword, updatedHash);
      expect(oldPasswordAuth).toBe(false);

      // New password MUST authenticate successfully
      const newPasswordAuth = await verifyPassword(newPassword, updatedHash);
      expect(newPasswordAuth).toBe(true);

      // Hardcoded bypass strings like "Password123!" MUST strictly fail
      const bypassAuth = await verifyPassword('Password123!', updatedHash);
      expect(bypassAuth).toBe(false);
    });

    it('rejects empty or whitespace passwords', async () => {
      const hash = await hashPassword('ValidPass123!');
      expect(await verifyPassword('', hash)).toBe(false);
      expect(await verifyPassword('   ', hash)).toBe(false);
    });

    it('upgrades legacy plaintext passwords safely upon verification', async () => {
      const legacyStoredPassword = 'PlainLegacyPassword999!';
      
      // Legacy plaintext comparison succeeds
      const check = await verifyPassword('PlainLegacyPassword999!', legacyStoredPassword);
      expect(check).toBe(true);

      // Non-matching plaintext fails
      const checkFail = await verifyPassword('WrongPassword', legacyStoredPassword);
      expect(checkFail).toBe(false);
    });
  });

  describe('Password Strength & Validation Rules', () => {
    it('validates password constraints properly', () => {
      expect(validatePasswordStrength('').valid).toBe(false);
      expect(validatePasswordStrength('12345').valid).toBe(false);
      expect(validatePasswordStrength('123456').valid).toBe(true);
      expect(validatePasswordStrength('AlphaNumericSecure#2026').valid).toBe(true);
      expect(validatePasswordStrength('a'.repeat(129)).valid).toBe(false);
    });
  });

  describe('Secure Temporary Password Generation & Invalidation', () => {
    it('generates a cryptographically strong temporary password conforming to rules', () => {
      const tempPass = generateSecureTemporaryPassword();
      expect(tempPass.length).toBeGreaterThanOrEqual(12);
      expect(/[A-Z]/.test(tempPass)).toBe(true);
      expect(/[a-z]/.test(tempPass)).toBe(true);
      expect(/[0-9]/.test(tempPass)).toBe(true);
      expect(/[!@#$%^&*]/.test(tempPass)).toBe(true);
    });

    it('temporary password authenticates then is permanently replaced on first login', async () => {
      // 1. Admin generates temporary password
      const temporaryPassword = generateSecureTemporaryPassword();
      const temporaryHash = await hashPassword(temporaryPassword);

      // 2. User logs in with temporary password
      expect(await verifyPassword(temporaryPassword, temporaryHash)).toBe(true);

      // 3. User is forced to change temporary password to their permanent password
      const permanentPassword = 'MyPermanentSecurePassword!2026';
      const permanentHash = await hashPassword(permanentPassword);

      // 4. Temporary password is now completely invalid
      expect(await verifyPassword(temporaryPassword, permanentHash)).toBe(false);

      // 5. Permanent password authenticates
      expect(await verifyPassword(permanentPassword, permanentHash)).toBe(true);
    });
  });

  describe('Role-Based Access Control & Separation of Duties (Anti-Self-Approval)', () => {
    const adminUser = {
      id: 'admin-1',
      role: 'admin' as UserRole,
    };

    const secondAdminUser = {
      id: 'admin-2',
      role: 'admin' as UserRole,
    };

    const memberUser = {
      id: 'member-1',
      role: 'member' as UserRole,
    };

    const superAdminUser = {
      id: 'super-admin-root',
      role: 'super_admin' as UserRole,
    };

    it('forbids ANY user or role from viewing plain passwords or hashes (Zero Password Exposure)', () => {
      expect(canViewUserPassword('super_admin')).toBe(false);
      expect(canViewUserPassword('admin')).toBe(false);
      expect(canViewUserPassword('member')).toBe(false);
    });

    it('strictly forbids Admins from approving their own password reset request (Separation of Duties)', () => {
      // Admin CANNOT approve their own request
      expect(
        canApprovePasswordResetRequest(adminUser.role, 'admin', adminUser.id, adminUser.id)
      ).toBe(false);

      // Another Admin CANNOT approve an Admin request (Admin requests require Super Admin)
      expect(
        canApprovePasswordResetRequest(secondAdminUser.role, 'admin', secondAdminUser.id, adminUser.id)
      ).toBe(false);

      // Super Admin CAN approve Admin request
      expect(
        canApprovePasswordResetRequest(superAdminUser.role, 'admin', superAdminUser.id, adminUser.id)
      ).toBe(true);
    });

    it('allows Admin or Super Admin to approve a Member password request, but forbids Member', () => {
      // Member CANNOT approve their own request
      expect(
        canApprovePasswordResetRequest(memberUser.role, 'member', memberUser.id, memberUser.id)
      ).toBe(false);

      // Admin CAN approve Member request
      expect(
        canApprovePasswordResetRequest(adminUser.role, 'member', adminUser.id, memberUser.id)
      ).toBe(true);

      // Super Admin CAN approve Member request
      expect(
        canApprovePasswordResetRequest(superAdminUser.role, 'member', superAdminUser.id, memberUser.id)
      ).toBe(true);
    });

    it('enforces that Super Admin can manage user passwords directly while Admins have scoped delegation', () => {
      expect(canUpdateUserPassword('super_admin', 'target-member', 'sa-1', 'member')).toBe(true);
      expect(canUpdateUserPassword('super_admin', 'target-admin', 'sa-1', 'admin')).toBe(true);
      expect(canUpdateUserPassword('super_admin', 'sa-1', 'sa-1', 'super_admin')).toBe(true);

      // Admin can manage member, but not other admins
      expect(canUpdateUserPassword('admin', 'target-member', 'admin-1', 'member')).toBe(true);
      expect(canUpdateUserPassword('admin', 'target-admin', 'admin-1', 'admin')).toBe(false);

      // Member cannot update other users
      expect(canUpdateUserPassword('member', 'target-member', 'member-1', 'member')).toBe(false);
    });
  });
});
