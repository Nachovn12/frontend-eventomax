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
  LucideCheck,
  LucideChevronDown,
  LucidePackage,
  LucideSearch,
  LucideSearchX,
} from '@lucide/angular';
import { Equipment } from '../../../catalog/models/equipment.model';

@Component({
  selector: 'emx-equipment-combobox',
  standalone: true,
  imports: [
    LucideCheck,
    LucideChevronDown,
    LucidePackage,
    LucideSearch,
    LucideSearchX,
  ],
  templateUrl: './equipment-combobox.component.html',
  styleUrl: './equipment-combobox.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EquipmentComboboxComponent),
      multi: true,
    },
  ],
})
export class EquipmentComboboxComponent implements ControlValueAccessor {
  private readonly elRef = inject(ElementRef<HTMLElement>);

  readonly triggerBtn = viewChild<ElementRef<HTMLButtonElement>>('triggerBtn');
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly inputId = input<string>('equipment-select');
  readonly equipment = input.required<readonly Equipment[]>();
  readonly draftQuantities = input<Readonly<Record<number, number>>>({});
  readonly placeholder = input<string>('Seleccionar equipo disponible…');

  readonly value = signal<string>('');
  readonly disabled = signal<boolean>(false);
  readonly isOpen = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly activeIndex = signal<number>(-1);
  readonly failedImages = signal<ReadonlySet<number>>(new Set());

  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  readonly selectedEquipment = computed<Equipment | null>(() => {
    const raw = this.value();
    if (!raw) return null;
    const id = Number(raw);
    return this.equipment().find((e) => e.id === id) ?? null;
  });

  readonly filteredEquipment = computed<readonly Equipment[]>(() => {
    const q = this.searchQuery().trim().toLocaleLowerCase('es');
    const items = this.equipment();
    if (!q) return items;
    return items.filter((eq) => {
      const haystacks = [
        eq.name,
        `#${eq.id}`,
        String(eq.id),
        eq.category ?? '',
        eq.description ?? '',
      ];
      return haystacks.some((h) => h.toLocaleLowerCase('es').includes(q));
    });
  });

  getStock(eq: Equipment): number {
    return eq.availableQty ?? eq.availableQuantity ?? 0;
  }

  getDraftQty(eqId: number): number {
    return this.draftQuantities()[eqId] ?? 0;
  }

  isOutOfStock(eq: Equipment): boolean {
    return this.getStock(eq) <= 0;
  }

  hasUsableImage(eq: Equipment): boolean {
    return Boolean(eq.imageUrl?.trim()) && !this.failedImages().has(eq.id);
  }

  onImageError(eqId: number): void {
    this.failedImages.update((prev) => {
      const next = new Set(prev);
      next.add(eqId);
      return next;
    });
  }

  writeValue(val: string | null): void {
    this.value.set(val ? String(val) : '');
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
    this.searchQuery.set('');
    const list = this.filteredEquipment();
    const selIdx = list.findIndex((e) => String(e.id) === this.value() && !this.isOutOfStock(e));
    const firstEnabled = list.findIndex((e) => !this.isOutOfStock(e));
    this.activeIndex.set(selIdx >= 0 ? selIdx : firstEnabled);
    this.isOpen.set(true);
    setTimeout(() => this.searchInput()?.nativeElement.focus(), 0);
  }

  close(restoreFocus: boolean): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.searchQuery.set('');
    this.onTouched();
    if (restoreFocus) {
      setTimeout(() => this.triggerBtn()?.nativeElement.focus(), 0);
    }
  }

  onSearchInput(raw: string): void {
    this.searchQuery.set(raw);
    const list = this.filteredEquipment();
    const firstEnabled = list.findIndex((e) => !this.isOutOfStock(e));
    this.activeIndex.set(firstEnabled);
  }

  selectEquipment(eq: Equipment): void {
    if (this.disabled() || this.isOutOfStock(eq)) return;
    const nextVal = String(eq.id);
    this.value.set(nextVal);
    this.onChange(nextVal);
    this.onTouched();
    this.close(true);
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
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

  onPanelKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;
    const list = this.filteredEquipment();

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.close(true);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1, list);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1, list);
        break;
      case 'Enter': {
        const idx = this.activeIndex();
        const item = idx >= 0 ? list[idx] : undefined;
        if (item && !this.isOutOfStock(item)) {
          event.preventDefault();
          this.selectEquipment(item);
        }
        break;
      }
      default:
        break;
    }
  }

  private moveActive(delta: number, list: readonly Equipment[]): void {
    if (list.length === 0) return;
    let idx = this.activeIndex();
    for (let step = 0; step < list.length; step++) {
      idx = idx < 0 ? (delta > 0 ? 0 : list.length - 1) : (idx + delta + list.length) % list.length;
      if (!this.isOutOfStock(list[idx])) {
        this.activeIndex.set(idx);
        return;
      }
    }
  }
}
