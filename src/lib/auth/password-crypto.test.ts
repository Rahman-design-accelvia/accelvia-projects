// src/lib/auth/password-crypto.test.ts
import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateSecureTemporaryPassword,
  validatePasswordStrength,
} from './password-crypto';

describe('Password Cryptography & Security Unit Tests', () => {
  it('hashes password with PBKDF2 salt and verifies correctly', async () => {
    const raw = 'Alpha#9922!Secret';
    const hash = await hashPassword(raw);

    expect(hash).toContain('$pbkdf2$v1$100000$');
    expect(hash).not.toContain(raw);

    // Correct password verifies to true
    const isValid = await verifyPassword(raw, hash);
    expect(isValid).toBe(true);

    // Wrong password fails
    const isInvalid = await verifyPassword('WrongPassword123!', hash);
    expect(isInvalid).toBe(false);
  });

  it('generates distinct salts for identical passwords', async () => {
    const pwd = 'SamePassword123!';
    const hash1 = await hashPassword(pwd);
    const hash2 = await hashPassword(pwd);

    expect(hash1).not.toBe(hash2);
    expect(await verifyPassword(pwd, hash1)).toBe(true);
    expect(await verifyPassword(pwd, hash2)).toBe(true);
  });

  it('rejects verification on invalid or null credentials', async () => {
    expect(await verifyPassword('Password123!', null)).toBe(false);
    expect(await verifyPassword('Password123!', '')).toBe(false);
    expect(await verifyPassword('', 'somehash')).toBe(false);
    expect(await verifyPassword('test', '$pbkdf2$v1$corrupted')).toBe(false);
  });

  it('supports transparent legacy plaintext verification', async () => {
    const legacyPlain = 'Password123!';
    expect(await verifyPassword('Password123!', legacyPlain)).toBe(true);
    expect(await verifyPassword('OtherPassword', legacyPlain)).toBe(false);
  });

  it('generates strong temporary passwords meeting complexity requirements', () => {
    const temp1 = generateSecureTemporaryPassword();
    const temp2 = generateSecureTemporaryPassword();

    expect(temp1).toHaveLength(12);
    expect(temp2).toHaveLength(12);
    expect(temp1).not.toBe(temp2);

    // Complexity checks: must have upper, lower, digit, and symbol
    expect(/[A-Z]/.test(temp1)).toBe(true);
    expect(/[a-z]/.test(temp1)).toBe(true);
    expect(/[0-9]/.test(temp1)).toBe(true);
    expect(/[!@#$%^&*]/.test(temp1)).toBe(true);
  });

  it('validates password strength rules', () => {
    expect(validatePasswordStrength('').valid).toBe(false);
    expect(validatePasswordStrength('12345').valid).toBe(false);
    expect(validatePasswordStrength('123456').valid).toBe(true);
    expect(validatePasswordStrength('SafePassword!2026').valid).toBe(true);
  });
});
