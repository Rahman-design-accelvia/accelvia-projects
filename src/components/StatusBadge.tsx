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
      styleClasses = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700';
      Icon = FileText;
      break;

    case 'pending':
      label = 'Pending Review';
      styleClasses = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80';
      Icon = Clock;
      break;

    case 'revision_requested':
      label = 'Revision Requested';
      styleClasses = 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/80';
      Icon = AlertCircle;
      break;

    case 'approved':
      label = 'Approved';
      styleClasses = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80';
      Icon = CheckCircle2;
      break;

    case 'rejected':
      label = 'Rejected';
      styleClasses = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80';
      Icon = XCircle;
      break;

    case 'superseded':
      label = 'Superseded (Historic)';
      styleClasses = 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/60';
      Icon = Archive;
      break;

    case 'in_progress':
      label = 'In Progress';
      styleClasses = 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/80';
      Icon = PlayCircle;
      break;

    case 'delivered':
      label = 'Work Delivered';
      styleClasses = 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800/80';
      Icon = Truck;
      break;

    case 'completed':
      label = 'Completed';
      styleClasses = 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/80';
      Icon = CheckCircle2;
      break;

    case 'active':
      label = 'Active';
      styleClasses = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/60';
      Icon = CheckCircle2;
      break;

    case 'archived':
    case 'void':
      label = norm === 'void' ? 'Void' : 'Archived';
      styleClasses = 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800';
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
