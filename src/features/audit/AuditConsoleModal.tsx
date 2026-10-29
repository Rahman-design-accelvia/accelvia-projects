// src/features/audit/AuditConsoleModal.tsx
// Super Admin Private Audit Console: Immutable forensic audit log and diff viewer

import React, { useState } from 'react';
import { AuditEvent } from '../../types';
import { Modal } from '../../components/Modal';
import { DualTimeBadge } from '../../components/DualTimeBadge';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  History, 
  ArrowRight, 
  Clock, 
  User, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';

interface AuditConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditEvents: AuditEvent[];
}

export const AuditConsoleModal: React.FC<AuditConsoleModalProps> = ({
  isOpen,
  onClose,
  auditEvents,
}) => {
  const [filterAction, setFilterAction] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const filteredEvents = auditEvents.filter((ev) => {
    if (filterAction !== 'all' && ev.action !== filterAction) return false;
    return true;
  });

  const actions = Array.from(new Set(auditEvents.map((e) => e.action)));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Super Admin Audit Console"
      subtitle="Append-only forensic event log with before/after state diffs (Confidential)"
      maxWidth="4xl"
    >
      <div className="space-y-4 text-xs">
        {/* Controls Bar */}
        <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-slate-300">Filter Action:</span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
            >
              <option value="all">All Actions ({auditEvents.length})</option>
              {actions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Append-only: Modifications strictly revoked
          </div>
        </div>

        {/* Audit Events List and Diff Viewer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Events List */}
          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
            {filteredEvents.map((ev) => {
              const isSelected = selectedEvent?.id === ev.id;
              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/60'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-indigo-300">{ev.action}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {ev.entity_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-1.5">
                    <User className="w-3 h-3 text-slate-500" />
                    <span>Actor: {ev.actor_role_snapshot || 'System / External Client'}</span>
                  </div>

                  {ev.reason && (
                    <div className="text-[11px] text-amber-300/80 italic mt-1">
                      Reason: "{ev.reason}"
                    </div>
                  )}

                  <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Server Instant:</span>
                    <span>{new Date(ev.server_recorded_at).toLocaleTimeString()} UTC</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Diff & Inspector View */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col max-h-[450px] overflow-hidden">
            {selectedEvent ? (
              <div className="space-y-3 overflow-y-auto flex-1">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <div className="font-bold text-slate-200">{selectedEvent.action}</div>
                    <div className="text-[11px] font-mono text-slate-500">
                      Entity ID: {selectedEvent.entity_id}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                    Source: {selectedEvent.source}
                  </span>
                </div>

                {/* State Diff */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Before State vs After State
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800 overflow-x-auto">
                      <div className="text-rose-400 font-bold mb-1">BEFORE:</div>
                      <pre className="text-slate-400 text-[10px]">
                        {selectedEvent.before_state
                          ? JSON.stringify(selectedEvent.before_state, null, 2)
                          : 'null (Initial Creation)'}
                      </pre>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800 overflow-x-auto">
                      <div className="text-emerald-400 font-bold mb-1">AFTER:</div>
                      <pre className="text-slate-300 text-[10px]">
                        {selectedEvent.after_state
                          ? JSON.stringify(selectedEvent.after_state, null, 2)
                          : 'null (Deleted)'}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <History className="w-8 h-8 mb-2 text-slate-700" />
                <p>Select an audit event from the list to inspect state diffs.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
          >
            Close Console
          </button>
        </div>
      </div>
    </Modal>
  );
};
