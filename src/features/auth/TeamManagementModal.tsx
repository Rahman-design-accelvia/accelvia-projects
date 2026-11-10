// src/features/auth/TeamManagementModal.tsx
// Super Admin Team Roster, Role Assignment Console & User Registration Approval Workflow

import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { useAuth, TeamMember } from './AuthContext';
import { UserRole } from '../../types';
import { 
  UserPlus, 
  Trash2, 
  Mail, 
  User, 
  CheckCircle2, 
  ShieldAlert,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Clock,
  CheckCheck,
  XCircle,
  Shield,
  FileText,
  Lock,
  ShieldCheck,
  Briefcase,
  Edit3,
  X,
  AlertTriangle
} from 'lucide-react';

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({ isOpen, onClose }) => {
  const { 
    teamMembers, 
    pendingRegistrations, 
    approveRegistration, 
    rejectRegistration, 
    addTeamMember, 
    removeTeamMember,
    updateUserPassword,
    isSuperAdmin,
    isAdmin,
    currentUser,
    designationRequests,
    pendingDesignationRequests,
    approveDesignationRequest,
    rejectDesignationRequest,
    superAdminUpdateUserDesignation
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'roster' | 'pending' | 'add'>('roster');
  const [pendingSubTab, setPendingSubTab] = useState<'registrations' | 'designations'>('registrations');

  // Super Admin direct designation editing in roster
  const [editingDesignationUserId, setEditingDesignationUserId] = useState<string | null>(null);
  const [editingDesignationText, setEditingDesignationText] = useState('');
  const [isSavingDesignation, setIsSavingDesignation] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [password, setPassword] = useState('Password123!');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Password reveal toggle state per user (Super Admin only)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Super Admin Password Edit Modal state
  const [editingUser, setEditingUser] = useState<TeamMember | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showEditPasswordInput, setShowEditPasswordInput] = useState(false);
  const [passwordModalError, setPasswordModalError] = useState<string | null>(null);
  const [passwordModalSuccess, setPasswordModalSuccess] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Super Admin Account Deletion Warning Modal state
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [deleteMemberError, setDeleteMemberError] = useState<string | null>(null);

  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete) return;
    setIsDeletingMember(true);
    setDeleteMemberError(null);
    try {
      await removeTeamMember(memberToDelete.user_id);
      setMemberToDelete(null);
    } catch (err: any) {
      setDeleteMemberError(err?.message || 'Failed to delete member account.');
    } finally {
      setIsDeletingMember(false);
    }
  };

  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleOpenEditPassword = (member: TeamMember) => {
    setEditingUser(member);
    setNewPasswordInput(member.password || 'Password123!');
    setShowEditPasswordInput(false);
    setPasswordModalError(null);
    setPasswordModalSuccess(null);
  };

  const generateRandomEditPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPasswordInput(res);
  };

  const handleSaveUpdatedPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 6) {
      setPasswordModalError('Password must be at least 6 characters.');
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordModalError(null);
    const res = await updateUserPassword(editingUser.user_id, newPasswordInput.trim());
    setIsUpdatingPassword(false);

    if (!res.success) {
      setPasswordModalError(res.error || 'Failed to update password');
    } else {
      setPasswordModalSuccess(`Password updated successfully for ${editingUser.display_name}!`);
      setTimeout(() => {
        setEditingUser(null);
      }, 1200);
    }
  };

  // Approval action toast state
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Invitation info banner state
  const [lastAddedMember, setLastAddedMember] = useState<{
    name: string;
    email: string;
    role: UserRole;
    password: string;
  } | null>(null);

  const [hasCopiedBanner, setHasCopiedBanner] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const assignedPassword = password.trim() || 'Password123!';

    addTeamMember({
      display_name: name.trim(),
      email: email.trim(),
      role,
      password: assignedPassword,
    });

    setLastAddedMember({
      name: name.trim(),
      email: email.trim(),
      role,
      password: assignedPassword,
    });
    setHasCopiedBanner(false);

    setName('');
    setEmail('');
    setRole('member');
    setPassword('Password123!');
  };

  const copyCredentialsText = (member: { name?: string; display_name?: string; email: string; role: string; password?: string }) => {
    const loginUrl = typeof window !== 'undefined' ? window.location.origin : 'https://accelvia-projects.vercel.app';
    const pwd = member.password || 'Password123!';
    const memberName = member.name || member.display_name || 'Team Member';

    const text = `Welcome to Accelvia Work Management Platform!

Your account details:
- Name: ${memberName}
- Role: ${member.role.toUpperCase()}
- Login URL: ${loginUrl}
- Email: ${member.email}
${isSuperAdmin ? `- Password: ${pwd}` : ''}

(If you use Gmail, you can also log in directly by clicking "Sign in with Google" with this email!)`;

    navigator.clipboard.writeText(text);
  };

  const handleApprove = (userId: string, assignedRole: UserRole, candidateName: string) => {
    approveRegistration(userId, assignedRole);
    setActionNotice(`Approved ${candidateName} as ${assignedRole.toUpperCase()}! They can now sign in.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleReject = (userId: string, candidateName: string) => {
    if (confirm(`Reject registration request from ${candidateName}?`)) {
      rejectRegistration(userId);
      setActionNotice(`Registration from ${candidateName} has been declined.`);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleApproveDesignation = async (requestId: string, applicantName: string) => {
    const res = await approveDesignationRequest(requestId);
    if (!res.success) {
      setActionNotice(`Error: ${res.error}`);
    } else {
      setActionNotice(`Approved designation request for ${applicantName}!`);
    }
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleRejectDesignation = async (requestId: string, applicantName: string) => {
    const reason = prompt(`Reason for rejecting ${applicantName}'s designation request (optional):`);
    if (reason === null) return;
    const res = await rejectDesignationRequest(requestId, reason || undefined);
    if (!res.success) {
      setActionNotice(`Error: ${res.error}`);
    } else {
      setActionNotice(`Rejected designation request for ${applicantName}.`);
    }
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleSaveSuperAdminDesignation = async (userId: string) => {
    if (!editingDesignationText.trim()) return;
    setIsSavingDesignation(true);
    const res = await superAdminUpdateUserDesignation(userId, editingDesignationText.trim());
    setIsSavingDesignation(false);
    if (!res.success) {
      setActionNotice(`Error: ${res.error}`);
    } else {
      setEditingDesignationUserId(null);
      setActionNotice('Designation updated successfully!');
    }
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Active roster filter: Admins cannot see Super Admin accounts in the team roster
  const activeRoster = teamMembers.filter((m) => {
    const isActive = m.status === 'active' || !m.status;
    if (!isActive) return false;
    if (!isSuperAdmin && m.role === 'super_admin') return false;
    return true;
  });

  // Pending registrations filter: Admins cannot see or approve Super Admin requests
  const visiblePending = isSuperAdmin
    ? pendingRegistrations
    : pendingRegistrations.filter((p) => p.role !== 'super_admin' && p.requested_role !== 'super_admin');

  const totalPendingCount = visiblePending.length + pendingDesignationRequests.length;

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSuperAdmin ? "Team & Access Governance" : "Team & Member Management"}
      subtitle={
        isSuperAdmin
          ? "Super Admin master authority: approve registrations, assign roles (Admin / Member), and manage team access"
          : "Admin workspace console: add new members & admins, and approve user registrations"
      }
      maxWidth="4xl"
    >
      <div className="space-y-4 text-xs text-slate-800 dark:text-slate-200">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'roster'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Active Team Roster</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === 'roster' ? 'bg-emerald-800 text-white' : 'bg-slate-200 dark:bg-slate-700'
            }`}>
              {activeRoster.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Approvals</span>
            {totalPendingCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono animate-pulse">
                {totalPendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`py-2 px-3 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'add'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Direct Add Member</span>
          </button>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 1: PENDING APPROVALS CONSOLE                                  */}
        {/* ================================================================= */}
        {activeTab === 'pending' && (
          <div className="space-y-3">
            {/* Sub-tabs toggle */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setPendingSubTab('registrations')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  pendingSubTab === 'registrations'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>User Registrations</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  pendingSubTab === 'registrations' ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
                }`}>
                  {visiblePending.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPendingSubTab('designations')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  pendingSubTab === 'designations'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Designation & Role Requests</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  pendingSubTab === 'designations' ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
                }`}>
                  {pendingDesignationRequests.length}
                </span>
              </button>
            </div>

            {/* Sub-tab 1: Registrations */}
            {pendingSubTab === 'registrations' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Self-Registration Approval Queue:</strong> New users who registered via the login screen are held in this queue.
                    As {isSuperAdmin ? 'Super Admin' : 'Admin'}, you can review their details and activate them as either an <strong>Admin</strong> or <strong>Member</strong>.
                  </div>
                </div>

                {visiblePending.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                    <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">All caught up!</p>
                    <p className="text-[11px] mt-0.5">No new user registrations are awaiting approval.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visiblePending.map((cand) => (
                      <div
                        key={cand.user_id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-300 dark:hover:border-amber-700/60 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                              {cand.display_name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              Requested: {(cand.requested_role || cand.role).toUpperCase()}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(cand.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {cand.email}
                            </span>
                            {cand.notes && (
                              <span className="text-slate-600 dark:text-slate-300 font-sans italic">
                                &bull; "{cand.notes}"
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleApprove(cand.user_id, 'member', cand.display_name)}
                            className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition"
                            title="Approve and activate as Member"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>Approve as Member</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApprove(cand.user_id, 'admin', cand.display_name)}
                            className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition"
                            title="Approve and activate as Admin"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>Approve as Admin</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReject(cand.user_id, cand.display_name)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-800 transition"
                            title="Reject registration"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Designation & Role Upgrade Requests */}
            {pendingSubTab === 'designations' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Designation & Title Upgrade Queue:</strong> Team members and Admins can submit requests for new designations or role advancements.
                    <div className="mt-1 text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                      🚨 Governance Rule: Admins cannot approve their own designation request. Any Admin request must be authorized by another Admin or a Super Admin.
                    </div>
                  </div>
                </div>

                {pendingDesignationRequests.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                    <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">All caught up!</p>
                    <p className="text-[11px] mt-0.5">No pending designation or title upgrade requests.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingDesignationRequests.map((req) => {
                      const isSelfAdmin = !isSuperAdmin && (req.applicant_id === currentUser.user_id || req.applicant_email.toLowerCase() === currentUser.email.toLowerCase());

                      return (
                        <div
                          key={req.id}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-300 dark:hover:border-amber-700/60 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                {req.applicant_name}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                Current: {req.current_designation || req.applicant_role.toUpperCase()}
                              </span>
                              <span className="text-slate-400 font-bold">&rarr;</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold">
                                Requested: {req.requested_designation} ({req.requested_role.toUpperCase()})
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(req.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" />
                                {req.applicant_email}
                              </span>
                              {req.notes && (
                                <span className="text-slate-600 dark:text-slate-300 font-sans italic">
                                  &bull; "{req.notes}"
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isSelfAdmin ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
                                <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>Self-Approval Restricted &bull; Awaiting another Admin or Super Admin</span>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveDesignation(req.id, req.applicant_name)}
                                  className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition"
                                  title="Approve this designation request"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve Designation</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRejectDesignation(req.id, req.applicant_name)}
                                  className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-800 transition text-xs flex items-center gap-1"
                                  title="Reject designation request"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: ACTIVE TEAM ROSTER                                         */}
        {/* ================================================================= */}
        {activeTab === 'roster' && (
          <div className="space-y-3">
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Team Member</th>
                    <th className="py-2.5 px-3">Designation / Title</th>
                    <th className="py-2.5 px-3">Email / Gmail</th>
                    <th className="py-2.5 px-3">Assigned Role</th>
                    <th className="py-2.5 px-3">Password & Security</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {activeRoster.map((member, idx) => (
                    <tr key={member.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {member.display_name}
                      </td>
                      <td className="py-2.5 px-3">
                        {editingDesignationUserId === member.user_id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingDesignationText}
                              onChange={(e) => setEditingDesignationText(e.target.value)}
                              className="py-0.5 px-2 text-xs bg-white dark:bg-slate-950 border border-emerald-500 rounded text-slate-900 dark:text-slate-100 focus:outline-none"
                              placeholder="New designation"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveSuperAdminDesignation(member.user_id);
                                if (e.key === 'Escape') setEditingDesignationUserId(null);
                              }}
                            />
                            <button
                              type="button"
                              disabled={isSavingDesignation}
                              onClick={() => handleSaveSuperAdminDesignation(member.user_id)}
                              className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
                              title="Save designation"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDesignationUserId(null)}
                              className="p-1 rounded border border-slate-300 dark:border-slate-700 text-slate-400 hover:text-slate-600 transition"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                              {member.designation || (member.role === 'super_admin' ? 'Executive Director' : member.role === 'admin' ? 'Project Manager' : 'Specialist Engineer')}
                            </span>
                            {member.requested_designation && (
                              <span
                                className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                title={`Requested change: ${member.requested_designation}`}
                              >
                                Req: {member.requested_designation}
                              </span>
                            )}
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDesignationUserId(member.user_id);
                                  setEditingDesignationText(member.designation || '');
                                }}
                                className="p-1 rounded text-slate-400 hover:text-amber-600 transition"
                                title="Super Admin: Direct edit designation"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {member.email}
                      </td>
                      <td className="py-2.5 px-3">
                        {member.role === 'super_admin' ? (
                          <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            Super Admin
                          </span>
                        ) : member.role === 'admin' ? (
                          <span className="bg-emerald-100 dark:bg-teal-950/80 text-emerald-800 dark:text-teal-300 border border-emerald-300 dark:border-teal-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            Admin
                          </span>
                        ) : (
                          <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            Member
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {isSuperAdmin ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 min-w-[70px] inline-block text-center">
                              {revealedPasswords[member.user_id]
                                ? (member.password || 'Password123!')
                                : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordReveal(member.user_id)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                              title={revealedPasswords[member.user_id] ? "Hide password" : "Show password"}
                            >
                              {revealedPasswords[member.user_id] ? (
                                <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditPassword(member)}
                              className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 transition shadow-xs"
                              title={`Edit and update password for ${member.display_name}`}
                            >
                              <Key className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span>Edit</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700/80 flex items-center gap-1.5">
                              <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                              <span>••••••••</span>
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-teal-400 font-semibold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Protected</span>
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isSuperAdmin ? (
                            <button
                              type="button"
                              onClick={() => {
                                copyCredentialsText(member);
                                setCopiedIndex(idx);
                                setTimeout(() => setCopiedIndex(null), 2000);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-emerald-600 transition"
                              title="Copy full credentials with password"
                            >
                              {copiedIndex === idx ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(member.email);
                                setCopiedIndex(idx);
                                setTimeout(() => setCopiedIndex(null), 2000);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-emerald-600 transition"
                              title="Copy email address"
                            >
                              {copiedIndex === idx ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          {member.role !== 'super_admin' ? (
                            isSuperAdmin ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteMemberError(null);
                                  setMemberToDelete(member);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title={`Delete ${member.display_name} account`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : null
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Root Authority</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: DIRECT ADD / INVITE                                       */}
        {/* ================================================================= */}
        {activeTab === 'add' && (
          <div className="space-y-4">
            {lastAddedMember && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/80 text-emerald-900 dark:text-emerald-100 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
                    Account Added Successfully!
                  </div>
                  <button
                    type="button"
                    onClick={() => setLastAddedMember(null)}
                    className="text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    Dismiss
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/60 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-semibold block">Member Name & Role</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{lastAddedMember.name}</span>{' '}
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-teal-950/80 text-emerald-800 dark:text-teal-300 font-bold ml-1">
                      {lastAddedMember.role.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-semibold block">Email / Gmail</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100">{lastAddedMember.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-semibold block">Password</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-teal-400 bg-emerald-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-emerald-200 dark:border-slate-700">
                      {lastAddedMember.password}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Send these login credentials to {lastAddedMember.name}.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      copyCredentialsText(lastAddedMember);
                      setHasCopiedBanner(true);
                      setTimeout(() => setHasCopiedBanner(false), 3000);
                    }}
                    className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
                  >
                    {hasCopiedBanner ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopiedBanner ? 'Copied to Clipboard!' : 'Copy Login Details'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
                  <span>Direct Provision User</span>
                </div>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] text-emerald-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Generate Random Password</span>
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Email Address (Gmail / Corporate)
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@gmail.com"
                        className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Assigned Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-bold"
                    >
                      <option value="member">Member (Specialist / Developer)</option>
                      <option value="admin">Admin (Project Manager)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
                  <div className="sm:col-span-8">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Initial Password
                    </label>
                    <div className="relative">
                      <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPasswordInput ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password123!"
                        className="w-full pl-8 pr-10 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordInput(!showPasswordInput)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswordInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <button
                      type="submit"
                      className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Create & Activate Account</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>

    {/* Super Admin: Edit and Update User Password Modal */}
    {editingUser && (
      <Modal
        isOpen={true}
        onClose={() => setEditingUser(null)}
        title="Edit & Update User Password"
        subtitle={`Assign a new password for ${editingUser.display_name} (${editingUser.email})`}
      >
        <form onSubmit={handleSaveUpdatedPassword} className="space-y-4">
          {passwordModalError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{passwordModalError}</span>
            </div>
          )}

          {passwordModalSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordModalSuccess}</span>
            </div>
          )}

          <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] uppercase font-semibold">User Account:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{editingUser.display_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Email:</span>
              <span className="font-mono text-slate-600 dark:text-slate-400">{editingUser.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Current Password:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                {editingUser.password || 'Password123!'}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                New Password
              </label>
              <button
                type="button"
                onClick={generateRandomEditPassword}
                className="text-[11px] text-emerald-600 dark:text-teal-400 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Generate Random</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showEditPasswordInput ? 'text' : 'password'}
                required
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-3 pr-10 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
              />
              <button
                type="button"
                onClick={() => setShowEditPasswordInput(!showEditPasswordInput)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showEditPasswordInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Super Admin Master Authority: This updates the database password instantly. The user will log in with this new password.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isUpdatingPassword ? 'Saving...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </Modal>
    )}

    {/* Delete Account Warning Confirmation Modal */}
    {memberToDelete && (
      <Modal
        isOpen={Boolean(memberToDelete)}
        onClose={() => setMemberToDelete(null)}
        title="Delete User Account?"
        subtitle="Permanent account termination & session revocation"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-slate-800 dark:text-slate-100">
          {deleteMemberError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{deleteMemberError}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-rose-800 dark:text-rose-200">
                Permanently delete {memberToDelete.display_name}'s account?
              </div>
              <div className="text-[11px] text-rose-700 dark:text-rose-300/90 leading-relaxed">
                This action is irreversible. All login credentials, mobile PWA sessions, and workspace permissions will be terminated immediately.
              </div>
            </div>
          </div>

          {/* Member Details Summary Box */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">User Name:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{memberToDelete.display_name}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Email:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{memberToDelete.email}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Role & Designation:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {memberToDelete.role.toUpperCase()} • {memberToDelete.designation || 'Specialist'}
              </span>
            </div>
          </div>

          {/* Important Warnings List */}
          <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900/40">
            <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>PWA & Security Enforcement Notice:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
              <li>Active sessions on mobile PWA apps and browsers will be instantly signed out.</li>
              <li>All team members and project channels will receive a security deletion notice.</li>
              <li>Historical messages and approved deliverables will remain preserved for audit compliance.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setMemberToDelete(null)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeletingMember}
              onClick={handleConfirmDeleteMember}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeletingMember ? 'Deleting Account...' : 'Confirm Permanent Deletion'}</span>
            </button>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
};
