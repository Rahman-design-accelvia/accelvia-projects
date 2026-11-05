// src/features/conversations/RichTextEditor.tsx
// Tiptap rich-text editor with table support, clipboard paste normalization, upload validation,
// Google L6-standard accessible @mention autocomplete system,
// Live Speech-to-Text Dictation (Mode 1), and Voice Note Audio Recording with live waveform and transcript (Mode 2).

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
import { useTheme } from '../theme/ThemeContext';
import { MentionPopover, MentionCandidate } from './MentionAutocomplete';
import {
  isSpeechRecognitionSupported,
  isMediaRecorderSupported,
  VoiceDictationEngine,
  VoiceRecorderEngine,
  formatAudioTime,
} from '../../lib/audio/voice-engine';
import { VoiceNoteData } from '../../types';
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
  Mic,
  Radio,
  Trash2,
  Check,
  Play,
  Pause,
  X,
  FileText,
} from 'lucide-react';

interface RichTextEditorProps {
  onSendMessage: (
    contentJson: Record<string, unknown>,
    attachments: File[],
    voiceNote?: VoiceNoteData | null
  ) => void;
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
  const { accentColor } = useTheme();
  const availableMembers = propTeamMembers || contextTeamMembers || [];

  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<{ error: string; recommendation?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mention autocomplete state
  const [mentionState, setMentionState] = useState<MentionState | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Voice Mode 1: Speech-to-Text Dictation State
  const [isDictating, setIsDictating] = useState(false);
  const [interimDictation, setInterimDictation] = useState('');
  const dictationEngineRef = useRef<VoiceDictationEngine | null>(null);

  // Voice Mode 2: Audio Recording & Transcript Studio State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingAudioLevel, setRecordingAudioLevel] = useState(0);
  const [recordingTranscript, setRecordingTranscript] = useState('');
  const [pendingVoiceNote, setPendingVoiceNote] = useState<VoiceNoteData | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const voiceRecorderEngineRef = useRef<VoiceRecorderEngine | null>(null);
  const recorderDictationRef = useRef<VoiceDictationEngine | null>(null);

  // Mutable refs for editor event callbacks
  const mentionStateRef = useRef<MentionState | null>(null);
  mentionStateRef.current = mentionState;
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dictationEngineRef.current?.stop();
      voiceRecorderEngineRef.current?.cancel();
      recorderDictationRef.current?.stop();
    };
  }, []);

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

      if (from !== to) {
        if (mentionStateRef.current?.isOpen) setMentionState(null);
        return;
      }

      const parentOffset = $from.parentOffset;
      const fromOffset = Math.max(0, parentOffset - 35);
      const textBefore = $from.parent.textBetween(fromOffset, parentOffset, undefined, '\ufffc');
      const match = /(?:^|\s)@([a-zA-Z0-9_\s.()'-]{0,25})$/.exec(textBefore);

      if (match) {
        const query = match[1];
        const matchLength = query.length + 1;
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
      // Graceful fallback
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
          const normalized = normalizePastedHtml(html);
          editor?.commands.insertContent(normalized);
          return true;
        }
        return false;
      },
      handleKeyDown: (view, event) => {
        const currentMention = mentionStateRef.current;

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

  // Toggle Mode 1: Speech-to-Text Dictation
  const toggleDictation = () => {
    if (isRecordingVoice) return;

    if (isDictating) {
      dictationEngineRef.current?.stop();
      setIsDictating(false);
      setInterimDictation('');
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setUploadError({
        error: 'Speech Recognition is not available in this browser.',
        recommendation: 'Voice dictation uses browser-native Web Speech API. Please use Google Chrome, Microsoft Edge, or Safari.',
      });
      return;
    }

    setUploadError(null);
    if (!dictationEngineRef.current) {
      dictationEngineRef.current = new VoiceDictationEngine();
    }

    const started = dictationEngineRef.current.start({
      onStateChange: (listening) => setIsDictating(listening),
      onInterimResult: (interim) => setInterimDictation(interim),
      onFinalResult: (finalText) => {
        setInterimDictation('');
        if (editor) {
          editor.chain().focus().insertContent(finalText + ' ').run();
        }
      },
      onError: (err) => {
        setUploadError({ error: err });
        setIsDictating(false);
        setInterimDictation('');
      },
    });

    if (started) {
      setIsDictating(true);
    }
  };

  // Start Mode 2: Voice Note Audio Recording
  const startVoiceRecording = async () => {
    if (isDictating) {
      dictationEngineRef.current?.stop();
      setIsDictating(false);
      setInterimDictation('');
    }

    if (!isMediaRecorderSupported()) {
      setUploadError({
        error: 'Microphone recording is not supported in this browser.',
        recommendation: 'Please verify microphone permissions or use a modern desktop browser.',
      });
      return;
    }

    if (!voiceRecorderEngineRef.current) {
      voiceRecorderEngineRef.current = new VoiceRecorderEngine();
    }
    if (!recorderDictationRef.current) {
      recorderDictationRef.current = new VoiceDictationEngine();
    }

    setUploadError(null);
    setRecordingDuration(0);
    setRecordingAudioLevel(0);
    setRecordingTranscript('');

    try {
      await voiceRecorderEngineRef.current.start({
        maxDurationSeconds: 60,
        onAudioLevel: (lvl) => setRecordingAudioLevel(lvl),
        onTimeUpdate: (secs) => setRecordingDuration(secs),
        onMaxReached: () => {
          handleFinishRecording(false);
        },
      });

      setIsRecordingVoice(true);

      // Concurrently run dictation engine to produce live transcript
      if (isSpeechRecognitionSupported()) {
        try {
          let accumulated = '';
          recorderDictationRef.current.start({
            onInterimResult: (interim) => {
              setRecordingTranscript(accumulated + (accumulated ? ' ' : '') + interim);
            },
            onFinalResult: (finalText) => {
              accumulated += (accumulated ? ' ' : '') + finalText;
              setRecordingTranscript(accumulated);
            },
            onError: () => {
              // Non-blocking transcript failure
            },
          });
        } catch {
          // Ignore
        }
      }
    } catch (err: any) {
      setIsRecordingVoice(false);
      setUploadError({
        error: err?.message || 'Failed to initialize microphone.',
        recommendation: 'Check browser microphone permissions in your address bar.',
      });
    }
  };

  const handleDiscardRecording = () => {
    recorderDictationRef.current?.stop();
    voiceRecorderEngineRef.current?.cancel();
    setIsRecordingVoice(false);
    setRecordingDuration(0);
    setRecordingAudioLevel(0);
    setRecordingTranscript('');
  };

  const handleFinishRecording = async (sendImmediately: boolean = false) => {
    if (!voiceRecorderEngineRef.current || !isRecordingVoice) return;
    recorderDictationRef.current?.stop();

    try {
      const result = await voiceRecorderEngineRef.current.stop();
      setIsRecordingVoice(false);
      const capturedTranscript = recordingTranscript.trim();

      const noteData: VoiceNoteData = {
        audio_url: result.url,
        duration_seconds: Math.round(result.duration * 10) / 10,
        transcript: capturedTranscript || undefined,
        mime_type: result.mimeType,
      };

      if (sendImmediately) {
        const json = editor ? editor.getJSON() : { type: 'doc', content: [] };
        onSendMessage(json, attachments, noteData);
        editor?.commands.clearContent();
        setAttachments([]);
        setPendingVoiceNote(null);
        setRecordingTranscript('');
        setUploadError(null);
        setMentionState(null);
      } else {
        setPendingVoiceNote(noteData);
      }
    } catch (err: any) {
      setIsRecordingVoice(false);
      setUploadError({
        error: 'Failed to process audio recording.',
        recommendation: err?.message,
      });
    }
  };

  const handleSend = () => {
    if (disabled) return;
    const json = editor ? editor.getJSON() : { type: 'doc', content: [] };
    const hasText = Boolean(editor?.getText().trim());
    const hasAttachments = attachments.length > 0;
    const hasVoiceNote = Boolean(pendingVoiceNote);

    if (!hasText && !hasAttachments && !hasVoiceNote) return;

    onSendMessage(json, attachments, pendingVoiceNote);
    editor?.commands.clearContent();
    setAttachments([]);
    setPendingVoiceNote(null);
    setRecordingTranscript('');
    setUploadError(null);
    setMentionState(null);

    if (isDictating) {
      dictationEngineRef.current?.stop();
      setIsDictating(false);
      setInterimDictation('');
    }
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

  // Preview player controls for pending voice note
  const togglePreviewPlay = () => {
    if (!previewAudioRef.current) return;
    if (previewPlaying) {
      previewAudioRef.current.pause();
      setPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().then(() => setPreviewPlaying(true)).catch(() => setPreviewPlaying(false));
    }
  };

  // Waveform heights for live recording visualizer
  const visualizerMultipliers = [0.4, 0.7, 0.5, 0.85, 0.35, 0.75, 1.0, 0.6, 0.9, 0.45, 0.8, 0.95, 0.3, 0.65, 0.55, 0.85];

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

        {/* Mention Team Member shortcut */}
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

        <span className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />

        {/* Mode 1: Live Voice Dictation Button (Speech to Text) */}
        <button
          type="button"
          onClick={toggleDictation}
          disabled={isRecordingVoice}
          className={`p-1.5 rounded transition flex items-center gap-1 text-xs shrink-0 ${
            isDictating
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
          title={isDictating ? 'Stop Voice Dictation' : 'Voice Dictation (Speech to text directly into message)'}
        >
          <Mic className={`w-4 h-4 ${isDictating ? 'text-rose-500 animate-pulse' : 'text-emerald-600 dark:text-teal-400'}`} />
          <span className="font-medium hidden sm:inline">{isDictating ? 'Dictating...' : 'Dictate'}</span>
        </button>

        {/* Mode 2: Record Voice Note Button */}
        <button
          type="button"
          onClick={startVoiceRecording}
          disabled={isRecordingVoice || isDictating}
          className={`p-1.5 rounded transition flex items-center gap-1 text-xs shrink-0 ${
            isRecordingVoice
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
          title="Record a voice note with live transcript (up to 60s)"
        >
          <Radio className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
          <span className="font-medium hidden sm:inline">Voice Note</span>
        </button>

        <div className="hidden sm:block ml-auto text-xs text-slate-500 font-mono shrink-0">
          Ctrl+Enter to send
        </div>
      </div>

      {/* Dictation Banner Indicator */}
      {isDictating && (
        <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span className="font-bold shrink-0">Speech Dictation Active:</span>
            <span className="italic truncate text-slate-600 dark:text-slate-300">
              {interimDictation || 'Speak into your microphone — words will type automatically...'}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleDictation}
            className="text-xs font-semibold underline hover:text-emerald-950 dark:hover:text-emerald-100 ml-2 shrink-0 cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {/* Voice Recording Studio Overlay */}
      {isRecordingVoice ? (
        <div className="p-4 bg-slate-900 text-white space-y-3 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status & Timer */}
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Recording</span>
              <span className="font-mono text-sm font-semibold text-slate-200">
                {formatAudioTime(recordingDuration)} / 1:00
              </span>
            </div>

            {/* Live Audio Level Equalizer Waveform */}
            <div className="flex items-center gap-1 h-7 px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-800">
              {visualizerMultipliers.map((mult, idx) => {
                const height = Math.min(100, Math.max(16, (mult * recordingAudioLevel + 0.15) * 100));
                return (
                  <div
                    key={idx}
                    className="w-1 rounded-full bg-gradient-to-t from-teal-500 to-emerald-400 transition-all duration-75"
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDiscardRecording}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-rose-300 hover:bg-rose-950/50 hover:border-rose-700 transition cursor-pointer"
                title="Discard recording"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>
              <button
                type="button"
                onClick={() => handleFinishRecording(false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-200 hover:bg-slate-700 transition cursor-pointer"
                title="Finish and review"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Done</span>
              </button>
              <button
                type="button"
                onClick={() => handleFinishRecording(true)}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-md active:scale-95 transition cursor-pointer"
                style={{ backgroundColor: accentColor }}
                title="Send voice note immediately"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>

          {/* Live Transcript Preview */}
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-400 mb-0.5 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>Live Transcript Preview</span>
            </div>
            <div className="text-slate-300 italic min-h-[18px]">
              {recordingTranscript || 'Listening to speech... your words will appear here in real time.'}
            </div>
          </div>
        </div>
      ) : (
        /* Editor Content Area */
        <div className="bg-white dark:bg-slate-900/60 min-h-[90px]">
          <EditorContent editor={editor} />
        </div>
      )}

      {/* Validation Error Alert */}
      {uploadError && (
        <div className="mx-3 my-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold">{uploadError.error}</div>
            {uploadError.recommendation && (
              <div className="text-rose-700 dark:text-rose-300 mt-0.5">{uploadError.recommendation}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-400 hover:text-rose-700 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
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

      {/* Attached Voice Note Preview Pill */}
      {pendingVoiceNote && (
        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-wrap items-center justify-between gap-2 text-xs">
          <audio
            ref={previewAudioRef}
            src={pendingVoiceNote.audio_url}
            onEnded={() => setPreviewPlaying(false)}
            className="hidden"
          />
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={togglePreviewPlay}
              className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 hover:bg-emerald-500 transition cursor-pointer"
              title={previewPlaying ? 'Pause preview' : 'Play audio preview'}
            >
              {previewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 translate-x-0.5" />}
            </button>
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>🎙️ Voice Note</span>
                <span className="text-[11px] font-mono font-normal text-slate-500">
                  ({formatAudioTime(pendingVoiceNote.duration_seconds)})
                </span>
              </div>
              {pendingVoiceNote.transcript && (
                <div className="text-[11px] text-slate-600 dark:text-slate-400 italic line-clamp-1 max-w-[280px] sm:max-w-md">
                  "{pendingVoiceNote.transcript}"
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (previewAudioRef.current) previewAudioRef.current.pause();
              setPreviewPlaying(false);
              setPendingVoiceNote(null);
            }}
            className="text-slate-400 hover:text-rose-500 p-1 rounded transition"
            title="Remove voice note"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Footer */}
      <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/60 flex items-center justify-between gap-2">
        <div className="hidden sm:block text-[11px] text-slate-500 truncate">
          Type <span className="font-mono text-emerald-600 dark:text-teal-400 font-bold">@</span> to mention • 
          <span className="font-medium text-slate-600 dark:text-slate-300"> Dictate</span> for speech-to-text • 
          <span className="font-medium text-slate-600 dark:text-slate-300"> Voice Note</span> for audio
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || isRecordingVoice}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-white font-semibold px-4 py-2 sm:py-1.5 rounded-lg text-xs transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-95 shrink-0 cursor-pointer"
          style={{ backgroundColor: accentColor }}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send Message</span>
        </button>
      </div>
    </div>
  );
};
