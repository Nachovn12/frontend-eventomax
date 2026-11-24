import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  LucideCalendarDays,
  LucideChevronDown,
  LucideChevronLeft,
  LucideChevronRight,
  LucideCircleAlert,
  LucideClock,
  LucideGlobe,
} from '@lucide/angular';
import {
  ChileZoneInfo,
  chileWallClockToUtcDate,
  getChileDateTimeParts,
  getChileZoneInfo,
} from '../../../core/utils/chile-time';

export interface CalendarDateTuple {
  readonly year: number;
  readonly month: number; // 1..12
  readonly day: number; // 1..31
}

export interface DateTimeCalendarCell {
  readonly date: CalendarDateTuple;
  readonly key: string;
  readonly dayNumber: number;
  readonly isCurrentMonth: boolean;
  readonly isToday: boolean;
  readonly isSelected: boolean;
  readonly isDisabled: boolean;
  readonly isFocused: boolean;
  readonly ariaLabel: string;
}

const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

const WEEKDAYS_ES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'] as const;
const ISO_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?$/;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function tupleKey(d: CalendarDateTuple): string {
  return `${d.year}-${pad2(d.month)}-${pad2(d.day)}`;
}

function compareTuples(a: CalendarDateTuple, b: CalendarDateTuple): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isValidTuple(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= getDaysInMonth(year, month);
}

function addDays(d: CalendarDateTuple, delta: number): CalendarDateTuple {
  const probe = new Date(Date.UTC(d.year, d.month - 1, d.day + delta));
  return {
    year: probe.getUTCFullYear(),
    month: probe.getUTCMonth() + 1,
    day: probe.getUTCDate(),
  };
}

function addMonths(d: CalendarDateTuple, deltaMonths: number): CalendarDateTuple {
  const total = d.year * 12 + (d.month - 1) + deltaMonths;
  const year = Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12 + 1;
  const day = Math.min(d.day, getDaysInMonth(year, month));
  return { year, month, day };
}

function parseStrictTwoDigitInt(raw: string, min: number, max: number): number | null {
  const trimmed = raw.trim();
  if (!/^\d{1,2}$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

function parseValue(raw: string | null | undefined): {
  date: CalendarDateTuple;
  hour: number;
  minute: number;
} | null {
  if (!raw || !raw.trim()) return null;
  const m = raw.trim().match(ISO_LOCAL_RE);
  if (!m) return null;
  const year = Number.parseInt(m[1], 10);
  const month = Number.parseInt(m[2], 10);
  const day = Number.parseInt(m[3], 10);
  const hour = Number.parseInt(m[4], 10);
  const minute = Number.parseInt(m[5], 10);
  if (!isValidTuple(year, month, day) || hour > 23 || minute > 59) return null;
  return { date: { year, month, day }, hour, minute };
}

/**
 * Corporate DateTime Picker bound to `America/Santiago` wall-clock strings (`YYYY-MM-DDTHH:mm`).
 * Preserves the exact reactive FormControl contract of native `<input type="datetime-local">`
 * while guaranteeing browser-timezone independence and dynamic CLST/CLT DST handling.
 */
@Component({
  selector: 'emx-date-time-picker',
  standalone: true,
  imports: [
    LucideCalendarDays,
    LucideChevronDown,
    LucideChevronLeft,
    LucideChevronRight,
    LucideCircleAlert,
    LucideClock,
    LucideGlobe,
  ],
  templateUrl: './date-time-picker.component.html',
  styleUrl: './date-time-picker.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateTimePickerComponent),
      multi: true,
    },
  ],
})
export class DateTimePickerComponent implements ControlValueAccessor, OnDestroy {
  private readonly elRef = inject(ElementRef<HTMLElement>);

  readonly triggerBtn = viewChild<ElementRef<HTMLButtonElement>>('triggerBtn');
  readonly popoverEl = viewChild<ElementRef<HTMLDivElement>>('popoverEl');

  readonly inputId = input<string>('emx-datetime-input');
  readonly placeholder = input<string>('Seleccionar fecha y hora');
  readonly invalid = input<boolean>(false);
  readonly ariaDescribedBy = input<string | null>(null);
  readonly minNow = input<boolean>(true);
  readonly nowProvider = input<() => Date>(() => new Date());

  readonly weekDays = WEEKDAYS_ES;
  readonly months = MONTHS_ES;

  readonly value = signal<string>('');
  readonly disabled = signal<boolean>(false);
  readonly isOpen = signal<boolean>(false);

  // Panel draft state (never mutates FormControl until "Aplicar")
  readonly viewYear = signal<number>(2026);
  readonly viewMonth = signal<number>(1); // 1..12
  readonly draftDate = signal<CalendarDateTuple | null>(null);
  readonly focusedDate = signal<CalendarDateTuple | null>(null);
  readonly draftHour = signal<string>('');
  readonly draftMinute = signal<string>('');
  readonly openTick = signal<number>(0);

  // Dynamic popover coordinates (computed against viewport or transformed modal container)
  readonly popoverStyle = signal<Record<string, string>>({});
  readonly openDirection = signal<'down' | 'up'>('down');

  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};
  private repositionRaf: number | null = null;
  private boundScrollAncestors: HTMLElement[] = [];
  private readonly boundReposition = () => this.scheduleReposition();

  private getCurrentNow(): Date {
    return this.nowProvider()();
  }

  readonly todayChile = computed<CalendarDateTuple>(() => {
    this.openTick();
    const p = getChileDateTimeParts(this.getCurrentNow());
    return { year: p.year, month: p.month, day: p.day };
  });

  readonly displayValue = computed<string>(() => {
    const parsed = parseValue(this.value());
    if (!parsed) return '';
    const { date, hour, minute } = parsed;
    return `${pad2(date.day)}/${pad2(date.month)}/${date.year} · ${pad2(hour)}:${pad2(minute)} h`;
  });

  readonly yearOptions = computed<readonly number[]>(() => {
    const todayY = this.todayChile().year;
    const minY = Math.min(todayY, this.viewYear(), this.draftDate()?.year ?? todayY);
    const maxY = Math.max(todayY + 10, this.viewYear(), this.draftDate()?.year ?? todayY);
    const years: number[] = [];
    for (let y = minY; y <= maxY; y++) {
      years.push(y);
    }
    return years;
  });

  readonly canGoPrevMonth = computed<boolean>(() => {
    if (!this.minNow()) return true;
    const today = this.todayChile();
    const vy = this.viewYear();
    const vm = this.viewMonth();
    return vy > today.year || (vy === today.year && vm > today.month);
  });

  readonly calendarCells = computed<readonly DateTimeCalendarCell[]>(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const today = this.todayChile();
    const selected = this.draftDate();
    const focused = this.focusedDate() ?? selected ?? today;
    const enforceMin = this.minNow();

    const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // 0 = Monday
    const daysInCurrent = getDaysInMonth(year, month);
    const prevMonthYear = month === 1 ? year - 1 : year;
    const prevMonthNum = month === 1 ? 12 : month - 1;
    const daysInPrev = getDaysInMonth(prevMonthYear, prevMonthNum);
    const nextMonthYear = month === 12 ? year + 1 : year;
    const nextMonthNum = month === 12 ? 1 : month + 1;

    const cells: DateTimeCalendarCell[] = [];

    const pushCell = (d: CalendarDateTuple, isCurrentMonth: boolean) => {
      const isPast = enforceMin && compareTuples(d, today) < 0;
      const isToday = compareTuples(d, today) === 0;
      const isSelected = !!selected && compareTuples(d, selected) === 0;
      const isFocused = compareTuples(d, focused) === 0;
      cells.push({
        date: d,
        key: tupleKey(d),
        dayNumber: d.day,
        isCurrentMonth,
        isToday,
        isSelected,
        isDisabled: isPast,
        isFocused,
        ariaLabel: `${d.day} de ${MONTHS_ES[d.month - 1].toLowerCase()} de ${d.year}${isToday ? ' (hoy)' : ''}`,
      });
    };

    for (let i = firstWeekday - 1; i >= 0; i--) {
      pushCell({ year: prevMonthYear, month: prevMonthNum, day: daysInPrev - i }, false);
    }

    for (let day = 1; day <= daysInCurrent; day++) {
      pushCell({ year, month, day }, true);
    }

    const totalCells = cells.length <= 35 ? 35 : 42;
    const remaining = totalCells - cells.length;
    for (let day = 1; day <= remaining; day++) {
      pushCell({ year: nextMonthYear, month: nextMonthNum, day }, false);
    }

    return cells;
  });

  readonly parsedDraftTime = computed<{ hour: number; minute: number } | null>(() => {
    const h = parseStrictTwoDigitInt(this.draftHour(), 0, 23);
    const m = parseStrictTwoDigitInt(this.draftMinute(), 0, 59);
    if (h === null || m === null) return null;
    return { hour: h, minute: m };
  });

  readonly draftEvaluation = computed<{
    valid: boolean;
    error: string | null;
    ambiguousNote: string | null;
    zoneInfo: ChileZoneInfo;
    serialized: string | null;
  }>(() => {
    this.openTick();
    const now = this.getCurrentNow();
    const today = this.todayChile();
    const selDate = this.draftDate();
    const refDate = selDate ?? { year: this.viewYear(), month: this.viewMonth(), day: 15 };
    const parsedTime = this.parsedDraftTime();
    const probeHour = parsedTime?.hour ?? 12;
    const probeMinute = parsedTime?.minute ?? 0;

    const instant = chileWallClockToUtcDate(
      refDate.year,
      refDate.month,
      refDate.day,
      probeHour,
      probeMinute,
      0
    );
    const zoneInfo = getChileZoneInfo(instant);

    if (!selDate) {
      return {
        valid: false,
        error: null,
        ambiguousNote: null,
        zoneInfo,
        serialized: null,
      };
    }

    if (this.minNow() && compareTuples(selDate, today) < 0) {
      return {
        valid: false,
        error: 'Selecciona una fecha actual o futura.',
        ambiguousNote: null,
        zoneInfo,
        serialized: null,
      };
    }

    if (this.draftHour().trim() === '' || this.draftMinute().trim() === '') {
      return {
        valid: false,
        error: 'Ingresa una hora y minutos válidos en formato 24 horas (00:00–23:59).',
        ambiguousNote: null,
        zoneInfo,
        serialized: null,
      };
    }

    if (!parsedTime) {
      return {
        valid: false,
        error: 'Hora inválida. Usa horas entre 00 y 23 y minutos entre 00 y 59.',
        ambiguousNote: null,
        zoneInfo,
        serialized: null,
      };
    }

    // Verify nonexistent spring-forward DST wall-clock time
    const roundTrip = getChileDateTimeParts(instant);
    const matchesWallClock =
      roundTrip.year === selDate.year &&
      roundTrip.month === selDate.month &&
      roundTrip.day === selDate.day &&
      roundTrip.hour === parsedTime.hour &&
      roundTrip.minute === parsedTime.minute;

    if (!matchesWallClock) {
      return {
        valid: false,
        error:
          'Esta hora no existe en Chile continental por el cambio al horario de verano. Elige otra hora.',
        ambiguousNote: null,
        zoneInfo,
        serialized: null,
      };
    }

    // Check autumn fall-back ambiguous DST hour (occurs twice; deterministic first occurrence applies)
    const laterParts = getChileDateTimeParts(new Date(instant.getTime() + 3_600_000));
    const isAmbiguous =
      laterParts.year === selDate.year &&
      laterParts.month === selDate.month &&
      laterParts.day === selDate.day &&
      laterParts.hour === parsedTime.hour &&
      laterParts.minute === parsedTime.minute;

    if (this.minNow() && instant.getTime() < now.getTime()) {
      return {
        valid: false,
        error: 'La hora seleccionada ya pasó para el día de hoy. Elige una hora actual o futura.',
        ambiguousNote: null,
        zoneInfo,
        serialized: null,
      };
    }

    const serialized = `${selDate.year}-${pad2(selDate.month)}-${pad2(selDate.day)}T${pad2(parsedTime.hour)}:${pad2(parsedTime.minute)}`;
    return {
      valid: true,
      error: null,
      ambiguousNote: isAmbiguous
        ? `Hora repetida por cambio a horario de invierno; se aplica la primera ocurrencia (${zoneInfo.commaLabel}).`
        : null,
      zoneInfo,
      serialized,
    };
  });

  readonly canApply = computed<boolean>(() => this.draftEvaluation().valid);

  // ControlValueAccessor implementation
  writeValue(val: string | null): void {
    const normalized = typeof val === 'string' ? val.trim() : '';
    this.value.set(normalized);
    if (!normalized && this.isOpen()) {
      this.close(false);
    }
  }

  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    if (isDisabled && this.isOpen()) {
      this.close(false);
    }
  }

  ngOnDestroy(): void {
    this.detachScrollListeners();
    if (this.repositionRaf !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.repositionRaf);
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const target = event.target as Node | null;
    if (target && !this.elRef.nativeElement.contains(target)) {
      this.close(false);
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.isOpen()) {
      this.scheduleReposition();
    }
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!this.isOpen()) {
        this.open();
      }
    } else if (event.key === 'Escape' && this.isOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.close(true);
    }
  }

  onPopoverKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close(true);
    }
  }

  toggle(): void {
    if (this.disabled()) return;
    if (this.isOpen()) {
      this.close(true);
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.disabled()) return;
    this.openTick.update((v) => v + 1);
    const now = this.getCurrentNow();
    const parsed = parseValue(this.value());

    if (parsed) {
      this.draftDate.set(parsed.date);
      this.focusedDate.set(parsed.date);
      this.viewYear.set(parsed.date.year);
      this.viewMonth.set(parsed.date.month);
      this.draftHour.set(pad2(parsed.hour));
      this.draftMinute.set(pad2(parsed.minute));
    } else {
      const nextValid = this.computeNextFutureChileSlot(now);
      this.draftDate.set(nextValid.date);
      this.focusedDate.set(nextValid.date);
      this.viewYear.set(nextValid.date.year);
      this.viewMonth.set(nextValid.date.month);
      this.draftHour.set(pad2(nextValid.hour));
      this.draftMinute.set(pad2(nextValid.minute));
    }

    this.isOpen.set(true);
    this.attachScrollListeners();
    this.updatePosition();
    this.scheduleReposition();
    this.focusActiveDayCellSoon();
  }

  close(restoreFocus: boolean): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.detachScrollListeners();
    this.onTouched();
    if (restoreFocus) {
      setTimeout(() => this.triggerBtn()?.nativeElement.focus(), 0);
    }
  }

  prevMonth(): void {
    if (!this.canGoPrevMonth()) return;
    const vm = this.viewMonth();
    const vy = this.viewYear();
    if (vm === 1) {
      this.viewYear.set(vy - 1);
      this.viewMonth.set(12);
    } else {
      this.viewMonth.set(vm - 1);
    }
  }

  nextMonth(): void {
    const vm = this.viewMonth();
    const vy = this.viewYear();
    if (vm === 12) {
      this.viewYear.set(vy + 1);
      this.viewMonth.set(1);
    } else {
      this.viewMonth.set(vm + 1);
    }
  }

  onMonthSelect(rawValue: string): void {
    const nextMonth = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(nextMonth) || nextMonth < 1 || nextMonth > 12) return;
    this.viewMonth.set(nextMonth);
  }

  onYearSelect(rawValue: string): void {
    const nextYear = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(nextYear)) return;
    this.viewYear.set(nextYear);
    if (this.minNow()) {
      const today = this.todayChile();
      if (nextYear === today.year && this.viewMonth() < today.month) {
        this.viewMonth.set(today.month);
      }
    }
  }

  selectDay(cell: DateTimeCalendarCell): void {
    if (cell.isDisabled) return;
    this.openTick.update((v) => v + 1);
    this.draftDate.set(cell.date);
    this.focusedDate.set(cell.date);
    if (!cell.isCurrentMonth) {
      this.viewYear.set(cell.date.year);
      this.viewMonth.set(cell.date.month);
    }
  }

  onDayKeydown(event: KeyboardEvent, cell: DateTimeCalendarCell): void {
    let target: CalendarDateTuple | null = null;

    switch (event.key) {
      case 'ArrowLeft':
        target = addDays(cell.date, -1);
        break;
      case 'ArrowRight':
        target = addDays(cell.date, 1);
        break;
      case 'ArrowUp':
        target = addDays(cell.date, -7);
        break;
      case 'ArrowDown':
        target = addDays(cell.date, 7);
        break;
      case 'Home':
        target = { year: cell.date.year, month: cell.date.month, day: 1 };
        break;
      case 'End':
        target = {
          year: cell.date.year,
          month: cell.date.month,
          day: getDaysInMonth(cell.date.year, cell.date.month),
        };
        break;
      case 'PageUp':
        target = addMonths(cell.date, -1);
        break;
      case 'PageDown':
        target = addMonths(cell.date, 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectDay(cell);
        return;
      default:
        return;
    }

    event.preventDefault();
    if (!target) return;

    const today = this.todayChile();
    if (this.minNow() && compareTuples(target, today) < 0) {
      target = today;
    }

    this.viewYear.set(target.year);
    this.viewMonth.set(target.month);
    this.focusedDate.set(target);
    this.focusDayKeySoon(tupleKey(target));
  }

  onHourInput(raw: string): void {
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 2);
    this.draftHour.set(digitsOnly);
  }

  onMinuteInput(raw: string): void {
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 2);
    this.draftMinute.set(digitsOnly);
  }

  onHourBlur(): void {
    const parsed = parseStrictTwoDigitInt(this.draftHour(), 0, 23);
    if (parsed !== null) {
      this.draftHour.set(pad2(parsed));
    }
  }

  onMinuteBlur(): void {
    const parsed = parseStrictTwoDigitInt(this.draftMinute(), 0, 59);
    if (parsed !== null) {
      this.draftMinute.set(pad2(parsed));
    }
  }

  onTimeKeydown(event: KeyboardEvent, part: 'hour' | 'minute'): void {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const step = event.key === 'ArrowUp' ? 1 : -1;
      if (part === 'hour') {
        const cur = parseStrictTwoDigitInt(this.draftHour(), 0, 23) ?? 0;
        const next = (cur + step + 24) % 24;
        this.draftHour.set(pad2(next));
      } else {
        const cur = parseStrictTwoDigitInt(this.draftMinute(), 0, 59) ?? 0;
        const next = (cur + step + 60) % 60;
        this.draftMinute.set(pad2(next));
      }
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.canApply()) {
        this.apply();
      }
    }
  }

  selectToday(): void {
    this.openTick.update((v) => v + 1);
    const now = this.getCurrentNow();
    const today = this.todayChile();
    const curTime = this.parsedDraftTime();

    if (curTime) {
      const candidate = chileWallClockToUtcDate(
        today.year,
        today.month,
        today.day,
        curTime.hour,
        curTime.minute,
        0
      );
      const roundTrip = getChileDateTimeParts(candidate);
      const wallClockValid =
        roundTrip.year === today.year &&
        roundTrip.month === today.month &&
        roundTrip.day === today.day &&
        roundTrip.hour === curTime.hour &&
        roundTrip.minute === curTime.minute;

      if (wallClockValid && (!this.minNow() || candidate.getTime() >= now.getTime())) {
        this.draftDate.set(today);
        this.focusedDate.set(today);
        this.viewYear.set(today.year);
        this.viewMonth.set(today.month);
        return;
      }
    }

    const nextValid = this.computeNextFutureChileSlot(now);
    this.draftDate.set(nextValid.date);
    this.focusedDate.set(nextValid.date);
    this.viewYear.set(nextValid.date.year);
    this.viewMonth.set(nextValid.date.month);
    this.draftHour.set(pad2(nextValid.hour));
    this.draftMinute.set(pad2(nextValid.minute));
  }

  apply(): void {
    this.openTick.update((v) => v + 1);
    const evaluation = this.draftEvaluation();
    if (!evaluation.valid || !evaluation.serialized) return;

    this.value.set(evaluation.serialized);
    this.onChange(evaluation.serialized);
    this.onTouched();
    this.close(true);
  }

  cancel(): void {
    this.close(true);
  }

  private computeNextFutureChileSlot(now: Date): {
    date: CalendarDateTuple;
    hour: number;
    minute: number;
  } {
    // Advance to the next full Chile minute strictly >= now so "Hoy" never picks a past moment
    const hasSubMinute = now.getUTCSeconds() > 0 || now.getUTCMilliseconds() > 0;
    const futureInstant = new Date(now.getTime() + (hasSubMinute ? 60_000 : 0));
    const p = getChileDateTimeParts(futureInstant);
    return {
      date: { year: p.year, month: p.month, day: p.day },
      hour: p.hour,
      minute: p.minute,
    };
  }

  private focusActiveDayCellSoon(): void {
    setTimeout(() => {
      const key = this.focusedDate() ? tupleKey(this.focusedDate()!) : null;
      if (key) {
        this.focusDayElement(key);
      }
    }, 0);
  }

  private focusDayKeySoon(key: string): void {
    setTimeout(() => this.focusDayElement(key), 0);
  }

  private focusDayElement(key: string): void {
    const pop = this.popoverEl()?.nativeElement;
    if (!pop) return;
    const btn = pop.querySelector<HTMLButtonElement>(`button[data-day-key="${key}"]`);
    btn?.focus();
  }

  private attachScrollListeners(): void {
    this.detachScrollListeners();
    if (typeof window === 'undefined') return;
    let node: HTMLElement | null = this.elRef.nativeElement.parentElement;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY) || /(auto|scroll)/.test(style.overflowX)) {
        node.addEventListener('scroll', this.boundReposition, { passive: true });
        this.boundScrollAncestors.push(node);
      }
      node = node.parentElement;
    }
    window.addEventListener('scroll', this.boundReposition, { passive: true });
  }

  private detachScrollListeners(): void {
    for (const el of this.boundScrollAncestors) {
      el.removeEventListener('scroll', this.boundReposition);
    }
    this.boundScrollAncestors = [];
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.boundReposition);
    }
  }

  private scheduleReposition(): void {
    if (typeof requestAnimationFrame === 'undefined') {
      this.updatePosition();
      return;
    }
    if (this.repositionRaf !== null) {
      cancelAnimationFrame(this.repositionRaf);
    }
    this.repositionRaf = requestAnimationFrame(() => {
      this.repositionRaf = null;
      this.updatePosition();
    });
  }

  private findFixedContainingBlock(): DOMRect | null {
    if (typeof window === 'undefined') return null;
    let node: HTMLElement | null = this.elRef.nativeElement.parentElement;
    while (node && node !== document.documentElement) {
      const s = getComputedStyle(node);
      if (
        (s.transform && s.transform !== 'none') ||
        (s.filter && s.filter !== 'none') ||
        (s.perspective && s.perspective !== 'none')
      ) {
        return node.getBoundingClientRect();
      }
      node = node.parentElement;
    }
    return null;
  }

  private updatePosition(): void {
    if (typeof window === 'undefined') return;
    const trigger = this.triggerBtn()?.nativeElement;
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const cbRect = this.findFixedContainingBlock();
    const cbLeft = cbRect ? cbRect.left : 0;
    const cbTop = cbRect ? cbRect.top : 0;
    const cbWidth = cbRect ? cbRect.width : window.innerWidth;
    const cbHeight = cbRect ? cbRect.height : window.innerHeight;

    const margin = 10;
    const gap = 6;
    const panelWidth = Math.min(348, Math.max(260, cbWidth - margin * 2));
    const measuredHeight = this.popoverEl()?.nativeElement.offsetHeight ?? 0;
    const panelHeight = measuredHeight > 0 ? Math.min(measuredHeight, cbHeight - margin * 2) : 410;

    const relTop = triggerRect.top - cbTop;
    const relBottom = triggerRect.bottom - cbTop;
    const relLeft = triggerRect.left - cbLeft;

    const spaceBelow = cbHeight - relBottom - margin;
    const spaceAbove = relTop - margin;

    const openUp = spaceBelow < panelHeight && spaceAbove > spaceBelow;
    this.openDirection.set(openUp ? 'up' : 'down');

    let top = openUp ? relTop - panelHeight - gap : relBottom + gap;
    top = Math.max(margin, Math.min(top, cbHeight - panelHeight - margin));

    const isCompact = cbWidth <= 420;
    const left = isCompact
      ? Math.max(margin, (cbWidth - panelWidth) / 2)
      : Math.max(margin, Math.min(relLeft, cbWidth - panelWidth - margin));

    this.popoverStyle.set({
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `${Math.round(panelWidth)}px`,
      'max-height': `${Math.max(240, Math.round(cbHeight - margin * 2))}px`,
    });
  }
}
