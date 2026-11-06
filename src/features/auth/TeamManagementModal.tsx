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
  ShieldCheck
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
    isSuperAdmin,
    isAdmin
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'roster' | 'pending' | 'add'>('roster');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [password, setPassword] = useState('Password123!');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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

Your account has been activated by the Super Admin:
- Name: ${memberName}
- Role: ${member.role.toUpperCase()}
- Login URL: ${loginUrl}
- Email: ${member.email}
- Password: ${pwd}

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

  return (
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
            {visiblePending.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono animate-pulse">
                {visiblePending.length}
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
        {/* TAB 1: PENDING REGISTRATION APPROVALS                             */}
        {/* ================================================================= */}
        {activeTab === 'pending' && (
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
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
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
                          {member.role !== 'super_admin' ? (
                            <button
                              type="button"
                              onClick={() => removeTeamMember(member.user_id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                              title="Remove user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
  );
};
