// src/features/organization/CompanySettingsModal.tsx
// Production Company Name Management & Approval System:
// - Super Admin: View active, approve/reject/edit proposed names, direct update, delete entries, inspect audit trail
// - Admin: Submit proposed company name request, track submission statuses (Pending, Approved, Rejected)
// - Member: View active company branding

import React, { useState, useEffect, useMemo } from 'react';
import { useOrganization } from './OrganizationContext';
import { useAuth } from '../auth/AuthContext';
import { useNotifications } from '../notifications/NotificationContext';
import { Modal } from '../../components/Modal';
import {
  Building2,
  Globe,
  Mail,
  Sparkles,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Trash2,
  Edit3,
  Check,
  X,
  Send,
  History,
  ShieldCheck,
  ListFilter,
  ArrowRight,
} from 'lucide-react';
import { CompanyNameRequest } from '../../types';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    settings,
    companyName,
    companyRequests,
    pendingCompanyRequests,
    companyAuditHistory,
    submitCompanyNameRequest,
    approveCompanyNameRequest,
    rejectCompanyNameRequest,
    directUpdateCompanyName,
    editCompanyNameRequest,
    deleteCompanyNameRequest,
  } = useOrganization();

  const { currentUser, currentRole, isSuperAdmin, isAdmin } = useAuth();
  const { notify } = useNotifications();

  // Tab State
  type SuperAdminTab = 'branding' | 'pending' | 'history' | 'audit';
  type AdminTab = 'current' | 'submit' | 'my_requests';

  const [saTab, setSaTab] = useState<SuperAdminTab>('branding');
  const [adminTab, setAdminTab] = useState<AdminTab>('submit');

  // Super Admin Direct Update Form state
  const [directName, setDirectName] = useState(settings.companyName);
  const [directTagline, setDirectTagline] = useState(settings.tagline);
  const [directWebsite, setDirectWebsite] = useState(settings.website);
  const [directEmail, setDirectEmail] = useState(settings.contactEmail);
  const [directActionMsg, setDirectActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDirectUpdating, setIsDirectUpdating] = useState(false);

  // Admin Request Submission Form state
  const [proposedNameInput, setProposedNameInput] = useState('');
  const [submissionMsg, setSubmissionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Super Admin Inline Edit / Review Modal state
  const [editingRequest, setEditingRequest] = useState<CompanyNameRequest | null>(null);
  const [editedProposedName, setEditedProposedName] = useState('');
  const [rejectionTargetId, setRejectionTargetId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setDirectName(settings.companyName);
      setDirectTagline(settings.tagline);
      setDirectWebsite(settings.website);
      setDirectEmail(settings.contactEmail);
      setDirectActionMsg(null);
      setSubmissionMsg(null);
      setEditingRequest(null);
      setRejectionTargetId(null);
      setRejectionReason('');
    }
  }, [isOpen, settings]);

  // Admin's own submitted requests
  const myRequests = useMemo(() => {
    return companyRequests.filter(
      (r) => r.requested_by_id === currentUser.user_id || r.requested_by_email.toLowerCase() === currentUser.email.toLowerCase()
    );
  }, [companyRequests, currentUser]);

  // Handle Admin Company Name Submission
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionMsg(null);
    setIsSubmitting(true);

    const res = await submitCompanyNameRequest(proposedNameInput, {
      id: currentUser.user_id,
      name: currentUser.display_name,
      email: currentUser.email,
      role: currentRole,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setSubmissionMsg({ type: 'error', text: res.error || 'Failed to submit company name request.' });
    } else {
      setSubmissionMsg({
        type: 'success',
        text: `Proposed company name "${proposedNameInput.trim()}" submitted for Super Admin review. Active name remains "${settings.companyName}".`,
      });
      setProposedNameInput('');

      notify({
        title: '🏢 Company Name Request Submitted',
        body: `Your request for "${res.request?.proposed_name}" has been sent to the Super Admin for approval.`,
        category: 'system',
      });
    }
  };

  // Handle Super Admin Direct Update
  const handleDirectUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectActionMsg(null);
    setIsDirectUpdating(true);

    const res = await directUpdateCompanyName(
      directName,
      {
        id: currentUser.user_id,
        name: currentUser.display_name,
        role: currentRole,
      },
      {
        tagline: directTagline.trim(),
        website: directWebsite.trim(),
        contactEmail: directEmail.trim(),
      }
    );

    setIsDirectUpdating(false);

    if (!res.success) {
      setDirectActionMsg({ type: 'error', text: res.error || 'Failed to update company name.' });
    } else {
      setDirectActionMsg({
        type: 'success',
        text: `Global company name updated to "${directName.trim()}". Synchronized across all modules & PDFs.`,
      });

      notify({
        title: '🏢 Global Company Name Updated',
        body: `Active company name set to "${directName.trim()}". All estimates, work orders, and PDFs updated.`,
        category: 'system',
      });
    }
  };

  // Handle Super Admin Approval
  const handleApprove = async (requestId: string, editedName?: string) => {
    const res = await approveCompanyNameRequest(
      requestId,
      {
        id: currentUser.user_id,
        name: currentUser.display_name,
        role: currentRole,
      },
      editedName
    );

    if (res.success) {
      setEditingRequest(null);
      notify({
        title: '✅ Company Name Approved',
        body: `Company name request approved! Global active company name updated.`,
        category: 'system',
      });
    } else {
      alert(res.error || 'Failed to approve request.');
    }
  };

  // Handle Super Admin Rejection
  const handleReject = async (requestId: string) => {
    const res = await rejectCompanyNameRequest(
      requestId,
      {
        id: currentUser.user_id,
        name: currentUser.display_name,
        role: currentRole,
      },
      rejectionReason
    );

    if (res.success) {
      setRejectionTargetId(null);
      setRejectionReason('');
      notify({
        title: '❌ Company Name Request Rejected',
        body: `Request was rejected. Active company name remained unchanged.`,
        category: 'system',
      });
    } else {
      alert(res.error || 'Failed to reject request.');
    }
  };

  // Handle Delete Entry
  const handleDeleteEntry = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to delete this company name record?')) return;
    const res = await deleteCompanyNameRequest(requestId, {
      id: currentUser.user_id,
      name: currentUser.display_name,
      role: currentRole,
    });
    if (!res.success) {
      alert(res.error || 'Failed to delete entry.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Company Identity & Name Governance"
      subtitle="Centralized management of the authoritative organization identity"
      maxWidth="4xl"
    >
      <div className="space-y-4 text-xs">
        {/* Active Global Company Name Banner */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              {companyName ? companyName.charAt(0).toUpperCase() : 'A'}
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-teal-300">
                Active Global Company Name
              </div>
              <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                {companyName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {settings.tagline} &bull; Visible across Super Admin, Admin, Member panels, Estimates & PDFs
              </div>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-teal-300 text-[11px] font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Authorized by Super Admin</span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SUPER ADMIN INTERFACE                                             */}
        {/* ================================================================= */}
        {isSuperAdmin && (
          <div className="space-y-4">
            {/* Super Admin Tabs */}
            <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSaTab('branding')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  saTab === 'branding'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Active Configuration
              </button>
              <button
                type="button"
                onClick={() => setSaTab('pending')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  saTab === 'pending'
                    ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>Pending Requests</span>
                {pendingCompanyRequests.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    {pendingCompanyRequests.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSaTab('history')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  saTab === 'history'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Request History
              </button>
              <button
                type="button"
                onClick={() => setSaTab('audit')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  saTab === 'audit'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Audit Trail
              </button>
            </div>

            {/* TAB 1: Super Admin Direct Update Form */}
            {saTab === 'branding' && (
              <form onSubmit={handleDirectUpdateSubmit} className="space-y-3.5">
                {directActionMsg && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      directActionMsg.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    {directActionMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{directActionMsg.text}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Active Company Name (Global Authority)
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={directName}
                      onChange={(e) => setDirectName(e.target.value)}
                      placeholder="e.g. Acme Global Studio"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Direct update updates the central database and immediately reflects on all header sections, estimates, work orders, and PDF exports.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tagline / Business Focus
                    </label>
                    <input
                      type="text"
                      value={directTagline}
                      onChange={(e) => setDirectTagline(e.target.value)}
                      placeholder="e.g. Enterprise Client Delivery"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Website URL
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={directWebsite}
                        onChange={(e) => setDirectWebsite(e.target.value)}
                        placeholder="https://yourcompany.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Public Contact Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={directEmail}
                      onChange={(e) => setDirectEmail(e.target.value)}
                      placeholder="contact@yourcompany.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={isDirectUpdating || !directName.trim()}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isDirectUpdating ? 'Saving...' : 'Apply Global Update'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: Pending Requests for Super Admin Approval */}
            {saTab === 'pending' && (
              <div className="space-y-3">
                {pendingCompanyRequests.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <div className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                      No Pending Company Name Requests
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      When Admins submit proposed company names, they will appear here for your review and authorization.
                    </p>
                  </div>
                ) : (
                  pendingCompanyRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-2.5 transition hover:border-amber-300"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                              "{req.proposed_name}"
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                              Pending Approval
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                            Submitted by <span className="font-semibold text-slate-800 dark:text-slate-200">{req.requested_by_name}</span> ({req.requested_by_email}) &bull; {new Date(req.submitted_at).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRequest(req);
                              setEditedProposedName(req.proposed_name);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                            title="Edit before approving"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRejectionTargetId(req.id);
                              setRejectionReason('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                            title="Reject request"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApprove(req.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition cursor-pointer"
                            title="Approve & make globally active"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve Active</span>
                          </button>
                        </div>
                      </div>

                      {/* Inline Edit Form for this request */}
                      {editingRequest?.id === req.id && (
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700 space-y-2 mt-2">
                          <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Edit Proposed Name Before Approving</span>
                          </div>
                          <input
                            type="text"
                            value={editedProposedName}
                            onChange={(e) => setEditedProposedName(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingRequest(null)}
                              className="px-2.5 py-1 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApprove(req.id, editedProposedName)}
                              className="px-3 py-1 rounded-md bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 cursor-pointer"
                            >
                              Save & Approve Active
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Inline Rejection Prompt */}
                      {rejectionTargetId === req.id && (
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-rose-300 dark:border-rose-800 space-y-2 mt-2">
                          <div className="font-semibold text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Rejection Reason (Optional)</span>
                          </div>
                          <input
                            type="text"
                            placeholder="e.g. Does not comply with legal registered brand entity..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setRejectionTargetId(null)}
                              className="px-2.5 py-1 rounded-md text-slate-500 hover:text-slate-700 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(req.id)}
                              className="px-3 py-1 rounded-md bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 cursor-pointer"
                            >
                              Confirm Rejection
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: Request History */}
            {saTab === 'history' && (
              <div className="space-y-3">
                {companyRequests.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No requests recorded yet.</div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Proposed Name</th>
                          <th className="py-2.5 px-3">Submitted By</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Reviewed By</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {companyRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                              {req.proposed_name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              {req.requested_by_name}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  req.status === 'approved'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-teal-300 border border-emerald-300 dark:border-emerald-700'
                                    : req.status === 'rejected'
                                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                }`}
                              >
                                {req.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {req.reviewed_by_name || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                              {new Date(req.submitted_at).toLocaleDateString()}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(req.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Delete request record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Audit Trail */}
            {saTab === 'audit' && (
              <div className="space-y-2.5">
                <div className="text-[11px] text-slate-500">
                  Immutable audit records for all company name submissions, approvals, rejections, direct updates, and deletions.
                </div>
                {companyAuditHistory.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No audit events recorded yet.</div>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {companyAuditHistory.map((audit) => (
                      <div
                        key={audit.id}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-[10px]">
                            {audit.action.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(audit.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300">
                          {audit.details || `Changed from "${audit.previous_name}" to "${audit.new_name}"`}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Operator: <span className="font-medium text-slate-600 dark:text-slate-400">{audit.performed_by_name}</span> ({audit.performed_by_role})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* ADMIN INTERFACE                                                   */}
        {/* ================================================================= */}
        {isAdmin && !isSuperAdmin && (
          <div className="space-y-4">
            <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAdminTab('submit')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  adminTab === 'submit'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Submit Proposed Name
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('my_requests')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  adminTab === 'my_requests'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>My Submissions</span>
                {myRequests.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-bold">
                    {myRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: Admin Proposed Name Submission Form */}
            {adminTab === 'submit' && (
              <form onSubmit={handleAdminSubmit} className="space-y-3.5">
                {submissionMsg && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      submissionMsg.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    {submissionMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{submissionMsg.text}</span>
                  </div>
                )}

                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Governance Requirement: Super Admin Approval
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Under Accelvia organization governance rules, newly proposed company names require authorization by the Super Admin before becoming active. The active company name ("{companyName}") remains unchanged until approved.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Proposed New Company Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={proposedNameInput}
                      onChange={(e) => setProposedNameInput(e.target.value)}
                      placeholder="e.g. Acme Creative Agency"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={isSubmitting || !proposedNameInput.trim()}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Submitting...' : 'Submit Proposal for Approval'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: My Submissions */}
            {adminTab === 'my_requests' && (
              <div className="space-y-3">
                {myRequests.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    You have not submitted any company name requests yet.
                  </div>
                ) : (
                  myRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          "{req.proposed_name}"
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            req.status === 'approved'
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-teal-300 border border-emerald-300'
                              : req.status === 'rejected'
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300'
                              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Submitted: {new Date(req.submitted_at).toLocaleDateString()}
                        {req.reviewed_by_name && ` • Reviewed by ${req.reviewed_by_name}`}
                      </div>
                      {req.review_notes && (
                        <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-[11px]">
                          Note: {req.review_notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* MEMBER READ-ONLY INTERFACE                                        */}
        {/* ================================================================= */}
        {!isSuperAdmin && !isAdmin && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              Organization Information
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Company Name</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{companyName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Tagline</span>
                <span className="text-slate-700 dark:text-slate-300">{settings.tagline}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Website</span>
                <span className="text-slate-700 dark:text-slate-300">{settings.website}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Contact</span>
                <span className="text-slate-700 dark:text-slate-300">{settings.contactEmail}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
