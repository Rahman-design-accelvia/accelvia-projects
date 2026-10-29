// src/features/audit/CorrectEventTimeModal.tsx
// Super Admin privileged event_at timestamp correction modal with mandatory audit reason

import React, { useState } from 'react';
import { SafeMessage } from '../../types';
import { Modal } from '../../components/Modal';
import { DualTimeBadge } from '../../components/DualTimeBadge';
import { Clock, AlertTriangle } from 'lucide-react';

interface CorrectEventTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: SafeMessage | null;
  projectIanaTimezone: string;
  onConfirmCorrection: (messageId: string, newIsoString: string, reason: string) => void;
}

export const CorrectEventTimeModal: React.FC<CorrectEventTimeModalProps> = ({
  isOpen,
  onClose,
  message,
  projectIanaTimezone,
  onConfirmCorrection,
}) => {
  const [newTimestamp, setNewTimestamp] = useState('');
  const [reason, setReason] = useState('');

  if (!message) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTimestamp || !reason.trim()) return;
    onConfirmCorrection(message.id, new Date(newTimestamp).toISOString(), reason.trim());
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Correct Event Timestamp (Super Admin Only)"
      subtitle="Audited historical correction of displayed business event time"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Warning Alert */}
        <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 p-3 rounded-lg text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>Forensic Immutability:</strong> The underlying row creation time (
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {new Date(message.created_at).toISOString()}
            </span>
            ) remains immutable. This action corrects the business display instant (
            <span className="font-mono text-emerald-700 dark:text-teal-300">event_at</span>) and logs a permanent audit entry with your stated reason.
          </div>
        </div>

        {/* Current Time Display */}
        <div>
          <label className="block text-slate-600 dark:text-slate-400 mb-1">Current Displayed Event Time:</label>
          <DualTimeBadge isoInstant={message.event_at} projectIanaTimezone={projectIanaTimezone} />
        </div>

        {/* New Timestamp Input */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
            New Business Event Instant (Local/ISO)
          </label>
          <input
            type="datetime-local"
            required
            value={newTimestamp}
            onChange={(e) => setNewTimestamp(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
          />
        </div>

        {/* Mandatory Reason */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
            Correction Reason (Required for Audit Log)
          </label>
          <textarea
            rows={3}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Document why this event time is being adjusted (e.g. offline phone confirmation occurred at 10:00 AM)..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-md shadow-emerald-950/20"
          >
            Commit Audited Correction
          </button>
        </div>
      </form>
    </Modal>
  );
};
