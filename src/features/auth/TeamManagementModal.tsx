// src/features/auth/TeamManagementModal.tsx
// Super Admin Team Roster and Role Assignment Console with Password & Invitation Management

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
  Sparkles
} from 'lucide-react';

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({ isOpen, onClose }) => {
  const { teamMembers, addTeamMember, removeTeamMember } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [password, setPassword] = useState('Password123!');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
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

Your account has been created by the Super Admin:
- Name: ${memberName}
- Role: ${member.role.toUpperCase()}
- Login URL: ${loginUrl}
- Email: ${member.email}
- Temporary Password: ${pwd}

(If you use Gmail, you can also log in directly by clicking "Sign in with Google" with this email!)`;

    navigator.clipboard.writeText(text);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Team & Role Management (Super Admin Only)"
      subtitle="Super Admin has master authority to add, invite, and assign roles for Admins and Members"
      maxWidth="4xl"
    >
      <div className="space-y-5 text-xs text-slate-800 dark:text-slate-200">
        
        {/* Security Rule Banner */}
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Authority Governance:</strong> Only the Super Admin can provision <strong>Admin</strong> or <strong>Member</strong> accounts.
            Invited users can log in either with the <strong>temporary password</strong> you assign them, or via <strong>1-Click Google Sign-in</strong> if they use Gmail!
          </div>
        </div>

        {/* Added Credentials Success Card */}
        {lastAddedMember && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/80 text-emerald-900 dark:text-emerald-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
                Account Created Successfully!
              </div>
              <button
                type="button"
                onClick={() => setLastAddedMember(null)}
                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                <span className="text-slate-500 text-[10px] uppercase font-semibold block">Temporary Password</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-teal-400 bg-emerald-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-emerald-200 dark:border-slate-700">
                  {lastAddedMember.password}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Send these login details to {lastAddedMember.name}. They can sign in immediately!
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

        {/* Add Member Form */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
              <span>Add / Invite Team Member</span>
            </div>
            <button
              type="button"
              onClick={generateRandomPassword}
              className="text-[11px] text-emerald-600 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Generate New Password</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
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
                  <option value="super_admin">Super Admin (Director)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
              <div className="sm:col-span-8">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Initial / Temporary Password (for manual login)
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
                  <span>Add Member & Save Password</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Existing Team Members Roster */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Current Organization Roster ({teamMembers.length})</span>
            <span className="text-[10px] text-slate-400 font-mono">Role Based Access Control</span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Team Member</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Assigned Role</th>
                  <th className="py-2.5 px-3">Temporary Password</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {teamMembers.map((member, idx) => (
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
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {member.password || 'Password123!'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            copyCredentialsText(member);
                            setCopiedIndex(idx);
                            setTimeout(() => setCopiedIndex(null), 2500);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-emerald-600 transition"
                          title="Copy login invitation text"
                        >
                          {copiedIndex === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
          >
            Close Roster
          </button>
        </div>
      </div>
    </Modal>
  );
};
