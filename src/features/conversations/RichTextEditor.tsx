// src/features/conversations/RichTextEditor.tsx
// Tiptap rich-text editor with table support, clipboard paste normalization, and upload validation

import React, { useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { normalizePastedHtml, validateAttachment } from '../../lib/rich-text/paste-normalizer';
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
} from 'lucide-react';

interface RichTextEditorProps {
  onSendMessage: (contentJson: Record<string, unknown>, attachments: File[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  onSendMessage,
  placeholder = 'Write a message... (Ctrl+Enter to send)',
  disabled = false,
}) => {
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const [uploadError, setUploadError] = React.useState<{ error: string; recommendation?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        class: 'prose prose-invert max-w-none text-slate-100 px-3 py-2 text-sm focus:outline-none min-h-[90px]',
      },
      handlePaste: (view, event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const html = clipboardData.getData('text/html');
        if (html) {
          event.preventDefault();
          // Normalize clipboard styles to match destination theme & remove dark backgrounds
          const normalized = normalizePastedHtml(html);
          // Insert normalized HTML into Tiptap
          const { state, dispatch } = view;
          const parser = (view as any).someProp('domParser') || view.dom.ownerDocument.defaultView?.DOMParser;
          editor?.commands.insertContent(normalized);
          return true;
        }
        return false;
      },
      handleKeyDown: (view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          handleSend();
          return true;
        }
        return false;
      },
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

  return (
    <div className="border border-slate-800 bg-slate-900/90 rounded-xl overflow-hidden focus-within:border-teal-500/50 transition">
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-slate-800/80 bg-slate-950/40 text-slate-400">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition ${
            editor?.isActive('bold') ? 'bg-slate-800 text-teal-400' : ''
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition ${
            editor?.isActive('italic') ? 'bg-slate-800 text-teal-400' : ''
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition ${
            editor?.isActive('underline') ? 'bg-slate-800 text-teal-400' : ''
          }`}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <span className="w-px h-4 bg-slate-800 mx-1" />

        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition ${
            editor?.isActive('bulletList') ? 'bg-slate-800 text-teal-400' : ''
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition ${
            editor?.isActive('orderedList') ? 'bg-slate-800 text-teal-400' : ''
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={insertTable}
          className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
          title="Insert Table"
        >
          <TableIcon className="w-4 h-4" />
        </button>

        <span className="w-px h-4 bg-slate-800 mx-1" />

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
          className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition flex items-center gap-1 text-xs"
          title="Attach Image (max 10MB) or Video (max 50MB)"
        >
          <Paperclip className="w-4 h-4" />
          <span>Attach</span>
        </button>

        <div className="ml-auto text-xs text-slate-500 font-mono">
          Ctrl+Enter to send
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="bg-slate-900/60 min-h-[90px]">
        <EditorContent editor={editor} />
      </div>

      {/* Validation Error Alert */}
      {uploadError && (
        <div className="mx-3 my-2 p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">{uploadError.error}</div>
            {uploadError.recommendation && (
              <div className="text-rose-300 mt-0.5">{uploadError.recommendation}</div>
            )}
          </div>
        </div>
      )}

      {/* Pending Attachments List */}
      {attachments.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-800 bg-slate-950/40 flex flex-wrap gap-2">
          {attachments.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-xs bg-slate-800 text-slate-200 px-2.5 py-1 rounded-md border border-slate-700"
            >
              <Paperclip className="w-3.5 h-3.5 text-teal-400" />
              <span className="truncate max-w-[150px]">{file.name}</span>
              <span className="text-slate-400">({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-slate-400 hover:text-rose-400 ml-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action Footer */}
      <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
        <div className="text-[11px] text-slate-500">
          Paste tables, bold, and links cleanly • Source theme backgrounds are automatically removed
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-4 py-1.5 rounded-lg text-xs transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-950"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send Message</span>
        </button>
      </div>
    </div>
  );
};
