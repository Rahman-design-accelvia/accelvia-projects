// src/lib/rich-text/paste-normalizer.test.ts
import { describe, it, expect } from 'vitest';
import { normalizePastedHtml, validateAttachment } from './paste-normalizer';

describe('Rich Text Paste Normalizer & Security Sanitizer', () => {
  it('strips background-color and inline styles while preserving table structure', () => {
    const darkThemeHtml = `
      <table style="background-color: #1a1a1a; color: #ffffff; border: 1px solid #333;">
        <thead>
          <tr style="background-color: #222;">
            <th style="color: #00ffcc; padding: 8px;">Task Title</th>
            <th style="color: #00ffcc; padding: 8px;">Hours</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="background-color: #111; color: #fff;">Architecture Design</td>
            <td style="background-color: #111; color: #fff;">15.00</td>
          </tr>
        </tbody>
      </table>
    `;

    const normalized = normalizePastedHtml(darkThemeHtml);

    // Style attributes stripped
    expect(normalized).not.toContain('background-color');
    expect(normalized).not.toContain('#1a1a1a');
    expect(normalized).not.toContain('color: #ffffff');

    // Structural table tags preserved
    expect(normalized).toContain('<table>');
    expect(normalized).toContain('<th>Task Title</th>');
    expect(normalized).toContain('<td>Architecture Design</td>');
    expect(normalized).toContain('<td>15.00</td>');
  });

  it('strips malicious script tags, event handlers, and javascript: links', () => {
    const maliciousHtml = `
      <p>Hello <script>alert("XSS")</script></p>
      <a href="javascript:stealTokens()" onclick="evil()">Click Here</a>
    `;

    const normalized = normalizePastedHtml(maliciousHtml);

    expect(normalized).not.toContain('<script>');
    expect(normalized).not.toContain('alert');
    expect(normalized).not.toContain('javascript:');
    expect(normalized).not.toContain('onclick');
    expect(normalized).toContain('Hello');
  });

  it('validates upload size limits correctly', () => {
    // 9 MB image: valid
    expect(
      validateAttachment({ name: 'diagram.png', size: 9_000_000, type: 'image/png' }).valid
    ).toBe(true);

    // 12 MB image: invalid
    const invalidImage = validateAttachment({
      name: 'huge.png',
      size: 12_000_000,
      type: 'image/png',
    });
    expect(invalidImage.valid).toBe(false);
    expect(invalidImage.error).toContain('10 MB limit');

    // 45 MB video: valid
    expect(
      validateAttachment({ name: 'walkthrough.mp4', size: 45_000_000, type: 'video/mp4' }).valid
    ).toBe(true);

    // 60 MB video: invalid with Google Drive guidance
    const invalidVideo = validateAttachment({
      name: 'large-demo.mp4',
      size: 60_000_000,
      type: 'video/mp4',
    });
    expect(invalidVideo.valid).toBe(false);
    expect(invalidVideo.recommendation).toContain('Google Drive');
  });
});
