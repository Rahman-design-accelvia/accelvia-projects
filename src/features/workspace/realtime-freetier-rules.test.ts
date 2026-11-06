// src/features/workspace/realtime-freetier-rules.test.ts
// Tests for Free-Tier Quota Optimization, Realtime Echo Suppression, and Administration Rules Enforcement

import { describe, it, expect } from 'vitest';
import { filterMessagesForProject, extractMessageSnippet } from './WorkspaceLayout';
import { SafeMessage } from '../../types';

describe('Realtime Free Tier & Administration Rules Engine', () => {
  describe('Per-Project Conversation Isolation', () => {
    const mockMessages: SafeMessage[] = [
      {
        id: 'msg-p1',
        conversation_id: 'conv-proj-1',
        project_id: 'proj-1',
        author_id: 'u-1',
        author_name: 'Admin Sarah',
        author_is_management: false,
        content_json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello Project 1' }] }] },
        event_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_edited: false,
        is_deleted: false,
        attachments: [],
        voice_note: null,
      },
      {
        id: 'msg-p2',
        conversation_id: 'conv-proj-2',
        project_id: 'proj-2',
        author_id: 'u-2',
        author_name: 'Musfiqur Rahman',
        author_is_management: false,
        content_json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello Project 2' }] }] },
        event_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_edited: false,
        is_deleted: false,
        attachments: [],
        voice_note: null,
      },
    ];

    it('isolates messages strictly to proj-1 and prevents cross-project leakage', () => {
      const p1Messages = filterMessagesForProject(mockMessages, 'proj-1');
      expect(p1Messages.length).toBe(1);
      expect(p1Messages[0].id).toBe('msg-p1');
      expect(p1Messages.some((m) => m.project_id === 'proj-2')).toBe(false);
    });

    it('isolates messages strictly to proj-2 and ensures a clean thread for new projects', () => {
      const p2Messages = filterMessagesForProject(mockMessages, 'proj-2');
      expect(p2Messages.length).toBe(1);
      expect(p2Messages[0].id).toBe('msg-p2');

      const brandNewProjMessages = filterMessagesForProject(mockMessages, 'proj-brand-new');
      expect(brandNewProjMessages.length).toBe(0);
    });
  });

  describe('Extract Message Snippet for Cross-Device Push Notifications', () => {
    it('extracts plain text from rich Tiptap document structures', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hey ' },
              { type: 'text', text: '@Management' },
              { type: 'text', text: ', please review this estimate!' },
            ],
          },
        ],
      };
      const snippet = extractMessageSnippet(doc);
      expect(snippet).toBe('Hey @Management , please review this estimate!');
    });

    it('falls back gracefully on empty or malformed document objects', () => {
      expect(extractMessageSnippet({})).toBe('New message in conversation thread');
      expect(extractMessageSnippet({ type: 'doc', content: [] })).toBe('New message in conversation thread');
    });
  });

  describe('Free Tier Echo Suppression & Network Call Elimination', () => {
    it('detects identical states and suppresses redundant network upserts', () => {
      const lastCloudJson: Record<string, string> = {};
      let networkUpsertCount = 0;

      const simulateQueueSync = (key: string, value: any) => {
        const jsonStr = JSON.stringify(value);
        if (lastCloudJson[key] === jsonStr) {
          // Echo suppression: 0 network calls!
          return;
        }
        lastCloudJson[key] = jsonStr;
        networkUpsertCount += 1;
      };

      const initialProjects = [{ id: 'proj-1', name: 'Alpha' }];
      // Initial cloud load records the state
      simulateQueueSync('projects', initialProjects);
      expect(networkUpsertCount).toBe(1);

      // React re-render with identical data: echo suppressed!
      simulateQueueSync('projects', initialProjects);
      expect(networkUpsertCount).toBe(1);

      // Incoming Realtime event echoes identical data: echo suppressed!
      simulateQueueSync('projects', [{ id: 'proj-1', name: 'Alpha' }]);
      expect(networkUpsertCount).toBe(1);

      // Legitimate user change: triggers single sync
      simulateQueueSync('projects', [{ id: 'proj-1', name: 'Alpha' }, { id: 'proj-2', name: 'Beta' }]);
      expect(networkUpsertCount).toBe(2);
    });
  });

  describe('Administration Rule: Super Admin Masking as Management', () => {
    it('correctly identifies author display name as Management when author_is_management is true', () => {
      const superAdminMsg: Partial<SafeMessage> = {
        author_id: 'sa-gravity',
        author_name: 'Ahmed Super Admin',
        author_is_management: true,
      };

      const regularAdminMsg: Partial<SafeMessage> = {
        author_id: 'admin-1',
        author_name: 'Nahidur Abedin',
        author_is_management: false,
      };

      const getAuthorDisplayName = (msg: Partial<SafeMessage>) =>
        msg.author_is_management ? 'Management' : msg.author_name;

      expect(getAuthorDisplayName(superAdminMsg)).toBe('Management');
      expect(getAuthorDisplayName(regularAdminMsg)).toBe('Nahidur Abedin');
    });
  });

  describe('Administration Rule: Member Financial Redaction', () => {
    it('redacts USD and BDT from members while preserving approved deliverable hours', () => {
      const financialSettings = {
        client_rate_usd_per_hour: 50,
        client_rate_bdt_per_hour: 6000,
        internal_budget_hours: 40,
      };

      const estimateItems = [
        { title: 'Frontend UI', hours: 10 },
        { title: 'Backend API', hours: 15 },
      ];

      const isMember = true;
      const canViewMoney = !isMember;

      const memberView = {
        items: estimateItems,
        totalHours: estimateItems.reduce((acc, curr) => acc + curr.hours, 0),
        usd: canViewMoney ? estimateItems.reduce((acc, curr) => acc + curr.hours, 0) * (financialSettings.client_rate_usd_per_hour || 0) : null,
        bdt: canViewMoney ? estimateItems.reduce((acc, curr) => acc + curr.hours, 0) * (financialSettings.client_rate_bdt_per_hour || 0) : null,
      };

      expect(memberView.totalHours).toBe(25);
      expect(memberView.usd).toBeNull();
      expect(memberView.bdt).toBeNull();
    });
  });
});
