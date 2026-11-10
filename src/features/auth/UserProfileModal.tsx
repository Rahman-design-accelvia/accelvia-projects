// src/features/auth/UserProfileModal.tsx
// Profile & Designation Management:
// - All Admins and Members can change their own name immediately (self-service)
// - Put in request for new designation or role (Admin / Member)
// - Self-approval restriction: An Admin cannot approve their own designation change

import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { useAuth } from './AuthContext';
import { UserRole } from '../../types';
import { 
  User, 
  Mail, 
  Shield, 
  Briefcase, 
  Check, 
  Clock, 
  AlertCircle, 
  Send, 
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Key,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser, 
    currentRole, 
    isSuperAdmin, 
    isAdmin, 
    updateDisplayName, 
    submitDesignationRequest,
    pendingDesignationRequests,
    updateUserPassword
  } = useAuth();

  // Display Name editing state
  const [displayNameInput, setDisplayNameInput] = useState(currentUser.display_name);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSaveSuccess, setNameSaveSuccess] = useState<string | null>(null);
  const [nameSaveError, setNameSaveError] = useState<string | null>(null);

  // Designation Request state
  const [requestedDesignation, setRequestedDesignation] = useState('');
  const [requestedRole, setRequestedRole] = useState<UserRole>(currentRole);
  const [requestNotes, setRequestNotes] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Password change state (Self-Service for designated account)
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const trimmed = newPasswordInput.trim();
    if (!trimmed || trimmed.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (trimmed !== confirmPasswordInput.trim()) {
      setPasswordError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsUpdatingPassword(true);
    const res = await updateUserPassword(currentUser.user_id, trimmed);
    setIsUpdatingPassword(false);

    if (!res.success) {
      setPasswordError(res.error || 'Failed to update password.');
    } else {
      setPasswordSuccess('Password updated successfully for your designated account!');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    }
  };

  // Sync state when currentUser updates
  useEffect(() => {
    setDisplayNameInput(currentUser.display_name);
    setRequestedRole(currentRole);
  }, [currentUser.display_name, currentRole]);

  // Check if current user already has an active pending request
  const myPendingRequest = pendingDesignationRequests.find(
    (r) => r.applicant_id === currentUser.user_id || r.applicant_email.toLowerCase() === currentUser.email.toLowerCase()
  );

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayNameInput.trim() || displayNameInput.trim().length < 2) {
      setNameSaveError('Display name must be at least 2 characters.');
      return;
    }

    setIsSavingName(true);
    setNameSaveError(null);
    const res = await updateDisplayName(displayNameInput.trim());
    setIsSavingName(false);

    if (!res.success) {
      setNameSaveError(res.error || 'Failed to update display name.');
    } else {
      setNameSaveSuccess('Display name updated successfully across workspace!');
      setTimeout(() => setNameSaveSuccess(null), 3000);
    }
  };

  const handleSubmitDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedDesignation.trim()) {
      setRequestError('Please specify the requested designation/title.');
      return;
    }

    setIsSubmittingRequest(true);
    setRequestError(null);
    const res = await submitDesignationRequest({
      requestedDesignation: requestedDesignation.trim(),
      requestedRole,
      notes: requestNotes.trim(),
    });
    setIsSubmittingRequest(false);

    if (!res.success) {
      setRequestError(res.error || 'Failed to submit designation request.');
    } else {
      setRequestSuccess('Designation change request submitted successfully!');
      setRequestedDesignation('');
      setRequestNotes('');
      setTimeout(() => setRequestSuccess(null), 4000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="My Profile & Designation"
      subtitle="Update your display name and request designation or title upgrades"
    >
      <div className="space-y-5 text-xs text-slate-800 dark:text-slate-100">
        
        {/* ================================================================= */}
        {/* SECTION 1: EDIT DISPLAY NAME (Immediate Self-Service)             */}
        {/* ================================================================= */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
              <span>Full Name (Public Display Name)</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-teal-400 font-medium">
              Instant Self-Service
            </span>
          </div>

          {nameSaveSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{nameSaveSuccess}</span>
            </div>
          )}

          {nameSaveError && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{nameSaveError}</span>
            </div>
          )}

          <form onSubmit={handleSaveName} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Your Display Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={isSavingName || displayNameInput.trim() === currentUser.display_name}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingName ? 'Saving...' : 'Save Name'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">{currentUser.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Account Status: Active</span>
              </div>
            </div>
          </form>
        </div>

        {/* ================================================================= */}
        {/* SECTION 2: CURRENT DESIGNATION & PERMISSION LEVEL                */}
        {/* ================================================================= */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
            <Briefcase className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Current Role & Designation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-semibold block mb-0.5">
                Assigned Designation / Title
              </span>
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-cyan-500" />
                <span>{currentUser.designation || 'Team Member'}</span>
              </span>
            </div>

            <div className="bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-semibold block mb-0.5">
                System Role & Authority
              </span>
              <span className="mt-1 inline-block">
                {currentRole === 'super_admin' ? (
                  <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                    Super Admin (Master Ownership)
                  </span>
                ) : currentRole === 'admin' ? (
                  <span className="bg-emerald-100 dark:bg-teal-950/80 text-emerald-800 dark:text-teal-300 border border-emerald-300 dark:border-teal-800 px-2 py-0.5 rounded text-[10px] font-bold">
                    Admin (Project & Team Manager)
                  </span>
                ) : (
                  <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">
                    Member (Engineering / Scope Specialist)
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SECTION 3: REQUEST DESIGNATION OR ROLE UPGRADE                    */}
        {/* ================================================================= */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Request Designation / Title Upgrade</span>
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
              Requires Admin / Super Admin Approval
            </span>
          </div>

          {/* Pending Request Alert Card */}
          {myPendingRequest ? (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Designation Request Currently Pending Review</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                You have requested designation: <strong>"{myPendingRequest.requested_designation}"</strong> with role <strong>{myPendingRequest.requested_role.toUpperCase()}</strong>.
              </p>
              <div className="p-2 rounded bg-white/70 dark:bg-slate-900/70 border border-amber-200 dark:border-amber-800/60 text-[10px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Governance Policy:</strong> Admins cannot approve their own designation changes. Your request must be authorized by <strong>another Admin</strong> or a <strong>Super Admin</strong>.
                </span>
              </div>
            </div>
          ) : isSuperAdmin ? (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
              <p className="leading-relaxed">
                As the <strong>Founding Super Admin</strong>, you hold root authority over the entire platform. You can directly edit your own and any user's designation from the Team Management roster.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitDesignation} className="space-y-3">
              {requestSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{requestSuccess}</span>
                </div>
              )}

              {requestError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{requestError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Requested Designation / Job Title
                  </label>
                  <input
                    type="text"
                    required
                    value={requestedDesignation}
                    onChange={(e) => setRequestedDesignation(e.target.value)}
                    placeholder="e.g. VP Engineering, Lead Architect"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Requested System Role
                  </label>
                  <select
                    value={requestedRole}
                    onChange={(e) => setRequestedRole(e.target.value as UserRole)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="member">Member (Specialist / Engineer)</option>
                    <option value="admin">Admin (Project & Scope Manager)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Reason / Notes for Management (Optional)
                </label>
                <textarea
                  rows={2}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="e.g. Promoted to lead QA engineer for enterprise deliverables..."
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Separation of Duties Rule:</strong> Admins cannot approve their own designation request. Your submission will appear in the governance queue and must be authorized by <strong>another Admin</strong> or a <strong>Super Admin</strong>.
                </span>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmittingRequest || !requestedDesignation.trim()}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingRequest ? 'Submitting...' : 'Submit Designation Request'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ================================================================= */}
        {/* SECTION 3: CHANGE MY PASSWORD (Designated Account Only)           */}
        {/* ================================================================= */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
              <span>Change Account Password</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-teal-400 font-medium">
              Designated Account Only
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Update your account password. Admins and Members can change credentials for their own account only.
          </p>

          {passwordSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isUpdatingPassword || !newPasswordInput.trim() || !confirmPasswordInput.trim()}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{isUpdatingPassword ? 'Updating...' : 'Update My Password'}</span>
              </button>
            </div>
          </form>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
