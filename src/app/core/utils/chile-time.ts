/**
 * Utilidad centralizada de estandarización temporal para Chile continental.
 *
 * Estándar EventoMax:
 * - Zona horaria IANA: America/Santiago (conversión estacional automática CLST UTC-3 / CLT UTC-4).
 * - Locale: es-CL, reloj 24 horas (hourCycle: 'h23'), sin AM/PM.
 * - Fecha: dd/MM/yyyy · Hora operacional: HH:mm · Hora de auditoría/trazabilidad: HH:mm:ss.
 * - Independiente de la zona horaria del navegador o sistema operativo.
 *
 * Semántica explícita de entradas:
 * 1. Instantes absolutos UTC o LocalDateTime emitidos por servidores en UTC
 *    (Audit timestamp, Notify createdAt, Productions createdAt/updatedAt, Report from/to/generatedAt).
 * 2. Fechas y horas locales programadas (scheduledAt sin offset = hora reloj de pared en Chile;
 *    scheduledAt con offset Z/±HH:MM = instante absoluto convertido a Chile).
 * 3. Fechas calendario sin componente horario (YYYY-MM-DD).
 * 4. Filtros temporales en hora chilena serializados a UTC sin Z para el contrato de Audit.
 */

export const CHILE_TIMEZONE = 'America/Santiago';
export const CHILE_LOCALE = 'es-CL';

const HAS_TIMEZONE_SUFFIX_RE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;
const NAIVE_ISO_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/;
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS_SHORT_ES_CL = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

export interface ChileZoneInfo {
  readonly abbr: 'CLST' | 'CLT' | 'Chile';
  readonly utcOffset: string;
  readonly offsetMinutes: number;
  readonly commaLabel: string;
  readonly parenLabel: string;
}

export interface ChileDateTimeParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly dd: string;
  readonly mm: string;
  readonly yyyy: string;
  readonly hh: string;
  readonly min: string;
  readonly ss: string;
  readonly monthShort: string;
  readonly dateKey: string;
  readonly dateEsCl: string;
}

export interface AuditTimestampChile {
  readonly date: string;
  readonly time: string;
  readonly tzAbbr: string;
  readonly utcOffset: string;
  readonly tzLabel: string;
  readonly combined: string;
  readonly utcIso: string;
  readonly utcReadable: string;
}

export interface OperationalTimestampChile {
  readonly date: string;
  readonly time: string;
  readonly tzAbbr: string;
  readonly utcOffset: string;
  readonly tzLabel: string;
  readonly commaTzLabel: string;
  readonly full: string;
  readonly ticketFull: string;
  readonly compact: string;
  readonly utcIso: string;
  readonly utcReadable: string;
}

export interface ScheduledAtChile {
  readonly date: string;
  readonly time: string;
  readonly monthShort: string;
  readonly day: string;
  readonly tzAbbr: string;
  readonly utcOffset: string;
  readonly tzLabel: string;
  readonly commaTzLabel: string;
  readonly combined: string;
  readonly kpiMain: string;
  readonly kpiSub: string;
  readonly ticketFull: string;
  readonly approxInstant: Date | null;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/**
 * Resuelve dinámicamente la abreviatura y desplazamiento vigente en America/Santiago
 * para un instante dado (CLST / UTC-3 en verano, CLT / UTC-4 en invierno).
 */
export function getChileZoneInfo(instant: Date): ChileZoneInfo {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: CHILE_TIMEZONE,
      timeZoneName: 'shortOffset',
    }).formatToParts(instant);
    const rawOffset = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    const match = rawOffset.match(/GMT([+-])(\d+)(?::(\d{2}))?/i);
    if (match) {
      const sign = match[1] === '-' ? -1 : 1;
      const hoursAbs = Number.parseInt(match[2], 10);
      const minsAbs = match[3] ? Number.parseInt(match[3], 10) : 0;
      const offsetMinutes = sign * (hoursAbs * 60 + minsAbs);
      const minsSuffix = minsAbs > 0 ? `:${pad2(minsAbs)}` : '';
      const utcOffset = `UTC${sign < 0 ? '-' : '+'}${hoursAbs}${minsSuffix}`;
      const abbr: 'CLST' | 'CLT' | 'Chile' =
        offsetMinutes === -180 ? 'CLST' : offsetMinutes === -240 ? 'CLT' : 'Chile';
      return {
        abbr,
        utcOffset,
        offsetMinutes,
        commaLabel: `${abbr}, ${utcOffset}`,
        parenLabel: `${abbr} (${utcOffset})`,
      };
    }
  } catch {
    // Fallback defensivo si el motor JS carece de shortOffset
  }

  return {
    abbr: 'Chile',
    utcOffset: 'America/Santiago',
    offsetMinutes: -240,
    commaLabel: 'America/Santiago',
    parenLabel: 'America/Santiago',
  };
}

/**
 * Descompone un instante absoluto en componentes calendario/reloj 24h en America/Santiago.
 */
export function getChileDateTimeParts(instant: Date): ChileDateTimeParts {
  const parts = new Intl.DateTimeFormat(CHILE_LOCALE, {
    timeZone: CHILE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);

  const byType = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00';

  const yyyy = byType('year');
  const mm = byType('month');
  const dd = byType('day');
  let hh = byType('hour');
  if (hh === '24') hh = '00';
  const min = byType('minute');
  const ss = byType('second');

  const year = Number.parseInt(yyyy, 10);
  const month = Number.parseInt(mm, 10);
  const day = Number.parseInt(dd, 10);
  const hour = Number.parseInt(hh, 10) % 24;
  const minute = Number.parseInt(min, 10);
  const second = Number.parseInt(ss, 10);

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dd,
    mm,
    yyyy,
    hh,
    min,
    ss,
    monthShort: MONTHS_SHORT_ES_CL[month - 1] ?? mm,
    dateKey: `${yyyy}-${mm}-${dd}`,
    dateEsCl: `${dd}/${mm}/${yyyy}`,
  };
}

function matchesChileWallClock(
  instant: Date,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): boolean {
  const p = getChileDateTimeParts(instant);
  return (
    p.year === year &&
    p.month === month &&
    p.day === day &&
    p.hour === hour &&
    p.minute === minute
  );
}

/**
 * Convierte una hora reloj de pared en Chile continental (America/Santiago) a instante UTC exacto.
 *
 * Manejo determinista de transiciones DST (estándar compatible / ZonedDateTime):
 * - Hora ambigua (cambio a invierno, hora repetida): selecciona la primera ocurrencia (más temprana).
 * - Hora inexistente (cambio a verano, salto hacia adelante): avanza limpiamente por el salto horario.
 */
export function chileWallClockToUtcDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
  ms = 0,
): Date {
  const utcGuessMs = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const offset1 = getChileZoneInfo(new Date(utcGuessMs)).offsetMinutes;
  const cand1 = new Date(utcGuessMs - offset1 * 60_000);
  const offset2 = getChileZoneInfo(cand1).offsetMinutes;
  const cand2 = offset2 === offset1 ? cand1 : new Date(utcGuessMs - offset2 * 60_000);

  const cand1Matches = matchesChileWallClock(cand1, year, month, day, hour, minute);
  const cand2Matches = matchesChileWallClock(cand2, year, month, day, hour, minute);

  if (cand1Matches && cand2Matches) {
    // Hora ambigua: retornar la primera ocurrencia cronológica (ej. CLST antes que CLT)
    return cand1.getTime() <= cand2.getTime() ? cand1 : cand2;
  }
  if (cand2Matches) {
    return cand2;
  }
  if (cand1Matches) {
    return cand1;
  }

  // Hora inexistente (salto de primavera): cand1 usa el offset previo a la transición,
  // proyectando hacia adelante después del salto (ej. 00:30 inexistente -> 01:30 CLST).
  return cand1;
}

/**
 * Categoría 1: parsea timestamps emitidos por servidores en UTC
 * (Audit timestamp, Notify createdAt, Productions createdAt/updatedAt, Report from/to/generatedAt).
 */
export function parseServerTimestampAsUtc(iso: string | null | undefined): Date | null {
  if (!iso || !iso.trim()) return null;
  const trimmed = iso.trim();
  const normalized = HAS_TIMEZONE_SUFFIX_RE.test(trimmed)
    ? trimmed
    : NAIVE_ISO_DATETIME_RE.test(trimmed)
      ? `${trimmed.replace(' ', 'T')}Z`
      : trimmed;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formatea un instante UTC como referencia técnica legible: `YYYY-MM-DD HH:mm:ss UTC`.
 */
export function formatUtcReference(iso: string | null | undefined): string {
  const instant = parseServerTimestampAsUtc(iso);
  if (!instant) return 'No disponible';
  return `${instant.getUTCFullYear()}-${pad2(instant.getUTCMonth() + 1)}-${pad2(instant.getUTCDate())} ${pad2(instant.getUTCHours())}:${pad2(instant.getUTCMinutes())}:${pad2(instant.getUTCSeconds())} UTC`;
}

/**
 * Formatea un instante UTC como ISO exacto con precisión de segundos: `YYYY-MM-DDTHH:mm:ssZ`.
 */
export function formatUtcIsoSeconds(iso: string | null | undefined): string {
  const instant = parseServerTimestampAsUtc(iso);
  if (!instant) return 'NO_DATE';
  return `${instant.getUTCFullYear()}-${pad2(instant.getUTCMonth() + 1)}-${pad2(instant.getUTCDate())}T${pad2(instant.getUTCHours())}:${pad2(instant.getUTCMinutes())}:${pad2(instant.getUTCSeconds())}Z`;
}

/**
 * Categoría 1 (Auditoría y trazabilidad): precisión al segundo `HH:mm:ss`.
 * Ejemplo verano: `23/11/2026 · 19:30:26 CLST (UTC-3)`.
 * Ejemplo invierno: `15/07/2026 · 18:30:26 CLT (UTC-4)`.
 */
export function formatAuditTimestampChile(iso: string | null | undefined): AuditTimestampChile {
  const instant = parseServerTimestampAsUtc(iso);
  if (!instant) {
    return {
      date: 'No disponible',
      time: '',
      tzAbbr: '',
      utcOffset: '',
      tzLabel: 'America/Santiago',
      combined: 'No disponible',
      utcIso: 'No disponible',
      utcReadable: 'No disponible',
    };
  }
  const p = getChileDateTimeParts(instant);
  const z = getChileZoneInfo(instant);
  const time = `${p.hh}:${p.min}:${p.ss}`;
  const utcIso = formatUtcIsoSeconds(iso);
  const utcReadable = formatUtcReference(iso);

  return {
    date: p.dateEsCl,
    time,
    tzAbbr: z.abbr,
    utcOffset: z.utcOffset,
    tzLabel: z.parenLabel,
    combined: `${p.dateEsCl} · ${time} ${z.parenLabel}`,
    utcIso,
    utcReadable,
  };
}

/**
 * Categoría 1 (Operacional): precisión a minutos `HH:mm` para emisión de tickets,
 * ventanas de reportes y marcas de actualización del servidor.
 */
export function formatOperationalTimestampChile(
  iso: string | null | undefined,
): OperationalTimestampChile {
  const instant = parseServerTimestampAsUtc(iso);
  if (!instant) {
    return {
      date: 'No disponible',
      time: '',
      tzAbbr: '',
      utcOffset: '',
      tzLabel: 'America/Santiago',
      commaTzLabel: 'America/Santiago',
      full: 'No disponible',
      ticketFull: 'No disponible',
      compact: 'No disponible',
      utcIso: 'No disponible',
      utcReadable: 'No disponible',
    };
  }
  const p = getChileDateTimeParts(instant);
  const z = getChileZoneInfo(instant);
  const time = `${p.hh}:${p.min}`;

  return {
    date: p.dateEsCl,
    time,
    tzAbbr: z.abbr,
    utcOffset: z.utcOffset,
    tzLabel: z.parenLabel,
    commaTzLabel: z.commaLabel,
    full: `${p.dateEsCl} · ${time} ${z.parenLabel}`,
    ticketFull: `${p.dateEsCl}, ${time} h (${z.commaLabel})`,
    compact: `${p.dateEsCl} · ${time} h ${z.abbr}`,
    utcIso: formatUtcIsoSeconds(iso),
    utcReadable: formatUtcReference(iso),
  };
}

/**
 * Categoría 2: convierte `scheduledAt` a instante absoluto comparable contra `Date.now()`.
 * - Con offset (`Z` o `±HH:MM`): instante exacto.
 * - Sin offset (`YYYY-MM-DDTHH:mm[:ss]`): hora reloj de pared en `America/Santiago`.
 * - Solo fecha (`YYYY-MM-DD`): inicio del día 00:00:00 en `America/Santiago`.
 */
export function parseScheduledAtToInstant(value: string | null | undefined): Date | null {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();

  if (HAS_TIMEZONE_SUFFIX_RE.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const dtMatch = trimmed.match(NAIVE_ISO_DATETIME_RE);
  if (dtMatch) {
    const year = Number.parseInt(dtMatch[1], 10);
    const month = Number.parseInt(dtMatch[2], 10);
    const day = Number.parseInt(dtMatch[3], 10);
    const hour = Number.parseInt(dtMatch[4], 10);
    const minute = Number.parseInt(dtMatch[5], 10);
    const second = dtMatch[6] ? Number.parseInt(dtMatch[6], 10) : 0;
    if (!isValidCalendarDate(year, month, day) || hour > 23 || minute > 59 || second > 59) {
      return null;
    }
    return chileWallClockToUtcDate(year, month, day, hour, minute, second);
  }

  const dateMatch = trimmed.match(DATE_ONLY_RE);
  if (dateMatch) {
    const year = Number.parseInt(dateMatch[1], 10);
    const month = Number.parseInt(dateMatch[2], 10);
    const day = Number.parseInt(dateMatch[3], 10);
    if (!isValidCalendarDate(year, month, day)) return null;
    return chileWallClockToUtcDate(year, month, day, 0, 0, 0);
  }

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Categoría 2: formatea `scheduledAt` en estándar chileno (`dd/MM/yyyy`, 24h `HH:mm`, `CLST`/`CLT` dinámico).
 * Nunca añade `Z` a horas locales programadas ni aplica conversiones dobles.
 */
export function formatScheduledAtChile(iso: string | null | undefined): ScheduledAtChile {
  const empty: ScheduledAtChile = {
    date: 'No disponible',
    time: '',
    monthShort: '--',
    day: '--',
    tzAbbr: '',
    utcOffset: '',
    tzLabel: 'America/Santiago',
    commaTzLabel: 'America/Santiago',
    combined: 'No disponible',
    kpiMain: 'No disponible',
    kpiSub: 'Hora Chile (America/Santiago)',
    ticketFull: 'No disponible',
    approxInstant: null,
  };

  if (!iso || !iso.trim()) return empty;
  const trimmed = iso.trim();

  if (HAS_TIMEZONE_SUFFIX_RE.test(trimmed)) {
    const instant = new Date(trimmed);
    if (Number.isNaN(instant.getTime())) {
      return { ...empty, date: trimmed, combined: trimmed, kpiMain: trimmed, ticketFull: trimmed };
    }
    const p = getChileDateTimeParts(instant);
    const z = getChileZoneInfo(instant);
    const time = `${p.hh}:${p.min}`;
    return {
      date: p.dateEsCl,
      time,
      monthShort: p.monthShort,
      day: p.dd,
      tzAbbr: z.abbr,
      utcOffset: z.utcOffset,
      tzLabel: z.parenLabel,
      commaTzLabel: z.commaLabel,
      combined: `${p.dateEsCl} · ${time} ${z.parenLabel}`,
      kpiMain: `${p.dateEsCl} · ${time} h`,
      kpiSub: `Hora Chile (${z.commaLabel})`,
      ticketFull: `${p.dateEsCl}, ${time} h (${z.commaLabel})`,
      approxInstant: instant,
    };
  }

  const dtMatch = trimmed.match(NAIVE_ISO_DATETIME_RE);
  if (dtMatch) {
    const year = Number.parseInt(dtMatch[1], 10);
    const month = Number.parseInt(dtMatch[2], 10);
    const day = Number.parseInt(dtMatch[3], 10);
    const hour = Number.parseInt(dtMatch[4], 10);
    const minute = Number.parseInt(dtMatch[5], 10);
    const second = dtMatch[6] ? Number.parseInt(dtMatch[6], 10) : 0;
    const instant = isValidCalendarDate(year, month, day)
      ? chileWallClockToUtcDate(year, month, day, hour, minute, second)
      : null;
    const z = instant ? getChileZoneInfo(instant) : getChileZoneInfo(new Date(`${dtMatch[1]}-${dtMatch[2]}-${dtMatch[3]}T12:00:00Z`));
    const dd = dtMatch[3];
    const mm = dtMatch[2];
    const yyyy = dtMatch[1];
    const hh = dtMatch[4];
    const min = dtMatch[5];
    const date = `${dd}/${mm}/${yyyy}`;
    const time = `${hh}:${min}`;
    return {
      date,
      time,
      monthShort: MONTHS_SHORT_ES_CL[month - 1] ?? mm,
      day: dd,
      tzAbbr: z.abbr,
      utcOffset: z.utcOffset,
      tzLabel: z.parenLabel,
      commaTzLabel: z.commaLabel,
      combined: `${date} · ${time} ${z.parenLabel}`,
      kpiMain: `${date} · ${time} h`,
      kpiSub: `Hora Chile (${z.commaLabel})`,
      ticketFull: `${date}, ${time} h (${z.commaLabel})`,
      approxInstant: instant,
    };
  }

  const dateMatch = trimmed.match(DATE_ONLY_RE);
  if (dateMatch) {
    const year = Number.parseInt(dateMatch[1], 10);
    const month = Number.parseInt(dateMatch[2], 10);
    const day = Number.parseInt(dateMatch[3], 10);
    const instant = isValidCalendarDate(year, month, day)
      ? chileWallClockToUtcDate(year, month, day, 0, 0, 0)
      : null;
    const z = instant ? getChileZoneInfo(instant) : getChileZoneInfo(new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T12:00:00Z`));
    const date = `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;
    return {
      date,
      time: '00:00',
      monthShort: MONTHS_SHORT_ES_CL[month - 1] ?? dateMatch[2],
      day: dateMatch[3],
      tzAbbr: z.abbr,
      utcOffset: z.utcOffset,
      tzLabel: z.parenLabel,
      commaTzLabel: z.commaLabel,
      combined: `${date} · 00:00 ${z.parenLabel}`,
      kpiMain: date,
      kpiSub: `Hora Chile (${z.commaLabel})`,
      ticketFull: `${date}, 00:00 h (${z.commaLabel})`,
      approxInstant: instant,
    };
  }

  return { ...empty, date: trimmed, combined: trimmed, kpiMain: trimmed, ticketFull: trimmed };
}

/**
 * Categoría 3: formatea fechas calendario puras (`YYYY-MM-DD`) a `dd/MM/yyyy`
 * sin pasar por `new Date()` ni aplicar desplazamientos de zona horaria.
 */
export function formatCalendarDateEsCl(dateStr: string | null | undefined): string {
  if (!dateStr || !dateStr.trim()) return '';
  const match = dateStr.trim().match(DATE_ONLY_RE);
  if (!match) return dateStr.trim();
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Categoría 3 (compacto para ejes de gráficos): `YYYY-MM-DD` -> `07 nov`.
 */
export function formatCalendarDateShortEsCl(dateStr: string | null | undefined): string {
  if (!dateStr || !dateStr.trim()) return '';
  const match = dateStr.trim().match(DATE_ONLY_RE);
  if (!match) return dateStr.trim();
  const monthIdx = Number.parseInt(match[2], 10) - 1;
  const monthName = MONTHS_SHORT_ES_CL[monthIdx] ?? match[2];
  return `${match[3]} ${monthName}`;
}

/**
 * Categoría 4: convierte un valor `datetime-local` expresado en hora de Chile continental
 * (`YYYY-MM-DDTHH:mm` o `YYYY-MM-DDTHH:mm:ss`) a ISO UTC SIN `Z` (`YYYY-MM-DDTHH:mm:ss`)
 * según el contrato de consulta del microservicio `ms-eventomax-audit`.
 */
export function chileLocalInputToAuditUtc(input: string | null | undefined): string | undefined {
  if (!input || !input.trim()) return undefined;
  const trimmed = input.trim();

  if (HAS_TIMEZONE_SUFFIX_RE.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 19) : undefined;
  }

  const dtMatch = trimmed.match(NAIVE_ISO_DATETIME_RE);
  if (!dtMatch) return undefined;

  const year = Number.parseInt(dtMatch[1], 10);
  const month = Number.parseInt(dtMatch[2], 10);
  const day = Number.parseInt(dtMatch[3], 10);
  const hour = Number.parseInt(dtMatch[4], 10);
  const minute = Number.parseInt(dtMatch[5], 10);
  const second = dtMatch[6] ? Number.parseInt(dtMatch[6], 10) : 0;

  if (!isValidCalendarDate(year, month, day) || hour > 23 || minute > 59 || second > 59) {
    return undefined;
  }

  const instant = chileWallClockToUtcDate(year, month, day, hour, minute, second);
  return Number.isFinite(instant.getTime()) ? instant.toISOString().slice(0, 19) : undefined;
}

/**
 * Serializa un instante absoluto a cadena `datetime-local` en `America/Santiago`
 * (`YYYY-MM-DDTHH:mm` o `YYYY-MM-DDTHH:mm:ss`).
 */
export function formatInstantToChileDatetimeLocal(instant: Date, includeSeconds = false): string {
  const p = getChileDateTimeParts(instant);
  return includeSeconds
    ? `${p.yyyy}-${p.mm}-${p.dd}T${p.hh}:${p.min}:${p.ss}`
    : `${p.yyyy}-${p.mm}-${p.dd}T${p.hh}:${p.min}`;
}

/**
 * Retorna el inicio del mes calendario actual en `America/Santiago` (`YYYY-MM-01T00:00`).
 */
export function getChileMonthStartDatetimeLocal(referenceInstant: Date = new Date()): string {
  const p = getChileDateTimeParts(referenceInstant);
  return `${p.yyyy}-${p.mm}-01T00:00`;
}

/**
 * Construye límites diarios completos en hora de Chile (`00:00:00` a `23:59:59`)
 * a partir de fechas calendario seleccionadas en el DatePicker.
 */
export function formatCalendarRangeToChileDatetimeLocal(
  start: Date,
  end: Date,
): { readonly from: string; readonly to: string } {
  const startY = start.getFullYear();
  const startM = pad2(start.getMonth() + 1);
  const startD = pad2(start.getDate());
  const endY = end.getFullYear();
  const endM = pad2(end.getMonth() + 1);
  const endD = pad2(end.getDate());
  return {
    from: `${startY}-${startM}-${startD}T00:00:00`,
    to: `${endY}-${endM}-${endD}T23:59:59`,
  };
}

/**
 * Devuelve la fecha calendario actual en `America/Santiago` como `Date` local (00:00)
 * para resaltado "Hoy" y presets mensuales del calendario sin depender del reloj del navegador.
 */
export function getChileTodayCalendarDate(referenceInstant: Date = new Date()): Date {
  const p = getChileDateTimeParts(referenceInstant);
  return new Date(p.year, p.month - 1, p.day);
}
