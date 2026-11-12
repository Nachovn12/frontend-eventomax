import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  input,
  output,
  computed,
} from '@angular/core';
import { LucidePanelLeft } from '@lucide/angular';

@Component({
  selector: 'emx-sidebar-toggle',
  standalone: true,
  imports: [LucidePanelLeft],
  template: `
    <button
      type="button"
      class="collapse-toggle desktop-toggle"
      [attr.aria-controls]="controls()"
      [attr.aria-expanded]="!collapsed()"
      [attr.aria-label]="label()"
      [attr.title]="label()"
      (pointerdown)="onPointerDown($event)"
      (click)="onClick($event)"
    >
      <svg lucidePanelLeft class="nav-icon" />
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarToggle {
  readonly collapsed = input.required<boolean>();
  readonly controls = input<string>('sidebar-content');
  readonly toggle = output<void>();

  private triggeredOnPointerDown = false;

  readonly label = computed(() =>
    this.collapsed() ? 'Expandir menú' : 'Colapsar menú',
  );

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.triggeredOnPointerDown = true;
    this.toggle.emit();
  }

  onClick(event: MouseEvent): void {
    if (this.triggeredOnPointerDown) {
      this.triggeredOnPointerDown = false;
      return;
    }
    // Keyboard activation (Enter / Space) or programmatic .click()
    this.toggle.emit();
  }
}
