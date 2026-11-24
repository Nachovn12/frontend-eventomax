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
import { LucideCheck, LucideChevronDown, LucideLayers } from '@lucide/angular';

export interface AuditEventTypeOption {
  readonly value: string;
  readonly label: string;
  readonly technical?: string;
}

export const AUDIT_EVENT_TYPE_OPTIONS: readonly AuditEventTypeOption[] = [
  { value: '', label: 'Todos los tipos' },
  { value: 'ProductionCreated', label: 'Creación de producción', technical: 'ProductionCreated' },
  { value: 'ProductionStatusChanged', label: 'Cambio de estado', technical: 'ProductionStatusChanged' },
];

@Component({
  selector: 'emx-audit-event-type-select',
  standalone: true,
  imports: [LucideLayers, LucideChevronDown, LucideCheck],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AuditEventTypeSelectComponent),
      multi: true,
    },
  ],
  templateUrl: './audit-event-type-select.component.html',
  styleUrl: './audit-event-type-select.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditEventTypeSelectComponent implements ControlValueAccessor {
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  readonly inputId = input<string>('filter-type');
  readonly ariaLabel = input<string>('Tipo de evento');
  readonly options = input<readonly AuditEventTypeOption[]>(AUDIT_EVENT_TYPE_OPTIONS);

  readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('triggerBtn');

  readonly value = signal<string>('');
  readonly isOpen = signal(false);
  readonly isDisabled = signal(false);
  readonly activeIndex = signal(0);

  readonly listboxId = computed(() => `${this.inputId()}-listbox`);

  readonly selectedOption = computed(
    () => this.options().find((opt) => opt.value === this.value()) ?? this.options()[0] ?? null
  );

  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(val: string | null | undefined): void {
    this.value.set(val ?? '');
  }

  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.isDisabled.set(disabled);
    if (disabled) {
      this.isOpen.set(false);
    }
  }

  toggle(): void {
    if (this.isDisabled()) return;
    if (this.isOpen()) {
      this.close(false);
      return;
    }
    const idx = this.options().findIndex((opt) => opt.value === this.value());
    this.activeIndex.set(idx >= 0 ? idx : 0);
    this.isOpen.set(true);
  }

  select(option: AuditEventTypeOption): void {
    this.value.set(option.value);
    this.onChange(option.value);
    this.onTouched();
    this.close(true);
  }

  close(restoreFocus: boolean): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.onTouched();
    if (restoreFocus) {
      this.triggerRef()?.nativeElement.focus();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) return;
    const opts = this.options();
    if (opts.length === 0) return;

    if (!this.isOpen()) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.toggle();
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.close(true);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex.set((this.activeIndex() + 1) % opts.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.set((this.activeIndex() - 1 + opts.length) % opts.length);
        break;
      case 'Home':
        event.preventDefault();
        this.activeIndex.set(0);
        break;
      case 'End':
        event.preventDefault();
        this.activeIndex.set(opts.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        const opt = opts[this.activeIndex()];
        if (opt) this.select(opt);
        break;
      case 'Tab':
        this.close(false);
        break;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    if (!this.hostRef.nativeElement.contains(event.target as Node)) {
      this.close(false);
    }
  }
}
