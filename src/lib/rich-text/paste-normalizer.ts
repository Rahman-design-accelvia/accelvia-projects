// src/lib/rich-text/paste-normalizer.ts
// Sanitizes and normalizes clipboard HTML to remove theme-specific styling
// while preserving table structure, headings, lists, bold, links.

import dompurify from 'dompurify';

/**
 * List of allowed HTML tags for the rich-text editor.
 */
const ALLOWED_TAGS = [
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'blockquote', 'code', 'pre', 'a'
];

/**
 * List of allowed attributes.
 */
const ALLOWED_ATTR = ['href', 'target', 'rel', 'colspan', 'rowspan'];

function sanitizeHtml(html: string): string {
  // Support both browser DOMPurify, ESM default, and factory in Node
  const purify = (dompurify as any).default || dompurify;
  if (typeof purify.sanitize === 'function') {
    return purify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
      FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
    });
  }

  // Fallback regex sanitizer if DOMPurify is not initialized with a window in Node
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\s*on\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/href\s*=\s*(['"])javascript:.*?\1/gi, 'href="#"');

  return sanitized;
}

/**
 * Normalizes pasted HTML by stripping all foreground and background colors,
 * fonts, and theme-specific inline styles, while preserving structural elements.
 */
export function normalizePastedHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  // 1. First-pass sanitization
  const cleanHtml = sanitizeHtml(rawHtml);

  // 2. DOM manipulation to strip any lingering inline styling
  // In browser environment or DOM parser
  if (typeof window !== 'undefined' && window.DOMParser) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanHtml, 'text/html');

    // Remove all style attributes from all elements
    const elementsWithStyle = doc.querySelectorAll('[style]');
    elementsWithStyle.forEach((el) => {
      el.removeAttribute('style');
    });

    // Remove class names from external apps that might carry background/color rules
    const allElements = doc.querySelectorAll('*');
    allElements.forEach((el) => {
      el.removeAttribute('class');
      // Ensure target="_blank" links have rel="noopener noreferrer"
      if (el.tagName.toLowerCase() === 'a' && el.getAttribute('target') === '_blank') {
        el.setAttribute('rel', 'noopener noreferrer');
      }
    });

    return doc.body.innerHTML;
  }

  // Fallback for non-DOM test environments: strip style="..." and class="..." attributes via regex
  return cleanHtml
    .replace(/\s*style=(['"])[^'"]*\1/gi, '')
    .replace(/\s*class=(['"])[^'"]*\1/gi, '')
    .trim();
}

/**
 * Maximum file upload limits in decimal bytes.
 */
export const UPLOAD_LIMITS = {
  IMAGE_MAX_BYTES: 10_000_000, // 10 MB
  VIDEO_MAX_BYTES: 50_000_000, // 50 MB
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  recommendation?: string;
}

export function validateAttachment(file: { name: string; size: number; type: string }): FileValidationResult {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  if (isImage) {
    if (file.size > UPLOAD_LIMITS.IMAGE_MAX_BYTES) {
      return {
        valid: false,
        error: `Image exceeds 10 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
        recommendation: 'Please compress the image or resize it before uploading.',
      };
    }
    return { valid: true };
  }

  if (isVideo) {
    if (file.size > UPLOAD_LIMITS.VIDEO_MAX_BYTES) {
      return {
        valid: false,
        error: `Video exceeds 50 MB upload limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
        recommendation:
          'Please upload it to Google Drive or another video-hosting service and share the link in this conversation.',
      };
    }
    return { valid: true };
  }

  // Other file types (documents) up to 20 MB
  if (file.size > 20_000_000) {
    return {
      valid: false,
      error: `File exceeds 20 MB limit.`,
      recommendation: 'Please share files larger than 20 MB via Google Drive or cloud storage.',
    };
  }

  return { valid: true };
}
