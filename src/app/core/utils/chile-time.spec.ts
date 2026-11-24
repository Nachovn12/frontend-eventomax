import { describe, it, expect } from 'vitest';
import {
  chileLocalInputToAuditUtc,
  chileWallClockToUtcDate,
  formatAuditTimestampChile,
  formatCalendarDateEsCl,
  formatCalendarDateShortEsCl,
  formatInstantToChileDatetimeLocal,
  formatOperationalTimestampChile,
  formatScheduledAtChile,
  formatUtcIsoSeconds,
  formatUtcReference,
  getChileMonthStartDatetimeLocal,
  getChileZoneInfo,
  parseScheduledAtToInstant,
  parseServerTimestampAsUtc,
} from './chile-time';

describe('chile-time (America/Santiago es-CL 24h standard)', () => {
  it('formats Production #13 summer audit timestamp (CLST, UTC-3) and preserves exact UTC reference', () => {
    const withZ = formatAuditTimestampChile('2026-11-23T22:30:26Z');
    expect(withZ.date).toBe('23/11/2026');
    expect(withZ.time).toBe('19:30:26');
    expect(withZ.tzAbbr).toBe('CLST');
    expect(withZ.utcOffset).toBe('UTC-3');
    expect(withZ.tzLabel).toBe('CLST (UTC-3)');
    expect(withZ.combined).toBe('23/11/2026 · 19:30:26 CLST (UTC-3)');
    expect(withZ.utcIso).toBe('2026-11-23T22:30:26Z');
    expect(withZ.utcReadable).toBe('2026-11-23 22:30:26 UTC');

    // Naive Audit LocalDateTime (backend contract = UTC without Z) produces identical output
    const naive = formatAuditTimestampChile('2026-11-23T22:30:26');
    expect(naive.combined).toBe('23/11/2026 · 19:30:26 CLST (UTC-3)');
    expect(naive.utcIso).toBe('2026-11-23T22:30:26Z');
  });

  it('formats winter audit timestamp automatically in CLT (UTC-4) without fixed offsets', () => {
    const winter = formatAuditTimestampChile('2026-07-15T22:30:26Z');
    expect(winter.date).toBe('15/07/2026');
    expect(winter.time).toBe('18:30:26');
    expect(winter.tzAbbr).toBe('CLT');
    expect(winter.utcOffset).toBe('UTC-4');
    expect(winter.tzLabel).toBe('CLT (UTC-4)');
    expect(winter.combined).toBe('15/07/2026 · 18:30:26 CLT (UTC-4)');
    expect(winter.utcIso).toBe('2026-07-15T22:30:26Z');
  });

  it('handles UTC midnight crossing into previous Chile calendar day and previous month/year', () => {
    // 2026-11-23T02:03:24Z -> 22/11/2026 23:03:24 CLST
    const prevDay = formatAuditTimestampChile('2026-11-23T02:03:24.116572');
    expect(prevDay.combined).toBe('22/11/2026 · 23:03:24 CLST (UTC-3)');

    // 2026-08-01T01:15:00Z -> 31/07/2026 21:15:00 CLT (month rollover in winter)
    const prevMonth = formatAuditTimestampChile('2026-08-01T01:15:00Z');
    expect(prevMonth.combined).toBe('31/07/2026 · 21:15:00 CLT (UTC-4)');

    // 2027-01-01T00:05:00Z -> 31/12/2026 21:05:00 CLST (year rollover in summer)
    const prevYear = formatAuditTimestampChile('2027-01-01T00:05:00Z');
    expect(prevYear.combined).toBe('31/12/2026 · 21:05:00 CLST (UTC-3)');
  });

  it('formats operational timestamps in 24h HH:mm without AM/PM for both seasons', () => {
    const summer = formatOperationalTimestampChile('2026-11-23T03:00:00Z');
    expect(summer.full).toBe('23/11/2026 · 00:00 CLST (UTC-3)');
    expect(summer.ticketFull).toBe('23/11/2026, 00:00 h (CLST, UTC-3)');
    expect(summer.full).not.toMatch(/AM|PM|a\.\s?m\.|p\.\s?m\./i);

    const winter = formatOperationalTimestampChile('2026-07-15T14:30:00');
    expect(winter.full).toBe('15/07/2026 · 10:30 CLT (UTC-4)');
    expect(winter.ticketFull).toBe('15/07/2026, 10:30 h (CLT, UTC-4)');
  });

  it('differentiates scheduledAt naive Chile wall-clock from offset-aware UTC without double conversion', () => {
    // Naive wall-clock in summer stays 09:00 CLST (UTC-3)
    const naiveSummer = formatScheduledAtChile('2026-11-25T09:00:00');
    expect(naiveSummer.combined).toBe('25/11/2026 · 09:00 CLST (UTC-3)');
    expect(naiveSummer.ticketFull).toBe('25/11/2026, 09:00 h (CLST, UTC-3)');
    expect(naiveSummer.approxInstant?.toISOString()).toBe('2026-11-25T12:00:00.000Z');

    // Naive wall-clock in winter stays 09:30 CLT (UTC-4)
    const naiveWinter = formatScheduledAtChile('2026-07-20T09:30:00');
    expect(naiveWinter.combined).toBe('20/07/2026 · 09:30 CLT (UTC-4)');
    expect(naiveWinter.approxInstant?.toISOString()).toBe('2026-07-20T13:30:00.000Z');

    // Offset-aware UTC converts into America/Santiago accurately
    const utcWinter = formatScheduledAtChile('2026-07-15T18:00:00Z');
    expect(utcWinter.combined).toBe('15/07/2026 · 14:00 CLT (UTC-4)');
    expect(utcWinter.approxInstant?.toISOString()).toBe('2026-07-15T18:00:00.000Z');

    // Date-only preserves exact calendar date without shifting backward
    const dateOnly = formatScheduledAtChile('2026-09-14');
    expect(dateOnly.date).toBe('14/09/2026');
    expect(dateOnly.monthShort).toBe('sep');
    expect(dateOnly.day).toBe('14');
  });

  it('converts Chile local filter inputs to Audit UTC without Z across summer, winter, and day/month boundaries', () => {
    // Summer CLST (UTC-3)
    expect(chileLocalInputToAuditUtc('2026-10-01T10:00')).toBe('2026-10-01T13:00:00');
    expect(chileLocalInputToAuditUtc('2026-10-15T18:30')).toBe('2026-10-15T21:30:00');
    // End of day in Chile crosses into next UTC day
    expect(chileLocalInputToAuditUtc('2026-11-30T23:59:59')).toBe('2026-12-01T02:59:59');

    // Winter CLT (UTC-4)
    expect(chileLocalInputToAuditUtc('2026-07-15T10:00')).toBe('2026-07-15T14:00:00');
    expect(chileLocalInputToAuditUtc('2026-07-31T23:59:59')).toBe('2026-08-01T03:59:59');

    // Invalid calendar dates rejected cleanly
    expect(chileLocalInputToAuditUtc('2026-02-30T10:00')).toBeUndefined();
    expect(chileLocalInputToAuditUtc('')).toBeUndefined();
  });

  it('handles Chile DST transitions deterministically: ambiguous fall-back hour and non-existent spring-forward hour', () => {
    // Chile 2026 fall-back: 2026-04-04 23:59:59 CLST (UTC-3) -> 2026-04-04 23:00:00 CLT (UTC-4)
    // 23:30 happens twice: 2026-04-05T02:30:00Z (CLST) and 2026-04-05T03:30:00Z (CLT).
    // Standard compatible resolution picks the earlier occurrence (CLST, UTC-3).
    const fallBack = chileWallClockToUtcDate(2026, 4, 4, 23, 30, 0);
    expect(fallBack.toISOString()).toBe('2026-04-05T02:30:00.000Z');
    expect(getChileZoneInfo(fallBack).abbr).toBe('CLST');
    expect(getChileZoneInfo(new Date('2026-04-05T03:30:00Z')).abbr).toBe('CLT');

    // Chile 2026 spring-forward: 2026-09-05 23:59:59 CLT (UTC-4) -> 2026-09-06 01:00:00 CLST (UTC-3)
    // 2026-09-06 00:30 does not exist; compatible resolution advances across the 1h gap to 01:30 CLST (04:30Z).
    const springGap = chileWallClockToUtcDate(2026, 9, 6, 0, 30, 0);
    expect(springGap.toISOString()).toBe('2026-09-06T04:30:00.000Z');
    expect(formatAuditTimestampChile(springGap.toISOString()).combined).toBe(
      '06/09/2026 · 01:30:00 CLST (UTC-3)',
    );
  });

  it('formats pure calendar dates without timezone drift and computes Chile month start independently of device TZ', () => {
    expect(formatCalendarDateEsCl('2026-11-07')).toBe('07/11/2026');
    expect(formatCalendarDateShortEsCl('2026-11-07')).toBe('07 nov');

    // 2026-12-01T01:00:00Z is still 30/11/2026 22:00 CLST in Chile -> month start must be 2026-11-01T00:00!
    const novEndInUtcDec = new Date('2026-12-01T01:00:00Z');
    expect(getChileMonthStartDatetimeLocal(novEndInUtcDec)).toBe('2026-11-01T00:00');
    expect(formatInstantToChileDatetimeLocal(novEndInUtcDec)).toBe('2026-11-30T22:00');

    expect(parseServerTimestampAsUtc('2026-11-23T02:03:24.116572')?.toISOString()).toBe(
      '2026-11-23T02:03:24.116Z',
    );
    expect(formatUtcReference('2026-11-23T02:03:24.116572')).toBe('2026-11-23 02:03:24 UTC');
    expect(formatUtcIsoSeconds('2026-11-23T02:03:24.116572')).toBe('2026-11-23T02:03:24Z');
    expect(parseScheduledAtToInstant('2026-11-25T09:00:00')?.toISOString()).toBe(
      '2026-11-25T12:00:00.000Z',
    );
  });
});
