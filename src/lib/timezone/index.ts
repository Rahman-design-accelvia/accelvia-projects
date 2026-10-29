// src/lib/timezone/index.ts
// Dual-clock timezone engine with IANA support and DST transition handling

export const BANGLADESH_TIMEZONE = 'Asia/Dhaka';

export interface FormattedDualTime {
  clientTime: string;
  clientDate: string;
  clientTzAbbrev: string;
  bangladeshTime: string;
  bangladeshDate: string;
  bangladeshTzAbbrev: string;
  isSameDate: boolean;
  canonicalUtc: string;
}

/**
 * Formats an ISO instant into dual timestamps:
 * 1. Project / Client Local Time (using project's IANA timezone)
 * 2. Bangladesh Time (Asia/Dhaka)
 */
export function formatDualTime(
  isoInstant: string | Date,
  clientIanaTimezone: string = 'America/New_York'
): FormattedDualTime {
  const date = typeof isoInstant === 'string' ? new Date(isoInstant) : isoInstant;

  // Validate date
  if (isNaN(date.getTime())) {
    return {
      clientTime: 'Invalid date',
      clientDate: '',
      clientTzAbbrev: '',
      bangladeshTime: 'Invalid date',
      bangladeshDate: '',
      bangladeshTzAbbrev: '',
      isSameDate: true,
      canonicalUtc: '',
    };
  }

  // Safe fallback if invalid timezone passed
  let validClientTz = clientIanaTimezone;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: validClientTz });
  } catch {
    validClientTz = 'UTC';
  }

  // Client time formatter
  const clientTimeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: validClientTz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const clientDateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: validClientTz,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const clientTzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: validClientTz,
    timeZoneName: 'short',
  });

  // Bangladesh time formatter
  const bdTimeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BANGLADESH_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const bdDateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BANGLADESH_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const bdTzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BANGLADESH_TIMEZONE,
    timeZoneName: 'short',
  });

  const clientDate = clientDateFormatter.format(date);
  const bdDate = bdDateFormatter.format(date);

  // Extract short timezone abbreviation
  const clientParts = clientTzFormatter.formatToParts(date);
  const clientTzAbbrev = clientParts.find((p) => p.type === 'timeZoneName')?.value || validClientTz;

  const bdParts = bdTzFormatter.formatToParts(date);
  const bdTzAbbrev = bdParts.find((p) => p.type === 'timeZoneName')?.value || 'BST';

  return {
    clientTime: clientTimeFormatter.format(date),
    clientDate,
    clientTzAbbrev,
    bangladeshTime: bdTimeFormatter.format(date),
    bangladeshDate: bdDate,
    bangladeshTzAbbrev: bdTzAbbrev,
    isSameDate: clientDate === bdDate,
    canonicalUtc: date.toISOString(),
  };
}

/**
 * Returns a human-friendly string for message headers or cards:
 * e.g. "10:30 AM EDT (BD: 8:30 PM BST)"
 */
export function formatDualTimeInline(
  isoInstant: string | Date,
  clientIanaTimezone: string = 'America/New_York'
): string {
  const formatted = formatDualTime(isoInstant, clientIanaTimezone);
  if (!formatted.clientDate) return 'Invalid date';

  const datePrefix = !formatted.isSameDate
    ? `[${formatted.clientDate}] `
    : '';

  return `${datePrefix}${formatted.clientTime} ${formatted.clientTzAbbrev} / BD: ${formatted.bangladeshTime} ${formatted.bangladeshTzAbbrev}`;
}
