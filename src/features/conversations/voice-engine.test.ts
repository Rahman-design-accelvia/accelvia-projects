// src/features/conversations/voice-engine.test.ts
import { describe, it, expect } from 'vitest';
import {
  formatAudioTime,
  isSpeechRecognitionSupported,
  isMediaRecorderSupported,
  getSupportedAudioMimeType,
  VoiceDictationEngine,
  VoiceRecorderEngine,
} from '../../lib/audio/voice-engine';
import { SafeMessage, VoiceNoteData } from '../../types';

describe('Voice Engine Utilities', () => {
  describe('formatAudioTime', () => {
    it('formats 0 seconds properly', () => {
      expect(formatAudioTime(0)).toBe('0:00');
    });

    it('formats single-digit seconds with leading zero', () => {
      expect(formatAudioTime(7)).toBe('0:07');
    });

    it('formats 59 seconds properly', () => {
      expect(formatAudioTime(59)).toBe('0:59');
    });

    it('formats exact minutes properly', () => {
      expect(formatAudioTime(60)).toBe('1:00');
      expect(formatAudioTime(120)).toBe('2:00');
    });

    it('formats minutes and seconds accurately', () => {
      expect(formatAudioTime(75)).toBe('1:15');
      expect(formatAudioTime(134)).toBe('2:14');
    });

    it('safely handles decimal or negative inputs', () => {
      expect(formatAudioTime(12.7)).toBe('0:12');
      expect(formatAudioTime(-5)).toBe('0:00');
    });
  });

  describe('Feature Detection', () => {
    it('isSpeechRecognitionSupported returns a boolean without throwing', () => {
      const supported = isSpeechRecognitionSupported();
      expect(typeof supported).toBe('boolean');
    });

    it('isMediaRecorderSupported returns a boolean without throwing', () => {
      const supported = isMediaRecorderSupported();
      expect(typeof supported).toBe('boolean');
    });

    it('getSupportedAudioMimeType returns a string without crashing', () => {
      const mime = getSupportedAudioMimeType();
      expect(typeof mime).toBe('string');
    });
  });

  describe('VoiceDictationEngine', () => {
    it('initializes with isListening returning false', () => {
      const engine = new VoiceDictationEngine();
      expect(engine.isListening()).toBe(false);
    });

    it('stop is idempotent and does not throw', () => {
      const engine = new VoiceDictationEngine();
      expect(() => {
        engine.stop();
        engine.stop();
      }).not.toThrow();
      expect(engine.isListening()).toBe(false);
    });
  });

  describe('VoiceRecorderEngine', () => {
    it('initializes with isRecording returning false', () => {
      const recorder = new VoiceRecorderEngine();
      expect(recorder.isRecording()).toBe(false);
    });

    it('cancel is idempotent and cleans up safely', () => {
      const recorder = new VoiceRecorderEngine();
      expect(() => {
        recorder.cancel();
        recorder.cancel();
      }).not.toThrow();
      expect(recorder.isRecording()).toBe(false);
    });
  });

  describe('Voice Note Message Integration', () => {
    it('supports attaching VoiceNoteData to SafeMessage structure', () => {
      const voiceNote: VoiceNoteData = {
        audio_url: 'blob:http://localhost:3000/mock-audio-blob',
        duration_seconds: 14.5,
        transcript: 'Please approve the scope package for phase two.',
        mime_type: 'audio/webm;codecs=opus',
      };

      const message: SafeMessage = {
        id: 'msg-voice-test-1',
        conversation_id: 'conv-1',
        author_id: 'usr-1',
        author_name: 'Lead Developer',
        author_is_management: false,
        content_json: { type: 'doc', content: [] },
        event_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_edited: false,
        is_deleted: false,
        attachments: [],
        voice_note: voiceNote,
      };

      expect(message.voice_note).toBeDefined();
      expect(message.voice_note?.duration_seconds).toBe(14.5);
      expect(message.voice_note?.transcript).toContain('phase two');
      expect(message.voice_note?.mime_type).toBe('audio/webm;codecs=opus');
    });
  });
});
