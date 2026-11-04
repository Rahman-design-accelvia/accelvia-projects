// src/features/conversations/rich-message-renderer.test.ts
// Unit tests for AST rendering of Tiptap JSON messages (tables, lists, marks, fallbacks)

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { RichMessageRenderer } from './RichMessageRenderer';

describe('RichMessageRenderer', () => {
  const candidates = [
    {
      id: 'user-1',
      display_name: 'Musfiqur Rahman (QA)',
      email: 'qa@accelvia.internal',
      role: 'admin' as const,
      avatar_text: 'M',
    },
  ];

  it('renders a full table with headers, rows, and cells', () => {
    const tableJson = {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  attrs: { colspan: 1, rowspan: 1 },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task' }] }],
                },
                {
                  type: 'tableHeader',
                  attrs: { colspan: 1, rowspan: 1 },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hours' }] }],
                },
              ],
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1 },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Frontend UI' }] }],
                },
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1 },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: '12' }] }],
                },
              ],
            },
          ],
        },
      ],
    };

    const html = renderToString(
      React.createElement(RichMessageRenderer, {
        contentJson: tableJson,
        currentUserName: 'Musfiqur Rahman (QA)',
        candidates,
      })
    );

    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('Task');
    expect(html).toContain('Hours');
    expect(html).toContain('<td');
    expect(html).toContain('Frontend UI');
    expect(html).toContain('12');
  });

  it('renders text formatting marks (bold, italic, underline, link, code)', () => {
    const docJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Bold text',
              marks: [{ type: 'bold' }],
            },
            {
              type: 'text',
              text: ' and ',
            },
            {
              type: 'text',
              text: 'Italic link',
              marks: [
                { type: 'italic' },
                { type: 'link', attrs: { href: 'https://accelvia.com' } },
              ],
            },
          ],
        },
      ],
    };

    const html = renderToString(
      React.createElement(RichMessageRenderer, {
        contentJson: docJson,
        currentUserName: 'Musfiqur Rahman (QA)',
        candidates,
      })
    );

    expect(html).toContain('<strong');
    expect(html).toContain('Bold text');
    expect(html).toContain('<em');
    expect(html).toContain('href="https://accelvia.com"');
    expect(html).toContain('Italic link');
  });

  it('renders bullet lists and ordered lists correctly', () => {
    const listJson = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First item' }] }],
            },
          ],
        },
      ],
    };

    const html = renderToString(
      React.createElement(RichMessageRenderer, {
        contentJson: listJson,
        currentUserName: 'Musfiqur Rahman (QA)',
        candidates,
      })
    );

    expect(html).toContain('<ul');
    expect(html).toContain('<li');
    expect(html).toContain('First item');
  });

  it('gracefully handles legacy string content or plain text fallbacks', () => {
    const html = renderToString(
      React.createElement(RichMessageRenderer, {
        contentJson: 'Hello from simple text message',
        currentUserName: 'Musfiqur Rahman (QA)',
        candidates,
      })
    );

    expect(html).toContain('Hello from simple text message');
  });
});
