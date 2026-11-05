// src/features/conversations/VoiceNotePlayer.tsx
// Production Voice Note Player with Waveform Scrubber, Speed Controls, and Collapsible Transcript

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { VoiceNoteData } from '../../types';
import { formatAudioTime } from '../../lib/audio/voice-engine';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface VoiceNotePlayerProps {
  voiceNote: VoiceNoteData;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ voiceNote }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcriptCopied, setTranscriptCopied] = useState(false);

  const duration = voiceNote.duration_seconds || 1;

  // Generate a consistent pseudo-random waveform visual pattern based on duration
  const waveformBars = useMemo(() => {
    const barsCount = 28;
    const bars: number[] = [];
    for (let i = 0; i < barsCount; i++) {
      // Deterministic wavy pattern for voice profile
      const val = 0.25 + 0.65 * Math.abs(Math.sin((i * 13) % 7 + (i * 0.7)));
      bars.push(Math.round(val * 100));
    }
    return bars;
  }, [voiceNote.duration_seconds]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.min(1, Math.max(0, clickX / rect.width));
    const targetTime = progress * duration;
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleSpeedCycle = () => {
    if (!audioRef.current) return;
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    audioRef.current.playbackRate = nextSpeed;
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioRef.current.muted = nextMuted;
  };

  const handleCopyTranscript = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!voiceNote.transcript) return;
    try {
      await navigator.clipboard.writeText(voiceNote.transcript);
      setTranscriptCopied(true);
      setTimeout(() => setTranscriptCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const progressPercent = Math.min(100, Math.max(0, (currentTime / duration) * 100));

  return (
    <div className="w-full max-w-md my-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm overflow-hidden text-slate-800 dark:text-slate-100">
      {/* Hidden Native Audio Element */}
      <audio
        ref={audioRef}
        src={voiceNote.audio_url}
        preload="metadata"
        playsInline
      />

      {/* Main Audio Player Card */}
      <div className="p-3 flex items-center gap-3">
        {/* Play / Pause Circular Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-95 cursor-pointer"
          style={{ backgroundColor: 'var(--theme-accent)' }}
          title={isPlaying ? 'Pause voice message' : 'Play voice message'}
          aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-white" />
          ) : (
            <Play className="w-4 h-4 fill-white translate-x-0.5" />
          )}
        </button>

        {/* Center: Waveform scrubber and live time */}
        <div className="flex-1 min-w-0">
          {/* Waveform Scrubber */}
          <div
            onClick={handleSeek}
            className="h-7 flex items-center gap-[2.5px] cursor-pointer group py-1"
            title="Click or drag to seek audio position"
          >
            {waveformBars.map((heightPercent, idx) => {
              const barProgress = (idx / waveformBars.length) * 100;
              const isPlayed = barProgress <= progressPercent;
              return (
                <div
                  key={idx}
                  className="w-1 rounded-full transition-all duration-75"
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: isPlayed
                      ? 'var(--theme-accent)'
                      : 'rgba(148, 163, 184, 0.35)',
                  }}
                />
              );
            })}
          </div>

          {/* Time & Format Info */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-0.5">
            <span>{formatAudioTime(currentTime)}</span>
            <span className="text-slate-500">/ {formatAudioTime(duration)}</span>
          </div>
        </div>

        {/* Right Controls: Playback Speed & Mute */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleSpeedCycle}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            title="Change playback speed (1x / 1.5x / 2x)"
          >
            {playbackRate}x
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Transcript Section Toggle Banner */}
      {voiceNote.transcript && (
        <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full px-3 py-1.5 text-left flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <div className="flex items-center gap-1.5 truncate">
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400 shrink-0" />
              <span>Voice Transcript</span>
              {!showTranscript && (
                <span className="text-slate-400 dark:text-slate-500 truncate max-w-[170px] text-[10px] italic">
                  — "{voiceNote.transcript}"
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-slate-400">
                {showTranscript ? 'Hide' : 'Read'}
              </span>
              {showTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </div>
          </button>

          {/* Expanded Transcript Body */}
          {showTranscript && (
            <div className="px-3 pb-3 pt-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60">
              <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                {voiceNote.transcript}
              </div>
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={handleCopyTranscript}
                  className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition cursor-pointer font-medium"
                  title="Copy transcript text"
                >
                  {transcriptCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
