import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { getChileTodayCalendarDate } from '../../../core/utils/chile-time';

export interface CalendarDay {
  readonly date: Date;
  readonly dayNumber: number;
  readonly isCurrentMonth: boolean;
  readonly isToday: boolean;
  readonly isSelected: boolean;
  readonly isRangeStart: boolean;
  readonly isRangeEnd: boolean;
  readonly isRangeBetween: boolean;
}

/**
 * Apple Design System Date Calendar (1:1 Board UI Figma specification).
 * Features:
 * - 326px Figma-calibrated month panel
 * - 16px round-capped chevrons (ChevronLeft16 / ChevronRight16)
 * - 32px day cells with 12px gap
 * - Range band bridging and solid #2563EB edge pills
 * - Today accent indicator dot
 */
@Component({
  selector: 'emx-date-calendar',
  standalone: true,
  template: `
    <div class="emx-month-panel">
      <!-- Month Header -->
      <div class="emx-month-header">
        <button
          type="button"
          class="emx-month-nav-btn"
          (click)="prevMonth()"
          aria-label="Mes anterior"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M9 4L5.70711 7.29289C5.31658 7.68342 5.31658 8.31658 5.70711 8.70711L9 12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>

        <span class="emx-month-title">{{ monthTitle() }}</span>

        <button
          type="button"
          class="emx-month-nav-btn"
          (click)="nextMonth()"
          aria-label="Mes siguiente"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M7 4L10.2929 7.29289C10.6834 7.68342 10.6834 8.31658 10.2929 8.70711L7 12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <!-- Calendar Grid -->
      <div class="emx-calendar-grid" role="grid" [attr.aria-label]="monthTitle()">
        <!-- Weekday Headers -->
        @for (dayName of weekDays; track dayName) {
          <div class="emx-weekday-header" role="columnheader">{{ dayName }}</div>
        }

        <!-- Day Cells -->
        @for (cell of days(); track cell.date.getTime()) {
          <div class="emx-day-cell-wrapper">
            @if (isRange() && (cell.isRangeBetween || cell.isRangeStart || cell.isRangeEnd)) {
              <div
                class="emx-day-range-band"
                [class.range-start]="cell.isRangeStart"
                [class.range-end]="cell.isRangeEnd"
                aria-hidden="true"
              ></div>
            }

            <button
              type="button"
              class="emx-day-cell"
              [class.outside-month]="!cell.isCurrentMonth"
              [class.today]="showToday() && cell.isToday"
              [class.selected]="!isRange() && cell.isSelected"
              [class.range-edge]="isRange() && (cell.isRangeStart || cell.isRangeEnd)"
              [class.range-between]="isRange() && cell.isRangeBetween"
              [disabled]="!cell.isCurrentMonth"
              (click)="onSelectDay(cell.date)"
              [attr.aria-label]="formatAriaDay(cell.date)"
              [attr.aria-selected]="cell.isSelected || cell.isRangeStart || cell.isRangeEnd ? 'true' : null"
            >
              <span>{{ cell.dayNumber }}</span>
              @if (showToday() && cell.isToday && !cell.isSelected && !cell.isRangeStart && !cell.isRangeEnd) {
                <span class="emx-today-dot" aria-hidden="true"></span>
              }
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './date-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateCalendarComponent {
  readonly selectedDate = input<Date | null>(null);
  readonly rangeStart = input<Date | null>(null);
  readonly rangeEnd = input<Date | null>(null);
  readonly isRange = input<boolean>(false);
  readonly showToday = input<boolean>(true);

  readonly dateSelected = output<Date>();
  readonly rangeSelected = output<{ start: Date; end: Date }>();

  readonly weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'] as const;
  readonly viewDate = signal<Date>(getChileTodayCalendarDate());

  readonly monthTitle = computed(() => {
    const d = this.viewDate();
    const formatted = new Intl.DateTimeFormat('es-CL', {
      month: 'long',
      year: 'numeric',
    }).format(d);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  });

  readonly days = computed<readonly CalendarDay[]>(() => {
    const v = this.viewDate();
    const year = v.getFullYear();
    const month = v.getMonth();

    const firstDay = new Date(year, month, 1);
    // Sunday is 0, convert so Monday is 0
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const result: CalendarDay[] = [];
    const today = getChileTodayCalendarDate();

    const sel = this.selectedDate();
    const rStart = this.rangeStart();
    const rEnd = this.rangeEnd();

    // 1. Previous month filler days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      result.push({
        date: d,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isRangeStart: false,
        isRangeEnd: false,
        isRangeBetween: false,
      });
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const isToday = d.toDateString() === today.toDateString();
      const isSelected = !!sel && d.toDateString() === sel.toDateString();

      const time = d.getTime();
      const startTime = rStart ? new Date(rStart.getFullYear(), rStart.getMonth(), rStart.getDate()).getTime() : null;
      const endTime = rEnd ? new Date(rEnd.getFullYear(), rEnd.getMonth(), rEnd.getDate()).getTime() : null;

      const isRangeStart = startTime !== null && time === startTime;
      const isRangeEnd = endTime !== null && time === endTime;
      const isRangeBetween = startTime !== null && endTime !== null && time > startTime && time < endTime;

      result.push({
        date: d,
        dayNumber: day,
        isCurrentMonth: true,
        isToday,
        isSelected,
        isRangeStart,
        isRangeEnd,
        isRangeBetween,
      });
    }

    // 3. Next month filler days (to complete 35 or 42 grid cells)
    const totalCells = result.length <= 35 ? 35 : 42;
    const remaining = totalCells - result.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      result.push({
        date: d,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isRangeStart: false,
        isRangeEnd: false,
        isRangeBetween: false,
      });
    }

    return result;
  });

  prevMonth(): void {
    const cur = this.viewDate();
    this.viewDate.set(new Date(cur.getFullYear(), cur.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const cur = this.viewDate();
    this.viewDate.set(new Date(cur.getFullYear(), cur.getMonth() + 1, 1));
  }

  onSelectDay(d: Date): void {
    if (!this.isRange()) {
      this.dateSelected.emit(d);
      return;
    }

    // Handle range selection: click start, click end
    const curStart = this.rangeStart();
    const curEnd = this.rangeEnd();

    if (!curStart || (curStart && curEnd)) {
      this.rangeSelected.emit({ start: d, end: d });
    } else {
      if (d < curStart) {
        this.rangeSelected.emit({ start: d, end: curStart });
      } else {
        this.rangeSelected.emit({ start: curStart, end: d });
      }
    }
  }

  formatAriaDay(d: Date): string {
    return new Intl.DateTimeFormat('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  }
}
