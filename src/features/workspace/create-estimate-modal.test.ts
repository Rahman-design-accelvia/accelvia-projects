// src/features/workspace/create-estimate-modal.test.ts
// Unit tests for CreateEstimateModal parsing, multi-task lists, and calculations

import { describe, it, expect } from 'vitest';

export function parseBulkTaskList(
  text: string,
  defaultHours = 4
): Array<{ title: string; hours: number }> {
  if (!text.trim()) return [];

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines
    .map((line) => {
      // Strip leading bullet points or numbers (e.g. "1. ", "- ", "* ")
      const cleanLine = line.replace(/^(?:[-*•]|\d+[.)])\s*/, '').trim();

      // Look for hours in parentheses, colons, or commas at the end of line
      const matchWithHours = cleanLine.match(
        /^(.*?)(?:[\(\[\{,:\-–]\s*(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)?[\)\]\}]?)\s*$/i
      );

      if (matchWithHours && matchWithHours[1].trim() && matchWithHours[2]) {
        return {
          title: matchWithHours[1].trim(),
          hours: Number(matchWithHours[2]) || defaultHours,
        };
      }

      // Trailing digits + hrs
      const matchTrailingHrs = cleanLine.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)$/i);
      if (matchTrailingHrs && matchTrailingHrs[1].trim()) {
        return {
          title: matchTrailingHrs[1].trim(),
          hours: Number(matchTrailingHrs[2]) || defaultHours,
        };
      }

      return {
        title: cleanLine,
        hours: defaultHours,
      };
    })
    .filter((it) => it.title.length > 0 && it.hours > 0);
}

describe('Create Estimate Modal & Multi-Task List Parsing', () => {
  it('correctly parses bulleted lines with hours in parentheses', () => {
    const raw = `
      - Home page & Global settings (16 hrs)
      - Responsive layout (10 hrs)
      - QA & Performance audit (5.5 hrs)
    `;
    const result = parseBulkTaskList(raw);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ title: 'Home page & Global settings', hours: 16 });
    expect(result[1]).toEqual({ title: 'Responsive layout', hours: 10 });
    expect(result[2]).toEqual({ title: 'QA & Performance audit', hours: 5.5 });
  });

  it('correctly parses numbered lists with colons and commas', () => {
    const raw = `
      1. Database schema and migrations: 14
      2. Core REST API endpoints, 20
      3. Integration tests: 8.5 hrs
    `;
    const result = parseBulkTaskList(raw);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ title: 'Database schema and migrations', hours: 14 });
    expect(result[1]).toEqual({ title: 'Core REST API endpoints', hours: 20 });
    expect(result[2]).toEqual({ title: 'Integration tests', hours: 8.5 });
  });

  it('applies configurable default hours when no hours are specified in task list', () => {
    const raw = `
      User Authentication
      Profile Management
      Push Notifications
    `;
    const result = parseBulkTaskList(raw, 6);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ title: 'User Authentication', hours: 6 });
    expect(result[1]).toEqual({ title: 'Profile Management', hours: 6 });
    expect(result[2]).toEqual({ title: 'Push Notifications', hours: 6 });
  });

  it('calculates total billable scope hours across all multiple task list items', () => {
    const items = [
      { title: 'Home page & Global settings', hours: 16.0 },
      { title: 'Responsive layout', hours: 10.0 },
      { title: 'QA & Delivery', hours: 5.5 },
    ];
    const total = items.reduce((acc, it) => acc + it.hours, 0);
    expect(total).toBe(31.5);
  });
});
