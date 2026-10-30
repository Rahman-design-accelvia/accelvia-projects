// src/features/auth/TeamManagementModal.tsx
// Super Admin Team Roster and Role Assignment Console

import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { useAuth, TeamMember } from './AuthContext';
import { UserRole } from '../../types';
import { 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  Mail, 
  User, 
  CheckCircle2, 
  ShieldAlert 
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    addTeamMember({
      display_name: name.trim(),
      email: email.trim(),
      role,
    });

    setSuccessMsg(`Successfully added ${name.trim()} as ${role.replace('_', ' ').toUpperCase()}. They can now sign in with their email!`);
    setName('');
    setEmail('');
    setRole('member');

    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
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
          <div>
            <strong>Authority Governance:</strong> Only Super Admin can register or elevate users into <strong>Admin</strong> or <strong>Member</strong> roles. Any user added here can sign in with their email and will automatically inherit the assigned role permissions.
          </div>
        </div>

        {/* Add Member Form */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
            Add / Invite Team Member
          </div>

          {successMsg && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
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
                  placeholder="e.g. John Doe"
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
                  placeholder="user@gmail.com"
                  className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Assigned Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-bold"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Member
              </button>
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
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {teamMembers.map((member) => (
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
                      <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-teal-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
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
