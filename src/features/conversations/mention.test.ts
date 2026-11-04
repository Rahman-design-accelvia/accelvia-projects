// src/features/conversations/mention.test.ts
// Unit tests for Google L6 @mention autocomplete & message formatting logic

import { describe, it, expect } from 'vitest';
import { MentionCandidate } from './MentionAutocomplete';

describe('@mention Autocomplete & Parsing Logic', () => {
  const sampleCandidates: MentionCandidate[] = [
    {
      id: 'management',
      display_name: 'Management',
      email: 'management@accelvia.internal',
      role: 'management',
      avatar_text: 'M',
      is_management: true,
    },
    {
      id: 'user-1',
      display_name: 'Musfiqur Rahman (QA)',
      email: 'musfiqurrahmanqa@gmail.com',
      role: 'admin',
      avatar_text: 'M',
    },
    {
      id: 'user-2',
      display_name: 'Super Admin (Ahmed)',
      email: 'gravityahmed11@gmail.com',
      role: 'super_admin',
      avatar_text: 'S',
      is_management: true,
    },
    {
      id: 'user-3',
      display_name: 'Dev Alex',
      email: 'member@accelvia.internal',
      role: 'member',
      avatar_text: 'D',
    },
  ];

  it('filters candidates by name query case-insensitively', () => {
    const query = 'mus';
    const filtered = sampleCandidates.filter((c) =>
      c.display_name.toLowerCase().includes(query.toLowerCase())
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].display_name).toBe('Musfiqur Rahman (QA)');
  });

  it('filters candidates by role or email', () => {
    const query = 'admin';
    const filtered = sampleCandidates.filter(
      (c) =>
        c.role.toLowerCase().includes(query.toLowerCase()) ||
        c.email.toLowerCase().includes(query.toLowerCase())
    );
    // Should match Musfiqur (admin) and Super Admin
    expect(filtered.length).toBeGreaterThanOrEqual(2);
  });

  it('does not trigger on email addresses with @ in the middle of a word', () => {
    const emailText = 'Please send inquiry to info@accelvia.com for details.';
    const triggerRegex = /(?:^|\s)@([a-zA-Z0-9_\s.()'-]{0,25})$/;
    const match = triggerRegex.exec(emailText);
    expect(match).toBeNull();
  });

  it('correctly matches @ trigger at start of line or following whitespace', () => {
    const triggerRegex = /(?:^|\s)@([a-zA-Z0-9_\s.()'-]{0,25})$/;
    
    // Start of line
    const matchStart = triggerRegex.exec('@Dev');
    expect(matchStart).not.toBeNull();
    expect(matchStart![1]).toBe('Dev');

    // After space
    const matchSpace = triggerRegex.exec('Hello @Musfiqur');
    expect(matchSpace).not.toBeNull();
    expect(matchSpace![1]).toBe('Musfiqur');

    // Bare @ symbol
    const matchBare = triggerRegex.exec('Hey @');
    expect(matchBare).not.toBeNull();
    expect(matchBare![1]).toBe('');
  });

  it('identifies @mentions inside message strings', () => {
    const text = 'Hey @Dev Alex, please verify the estimate with @Management.';
    const mentionPattern = /@([a-zA-Z0-9_\-.'()]+(?:\s+[a-zA-Z0-9_\-.'()]+)*)/g;
    const matches: string[] = [];
    let m;
    while ((m = mentionPattern.exec(text)) !== null) {
      matches.push(m[1]);
    }
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(matches.some((name) => name.startsWith('Dev Alex'))).toBe(true);
    expect(matches.some((name) => name.startsWith('Management'))).toBe(true);
  });
});
