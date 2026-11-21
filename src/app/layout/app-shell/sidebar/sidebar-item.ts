import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  input,
  output,
  computed,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideLayoutGrid,
  LucideCalendarDays,
  LucidePackage,
  LucideBarChart3,
  LucideShieldCheck,
  LucideUsers,
} from '@lucide/angular';
import { SidebarNavItem } from './sidebar.models';

@Component({
  selector: 'emx-sidebar-item',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideLayoutGrid,
    LucideCalendarDays,
    LucidePackage,
    LucideBarChart3,
    LucideShieldCheck,
    LucideUsers,
  ],
  template: `
    <a
      [routerLink]="item().route"
      routerLinkActive="active"
      ariaCurrentWhenActive="page"
      class="nav-link"
      [attr.aria-label]="collapsed() ? tooltipText() : null"
      [attr.data-tooltip]="tooltipText()"
      (pointerenter)="itemHover.emit()"
      (click)="itemClick.emit()"
    >
      <span class="nav-icon-wrap">
        @switch (item().icon) {
          @case ('dashboard') {
            <svg lucideLayoutGrid class="nav-icon" />
          }
          @case ('productions') {
            <svg lucideCalendarDays class="nav-icon" />
          }
          @case ('catalog') {
            <svg lucidePackage class="nav-icon" />
          }
          @case ('reports') {
            <svg lucideBarChart3 class="nav-icon" />
          }
          @case ('audit') {
            <svg lucideShieldCheck class="nav-icon" />
          }
          @case ('organizers') {
            <svg lucideUsers class="nav-icon" />
          }
        }
        @if (item().badge !== undefined && item().badge !== null) {
          <span class="nav-collapsed-dot" aria-hidden="true"></span>
        }
        @if (item().statusDot) {
          <span class="nav-collapsed-status-dot" aria-hidden="true"></span>
        }
      </span>
      <span class="nav-label brand-copy">{{ item().label }}</span>
      @if (item().badge !== undefined && item().badge !== null) {
        <span class="nav-count-badge brand-copy">{{ item().badge }}</span>
      }
      @if (item().statusDot) {
        <span
          class="nav-live-dot brand-copy"
          [attr.title]="item().statusLabel || 'Estado activo'"
        ></span>
      }
    </a>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarItem {
  readonly item = input.required<SidebarNavItem>();
  readonly collapsed = input<boolean>(false);
  readonly itemClick = output<void>();
  readonly itemHover = output<void>();

  readonly tooltipText = computed(() => {
    const current = this.item();
    if (current.badge !== undefined && current.badge !== null) {
      return `${current.label} · ${current.badge}`;
    }
    return current.label;
  });
}
