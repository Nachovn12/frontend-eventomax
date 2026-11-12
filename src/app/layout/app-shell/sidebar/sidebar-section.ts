import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  input,
  output,
} from '@angular/core';
import { SidebarItem } from './sidebar-item';
import { SidebarNavItem } from './sidebar.models';

@Component({
  selector: 'emx-sidebar-section',
  standalone: true,
  imports: [SidebarItem],
  template: `
    <div class="sidebar-section-group" [class.is-secondary]="isSecondary()">
      <div class="nav-section-slot">
        <p class="nav-section brand-copy" [class.secondary]="isSecondary()">
          {{ title() }}
        </p>
        @if (isSecondary()) {
          <div class="nav-divider" aria-hidden="true"></div>
        }
      </div>
      <ul class="nav-list" role="list">
        @for (item of items(); track item.id; let idx = $index) {
          <li class="nav-list-item" [style.--item-index]="staggerOffset() + idx">
            <emx-sidebar-item
              [item]="item"
              [collapsed]="collapsed()"
              (itemHover)="itemHover.emit()"
              (itemClick)="itemClick.emit()"
            />
          </li>
        }
      </ul>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarSection {
  readonly title = input.required<string>();
  readonly items = input.required<readonly SidebarNavItem[]>();
  readonly collapsed = input<boolean>(false);
  readonly isSecondary = input<boolean>(false);
  readonly staggerOffset = input<number>(0);
  readonly itemClick = output<void>();
  readonly itemHover = output<void>();
}
