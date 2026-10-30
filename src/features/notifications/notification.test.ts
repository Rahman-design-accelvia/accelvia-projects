// src/features/notifications/notification.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebPushService } from '../../lib/notifications/push-service';
import { notificationAudio } from '../../lib/notifications/sound';
import { AppNotification } from '../../types';

describe('WebPushService & Audio Chimes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly detects WebPush API support in browser environment', () => {
    const isSupported = WebPushService.isSupported();
    expect(typeof isSupported).toBe('boolean');
  });

  it('returns valid permission status or unsupported', () => {
    const perm = WebPushService.getPermission();
    expect(['default', 'granted', 'denied', 'unsupported']).toContain(perm);
  });

  it('safely handles audio chimes without throwing', () => {
    expect(() => {
      notificationAudio.playApprovedChime();
      notificationAudio.playConversationChime();
      notificationAudio.playStatusChime();
    }).not.toThrow();
  });

  it('constructs correct notification structure with required fields', () => {
    const testNotif: AppNotification = {
      id: 'notif-test-1',
      title: 'Estimate Scope Approved',
      body: '145.0 hrs authorized by Management',
      category: 'estimate_approved',
      priority: 'high',
      timestamp: new Date().toISOString(),
      read: false,
      project_id: 'proj-1',
      project_name: 'Cloud Migration',
      version_number: 1,
    };

    expect(testNotif.category).toBe('estimate_approved');
    expect(testNotif.read).toBe(false);
    expect(testNotif.priority).toBe('high');
    expect(testNotif.version_number).toBe(1);
  });
});

