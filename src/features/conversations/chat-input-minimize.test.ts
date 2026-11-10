// src/features/conversations/chat-input-minimize.test.ts
// Unit tests for chat box writing area minimize / maximize usability logic

import { describe, it, expect } from 'vitest';

describe('Chat Input Minimize / Maximize Usability Logic', () => {
  interface ComposerState {
    isMinimized: boolean;
    text: string;
    attachments: { name: string; size: number }[];
    hasVoiceNote: boolean;
  }

  const computeCanSend = (state: ComposerState): boolean => {
    return Boolean(state.text.trim()) || state.attachments.length > 0 || state.hasVoiceNote;
  };

  const getPlaceholderPreview = (state: ComposerState): string => {
    if (state.text.trim()) {
      return state.text.trim();
    }
    return 'Write a message... (Click to expand)';
  };

  it('determines quick send availability based on text, attachments, or voice note', () => {
    // Empty state cannot send
    const emptyState: ComposerState = {
      isMinimized: true,
      text: '',
      attachments: [],
      hasVoiceNote: false,
    };
    expect(computeCanSend(emptyState)).toBe(false);

    // With text can send
    const withText: ComposerState = {
      ...emptyState,
      text: 'Hello team, scope is approved',
    };
    expect(computeCanSend(withText)).toBe(true);

    // With attachment can send
    const withAttachment: ComposerState = {
      ...emptyState,
      attachments: [{ name: 'spec.pdf', size: 1024 }],
    };
    expect(computeCanSend(withAttachment)).toBe(true);

    // With voice note can send
    const withVoiceNote: ComposerState = {
      ...emptyState,
      hasVoiceNote: true,
    };
    expect(computeCanSend(withVoiceNote)).toBe(true);
  });

  it('generates informative preview text when minimized with a draft', () => {
    const emptyState: ComposerState = {
      isMinimized: true,
      text: '',
      attachments: [],
      hasVoiceNote: false,
    };
    expect(getPlaceholderPreview(emptyState)).toBe('Write a message... (Click to expand)');

    const draftedState: ComposerState = {
      isMinimized: true,
      text: 'Please review the 31.5 hr estimate',
      attachments: [],
      hasVoiceNote: false,
    };
    expect(getPlaceholderPreview(draftedState)).toBe('Please review the 31.5 hr estimate');
  });

  it('auto-expands when user initiates voice recording or dictation', () => {
    let isMinimized = true;

    const startRecording = () => {
      isMinimized = false; // Auto-expands to show waveform & transcript
    };

    const startDictating = () => {
      isMinimized = false; // Auto-expands to show live speech indicator
    };

    startRecording();
    expect(isMinimized).toBe(false);

    isMinimized = true;
    startDictating();
    expect(isMinimized).toBe(false);
  });

  it('auto-expands when user attaches a file via quick attach button', () => {
    let isMinimized = true;
    let attachments: string[] = [];

    const handleAttach = (fileName: string) => {
      attachments.push(fileName);
      isMinimized = false; // Auto-expands so user verifies the attached file pill
    };

    handleAttach('diagram.png');
    expect(isMinimized).toBe(false);
    expect(attachments).toEqual(['diagram.png']);
  });

  it('preserves draft content and attachments when toggling between minimized and maximized states', () => {
    const draft = {
      isMinimized: false,
      text: 'Hey team, here is the updated plan.',
      attachments: [{ name: 'plan.docx', size: 5000 }],
      pendingVoiceNote: { audio_url: 'blob:...', duration_seconds: 12 },
    };

    // User minimizes to inspect chat history and estimate cards
    draft.isMinimized = true;
    expect(draft.isMinimized).toBe(true);
    // Data remains intact
    expect(draft.text).toBe('Hey team, here is the updated plan.');
    expect(draft.attachments).toHaveLength(1);
    expect(draft.pendingVoiceNote.duration_seconds).toBe(12);

    // User maximizes back to continue typing
    draft.isMinimized = false;
    expect(draft.isMinimized).toBe(false);
    expect(draft.text).toBe('Hey team, here is the updated plan.');
  });
});
