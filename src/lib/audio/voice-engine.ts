// src/lib/audio/voice-engine.ts
// Production Voice Dictation (Speech-to-Text) and Lightweight Audio Recorder Engine
// Built for zero-database overhead using browser-native APIs and WebM Opus compression

export interface VoiceDictationOptions {
  onInterimResult?: (text: string) => void;
  onFinalResult: (text: string) => void;
  onError?: (error: string) => void;
  onStateChange?: (isListening: boolean) => void;
  lang?: string;
}

export interface VoiceRecordResult {
  blob: Blob;
  url: string;
  duration: number; // in seconds
  mimeType: string;
}

export interface VoiceRecorderOptions {
  onAudioLevel?: (level: number) => void; // 0 to 1 for live waveform
  onTimeUpdate?: (seconds: number) => void;
  onMaxReached?: () => void;
  maxDurationSeconds?: number;
}

/** Check if the current browser supports Speech Recognition */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

/** Check if the current browser supports Media Recording */
export function isMediaRecorderSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof MediaRecorder !== 'undefined' && !!navigator?.mediaDevices?.getUserMedia;
}

/** Get best supported audio mime type for lightweight speech */
export function getSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

/** Format seconds to mm:ss */
export function formatAudioTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 1. Live Voice Dictation Engine
 * Converts spoken words directly into text in real time using Web Speech API
 */
export class VoiceDictationEngine {
  private recognition: any = null;
  private isRunning = false;
  private onStateChange?: (active: boolean) => void;

  public isListening(): boolean {
    return this.isRunning;
  }

  public start(options: VoiceDictationOptions): boolean {
    if (!isSpeechRecognitionSupported()) {
      options.onError?.('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return false;
    }

    this.stop();

    try {
      const SpeechRecognitionConstructor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionConstructor();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = options.lang || 'en-US';
      this.onStateChange = options.onStateChange;

      this.recognition.onstart = () => {
        this.isRunning = true;
        this.onStateChange?.(true);
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += piece;
          } else {
            interimTranscript += piece;
          }
        }

        if (finalTranscript.trim()) {
          options.onFinalResult(finalTranscript.trim());
        }
        if (interimTranscript) {
          options.onInterimResult?.(interimTranscript);
        }
      };

      this.recognition.onerror = (event: any) => {
        // Ignore benign no-speech or abort events
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        const msg = event.error === 'not-allowed'
          ? 'Microphone permission was denied. Please allow microphone access.'
          : `Speech recognition error: ${event.error}`;
        options.onError?.(msg);
      };

      this.recognition.onend = () => {
        this.isRunning = false;
        this.onStateChange?.(false);
      };

      this.recognition.start();
      return true;
    } catch (err: any) {
      options.onError?.(err?.message || 'Failed to start speech recognition');
      this.isRunning = false;
      this.onStateChange?.(false);
      return false;
    }
  }

  public stop(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore if already stopped
      }
      this.recognition = null;
    }
    this.isRunning = false;
    this.onStateChange?.(false);
  }
}

/**
 * 2. Voice Note Audio Recorder Engine
 * Records compressed audio with live waveform analysis and automatic 60s cut-off
 */
export class VoiceRecorderEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private recordedChunks: Blob[] = [];
  private startTime = 0;
  private timerInterval: any = null;
  private animationFrameId: number | null = null;
  private isRecordingState = false;

  public isRecording(): boolean {
    return this.isRecordingState;
  }

  public async start(options: VoiceRecorderOptions): Promise<boolean> {
    if (!isMediaRecorderSupported()) {
      throw new Error('MediaRecorder or audio input is not supported in this browser.');
    }

    this.cancel();

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mimeType = getSupportedAudioMimeType();
      const recorderOptions: MediaRecorderOptions = {};
      if (mimeType) recorderOptions.mimeType = mimeType;
      // 24 kbps is crystal clear for speech and takes ~180KB per full minute
      recorderOptions.audioBitsPerSecond = 24000;

      try {
        this.mediaRecorder = new MediaRecorder(this.audioStream, recorderOptions);
      } catch {
        // Fallback to default options if browser rejects specified bitrate/mime
        this.mediaRecorder = new MediaRecorder(this.audioStream);
      }

      this.recordedChunks = [];
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      // Set up AudioContext for live waveform / volume meter
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          const source = this.audioContext.createMediaStreamSource(this.audioStream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 64;
          source.connect(this.analyser);

          const bufferLength = this.analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const updateVolume = () => {
            if (!this.analyser || !this.isRecordingState) return;
            this.analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const normalized = Math.min(1, Math.max(0, average / 128));
            options.onAudioLevel?.(normalized);
            this.animationFrameId = requestAnimationFrame(updateVolume);
          };

          this.animationFrameId = requestAnimationFrame(updateVolume);
        }
      } catch {
        // AudioContext visualizer optional; continue if not permitted
      }

      const maxSecs = options.maxDurationSeconds || 60;
      this.startTime = Date.now();
      this.isRecordingState = true;

      this.timerInterval = setInterval(() => {
        const elapsed = (Date.now() - this.startTime) / 1000;
        options.onTimeUpdate?.(elapsed);
        if (elapsed >= maxSecs) {
          options.onMaxReached?.();
        }
      }, 250);

      this.mediaRecorder.start(250); // Collect data chunks every 250ms
      return true;
    } catch (err: any) {
      this.cancel();
      throw err;
    }
  }

  public stop(): Promise<VoiceRecordResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecordingState) {
        reject(new Error('Recorder is not active'));
        return;
      }

      const duration = Math.max(0.5, (Date.now() - this.startTime) / 1000);

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        this.cleanup();
        resolve({
          blob,
          url,
          duration,
          mimeType,
        });
      };

      try {
        this.mediaRecorder.stop();
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  public cancel(): void {
    if (this.mediaRecorder && this.isRecordingState) {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignore
      }
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.isRecordingState = false;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // Ignore
      }
      this.audioContext = null;
      this.analyser = null;
    }

    this.mediaRecorder = null;
    this.recordedChunks = [];
  }
}
