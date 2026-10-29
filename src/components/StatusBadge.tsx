// src/components/StatusBadge.tsx
// Accessible status indicator badges conforming to Section 5.3 color requirements

import React from 'react';
import { 
  ScopeVersionStatus, 
  WorkOrderStatus, 
  ProjectStatus, 
  ClientStatus 
} from '../types';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Archive, 
  Send, 
  PlayCircle,
  Truck
} from 'lucide-react';

type AnyStatus = ScopeVersionStatus | WorkOrderStatus | ProjectStatus | ClientStatus | string;

interface StatusBadgeProps {
  status: AnyStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = String(status).toLowerCase();

  let label = norm.replace(/_/g, ' ');
  let styleClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  let Icon = FileText;

  switch (norm) {
    case 'draft':
      label = 'Draft';
      styleClasses = 'bg-slate-800/80 text-slate-300 border-slate-700';
      Icon = FileText;
      break;

    case 'pending':
      label = 'Pending Review';
      styleClasses = 'bg-amber-950/60 text-amber-300 border-amber-800/80';
      Icon = Clock;
      break;

    case 'revision_requested':
      label = 'Revision Requested';
      styleClasses = 'bg-orange-950/60 text-orange-300 border-orange-800/80';
      Icon = AlertCircle;
      break;

    case 'approved':
      label = 'Approved';
      styleClasses = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80';
      Icon = CheckCircle2;
      break;

    case 'rejected':
      label = 'Rejected';
      styleClasses = 'bg-rose-950/60 text-rose-300 border-rose-800/80';
      Icon = XCircle;
      break;

    case 'superseded':
      label = 'Superseded (Historic)';
      styleClasses = 'bg-slate-800/50 text-slate-400 border-slate-700/60';
      Icon = Archive;
      break;

    case 'in_progress':
      label = 'In Progress';
      styleClasses = 'bg-cyan-950/60 text-cyan-300 border-cyan-800/80';
      Icon = PlayCircle;
      break;

    case 'delivered':
      label = 'Work Delivered';
      styleClasses = 'bg-yellow-950/60 text-yellow-300 border-yellow-800/80';
      Icon = Truck;
      break;

    case 'completed':
      label = 'Completed';
      styleClasses = 'bg-teal-950/60 text-teal-300 border-teal-800/80';
      Icon = CheckCircle2;
      break;

    case 'active':
      label = 'Active';
      styleClasses = 'bg-emerald-950/50 text-emerald-400 border-emerald-800/60';
      Icon = CheckCircle2;
      break;

    case 'archived':
    case 'void':
      label = norm === 'void' ? 'Void' : 'Archived';
      styleClasses = 'bg-slate-900 text-slate-500 border-slate-800';
      Icon = Archive;
      break;

    default:
      label = status;
      break;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium uppercase tracking-wider ${sizeClasses} ${styleClasses}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{label}</span>
    </span>
  );
};
