// src/features/workspace/RightPanelConversation.tsx
// Right Panel: Project Primary Conversation with rich-text, attachments, dual-time, and Super Admin masking

import React, { useState, useMemo } from 'react';
import { Project, Client, SafeMessage, ScopeVersion } from '../../types';
import { useAuth, TeamMember } from '../auth/AuthContext';
import { RichTextEditor } from '../conversations/RichTextEditor';
import { FormattedMessageText, MentionCandidate } from '../conversations/MentionAutocomplete';
import { RichMessageRenderer } from '../conversations/RichMessageRenderer';
import { EstimateConversationCard } from '../conversations/EstimateConversationCard';
import { WorkOrderConversationCard } from '../conversations/WorkOrderConversationCard';
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
  CheckCircle2,
  Building2,
  ChevronLeft
} from 'lucide-react';

interface RightPanelConversationProps {
  project: Project | null;
  client?: Client | null;
  messages: SafeMessage[];
  versions: ScopeVersion[];
  teamMembers?: TeamMember[];
  onSendMessage: (contentJson: Record<string, unknown>, attachments: File[]) => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onApproveEstimate: (versionId: string) => void;
  onGenerateWorkOrder?: (versionId: string) => void;
  onOpenAuditConsole: () => void;
  onOpenEstimateDraftModal: () => void;
  onOpenCorrectTimeModal: (message: SafeMessage) => void;
  onUpdateWorkOrderStatus?: (woId: string, status: any) => void;
  onBackToProjects?: () => void;
}

export const RightPanelConversation: React.FC<RightPanelConversationProps> = ({
  project,
  client,
  messages,
  versions,
  teamMembers,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onApproveEstimate,
  onGenerateWorkOrder,
  onOpenAuditConsole,
  onOpenEstimateDraftModal,
  onOpenCorrectTimeModal,
  onUpdateWorkOrderStatus,
  onBackToProjects,
}) => {
  const { currentUser, isSuperAdmin, isMember, canViewMoney, teamMembers: contextTeamMembers } = useAuth();
  const activeTeamMembers = teamMembers || contextTeamMembers || [];

  const mentionCandidates: MentionCandidate[] = useMemo(() => {
    return activeTeamMembers.map((m) => ({
      id: m.user_id,
      display_name: m.display_name,
      email: m.email,
      role: m.role,
      avatar_text: m.display_name.charAt(0).toUpperCase(),
      is_management: m.role === 'super_admin',
    }));
  }, [activeTeamMembers]);

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

  // Helper to extract text from Tiptap JSON with recursive paragraph/list/table traversal
  const extractText = (json: any): string => {
    try {
      if (!json) return '';
      if (typeof json === 'string') return json;
      if (Array.isArray(json.content)) {
        const lines: string[] = [];
        const processNode = (node: any) => {
          if (node?.type === 'paragraph' || node?.type === 'heading' || node?.type === 'listItem') {
            const pTexts: string[] = [];
            const collect = (child: any) => {
              if (child?.text) pTexts.push(child.text);
              if (Array.isArray(child?.content)) child.content.forEach(collect);
            };
            collect(node);
            if (pTexts.length > 0) lines.push(pTexts.join(''));
          } else if (node?.text) {
            lines.push(node.text);
          } else if (Array.isArray(node?.content)) {
            node.content.forEach(processNode);
          }
        };
        json.content.forEach(processNode);
        if (lines.length > 0) return lines.join('\n');
      }
      return '';
    } catch {
      return '';
    }
  };

  if (!project) {
    return (
      <div className="w-full lg:flex-1 h-full flex flex-col items-center justify-center bg-slate-950 p-8 text-center text-slate-500">
        <MessageSquare className="w-12 h-12 text-slate-800 mb-3" />
        <h3 className="text-sm font-bold text-slate-300">No Conversation Active</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Select or initialize a project from the left panel to start messaging and sharing estimates.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full lg:flex-1 h-full flex flex-col bg-slate-100/60 dark:bg-slate-950 overflow-hidden min-w-0 text-slate-900 dark:text-slate-100">
      {/* Conversation Top Header */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950/80 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBackToProjects && (
            <button
              onClick={onBackToProjects}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900 transition shrink-0"
              title="Back to projects"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 dark:bg-teal-500/10 border border-emerald-200 dark:border-teal-500/20 text-emerald-600 dark:text-teal-400 shrink-0">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">Project Conversation</h2>
              <span className="hidden sm:inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-800/60 shrink-0">
                Primary Thread
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 sm:gap-2 mt-0.5 truncate">
              {client && (
                <>
                  <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-semibold truncate">
                    <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-teal-400 shrink-0" />
                    <span className="truncate">{client.name}</span>
                  </span>
                  <span className="text-slate-400 dark:text-slate-600">•</span>
                </>
              )}
              <span className="truncate font-medium">{project.name}</span>
              <span className="text-slate-400 dark:text-slate-600 hidden md:inline">•</span>
              <span className="font-mono text-cyan-700 dark:text-cyan-300 hidden md:inline truncate">{project.timezone}</span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {canViewMoney && (
            <button
              onClick={onOpenEstimateDraftModal}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/30 text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition"
              title="Create new scope estimate"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Create Estimate</span>
              <span className="sm:hidden text-[11px]">Estimate</span>
            </button>
          )}

          {isSuperAdmin && (
            <button
              onClick={onOpenAuditConsole}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30 text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition"
              title="Super Admin Private Audit Console"
            >
              <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Audit Console</span>
              <span className="sm:hidden text-[11px]">Audit</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Feed Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-3 sm:space-y-4">
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
                <div className="flex-1 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 space-y-2 hover:border-slate-300 dark:hover:border-slate-700/80 transition shadow-xs">
                  {/* Message Meta Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${
                          isAuthorSuperAdmin ? 'text-amber-700 dark:text-amber-300 font-bold' : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {displayedAuthor}
                      </span>

                      {isAuthorSuperAdmin && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-amber-100 border border-amber-300 text-amber-800 dark:bg-amber-950/80 dark:border-amber-800 dark:text-amber-400">
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

                  {/* Render Message Content with high-fidelity rich tables, lists, formatting & @mentions */}
                  <div className="text-slate-800 dark:text-slate-200 leading-relaxed space-y-1">
                    {msg.is_deleted && !isSuperAdmin ? (
                      <span className="text-slate-500 italic">[This message was deleted]</span>
                    ) : (
                      <RichMessageRenderer
                        contentJson={msg.content_json}
                        currentUserName={currentUser.display_name}
                        candidates={mentionCandidates}
                      />
                    )}
                  </div>

                  {/* Interactive Estimate Scope Card (Orange tab when pending; Green border when approved) */}
                  {(() => {
                    const matchedVersion = msg.estimate_version_id
                      ? versions.find((v) => v.id === msg.estimate_version_id)
                      : null;
                    const cardData = matchedVersion || msg.estimate_card;

                    if (cardData) {
                      return (
                        <EstimateConversationCard
                          version={cardData as ScopeVersion}
                          packageTitle={msg.estimate_card?.package_title || 'Core Project Scope'}
                          onApprove={onApproveEstimate}
                          onGenerateWorkOrder={onGenerateWorkOrder}
                        />
                      );
                    }
                    return null;
                  })()}

                  {/* Interactive Work Order Card (Generated and Delivered to Client) */}
                  {msg.work_order_card && (
                    <WorkOrderConversationCard
                      workOrder={msg.work_order_card}
                      projectName={project?.name || 'Project'}
                      canViewMoney={canViewMoney}
                      onMarkComplete={onUpdateWorkOrderStatus ? (woId) => onUpdateWorkOrderStatus(woId, 'completed') : undefined}
                    />
                  )}

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
      <div className="p-2.5 sm:p-4 border-t border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80">
        <RichTextEditor onSendMessage={onSendMessage} teamMembers={activeTeamMembers} />
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
