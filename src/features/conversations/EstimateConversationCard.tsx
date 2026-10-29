// src/features/conversations/EstimateConversationCard.tsx
// Interactive estimate card embedded directly in the conversation feed
// Shows special orange border & tab when Pending; transitions to Green border when Approved by Admin/Super Admin

import React, { useState } from 'react';
import { ScopeVersion, ScopeVersionStatus } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import { formatHours, formatUSD, formatBDT } from '../../lib/formatting/currency';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  DollarSign, 
  ShieldCheck, 
  FileCheck,
  Check
} from 'lucide-react';

interface EstimateConversationCardProps {
  version: ScopeVersion;
  packageTitle?: string;
  onApprove: (versionId: string) => void;
  onGenerateWorkOrder?: (versionId: string) => void;
}

export const EstimateConversationCard: React.FC<EstimateConversationCardProps> = ({
  version,
  packageTitle = 'Scope Package',
  onApprove,
  onGenerateWorkOrder,
}) => {
  const { canViewMoney, isSuperAdmin, isAdmin } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isApproving, setIsApproving] = useState(false);

  const isApproved = version.status === 'approved';
  const isPending = version.status === 'pending';
  const canApprove = (isSuperAdmin || isAdmin) && isPending;

  const handleApproveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsApproving(true);
    onApprove(version.id);
    setTimeout(() => setIsApproving(false), 500);
  };

  // Border & Accent Color System as specified by user:
  // "it will show like special tab with orange color when the admin or super admin approved it it will be green border"
  const containerClasses = isApproved
    ? 'border-2 border-emerald-500 bg-gradient-to-br from-emerald-950/30 via-slate-900/90 to-slate-950 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
    : isPending
    ? 'border-2 border-orange-500 bg-gradient-to-br from-orange-950/30 via-slate-900/90 to-slate-950 shadow-lg shadow-orange-950/40 ring-1 ring-orange-500/30'
    : 'border border-slate-800 bg-slate-900/90';

  const tabHeaderColor = isApproved
    ? 'bg-emerald-950/80 text-emerald-300 border-b border-emerald-800/80'
    : isPending
    ? 'bg-orange-950/80 text-orange-300 border-b border-orange-800/80'
    : 'bg-slate-900 text-slate-300 border-b border-slate-800';

  return (
    <div className={`rounded-xl overflow-hidden transition-all duration-300 my-2.5 ${containerClasses}`}>
      {/* Special Top Tab Banner */}
      <div className={`px-3 sm:px-4 py-2 flex items-center justify-between text-xs font-semibold tracking-wide ${tabHeaderColor}`}>
        <div className="flex items-center gap-2 min-w-0 pr-2">
          {isApproved ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : isPending ? (
            <Clock className="w-4 h-4 text-orange-400 shrink-0 animate-pulse" />
          ) : (
            <FileSpreadsheet className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <span className="uppercase text-[10px] sm:text-[11px] font-bold truncate">
            {isApproved
              ? 'Authorized Estimate Scope • Approved'
              : isPending
              ? 'Active Estimate Scope Proposal • Pending'
              : `Estimate Scope • ${version.status}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <StatusBadge status={version.status} size="sm" />
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-black/20 text-slate-400 hover:text-slate-200 transition"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Card Content */}
      <div className="p-3 sm:p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-100 flex items-center gap-2 flex-wrap">
              <span className="truncate">{packageTitle}</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                v{version.version_number}.0
              </span>
            </div>
            {version.scope_summary && (
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {version.scope_summary}
              </p>
            )}
          </div>

          {/* Prominent Hours Metric */}
          <div className="text-right shrink-0 bg-slate-950/80 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-slate-800/80">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Scope</div>
            <div className="text-sm sm:text-base font-bold font-mono text-teal-300">
              {formatHours(version.total_hours_snapshot)}
            </div>
          </div>
        </div>

        {/* Monetary Totals Bar (Only for Super Admin and Admin) */}
        {canViewMoney && version.total_usd_snapshot != null && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono bg-slate-950/90 px-3 py-2 rounded-lg border border-slate-800/80 gap-1.5 sm:gap-0">
            <div className="flex items-center gap-1.5 text-slate-400">
              <DollarSign className="w-3.5 h-3.5 text-teal-400" />
              <span className="uppercase text-[10px] font-semibold">Commercial Value:</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-100 font-bold text-xs">
                {formatUSD(version.total_usd_snapshot)}
              </span>
              <span className="text-slate-400 text-[11px]">
                {formatBDT(version.total_bdt_snapshot)}
              </span>
            </div>
          </div>
        )}

        {/* Expandable Line Items Preview */}
        {isExpanded && version.items && version.items.length > 0 && (
          <div className="border border-slate-800/80 rounded-lg overflow-hidden bg-slate-950/60">
            <div className="bg-slate-900/60 px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-800/80 flex justify-between">
              <span>Deliverable / Scope Task</span>
              <span className="text-right">Estimated Hours</span>
            </div>
            <div className="divide-y divide-slate-800/60 text-xs">
              {version.items.map((item, idx) => (
                <div key={idx} className="px-3 py-2 flex items-center justify-between hover:bg-slate-900/30">
                  <div className="min-w-0 pr-2">
                    <div className="font-medium text-slate-200 truncate">{item.title}</div>
                    {item.description && (
                      <div className="text-[11px] text-slate-400 truncate">{item.description}</div>
                    )}
                  </div>
                  <div className="font-mono text-teal-300 font-semibold shrink-0">
                    {formatHours(item.hours)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approval and Action Footer */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            {isApproved ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Approved & Authorized by Management</span>
              </span>
            ) : isPending ? (
              <span className="text-orange-300/90 font-medium">
                Awaiting client or executive approval
              </span>
            ) : (
              <span>Status: {version.status}</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Direct Approve Action for Admin / Super Admin */}
            {canApprove && (
              <button
                type="button"
                onClick={handleApproveClick}
                disabled={isApproving}
                className="w-full sm:w-auto justify-center px-4 py-2 sm:py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-emerald-950 active:scale-95"
                title="Approve this estimate directly from conversation"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isApproving ? 'Approving...' : 'Approve Estimate'}</span>
              </button>
            )}

            {/* If already approved and Admin/SA: option to generate work order */}
            {isApproved && canViewMoney && onGenerateWorkOrder && (
              <button
                type="button"
                onClick={() => onGenerateWorkOrder(version.id)}
                className="w-full sm:w-auto justify-center px-3 py-2 sm:py-1.5 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Generate Work Order</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

