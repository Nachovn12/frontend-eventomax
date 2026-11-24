import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  LucideBan,
  LucideCheck,
  LucideChevronDown,
  LucideCircleCheck,
  LucideClock3,
  LucideListFilter,
  LucidePlay,
  LucideWrench,
} from '@lucide/angular';
import { ProductionStatus } from '../../../../core/models/production.model';

export type StatusFilterValue = ProductionStatus | '';

export interface StatusFilterOptionMeta {
  readonly value: StatusFilterValue;
  readonly label: string;
  readonly tone: 'neutral' | 'warning' | 'brand' | 'purple' | 'positive' | 'emerald' | 'negative';
  readonly icon: 'all' | 'clock' | 'confirm' | 'wrench' | 'play' | 'closed' | 'ban';
}

const DEFAULT_CONSULTABLE_STATUSES: readonly ProductionStatus[] = [
  'SOLICITADO',
  'CONFIRMADO',
  'EN_MONTAJE',
  'EN_EJECUCION',
  'CERRADO',
  'CANCELADO',
];

const ALL_OPTION: StatusFilterOptionMeta = {
  value: '',
  label: 'Todos los estados',
  tone: 'neutral',
  icon: 'all',
};

const FILTER_STATUS_META: Record<ProductionStatus, StatusFilterOptionMeta> = {
  SOLICITADO: {
    value: 'SOLICITADO',
    label: 'Solicitado',
    tone: 'warning',
    icon: 'clock',
  },
  CONFIRMADO: {
    value: 'CONFIRMADO',
    label: 'Confirmado',
    tone: 'brand',
    icon: 'confirm',
  },
  EN_MONTAJE: {
    value: 'EN_MONTAJE',
    label: 'En montaje',
    tone: 'purple',
    icon: 'wrench',
  },
  EN_EJECUCION: {
    value: 'EN_EJECUCION',
    label: 'En ejecución',
    tone: 'positive',
    icon: 'play',
  },
  CERRADO: {
    value: 'CERRADO',
    label: 'Cerrado',
    tone: 'emerald',
    icon: 'closed',
  },
  CANCELADO: {
    value: 'CANCELADO',
    label: 'Cancelado',
    tone: 'negative',
    icon: 'ban',
  },
};

@Component({
  selector: 'emx-status-filter-selector',
  standalone: true,
  imports: [
    LucideBan,
    LucideCheck,
    LucideChevronDown,
    LucideCircleCheck,
    LucideClock3,
    LucideListFilter,
    LucidePlay,
    LucideWrench,
  ],
  templateUrl: './status-filter-selector.component.html',
  styleUrl: './status-filter-selector.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => StatusFilterSelectorComponent),
      multi: true,
    },
  ],
})
export class StatusFilterSelectorComponent implements ControlValueAccessor {
  private readonly elRef = inject(ElementRef<HTMLElement>);

  readonly triggerBtn = viewChild<ElementRef<HTMLButtonElement>>('triggerBtn');

  readonly inputId = input<string>('production-status');
  readonly statuses = input<readonly ProductionStatus[]>([]);

  readonly value = signal<StatusFilterValue>('');
  readonly disabled = signal<boolean>(false);
  readonly isOpen = signal<boolean>(false);
  readonly activeIndex = signal<number>(0);

  private onChange: (val: StatusFilterValue) => void = () => {};
  private onTouched: () => void = () => {};

  readonly options = computed<readonly StatusFilterOptionMeta[]>(() => {
    const incoming = this.statuses();
    const list = incoming.length > 0 ? incoming : DEFAULT_CONSULTABLE_STATUSES;
    return [ALL_OPTION, ...list.map((s) => FILTER_STATUS_META[s]).filter(Boolean)];
  });

  readonly selectedMeta = computed<StatusFilterOptionMeta>(() => {
    const current = this.value();
    if (!current) return ALL_OPTION;
    return FILTER_STATUS_META[current] ?? ALL_OPTION;
  });

  readonly isFiltered = computed<boolean>(() => this.value() !== '');

  writeValue(val: StatusFilterValue | null): void {
    this.value.set(val ?? '');
  }

  registerOnChange(fn: (val: StatusFilterValue) => void): void {
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

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const target = event.target as Node | null;
    if (target && !this.elRef.nativeElement.contains(target)) {
      this.close(false);
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
    const idx = this.options().findIndex((o) => o.value === this.value());
    this.activeIndex.set(idx >= 0 ? idx : 0);
    this.isOpen.set(true);
  }

  close(restoreFocus: boolean): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.onTouched();
    if (restoreFocus) {
      setTimeout(() => this.triggerBtn()?.nativeElement.focus(), 0);
    }
  }

  selectOption(next: StatusFilterValue): void {
    if (this.disabled()) return;
    this.value.set(next);
    this.onChange(next);
    this.onTouched();
    this.close(true);
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;

    if (!this.isOpen()) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.open();
      }
      return;
    }

    this.handleOpenKeydown(event);
  }

  onListboxKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;
    this.handleOpenKeydown(event);
  }

  private handleOpenKeydown(event: KeyboardEvent): void {
    const list = this.options();
    if (list.length === 0) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.close(true);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex.update((i) => (i + 1) % list.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.update((i) => (i - 1 + list.length) % list.length);
        break;
      case 'Home':
        event.preventDefault();
        this.activeIndex.set(0);
        break;
      case 'End':
        event.preventDefault();
        this.activeIndex.set(list.length - 1);
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const chosen = list[this.activeIndex()];
        if (chosen) {
          this.selectOption(chosen.value);
        }
        break;
      }
      default:
        break;
    }
  }
}
