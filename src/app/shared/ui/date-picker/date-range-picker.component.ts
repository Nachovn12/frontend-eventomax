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
} from '@angular/core';
import { DateCalendarComponent } from './date-calendar.component';
import { ButtonComponent } from '../button.component';
import { getChileDateTimeParts, getChileTodayCalendarDate } from '../../../core/utils/chile-time';

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
  imports: [DateCalendarComponent, ButtonComponent],
  template: `
    <div class="emx-date-picker-wrapper" style="position: relative; display: inline-block;">
      <!-- Trigger Button (Board UI triggerButtonClassName) -->
      <button
        type="button"
        class="emx-date-trigger"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-haspopup]="'dialog'"
        [attr.aria-label]="ariaLabel()"
        (click)="toggle()"
      >
        <svg class="trigger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>

        <span>{{ displayLabel() }}</span>

        <svg class="trigger-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <!-- Popover Menu -->
      @if (isOpen()) {
        <div
          class="emx-date-picker-popover"
          [class.emx-date-picker-popover--right]="align() === 'right'"
          [class.emx-date-picker-popover--left]="align() === 'left'"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="'Selector de fechas'"
        >
          <div class="emx-date-picker-body">
            <!-- Sidebar Quick-Select Presets -->
            <div class="emx-date-presets" role="radiogroup" aria-label="Períodos rápidos">
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
              <span>Desde</span>
              <input
                type="text"
                class="emx-date-chip-input"
                [value]="formatChip(draftStart())"
                readonly
                aria-label="Fecha de inicio"
              />
              <span>Hasta</span>
              <input
                type="text"
                class="emx-date-chip-input"
                [value]="formatChip(draftEnd())"
                readonly
                aria-label="Fecha de fin"
              />
            </div>

            <div class="emx-date-footer-actions">
              <emx-button [variant]="'secondary'" [size]="'small'" (click)="close()">
                Cancelar
              </emx-button>
              <emx-button [variant]="'primary'" [size]="'small'" (click)="apply()">
                Aplicar
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
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) this.close();
  }

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  close(): void {
    this.isOpen.set(false);
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
    this.close();
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
