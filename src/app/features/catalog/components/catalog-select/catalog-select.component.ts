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
  LucideArrowUpDown,
  LucideCheck,
  LucideChevronDown,
  LucideCircleCheck,
  LucideCircleOff,
  LucideListFilter,
} from '@lucide/angular';

export type CatalogSelectValue = string | boolean;

export interface CatalogSelectOption {
  readonly value: CatalogSelectValue;
  readonly label: string;
  readonly description?: string;
  readonly tone?: 'neutral' | 'positive' | 'brand' | 'warning' | 'negative';
  readonly icon?: 'all' | 'filter' | 'sort' | 'active' | 'inactive';
}

@Component({
  selector: 'emx-catalog-select',
  standalone: true,
  imports: [
    LucideArrowUpDown,
    LucideCheck,
    LucideChevronDown,
    LucideCircleCheck,
    LucideCircleOff,
    LucideListFilter,
  ],
  templateUrl: './catalog-select.component.html',
  styleUrl: './catalog-select.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CatalogSelectComponent),
      multi: true,
    },
  ],
})
export class CatalogSelectComponent implements ControlValueAccessor {
  private readonly elRef = inject(ElementRef<HTMLElement>);

  readonly triggerBtn = viewChild<ElementRef<HTMLButtonElement>>('triggerBtn');

  readonly inputId = input.required<string>();
  readonly ariaLabel = input<string>('Seleccionar opción');
  readonly options = input.required<readonly CatalogSelectOption[]>();
  readonly align = input<'left' | 'right'>('left');
  readonly openDirection = input<'down' | 'up'>('down');
  readonly highlightActive = input<boolean>(false);

  readonly value = signal<CatalogSelectValue>('');
  readonly disabled = signal<boolean>(false);
  readonly isOpen = signal<boolean>(false);
  readonly activeIndex = signal<number>(0);

  private onChange: (val: CatalogSelectValue) => void = () => {};
  private onTouched: () => void = () => {};

  readonly selectedOption = computed<CatalogSelectOption | null>(() => {
    const val = this.value();
    return this.options().find((opt) => opt.value === val) ?? this.options()[0] ?? null;
  });

  readonly isFiltered = computed<boolean>(() => {
    if (!this.highlightActive()) return false;
    const val = this.value();
    return val !== '' && val !== 'id-asc';
  });

  writeValue(val: CatalogSelectValue | null): void {
    this.value.set(val ?? '');
  }

  registerOnChange(fn: (val: CatalogSelectValue) => void): void {
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

  optionKey(val: CatalogSelectValue): string {
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    return val === '' ? 'ALL' : val;
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

  selectOption(next: CatalogSelectValue): void {
    if (this.disabled()) return;
    this.value.set(next);
    this.onChange(next);
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
        if (chosen !== undefined) {
          this.selectOption(chosen.value);
        }
        break;
      }
      default:
        break;
    }
  }
}
