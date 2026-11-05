// src/features/approvals/ClientReviewModal.tsx
// Secure Client Estimate Review Portal Simulator (Standalone client approval interface)

import React, { useState } from 'react';
import { ScopeVersion, Project } from '../../types';
import { Modal } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { formatHours, formatUSD } from '../../lib/formatting/currency';
import { DualTimeBadge } from '../../components/DualTimeBadge';
import { useOrganization } from '../organization/OrganizationContext';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ShieldCheck, 
  FileSpreadsheet, 
  Lock 
} from 'lucide-react';

interface ClientReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: ScopeVersion | null;
  project: Project;
  onClientDecision: (
    versionId: string,
    decision: 'approved' | 'rejected' | 'revision_requested',
    clientName: string,
    clientEmail: string,
    comment?: string
  ) => void;
}

export const ClientReviewModal: React.FC<ClientReviewModalProps> = ({
  isOpen,
  onClose,
  version,
  project,
  onClientDecision,
}) => {
  const { companyName } = useOrganization();
  const [clientName, setClientName] = useState('Client Reviewer');
  const [clientEmail, setClientEmail] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decisionRecorded, setDecisionRecorded] = useState<string | null>(null);

  if (!version) return null;

  const handleDecision = (decision: 'approved' | 'rejected' | 'revision_requested') => {
    setIsSubmitting(true);
    onClientDecision(version.id, decision, clientName, clientEmail, comment);
    setDecisionRecorded(decision);
    setIsSubmitting(false);
  };

  const isEligible = version.status === 'pending';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${companyName} Client Estimate Review Portal`}
      subtitle={`Secure client approval interface for ${project.name}`}
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Security Isolation Notice */}
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-slate-950 p-2.5 rounded-lg border border-emerald-200 dark:border-slate-800 text-emerald-800 dark:text-teal-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-teal-400 shrink-0" />
          <span>
            <strong>{companyName} Client Portal:</strong> Internal conversations, internal costs, and employee rosters are withheld by database security policies.
          </span>
        </div>

        {/* Commercial Scope Card */}
        <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Scope Estimate — v{version.version_number}.0
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Project: {project.name}</div>
            </div>
            <StatusBadge status={version.status} size="sm" />
          </div>

          {/* Scope Line Items Table */}
          <div className="border border-slate-200 dark:border-slate-800/80 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
                <tr>
                  <th className="py-2 px-3">Item / Deliverable</th>
                  <th className="py-2 px-3 text-right">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {version.items?.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-900/40">
                    <td className="py-2 px-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{item.title}</div>
                      {item.description && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.description}</div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700 dark:text-teal-300">
                      {formatHours(item.hours)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Commercial Totals */}
          <div className="flex justify-between items-center bg-slate-100/80 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800 font-mono">
            <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold">
              Authorized Total:
            </span>
            <div className="text-right">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {formatHours(version.total_hours_snapshot)}
              </div>
              {version.total_usd_snapshot != null && (
                <div className="text-emerald-700 dark:text-teal-400 font-bold text-xs">
                  {formatUSD(version.total_usd_snapshot)} USD
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Client Decision Section */}
        {decisionRecorded ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 p-4 rounded-xl text-center space-y-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <div className="font-bold text-emerald-800 dark:text-emerald-300">Decision Recorded Successfully</div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px]">
              Your decision ({decisionRecorded.toUpperCase()}) has been cryptographically locked and recorded in the audit history.
            </p>
          </div>
        ) : isEligible ? (
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="font-semibold text-slate-800 dark:text-slate-200">Record Formal Client Response</div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Your Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Your Business Email</label>
                <input
                  type="text"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@company.com (any platform)"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                Comments or Revision Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Include feedback, questions, or clarification requests..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDecision('rejected')}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 font-semibold text-xs transition"
              >
                Reject Scope
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDecision('revision_requested')}
                className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-700 dark:text-orange-300 hover:bg-orange-500/20 font-semibold text-xs transition"
              >
                Request Revision
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDecision('approved')}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-900/30"
              >
                Approve & Authorize
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-500 p-3 italic">
            This estimate is currently in <strong>{version.status}</strong> status and cannot accept client decisions.
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition"
          >
            Close Portal View
          </button>
        </div>
      </div>
    </Modal>
  );
};
