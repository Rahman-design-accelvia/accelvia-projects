// src/features/conversations/RichTextEditor.tsx
// Tiptap rich-text editor with table support, clipboard paste normalization, upload validation,
// and Google L6-standard accessible @mention autocomplete system.

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { normalizePastedHtml, validateAttachment } from '../../lib/rich-text/paste-normalizer';
import { useAuth, TeamMember } from '../auth/AuthContext';
import { MentionPopover, MentionCandidate } from './MentionAutocomplete';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Table as TableIcon,
  Paperclip,
  Send,
  AlertTriangle,
  AtSign,
} from 'lucide-react';

interface RichTextEditorProps {
  onSendMessage: (contentJson: Record<string, unknown>, attachments: File[]) => void;
  placeholder?: string;
  disabled?: boolean;
  teamMembers?: TeamMember[];
}

interface MentionState {
  isOpen: boolean;
  query: string;
  range: { from: number; to: number };
  filteredCandidates: MentionCandidate[];
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  onSendMessage,
  placeholder = 'Write a message... Type @ to mention a team member. (Ctrl+Enter to send)',
  disabled = false,
  teamMembers: propTeamMembers,
}) => {
  const { teamMembers: contextTeamMembers } = useAuth();
  const availableMembers = propTeamMembers || contextTeamMembers || [];

  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<{ error: string; recommendation?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mention autocomplete state
  const [mentionState, setMentionState] = useState<MentionState | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Mutable refs for editor event callbacks (prevents stale closures in Tiptap event handlers)
  const mentionStateRef = useRef<MentionState | null>(null);
  mentionStateRef.current = mentionState;
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  // Transform system team members into candidate list
  const candidates: MentionCandidate[] = useMemo(() => {
    const list: MentionCandidate[] = availableMembers
      .filter((m) => m.status === 'active' || !m.status)
      .map((m) => ({
        id: m.user_id,
        display_name: m.display_name,
        email: m.email,
        role: m.role,
        avatar_text: m.display_name.charAt(0).toUpperCase(),
        is_management: m.role === 'super_admin',
      }));

    // Prepend @Management option for team-wide management ping
    if (!list.some((c) => c.id === 'management')) {
      list.unshift({
        id: 'management',
        display_name: 'Management',
        email: 'management@accelvia.internal',
        role: 'management',
        avatar_text: 'M',
        is_management: true,
      });
    }

    return list;
  }, [availableMembers]);

  const candidatesRef = useRef(candidates);
  candidatesRef.current = candidates;

  // Check cursor position for @mention query trigger
  const checkMentionTrigger = (editorInstance: any) => {
    if (!editorInstance) return;
    try {
      const { state } = editorInstance;
      const { selection } = state;
      const { $from, from, to } = selection;

      // Only evaluate if cursor is collapsed
      if (from !== to) {
        if (mentionStateRef.current?.isOpen) setMentionState(null);
        return;
      }

      // Check text in current block preceding the cursor (up to 35 chars)
      const parentOffset = $from.parentOffset;
      const fromOffset = Math.max(0, parentOffset - 35);
      const textBefore = $from.parent.textBetween(fromOffset, parentOffset, undefined, '\ufffc');

      // Match @ followed by non-newline characters (avoid email addresses like test@foo.com)
      const match = /(?:^|\s)@([a-zA-Z0-9_\s.()'-]{0,25})$/.exec(textBefore);

      if (match) {
        const query = match[1];
        // Calculate starting document index of '@'
        const matchLength = query.length + 1; // +1 for the '@' symbol
        const startPos = from - matchLength;

        const q = query.toLowerCase().trim();
        const filtered = candidatesRef.current.filter((c) => {
          if (!q) return true;
          return (
            c.display_name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.role.toLowerCase().includes(q)
          );
        });

        setSelectedIndex(0);
        setMentionState({
          isOpen: true,
          query,
          range: { from: startPos, to: from },
          filteredCandidates: filtered,
        });
      } else {
        if (mentionStateRef.current?.isOpen) {
          setMentionState(null);
        }
      }
    } catch {
      // Graceful fallback if DOM is mid-render
    }
  };

  const handleSelectCandidate = (candidate: MentionCandidate) => {
    if (!editor || !mentionStateRef.current) return;
    const { range } = mentionStateRef.current;
    const mentionText = `@${candidate.display_name} `;

    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent(mentionText)
      .run();

    setMentionState(null);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-teal-400 hover:underline',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose max-w-none text-slate-900 dark:text-slate-100 dark:prose-invert px-3 py-2 text-sm focus:outline-none min-h-[90px]',
      },
      handlePaste: (view, event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const html = clipboardData.getData('text/html');
        if (html) {
          event.preventDefault();
          // Normalize clipboard styles to match destination theme & remove dark backgrounds
          const normalized = normalizePastedHtml(html);
          editor?.commands.insertContent(normalized);
          return true;
        }
        return false;
      },
      handleKeyDown: (view, event) => {
        const currentMention = mentionStateRef.current;

        // Mention autocomplete keyboard handling
        if (currentMention && currentMention.isOpen && currentMention.filteredCandidates.length > 0) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % currentMention.filteredCandidates.length);
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIndex(
              (prev) => (prev - 1 + currentMention.filteredCandidates.length) % currentMention.filteredCandidates.length
            );
            return true;
          }
          if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            const activeCandidate = currentMention.filteredCandidates[selectedIndexRef.current];
            if (activeCandidate) {
              handleSelectCandidate(activeCandidate);
            }
            return true;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setMentionState(null);
            return true;
          }
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          handleSend();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      checkMentionTrigger(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      checkMentionTrigger(editor);
    },
  });

  const handleSend = () => {
    if (!editor || disabled) return;
    const json = editor.getJSON();
    const isEmpty = !editor.getText().trim() && attachments.length === 0;
    if (isEmpty) return;

    onSendMessage(json, attachments);
    editor.commands.clearContent();
    setAttachments([]);
    setUploadError(null);
    setMentionState(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const validation = validateAttachment(file);
      if (!validation.valid) {
        setUploadError({
          error: validation.error || 'File validation failed',
          recommendation: validation.recommendation,
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    setUploadError(null);
    setAttachments((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const insertTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const handleTriggerMention = () => {
    if (!editor) return;
    editor.chain().focus().insertContent('@').run();
  };

  return (
    <div className="relative border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-xl focus-within:border-emerald-500/50 dark:focus-within:border-teal-500/50 shadow-sm transition">
      {/* Floating Mention Autocomplete Popover */}
      {mentionState?.isOpen && (
        <MentionPopover
          query={mentionState.query}
          candidates={mentionState.filteredCandidates}
          selectedIndex={selectedIndex}
          onSelect={handleSelectCandidate}
          onClose={() => setMentionState(null)}
        />
      )}

      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition shrink-0 ${
            editor?.isActive('bold') ? 'bg-emerald-100 text-emerald-800 dark:bg-slate-800 dark:text-teal-400' : ''
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition shrink-0 ${
            editor?.isActive('italic') ? 'bg-emerald-100 text-emerald-800 dark:bg-slate-800 dark:text-teal-400' : ''
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition shrink-0 ${
            editor?.isActive('underline') ? 'bg-emerald-100 text-emerald-800 dark:bg-slate-800 dark:text-teal-400' : ''
          }`}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <span className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />

        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition shrink-0 ${
            editor?.isActive('bulletList') ? 'bg-emerald-100 text-emerald-800 dark:bg-slate-800 dark:text-teal-400' : ''
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition shrink-0 ${
            editor?.isActive('orderedList') ? 'bg-emerald-100 text-emerald-800 dark:bg-slate-800 dark:text-teal-400' : ''
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={insertTable}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition shrink-0"
          title="Insert Table"
        >
          <TableIcon className="w-4 h-4" />
        </button>

        <span className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />

        {/* Mention Team Member shortcut button */}
        <button
          type="button"
          onClick={handleTriggerMention}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1 text-xs shrink-0"
          title="Mention team member (@)"
        >
          <AtSign className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
          <span className="hidden sm:inline font-medium">Mention</span>
        </button>

        {/* Attachment button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1 text-xs shrink-0"
          title="Attach Image (max 10MB) or Video (max 50MB)"
        >
          <Paperclip className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
          <span>Attach</span>
        </button>

        <div className="hidden sm:block ml-auto text-xs text-slate-500 font-mono shrink-0">
          Ctrl+Enter to send
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="bg-white dark:bg-slate-900/60 min-h-[90px]">
        <EditorContent editor={editor} />
      </div>

      {/* Validation Error Alert */}
      {uploadError && (
        <div className="mx-3 my-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">{uploadError.error}</div>
            {uploadError.recommendation && (
              <div className="text-rose-700 dark:text-rose-300 mt-0.5">{uploadError.recommendation}</div>
            )}
          </div>
        </div>
      )}

      {/* Pending Attachments List */}
      {attachments.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex flex-wrap gap-2">
          {attachments.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700"
            >
              <Paperclip className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
              <span className="truncate max-w-[150px] font-medium">{file.name}</span>
              <span className="text-slate-500 dark:text-slate-400">({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 ml-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action Footer */}
      <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/60 flex items-center justify-between gap-2">
        <div className="hidden sm:block text-[11px] text-slate-500 truncate">
          Type <span className="font-mono text-emerald-600 dark:text-teal-400 font-bold">@</span> to mention team members • Paste tables and styled text cleanly
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 dark:bg-teal-500 dark:hover:bg-teal-400 text-white dark:text-slate-950 font-semibold px-4 py-2 sm:py-1.5 rounded-lg text-xs transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 dark:shadow-teal-950 active:scale-95 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send Message</span>
        </button>
      </div>
    </div>
  );
};
