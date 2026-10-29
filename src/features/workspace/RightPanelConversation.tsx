// src/features/workspace/RightPanelConversation.tsx
// Right Panel: Project Primary Conversation with rich-text, attachments, dual-time, and Super Admin masking

import React, { useState } from 'react';
import { Project, SafeMessage } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { RichTextEditor } from '../conversations/RichTextEditor';
import { DualTimeBadge } from '../../components/DualTimeBadge';
import { Modal } from '../../components/Modal';
import { 
  MessageSquare, 
  ShieldAlert, 
  Trash2, 
  Edit3, 
  Clock, 
  Paperclip, 
  User, 
  Sparkles,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';

interface RightPanelConversationProps {
  project: Project;
  messages: SafeMessage[];
  onSendMessage: (contentJson: Record<string, unknown>, attachments: File[]) => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onOpenAuditConsole: () => void;
  onOpenEstimateDraftModal: () => void;
  onOpenCorrectTimeModal: (message: SafeMessage) => void;
}

export const RightPanelConversation: React.FC<RightPanelConversationProps> = ({
  project,
  messages,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onOpenAuditConsole,
  onOpenEstimateDraftModal,
  onOpenCorrectTimeModal,
}) => {
  const { currentUser, isSuperAdmin, isMember, canViewMoney } = useAuth();

  // Edit message modal state
  const [editingMessage, setEditingMessage] = useState<SafeMessage | null>(null);
  const [editText, setEditText] = useState('');

  const handleStartEdit = (msg: SafeMessage) => {
    setEditingMessage(msg);
    // Simple text extraction for MVP edit modal
    const text = extractText(msg.content_json);
    setEditText(text);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMessage) return;
    onEditMessage(editingMessage.id, editText);
    setEditingMessage(null);
  };

  // Helper to extract text from simple tiptap json
  const extractText = (json: any): string => {
    try {
      if (!json || !json.content) return '';
      return json.content
        .map((p: any) => (p.content ? p.content.map((c: any) => c.text).join('') : ''))
        .join('\n');
    } catch {
      return '';
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Conversation Top Header */}
      <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">Project Conversation</h2>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-teal-950/80 text-teal-300 border border-teal-800/60">
                Primary Thread
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{project.name}</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-cyan-300">{project.timezone}</span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2">
          {canViewMoney && (
            <button
              onClick={onOpenEstimateDraftModal}
              className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Create Estimate</span>
            </button>
          )}

          {isSuperAdmin && (
            <button
              onClick={onOpenAuditConsole}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Super Admin Private Audit Console"
            >
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              <span>Audit Console</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Feed Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-16 text-slate-500 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-700" />
            <div className="text-sm font-medium">No messages in this conversation yet.</div>
            <div className="text-xs text-slate-600">Start the conversation below using the rich-text editor.</div>
          </div>
        ) : (
          messages.map((msg) => {
            const isAuthorSuperAdmin = msg.author_is_management;
            // Super Admin identity masking: if author is SA and viewer is not SA, show 'Management'
            const displayedAuthor = (!isSuperAdmin && isAuthorSuperAdmin) ? 'Management' : msg.author_name;
            const canEdit = isSuperAdmin || msg.author_id === currentUser.user_id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs group ${
                  msg.is_deleted ? 'opacity-60 italic' : ''
                }`}
              >
                {/* Author Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold ${
                    isAuthorSuperAdmin
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-teal-400 border border-slate-700'
                  }`}
                >
                  {isAuthorSuperAdmin ? (
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  ) : (
                    displayedAuthor.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Message Body */}
                <div className="flex-1 bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 space-y-2 hover:border-slate-700/80 transition">
                  {/* Message Meta Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${
                          isAuthorSuperAdmin ? 'text-amber-300 font-bold' : 'text-slate-200'
                        }`}
                      >
                        {displayedAuthor}
                      </span>

                      {isAuthorSuperAdmin && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-800 text-amber-400">
                          Management
                        </span>
                      )}

                      {msg.is_edited && !msg.is_deleted && (
                        <span className="text-[10px] text-slate-500">(edited)</span>
                      )}
                    </div>

                    {/* Dual-Time Timestamp Display */}
                    <div className="flex items-center gap-2">
                      <DualTimeBadge
                        isoInstant={msg.event_at}
                        projectIanaTimezone={project.timezone}
                        variant="inline"
                      />

                      {/* Message Actions */}
                      <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                        {canEdit && !msg.is_deleted && (
                          <button
                            onClick={() => handleStartEdit(msg)}
                            className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800"
                            title="Edit message"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canEdit && !msg.is_deleted && (
                          <button
                            onClick={() => onDeleteMessage(msg.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                            title="Delete message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Super Admin Privileged Event Time Correction */}
                        {isSuperAdmin && (
                          <button
                            onClick={() => onOpenCorrectTimeModal(msg)}
                            className="p-1 rounded text-slate-500 hover:text-indigo-300 hover:bg-slate-800"
                            title="Super Admin: Correct event time (Audited)"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Render Message Content */}
                  <div className="text-slate-200 leading-relaxed space-y-1">
                    {msg.is_deleted && !isSuperAdmin ? (
                      <span className="text-slate-500">[This message was deleted]</span>
                    ) : (
                      <p className="whitespace-pre-wrap">{extractText(msg.content_json)}</p>
                    )}
                  </div>

                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800/60">
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-1.5 text-[11px] bg-slate-950 px-2 py-1 rounded border border-slate-800 text-teal-300"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span className="truncate max-w-[200px]">{att.original_filename}</span>
                          <span className="text-slate-500">
                            ({(att.size_bytes / 1024 / 1024).toFixed(1)}MB)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message Input Composer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/80">
        <RichTextEditor onSendMessage={onSendMessage} />
      </div>

      {/* Edit Message Modal */}
      <Modal
        isOpen={Boolean(editingMessage)}
        onClose={() => setEditingMessage(null)}
        title="Edit Message"
        subtitle="Changes are captured in the private audit log"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Message Text</label>
            <textarea
              rows={4}
              required
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingMessage(null)}
              className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
