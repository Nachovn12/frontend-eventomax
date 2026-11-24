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
  LucidePlay,
  LucideWrench,
} from '@lucide/angular';
import { ProductionStatus } from '../../../../core/models/production.model';

export interface StatusOptionMeta {
  readonly status: ProductionStatus;
  readonly label: string;
  readonly description: string;
  readonly tone: 'brand' | 'positive' | 'neutral' | 'negative' | 'warning';
  readonly icon: 'check' | 'wrench' | 'play' | 'close' | 'ban' | 'clock';
}

const STATUS_META: Record<ProductionStatus, StatusOptionMeta> = {
  SOLICITADO: {
    status: 'SOLICITADO',
    label: 'Solicitado',
    description: 'Producción registrada en espera de confirmación.',
    tone: 'warning',
    icon: 'clock',
  },
  CONFIRMADO: {
    status: 'CONFIRMADO',
    label: 'Confirmado',
    description: 'Asigna equipos, servicios opcionales y confirma el evento.',
    tone: 'brand',
    icon: 'check',
  },
  EN_MONTAJE: {
    status: 'EN_MONTAJE',
    label: 'En montaje',
    description: 'Asigna cuadrilla técnica e inicia preparación en recinto.',
    tone: 'brand',
    icon: 'wrench',
  },
  EN_EJECUCION: {
    status: 'EN_EJECUCION',
    label: 'En ejecución',
    description: 'Marca la producción en operación activa.',
    tone: 'positive',
    icon: 'play',
  },
  CERRADO: {
    status: 'CERRADO',
    label: 'Cerrado',
    description: 'Finaliza la producción y habilita cierre administrativo.',
    tone: 'neutral',
    icon: 'close',
  },
  CANCELADO: {
    status: 'CANCELADO',
    label: 'Cancelado',
    description: 'Estado terminal que detiene el ciclo operativo.',
    tone: 'negative',
    icon: 'ban',
  },
};

@Component({
  selector: 'emx-status-transition-selector',
  standalone: true,
  imports: [
    LucideBan,
    LucideCheck,
    LucideChevronDown,
    LucideCircleCheck,
    LucideClock3,
    LucidePlay,
    LucideWrench,
  ],
  templateUrl: './status-transition-selector.component.html',
  styleUrl: './status-transition-selector.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => StatusTransitionSelectorComponent),
      multi: true,
    },
  ],
})
export class StatusTransitionSelectorComponent implements ControlValueAccessor {
  private readonly elRef = inject(ElementRef<HTMLElement>);

  readonly triggerBtn = viewChild<ElementRef<HTMLButtonElement>>('triggerBtn');

  readonly inputId = input<string>('production-next-status');
  readonly allowedStatuses = input.required<readonly ProductionStatus[]>();

  readonly value = signal<ProductionStatus | ''>('');
  readonly disabled = signal<boolean>(false);
  readonly isOpen = signal<boolean>(false);
  readonly activeIndex = signal<number>(0);

  private onChange: (val: ProductionStatus | '') => void = () => {};
  private onTouched: () => void = () => {};

  readonly options = computed<readonly StatusOptionMeta[]>(() =>
    this.allowedStatuses().map((s) => STATUS_META[s])
  );

  readonly selectedMeta = computed<StatusOptionMeta | null>(() => {
    const val = this.value();
    if (!val) return null;
    return STATUS_META[val] ?? null;
  });

  writeValue(val: ProductionStatus | '' | null): void {
    this.value.set(val ?? '');
  }

  registerOnChange(fn: (val: ProductionStatus | '') => void): void {
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
    if (this.disabled() || this.options().length === 0) return;
    if (this.isOpen()) {
      this.close(true);
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.disabled() || this.options().length === 0) return;
    const idx = this.options().findIndex((o) => o.status === this.value());
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

  selectOption(status: ProductionStatus): void {
    if (this.disabled()) return;
    this.value.set(status);
    this.onChange(status);
    this.onTouched();
    this.close(true);
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled() || this.options().length === 0) return;

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
          this.selectOption(chosen.status);
        }
        break;
      }
      default:
        break;
    }
  }
}
