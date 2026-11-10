// src/features/auth/TemporaryPasswordModal.tsx
// Mandatory non-dismissible dialog displayed when mustChangePassword === true.
// Enforces Google L5 security: users authenticated with a temporary or reset password
// must establish a permanent salted PBKDF2-SHA256 password before accessing workspace assets.

import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { useAuth } from './AuthContext';
import { validatePasswordStrength } from '../../lib/auth/password-crypto';
import { 
  Lock, 
  Key, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert, 
  LogOut,
  ShieldCheck 
} from 'lucide-react';

interface TemporaryPasswordModalProps {
  isOpen: boolean;
}

export const TemporaryPasswordModal: React.FC<TemporaryPasswordModalProps> = ({ isOpen }) => {
  const { completeTemporaryPasswordChange, logout, currentUser } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      setError(validation.error || 'Password does not meet complexity standards.');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setError('Passwords do not match. Please ensure both fields match exactly.');
      return;
    }

    setIsSubmitting(true);
    const res = await completeTemporaryPasswordChange(newPassword.trim());
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || 'Failed to update password. Please try again.');
    } else {
      setSuccess('Password updated successfully! Entering workspace...');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Non-dismissible
      isDismissible={false}
      title="Mandatory Password Update"
      subtitle="Temporary or administrative password detected"
      maxWidth="md"
    >
      <div className="space-y-4 text-xs text-slate-800 dark:text-slate-100">
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-xs">Temporary Password Detected</div>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
              Hello <strong>{currentUser.display_name}</strong>. Your account is currently using a temporary one-time password or an administrative reset key. For enterprise security, you must establish a permanent password before continuing into the workspace.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Permanent Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Confirm Permanent Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                title={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Stored securely using 100,000 PBKDF2-SHA256 iterations with unique salt.</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={logout}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out Instead</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !newPassword.trim() || !confirmPassword.trim()}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving Password...' : 'Save & Enter Workspace'}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
