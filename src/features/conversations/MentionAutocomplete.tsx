// src/features/conversations/MentionAutocomplete.tsx
// Google L6 Standard @mention Suggestion, Autocomplete, and Interactive Badge System

import React, { useEffect, useRef } from 'react';
import { TeamMember } from '../auth/AuthContext';
import { UserRole } from '../../types';
import { Sparkles, Shield, User, AtSign, Check } from 'lucide-react';

export interface MentionCandidate {
  id: string;
  display_name: string;
  email: string;
  role: UserRole | 'management';
  avatar_text: string;
  is_management?: boolean;
}

interface MentionPopoverProps {
  query: string;
  candidates: MentionCandidate[];
  selectedIndex: number;
  onSelect: (candidate: MentionCandidate) => void;
  onClose: () => void;
}

export const MentionPopover: React.FC<MentionPopoverProps> = ({
  query,
  candidates,
  selectedIndex,
  onSelect,
  onClose,
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const activeElement = listRef.current.querySelector<HTMLElement>('[aria-selected="true"]');
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (candidates.length === 0) {
    return (
      <div className="absolute left-2 bottom-full mb-2 z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-3 text-xs text-slate-500 animate-in fade-in duration-150">
        <div className="flex items-center gap-2 text-slate-400">
          <AtSign className="w-3.5 h-3.5" />
          <span>No matching team members for "@{query}"</span>
        </div>
      </div>
    );
  }

  // Highlight matched substring
  const highlightMatch = (text: string, q: string) => {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    const before = text.substring(0, idx);
    const match = text.substring(idx, idx + q.length);
    const after = text.substring(idx + q.length);
    return (
      <>
        {before}
        <span className="text-emerald-600 dark:text-teal-400 font-bold underline decoration-emerald-500/50">
          {match}
        </span>
        {after}
      </>
    );
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
      case 'management':
        return (
          <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            Super Admin
          </span>
        );
      case 'admin':
        return (
          <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            Admin
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-1.5 py-0.2 rounded font-medium uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            Member
          </span>
        );
    }
  };

  return (
    <div
      role="listbox"
      aria-label="Mention team members"
      className="absolute left-2 bottom-full mb-2 z-50 w-80 max-w-[92vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150 ring-1 ring-black/5 dark:ring-white/10"
    >
      {/* Popover Header */}
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <AtSign className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
          <span className="font-semibold">Mention Team Member</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Candidates List */}
      <div ref={listRef} className="max-h-56 overflow-y-auto p-1 space-y-0.5">
        {candidates.map((c, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <div
              key={c.id}
              role="option"
              aria-selected={isSelected}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent editor blur
                onSelect(c);
              }}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition select-none ${
                isSelected
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-slate-900 dark:text-slate-100'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                  c.is_management
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-slate-800 dark:text-teal-300 border border-emerald-200 dark:border-slate-700'
                }`}
              >
                {c.is_management ? <Sparkles className="w-3.5 h-3.5" /> : c.avatar_text}
              </div>

              {/* User details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold truncate">
                    {highlightMatch(c.display_name, query)}
                  </span>
                  {getRoleBadge(c.role)}
                </div>
                <div className="text-[11px] font-mono text-slate-500 truncate">
                  {c.email}
                </div>
              </div>

              {isSelected && (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Popover Footer with Keyboard Hints */}
      <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40 text-[10px] text-slate-500 font-mono flex items-center justify-between">
        <span>↑ / ↓ to navigate</span>
        <span>Enter / Tab to select • Esc dismiss</span>
      </div>
    </div>
  );
};

// Interactive Mention Pill Badge in Conversation Messages
interface MentionBadgeProps {
  name: string;
  isCurrentUser: boolean;
  memberInfo?: MentionCandidate;
}

export const MentionBadge: React.FC<MentionBadgeProps> = ({
  name,
  isCurrentUser,
  memberInfo,
}) => {
  const isManagement = name.toLowerCase() === 'management' || memberInfo?.role === 'super_admin';

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md font-semibold text-xs tracking-tight transition cursor-default group relative select-none ${
        isCurrentUser
          ? 'bg-emerald-500/20 text-emerald-800 dark:text-teal-200 border border-emerald-500/50 ring-1 ring-emerald-500/30'
          : isManagement
          ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80'
          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-teal-300 border border-emerald-200 dark:border-emerald-800/80'
      }`}
      title={
        memberInfo
          ? `${memberInfo.display_name} (${memberInfo.role.toUpperCase()}) — ${memberInfo.email}`
          : `@${name}`
      }
    >
      {isManagement ? (
        <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
      ) : (
        <AtSign className="w-3 h-3 text-emerald-600 dark:text-teal-400 shrink-0" />
      )}
      <span>{name}</span>
      {isCurrentUser && (
        <span className="text-[9px] bg-emerald-600 text-white font-mono px-1 rounded-sm ml-0.5">
          You
        </span>
      )}
    </span>
  );
};

// Component that takes message text and renders it with interactive @mention badges
interface FormattedMessageTextProps {
  text: string;
  currentUserName: string;
  candidates: MentionCandidate[];
}

export const FormattedMessageText: React.FC<FormattedMessageTextProps> = ({
  text,
  currentUserName,
  candidates,
}) => {
  if (!text) return null;

  // Build map of candidate names for fast lookup
  const candidateMap = new Map<string, MentionCandidate>();
  candidates.forEach((c) => {
    candidateMap.set(c.display_name.toLowerCase(), c);
  });
  candidateMap.set('management', {
    id: 'management',
    display_name: 'Management',
    email: 'management@accelvia.internal',
    role: 'management',
    avatar_text: 'M',
    is_management: true,
  });

  // Regex matching @DisplayName where DisplayName can contain alphanumeric, spaces, and punctuation in names
  // Matches e.g. @Musfiqur Rahman (QA) or @Dev Alex or @Management
  const mentionPattern = /@([a-zA-Z0-9_\-.'()]+(?:\s+[a-zA-Z0-9_\-.'()]+)*)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionPattern.exec(text)) !== null) {
    const rawMention = match[0];
    const mentionName = match[1].trim();

    // Check if mentionName matches a known team member or starts with a known member name
    let matchedCandidate: MentionCandidate | undefined = candidateMap.get(mentionName.toLowerCase());
    let validName = mentionName;
    let matchLength = rawMention.length;

    if (!matchedCandidate) {
      // Check partial match from start of mentionName (for multi-word names followed by punctuation or text)
      for (const candidate of candidates) {
        if (mentionName.toLowerCase().startsWith(candidate.display_name.toLowerCase())) {
          matchedCandidate = candidate;
          validName = candidate.display_name;
          matchLength = 1 + validName.length; // '@' + length
          break;
        }
      }
    }

    if (matchedCandidate) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const isCurrentUser =
        matchedCandidate.display_name.toLowerCase() === currentUserName.toLowerCase();

      parts.push(
        <MentionBadge
          key={`mention-${match.index}`}
          name={matchedCandidate.display_name}
          isCurrentUser={isCurrentUser}
          memberInfo={matchedCandidate}
        />
      );

      lastIndex = match.index + matchLength;
      mentionPattern.lastIndex = lastIndex;
    } else {
      // Not a recognized system user, treat as normal text up to the match
      // but if it has @word style, render it with standard mention badge
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const isCurrentUser = mentionName.toLowerCase() === currentUserName.toLowerCase();
      parts.push(
        <MentionBadge
          key={`mention-generic-${match.index}`}
          name={mentionName}
          isCurrentUser={isCurrentUser}
        />
      );

      lastIndex = match.index + rawMention.length;
    }
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>;
};
