// src/components/DualTimeBadge.tsx
// High-precision dual-time display component showing both project local time and Bangladesh time

import React from 'react';
import { formatDualTime } from '../lib/timezone';
import { Clock, Globe } from 'lucide-react';

interface DualTimeBadgeProps {
  isoInstant: string | Date;
  projectIanaTimezone?: string;
  variant?: 'inline' | 'stacked' | 'detailed';
}

export const DualTimeBadge: React.FC<DualTimeBadgeProps> = ({
  isoInstant,
  projectIanaTimezone = 'America/New_York',
  variant = 'inline',
}) => {
  const dual = formatDualTime(isoInstant, projectIanaTimezone);

  if (!dual.clientDate) {
    return <span className="text-xs text-slate-500">Invalid time</span>;
  }

  if (variant === 'stacked') {
    return (
      <div className="flex flex-col text-xs space-y-0.5">
        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-mono">
          <Globe className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span>
            {dual.clientTime} <span className="text-slate-500">{dual.clientTzAbbrev}</span>
            {!dual.isSameDate && <span className="text-amber-600 dark:text-amber-400 ml-1">({dual.clientDate})</span>}
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-mono">
          <Clock className="w-3 h-3 text-emerald-600 dark:text-teal-400 shrink-0" />
          <span>
            {dual.bangladeshTime} <span className="text-slate-500">BST (BD)</span>
            {!dual.isSameDate && <span className="text-amber-600 dark:text-amber-400 ml-1">({dual.bangladeshDate})</span>}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 text-xs font-mono bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300">
      <div className="flex items-center gap-1">
        <Globe className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
        <span>
          {dual.clientTime} <span className="text-slate-500">{dual.clientTzAbbrev}</span>
        </span>
      </div>
      <span className="text-slate-400 dark:text-slate-600">/</span>
      <div className="flex items-center gap-1">
        <Clock className="w-3 h-3 text-emerald-600 dark:text-teal-400" />
        <span>
          {dual.bangladeshTime} <span className="text-slate-500">BD</span>
        </span>
      </div>
      {!dual.isSameDate && (
        <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 dark:text-amber-400 dark:bg-amber-950/60 dark:border-amber-800/50 px-1 rounded">
          +1 Day (BD)
        </span>
      )}
    </div>
  );
};
