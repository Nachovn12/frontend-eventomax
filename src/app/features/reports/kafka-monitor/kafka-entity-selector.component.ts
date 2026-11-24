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
import {
  LucideCheck,
  LucideChevronDown,
  LucideDatabase,
  LucideUsers,
} from '@lucide/angular';

export interface KafkaSelectorOption {
  readonly id: string;
  readonly label: string;
  readonly meta?: string;
  readonly stateTone?: 'stable' | 'warn' | 'dead' | 'neutral';
}

@Component({
  selector: 'emx-kafka-entity-selector',
  standalone: true,
  imports: [LucideCheck, LucideChevronDown, LucideDatabase, LucideUsers],
  templateUrl: './kafka-entity-selector.component.html',
  styleUrl: './kafka-entity-selector.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KafkaEntitySelectorComponent {
  private readonly elRef = inject(ElementRef<HTMLElement>);

  readonly triggerBtn = viewChild<ElementRef<HTMLButtonElement>>('triggerBtn');

  readonly inputId = input.required<string>();
  readonly ariaLabel = input<string>('Seleccionar elemento Kafka');
  readonly kind = input<'topic' | 'group'>('topic');
  readonly options = input.required<readonly KafkaSelectorOption[]>();
  readonly selectedId = input<string | null>(null);
  readonly placeholder = input<string>('Seleccionar…');

  readonly selectionChange = output<string>();

  readonly isOpen = signal<boolean>(false);
  readonly activeIndex = signal<number>(0);

  readonly selectedOption = computed<KafkaSelectorOption | null>(() => {
    const id = this.selectedId();
    if (!id) return this.options()[0] ?? null;
    return this.options().find((o) => o.id === id) ?? this.options()[0] ?? null;
  });

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const target = event.target as Node | null;
    if (target && !this.elRef.nativeElement.contains(target)) {
      this.close(false);
    }
  }

  toggle(): void {
    if (this.options().length === 0) return;
    if (this.isOpen()) {
      this.close(true);
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.options().length === 0) return;
    const idx = this.options().findIndex((o) => o.id === this.selectedId());
    this.activeIndex.set(idx >= 0 ? idx : 0);
    this.isOpen.set(true);
  }

  close(restoreFocus: boolean): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    if (restoreFocus) {
      setTimeout(() => this.triggerBtn()?.nativeElement.focus(), 0);
    }
  }

  choose(id: string): void {
    this.selectionChange.emit(id);
    this.close(true);
  }

  onKeydown(event: KeyboardEvent): void {
    const list = this.options();
    if (list.length === 0) return;

    if (!this.isOpen()) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.open();
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
        const item = list[this.activeIndex()];
        if (item) this.choose(item.id);
        break;
      }
      default:
        break;
    }
  }
}
