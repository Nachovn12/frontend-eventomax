import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { LucideCalendarRange, LucideChevronDown, LucideGlobe } from '@lucide/angular';
import { DateCalendarComponent } from './date-calendar.component';
import { ButtonComponent } from '../button.component';
import {
  formatOperationalTimestampChile,
  getChileDateTimeParts,
  getChileTodayCalendarDate,
} from '../../../core/utils/chile-time';

export interface DatePickerPreset {
  readonly id: string;
  readonly label: string;
}

const DEFAULT_PRESETS: readonly DatePickerPreset[] = [
  { id: 'all', label: 'Cualquier fecha' },
  { id: 'last24h', label: 'Últimas 24 horas' },
  { id: 'last7d', label: 'Últimos 7 días' },
  { id: 'last30d', label: 'Últimos 30 días' },
  { id: 'thisMonth', label: 'Este mes' },
  { id: 'custom', label: 'Personalizado' },
];

/**
 * Apple Design System Date Range Picker (1:1 Board UI Figma specification).
 * Includes:
 * - Trigger button with Apple tactile styling, calendar icon and formatted text
 * - Quick-select sidebar presets (Últimas 24 horas, Últimos 7 días, Este mes, etc.)
 * - MonthPanel calendar with range highlights
 * - Editable date chips ("DD/MM/YYYY")
 * - Footer with Apple Secondary ("Cancelar") and Primary ("Aplicar") buttons
 */
@Component({
  selector: 'emx-date-range-picker',
  standalone: true,
  imports: [DateCalendarComponent, ButtonComponent, LucideCalendarRange, LucideChevronDown, LucideGlobe],
  template: `
    <div class="emx-date-picker-wrapper" style="position: relative; display: inline-block;">
      <!-- Trigger Button -->
      <button
        #triggerBtn
        type="button"
        class="emx-date-trigger"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-haspopup]="'dialog'"
        [attr.aria-label]="ariaLabel()"
        (click)="toggle()"
      >
        <svg lucideCalendarRange class="trigger-icon" strokeWidth="1.9" aria-hidden="true"></svg>

        <span class="trigger-label">{{ displayLabel() }}</span>

        <svg lucideChevronDown class="trigger-chevron" strokeWidth="2" aria-hidden="true"></svg>
      </button>

      <!-- Popover Menu -->
      @if (isOpen()) {
        <div
          class="emx-date-picker-popover"
          [class.emx-date-picker-popover--right]="align() === 'right'"
          [class.emx-date-picker-popover--left]="align() === 'left'"
          role="dialog"
          aria-modal="true"
          aria-labelledby="emx-drp-heading"
        >
          <!-- Corporate Header (aligned with UI/UX-03.1 DateTime Picker) -->
          <div class="emx-drp-header">
            <span class="emx-drp-header-icon" aria-hidden="true">
              <svg lucideCalendarRange class="emx-drp-header-svg" strokeWidth="1.9"></svg>
            </span>
            <div class="emx-drp-header-copy">
              <h4 id="emx-drp-heading" class="emx-drp-title">Período de análisis</h4>
              <p class="emx-drp-subtitle">Selecciona un rango en hora chilena</p>
            </div>
            <span class="emx-drp-tz-pill" title="Zona horaria oficial America/Santiago">
              <svg lucideGlobe class="emx-drp-tz-icon" strokeWidth="1.9" aria-hidden="true"></svg>
              <span>{{ chileTzLabel() }}</span>
            </span>
          </div>

          <div class="emx-date-picker-body">
            <!-- Sidebar Quick-Select Presets -->
            <div class="emx-date-presets" role="radiogroup" aria-label="Períodos rápidos">
              <span class="emx-presets-caption">Accesos rápidos</span>
              @for (preset of presets(); track preset.id) {
                <button
                  type="button"
                  class="emx-preset-btn"
                  [class.active]="activePreset() === preset.id"
                  (click)="selectPreset(preset.id)"
                  role="radio"
                  [attr.aria-checked]="activePreset() === preset.id"
                >
                  {{ preset.label }}
                </button>
              }
            </div>

            <!-- Month Calendar Panel -->
            <emx-date-calendar
              [isRange]="true"
              [rangeStart]="draftStart()"
              [rangeEnd]="draftEnd()"
              (rangeSelected)="onRangeSelected($event)"
            />
          </div>

          <!-- Footer with Chips & Action Buttons -->
          <div class="emx-date-picker-footer">
            <div class="emx-date-chips">
              <label class="emx-date-chip-group">
                <span>Desde</span>
                <input
                  type="text"
                  class="emx-date-chip-input"
                  [value]="formatChip(draftStart())"
                  readonly
                  aria-label="Fecha de inicio"
                />
              </label>
              <label class="emx-date-chip-group">
                <span>Hasta</span>
                <input
                  type="text"
                  class="emx-date-chip-input"
                  [value]="formatChip(draftEnd())"
                  readonly
                  aria-label="Fecha de fin"
                />
              </label>
            </div>

            <div class="emx-date-footer-actions">
              <emx-button [variant]="'secondary'" [size]="'small'" (click)="close(true)">
                Cancelar
              </emx-button>
              <emx-button [variant]="'primary'" [size]="'small'" (click)="apply()">
                Aplicar período
              </emx-button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './date-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateRangePickerComponent {
  private readonly elRef = inject(ElementRef);
  readonly triggerBtn = viewChild<ElementRef<HTMLButtonElement>>('triggerBtn');

  readonly value = input<string>('last24h');
  readonly ariaLabel = input<string>('Seleccionar rango de fechas');
  readonly presets = input<readonly DatePickerPreset[]>(DEFAULT_PRESETS);
  readonly align = input<'left' | 'right'>('left');

  readonly valueChange = output<string>();
  readonly rangeChange = output<{ start: Date; end: Date }>();

  readonly isOpen = signal<boolean>(false);
  readonly activePreset = signal<string>('last24h');

  readonly draftStart = signal<Date | null>(new Date(Date.now() - 86400000));
  readonly draftEnd = signal<Date | null>(new Date());

  readonly chileTzLabel = computed(() => {
    const ref = this.draftEnd() ?? new Date();
    const formatted = formatOperationalTimestampChile(ref.toISOString());
    return `America/Santiago · ${formatted.tzAbbr}`;
  });

  readonly displayLabel = computed(() => {
    const val = this.value();
    const p = this.presets().find((x) => x.id === val);
    if (p && p.id === 'all') return 'Cualquier fecha';
    if (p && p.id !== 'custom') return p.label;
    const s = this.draftStart();
    const e = this.draftEnd();
    if (!s || !e) return 'Cualquier fecha';
    return `${this.formatChip(s)} – ${this.formatChip(e)}`;
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const target = event.target as Node;
    if (!this.elRef.nativeElement.contains(target)) {
      this.close(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) this.close(true);
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close(true);
    } else {
      const committed = this.value();
      if (committed !== 'custom') {
        this.selectPreset(committed);
      } else {
        this.activePreset.set('custom');
      }
      this.isOpen.set(true);
    }
  }

  close(restoreFocus = false): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    if (restoreFocus) {
      setTimeout(() => this.triggerBtn()?.nativeElement.focus(), 0);
    }
  }

  selectPreset(presetId: string): void {
    this.activePreset.set(presetId);
    const now = new Date();

    if (presetId === 'all') {
      this.draftStart.set(null);
      this.draftEnd.set(null);
    } else if (presetId === 'last24h') {
      this.draftStart.set(new Date(now.getTime() - 86400000));
      this.draftEnd.set(now);
    } else if (presetId === 'last7d') {
      this.draftStart.set(new Date(now.getTime() - 7 * 86400000));
      this.draftEnd.set(now);
    } else if (presetId === 'last30d') {
      this.draftStart.set(new Date(now.getTime() - 30 * 86400000));
      this.draftEnd.set(now);
    } else if (presetId === 'thisMonth') {
      const todayChile = getChileTodayCalendarDate(now);
      this.draftStart.set(new Date(todayChile.getFullYear(), todayChile.getMonth(), 1));
      this.draftEnd.set(todayChile);
    }
  }

  onRangeSelected(range: { start: Date; end: Date }): void {
    this.draftStart.set(range.start);
    this.draftEnd.set(range.end);
    this.activePreset.set('custom');
  }

  apply(): void {
    const preset = this.activePreset();
    this.valueChange.emit(preset);
    const s = this.draftStart();
    const e = this.draftEnd();
    if (s && e) {
      this.rangeChange.emit({
        start: s,
        end: e,
      });
    }
    this.close(true);
  }

  formatChip(d: Date | null): string {
    if (!d) return '--/--/----';
    if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return getChileDateTimeParts(d).dateEsCl;
  }
}
