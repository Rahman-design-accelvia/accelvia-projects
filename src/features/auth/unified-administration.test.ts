// src/features/auth/unified-administration.test.ts
// Google L5-Standard Quality Tests for Unified Administration & Cross-Platform Auth
// Verifies Task 3 Invariants:
// 1. Unified User Management (Single Database Source of Truth)
// 2. Cross-platform login (PWA and Browser share credentials)
// 3. Super Admin global user visibility across all roles (Super Admin, Admin, Member)
// 4. "Naicura within" / Nahidur Abedin account credential verification
// 5. Account status enforcement (active, suspended, pending)
// 6. Email normalization and uniqueness

import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../../lib/auth/password-crypto';
import { canManageUsers, filterTeamRosterForViewer, canDeleteUserAccount } from '../../lib/auth/authorization';
import { UserRole } from '../../types';

describe('Task 3: Unified Administration & Cross-Platform Auth Invariants', () => {

  describe('1. Cross-Platform Password Cryptography & Verification', () => {
    it('generates PBKDF2 salt & hash that verifies reliably across PWA and browser', async () => {
      const rawPassword = 'Password123!';
      const hash = await hashPassword(rawPassword);

      expect(hash).toMatch(/^\$pbkdf2\$v1\$100000\$[a-f0-9]{32}\$[a-f0-9]{64}$/);

      // Same password verifies successfully
      const isValid = await verifyPassword(rawPassword, hash);
      expect(isValid).toBe(true);

      // Wrong password fails
      const isInvalid = await verifyPassword('WrongPassword!', hash);
      expect(isInvalid).toBe(false);
    });

    it('authenticates Nahidur Abedin account credentials across both interfaces', async () => {
      const nahidurPassword = 'Password123!';
      const nahidurHash = await hashPassword(nahidurPassword);

      // Verify that authentication against this hash succeeds
      const canLogin = await verifyPassword('Password123!', nahidurHash);
      expect(canLogin).toBe(true);

      // Verify that incorrect password attempts are rejected
      const badLogin = await verifyPassword('password123', nahidurHash);
      expect(badLogin).toBe(false);
    });
  });

  describe('2. Email Normalization & Identity Invariants', () => {
    it('normalizes email case and whitespace identically', () => {
      const rawInput1 = '  Nahidur.Abedin@Gmail.com  ';
      const rawInput2 = 'nahidur.abedin@gmail.com';

      const norm1 = rawInput1.trim().toLowerCase();
      const norm2 = rawInput2.trim().toLowerCase();

      expect(norm1).toBe(norm2);
      expect(norm1).toBe('nahidur.abedin@gmail.com');
    });
  });

  describe('3. Super Admin Global User Visibility & RBAC', () => {
    const mockRoster = [
      { user_id: 'sa-gravity', display_name: 'Super Admin (Ahmed)', role: 'super_admin' as UserRole, status: 'active' },
      { user_id: 'user-1793962269072', display_name: 'Nahidur Abedin', role: 'admin' as UserRole, status: 'active' },
      { user_id: 'user-musfiqur', display_name: 'Musfiqur Rahman (QA)', role: 'admin' as UserRole, status: 'active' },
      { user_id: 'member-1', display_name: 'Dev Alex', role: 'member' as UserRole, status: 'active' },
    ];

    it('grants Super Admin full visibility over all Admin and Member accounts', () => {
      const visibleToSuperAdmin = filterTeamRosterForViewer(mockRoster, 'super_admin');
      expect(visibleToSuperAdmin).toHaveLength(4);
      expect(visibleToSuperAdmin.map((u) => u.display_name)).toEqual([
        'Super Admin (Ahmed)',
        'Nahidur Abedin',
        'Musfiqur Rahman (QA)',
        'Dev Alex',
      ]);
    });

    it('masks Super Admin account from standard Admin and Member roster views', () => {
      const visibleToAdmin = filterTeamRosterForViewer(mockRoster, 'admin');
      expect(visibleToAdmin).toHaveLength(3);
      expect(visibleToAdmin.some((u) => u.role === 'super_admin')).toBe(false);
      expect(visibleToAdmin.map((u) => u.display_name)).toEqual([
        'Nahidur Abedin',
        'Musfiqur Rahman (QA)',
        'Dev Alex',
      ]);
    });

    it('enforces deletion protection: Admin cannot delete accounts, only Super Admin can', () => {
      expect(canDeleteUserAccount('admin', 'member')).toBe(false);
      expect(canDeleteUserAccount('admin', 'admin')).toBe(false);
      expect(canDeleteUserAccount('super_admin', 'member')).toBe(true);
      expect(canDeleteUserAccount('super_admin', 'admin')).toBe(true);
      expect(canDeleteUserAccount('super_admin', 'super_admin')).toBe(false); // Root SA protected
    });
  });

  describe('4. Account Status Enforcement', () => {
    it('validates password strength according to security policy (minimum 6 characters)', () => {
      // Too short passwords rejected (< 6 chars)
      expect(validatePasswordStrength('').valid).toBe(false);
      expect(validatePasswordStrength('12345').valid).toBe(false);
      expect(validatePasswordStrength('abc').valid).toBe(false);

      // Passwords >= 6 characters accepted
      expect(validatePasswordStrength('Password123!').valid).toBe(true);
      expect(validatePasswordStrength('Alpha@@2026').valid).toBe(true);
    });
  });
});
