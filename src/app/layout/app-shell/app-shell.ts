import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
  effect,
  ViewEncapsulation,
  afterNextRender,
  DestroyRef,
  HostListener,
  ElementRef,
  OnInit,
} from '@angular/core';
import {
  LucideLogOut,
  LucideMenu,
  LucideX,
  LucideChevronDown,
  LucideChevronRight,
  LucideSun,
  LucideMoon,
} from '@lucide/angular';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { ThemeService } from '../../core/theme/theme.service';
import { StatusPill } from '../../shared/ui/status-pill/status-pill';
import { SidebarSection } from './sidebar/sidebar-section';
import { SidebarToggle } from './sidebar/sidebar-toggle';
import { SidebarNavItem } from './sidebar/sidebar.models';

import { ActiveProductionsStore } from '../../core/state/active-productions.store';
import { ProductionsDataService } from '../../features/productions/productions-data.service';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Production } from '../../core/models/production.model';

const SIDEBAR_STORAGE_KEY = 'emx-sidebar-collapsed';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    TitleCasePipe,
    StatusPill,
    SidebarSection,
    SidebarToggle,
    LucideLogOut,
    LucideMenu,
    LucideX,
    LucideChevronDown,
    LucideChevronRight,
    LucideSun,
    LucideMoon,
  ],
  templateUrl: './app-shell.html',
  styleUrls: [
    './app-shell.css',
    './shell-responsive.css',
    '../../shared/ui/workspace-reset.css',
    '../../shared/ui/workspace.css',
    '../../shared/ui/workspace-tables.css',
    '../../shared/ui/workspace-forms.css',
    '../../../styles/system-states.css',
  ],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly authz = inject(AuthorizationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly el = inject(ElementRef);
  private readonly themeService = inject(ThemeService);
  private readonly activeProductionsStore = inject(ActiveProductionsStore);
  private readonly productionsData = inject(ProductionsDataService, { optional: true });

  readonly isDark = this.themeService.isDark;
  readonly menuOpen = signal(false);
  readonly sidebarCollapsed = signal(AppShell.readInitialCollapsedState());
  readonly sidebarReady = signal(false);
  readonly sidebarAnimating = signal(false);
  readonly tooltipWarm = signal(false);
  readonly accountMenuOpen = signal(false);
  readonly isMobileViewport = signal(false);
  readonly sidebarCompact = computed(() => this.sidebarCollapsed() && !this.isMobileViewport());

  /** True when viewport is in the "medium" range (768–1199px) */
  readonly isMediumViewport = signal(false);

  private animCleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private tooltipWarmTimer: ReturnType<typeof setTimeout> | null = null;
  private tooltipCoolTimer: ReturnType<typeof setTimeout> | null = null;

  // Mobile 1:1 gesture state
  private dragPointerId: number | null = null;
  private dragStartX = 0;
  private dragCurrentX = 0;
  private dragHistory: Array<{ x: number; t: number }> = [];

  private static readInitialCollapsedState(): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
      }
    } catch {
      // Ignore storage access errors in restricted environments
    }
    return false;
  }

  readonly userName =
    this.auth.getAccount()?.name || this.auth.getAccount()?.username || 'Usuario EventoMax';
  readonly initials = this.userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  readonly displayRole = computed(() => {
    const roleMap: Record<AppRole, string> = {
      [AppRole.Admin]: 'Administrador',
      [AppRole.Productor]: 'Productor',
      [AppRole.Organizador]: 'Organizador',
      [AppRole.Auditor]: 'Auditor',
    };
    return (
      this.authz
        .roles()
        .map((role) => roleMap[role])
        .join(', ') || 'Sin rol asignado'
    );
  });
  readonly userEmail = computed(() => this.auth.getAccount()?.username || '');
  readonly assignedRoles = computed(() => {
    const roleInfo: Record<AppRole, { label: string; tag: string }> = {
      [AppRole.Admin]: { label: 'Administrador', tag: 'admin' },
      [AppRole.Productor]: { label: 'Productor', tag: 'productor' },
      [AppRole.Organizador]: { label: 'Organizador', tag: 'organizador' },
      [AppRole.Auditor]: { label: 'Auditor', tag: 'auditor' },
    };
    return this.authz.roles().map((r) => roleInfo[r] || { label: r, tag: 'default' });
  });
  readonly isAuditor = computed(() => this.authz.roles().includes(AppRole.Auditor));
  readonly isAdmin = computed(() => this.authz.roles().includes(AppRole.Admin));
  readonly isProductor = computed(() => this.authz.roles().includes(AppRole.Productor));
  readonly isOrganizador = computed(() => this.authz.roles().includes(AppRole.Organizador));

  // Section titles
  readonly operationSectionTitle = computed(() => 'Mis eventos');
  readonly analyticsSectionTitle = 'Análisis y control';

  // Feature Flags (EP2): rutas protegidas por MSAL y roleGuard
  readonly features = {
    dashboard: true,
    productions: true,
    catalog: true,
    reports: true,
    audit: true,
  };

  readonly canViewProductions = computed(
    () => (this.isAdmin() || this.isProductor() || this.isOrganizador()) && this.features.productions,
  );
  readonly canViewCatalog = computed(
    () => (this.isAdmin() || this.isProductor()) && this.features.catalog,
  );
  readonly canViewReports = computed(() => this.isAdmin() && this.features.reports);
  readonly canViewAudit = computed(
    () => (this.isAdmin() || this.isAuditor()) && this.features.audit,
  );

  readonly currentSection = signal('Dashboard');

  /** Labels for sidebar nav items */
  readonly navLabels = {
    dashboard: 'Dashboard',
    productions: 'Producciones',
    catalog: 'Catálogo',
    reports: 'Reportes',
    audit: 'Auditoría',
  };

  readonly primaryNavItems = computed<readonly SidebarNavItem[]>(() => {
    const items: SidebarNavItem[] = [
      {
        id: 'dashboard',
        label: this.navLabels.dashboard,
        route: '/dashboard',
        icon: 'dashboard',
      },
    ];
    if (this.canViewProductions()) {
      const activeBadge = this.activeProductionsStore.sidebarBadge();
      items.push({
        id: 'productions',
        label: this.navLabels.productions,
        route: '/productions',
        icon: 'productions',
        ...(activeBadge !== undefined
          ? { badge: activeBadge, badgeLabel: `${activeBadge} abiertas (estados no terminales)` }
          : {}),
      });
    }
    if (this.canViewCatalog()) {
      items.push({
        id: 'catalog',
        label: this.navLabels.catalog,
        route: '/catalog',
        icon: 'catalog',
      });
    }
    return items;
  });

  readonly secondaryNavItems = computed<readonly SidebarNavItem[]>(() => {
    const items: SidebarNavItem[] = [];
    if (this.canViewReports()) {
      items.push({
        id: 'reports',
        label: this.navLabels.reports,
        route: '/reports',
        icon: 'reports',
      });
    }
    if (this.canViewAudit()) {
      items.push({
        id: 'audit',
        label: this.navLabels.audit,
        route: '/audit',
        icon: 'audit',
        statusDot: true,
        statusLabel: 'Kafka Live',
      });
    }
    return items;
  });

  ngOnInit(): void {
    if (this.canViewProductions() && this.activeProductionsStore.activeCount() === null && this.productionsData) {
      this.productionsData.getProductions().pipe(
        catchError(() => of([] as readonly Production[]))
      ).subscribe();
    }
  }

  constructor() {
    const router = inject(Router);
    router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        const url = router.url;
        let section = 'Operación';
        if (url.includes('/dashboard')) section = 'Dashboard';
        else if (url.includes('/productions')) section = 'Producciones';
        else if (url.includes('/catalog')) section = 'Catálogo';
        else if (url.includes('/reports')) section = 'Reportes';
        else if (url.includes('/audit')) section = 'Auditoría';
        this.currentSection.set(section);
      });

    effect(() => {
      const open = this.menuOpen();
      if (typeof document !== 'undefined') {
        if (open) {
          document.body.style.overflow = 'hidden';
        } else {
          document.body.style.overflow = '';
        }
      }
    });

    // Restore sidebar state from localStorage & setup viewport listener
    afterNextRender(() => {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (stored === 'true') {
        this.sidebarCollapsed.set(true);
      }

      if (typeof window.matchMedia === 'function') {
        const mobile = window.matchMedia('(max-width: 767px)');
        const onMobileChange = (event: MediaQueryListEvent | MediaQueryList) => {
          this.isMobileViewport.set(event.matches);
          this.menuOpen.set(false);
        };
        onMobileChange(mobile);
        mobile.addEventListener('change', onMobileChange);
        this.destroyRef.onDestroy(() => mobile.removeEventListener('change', onMobileChange));
        const mql = window.matchMedia('(min-width: 768px) and (max-width: 1199px)');
        const handler = (e: MediaQueryListEvent | MediaQueryList) => {
          this.isMediumViewport.set(e.matches);
          if (e.matches && localStorage.getItem(SIDEBAR_STORAGE_KEY) === null) {
            this.sidebarCollapsed.set(true);
          }
        };
        handler(mql);
        mql.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
        this.destroyRef.onDestroy(() =>
          mql.removeEventListener('change', handler as (e: MediaQueryListEvent) => void),
        );
      }

      // Enable transitions only after first painted frame to prevent initial load animation
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          this.sidebarReady.set(true);
        });
      } else {
        this.sidebarReady.set(true);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.clearTimers();
    });
  }

  private clearTimers(): void {
    if (this.animCleanupTimer !== null) {
      clearTimeout(this.animCleanupTimer);
      this.animCleanupTimer = null;
    }
    if (this.tooltipWarmTimer !== null) {
      clearTimeout(this.tooltipWarmTimer);
      this.tooltipWarmTimer = null;
    }
    if (this.tooltipCoolTimer !== null) {
      clearTimeout(this.tooltipCoolTimer);
      this.tooltipCoolTimer = null;
    }
  }

  toggleSidebar(): void {
    const next = !this.sidebarCollapsed();
    this.clearTooltipTimers();
    this.tooltipWarm.set(false);

    if (this.sidebarReady() && !this.isMobileViewport()) {
      this.lockMainWidthDuringTransition();
      this.sidebarAnimating.set(true);
      if (this.animCleanupTimer !== null) {
        clearTimeout(this.animCleanupTimer);
      }
      this.animCleanupTimer = setTimeout(() => {
        this.finishSidebarTransition();
      }, 310);
    }

    this.sidebarCollapsed.set(next);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    } catch {
      // Ignore storage quota errors
    }
  }

  private lockMainWidthDuringTransition(): void {
    const host = this.el?.nativeElement as HTMLElement | undefined;
    if (!host) return;
    const mainEl = host.querySelector('.shell-main') as HTMLElement | null;
    if (mainEl && !mainEl.style.width) {
      const rect = mainEl.getBoundingClientRect();
      if (rect.width > 0) {
        mainEl.style.width = `${rect.width}px`;
      }
    }
  }

  onSidebarTransitionEnd(event: TransitionEvent): void {
    if (event.propertyName === 'width') {
      this.finishSidebarTransition();
    }
  }

  private finishSidebarTransition(): void {
    if (this.animCleanupTimer !== null) {
      clearTimeout(this.animCleanupTimer);
      this.animCleanupTimer = null;
    }
    this.sidebarAnimating.set(false);
    const host = this.el?.nativeElement as HTMLElement | undefined;
    const mainEl = host?.querySelector('.shell-main') as HTMLElement | null;
    if (mainEl) {
      mainEl.style.width = '';
    }
  }

  private clearTooltipTimers(): void {
    if (this.tooltipWarmTimer !== null) {
      clearTimeout(this.tooltipWarmTimer);
      this.tooltipWarmTimer = null;
    }
    if (this.tooltipCoolTimer !== null) {
      clearTimeout(this.tooltipCoolTimer);
      this.tooltipCoolTimer = null;
    }
  }

  onNavItemHover(): void {
    if (!this.sidebarCompact() || this.sidebarAnimating()) return;
    if (this.tooltipCoolTimer !== null) {
      clearTimeout(this.tooltipCoolTimer);
      this.tooltipCoolTimer = null;
    }
    if (this.tooltipWarm()) return;
    if (this.tooltipWarmTimer === null) {
      this.tooltipWarmTimer = setTimeout(() => {
        this.tooltipWarmTimer = null;
        if (this.sidebarCompact() && !this.sidebarAnimating()) {
          this.tooltipWarm.set(true);
        }
      }, 300);
    }
  }

  onNavPointerLeave(): void {
    if (this.tooltipWarmTimer !== null) {
      clearTimeout(this.tooltipWarmTimer);
      this.tooltipWarmTimer = null;
    }
    if (this.tooltipWarm()) {
      this.tooltipCoolTimer = setTimeout(() => {
        this.tooltipCoolTimer = null;
        this.tooltipWarm.set(false);
      }, 140);
    }
  }

  // Mobile Drawer 1:1 Pointer Drag + Apple Velocity Projection
  onSidebarPointerDown(event: PointerEvent, sidebarEl: HTMLElement): void {
    if (!this.isMobileViewport() || !this.menuOpen() || event.button !== 0) return;
    this.dragPointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragCurrentX = event.clientX;
    this.dragHistory = [{ x: event.clientX, t: performance.now() }];
    sidebarEl.setPointerCapture?.(event.pointerId);
    sidebarEl.style.transition = 'none';
  }

  onSidebarPointerMove(event: PointerEvent, sidebarEl: HTMLElement): void {
    if (this.dragPointerId !== event.pointerId) return;
    this.dragCurrentX = event.clientX;
    const now = performance.now();
    this.dragHistory.push({ x: event.clientX, t: now });
    if (this.dragHistory.length > 5) {
      this.dragHistory.shift();
    }
    const rawDelta = this.dragCurrentX - this.dragStartX;
    const deltaX = rawDelta > 0 ? 0 : rawDelta;
    sidebarEl.style.transform = `translate3d(${deltaX}px, 0, 0)`;
  }

  onSidebarPointerUp(event: PointerEvent, sidebarEl: HTMLElement, trigger?: HTMLButtonElement): void {
    if (this.dragPointerId !== event.pointerId) return;
    this.dragPointerId = null;
    sidebarEl.releasePointerCapture?.(event.pointerId);
    sidebarEl.style.transition = '';
    sidebarEl.style.transform = '';

    const deltaX = Math.min(0, this.dragCurrentX - this.dragStartX);
    let velocityPxPerSec = 0;
    if (this.dragHistory.length >= 2) {
      const first = this.dragHistory[0];
      const last = this.dragHistory[this.dragHistory.length - 1];
      const dt = Math.max(1, last.t - first.t);
      velocityPxPerSec = ((last.x - first.x) / dt) * 1000;
    }

    // Apple WWDC Fluid Interfaces projection formula (d = 0.99 for snappy drawer)
    const decelerationRate = 0.99;
    const projectedChange = ((velocityPxPerSec / 1000) * decelerationRate) / (1 - decelerationRate);
    const projectedX = deltaX + projectedChange;
    const drawerWidth = sidebarEl.getBoundingClientRect().width || 280;

    if (projectedX < -drawerWidth * 0.35 || velocityPxPerSec < -450) {
      this.closeMenu(trigger);
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  skipToContent(event: Event, main: HTMLElement): void {
    event.preventDefault();
    main.focus();
  }

  toggleAccountMenu(): void {
    this.accountMenuOpen.update((v) => !v);
  }

  onAccountFocusOut(event: FocusEvent): void {
    if (
      event.relatedTarget instanceof Node &&
      !(event.currentTarget as HTMLElement).contains(event.relatedTarget)
    ) {
      this.accountMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    if (
      (event.metaKey || event.ctrlKey) &&
      !event.shiftKey &&
      !event.altKey &&
      event.key.toLowerCase() === 'b'
    ) {
      event.preventDefault();
      if (this.isMobileViewport()) {
        this.menuOpen.update((open) => !open);
      } else {
        this.toggleSidebar();
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (this.accountMenuOpen() && !target.closest('.topbar-meta')) {
      this.accountMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.accountMenuOpen()) {
      this.accountMenuOpen.set(false);
      this.el.nativeElement.querySelector('.account-trigger')?.focus();
    }
    if (this.menuOpen()) {
      this.closeMenu(this.el.nativeElement.querySelector('.mobile-toggle-btn'));
    }
  }

  onLogout(): void {
    this.auth.logout();
  }

  closeMenu(trigger?: HTMLButtonElement): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      trigger?.focus();
    }
  }
}
