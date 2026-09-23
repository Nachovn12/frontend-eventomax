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
} from '@angular/core';
import {
  LucideLayoutDashboard,
  LucideCalendarDays,
  LucidePackage,
  LucideChartNoAxesColumn,
  LucideShield,
  LucidePanelLeftClose,
  LucidePanelLeftOpen,
  LucideLogOut,
  LucideMenu,
  LucideX,
  LucideChevronDown,
  LucideChevronRight
} from '@lucide/angular';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';

const SIDEBAR_STORAGE_KEY = 'emx-sidebar-collapsed';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TitleCasePipe,
    LucideLayoutDashboard,
    LucideCalendarDays,
    LucidePackage,
    LucideChartNoAxesColumn,
    LucideShield,
    LucidePanelLeftClose,
    LucidePanelLeftOpen,
    LucideLogOut,
    LucideMenu,
    LucideX,
    LucideChevronDown,
    LucideChevronRight
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
export class AppShell {
  private readonly auth = inject(AuthService);
  private readonly authz = inject(AuthorizationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly el = inject(ElementRef);

  readonly menuOpen = signal(false);
  readonly sidebarCollapsed = signal(false);
  readonly accountMenuOpen = signal(false);
  readonly isMobileViewport = signal(false);
  readonly sidebarCompact = computed(() => this.sidebarCollapsed() && !this.isMobileViewport());

  /** True when viewport is in the "medium" range (768–1199px) */
  readonly isMediumViewport = signal(false);

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
  readonly isAuditor = computed(() => this.authz.roles().includes(AppRole.Auditor));
  readonly isAdmin = computed(() => this.authz.roles().includes(AppRole.Admin));
  readonly isProductor = computed(() => this.authz.roles().includes(AppRole.Productor));
  readonly isOrganizador = computed(() => this.authz.roles().includes(AppRole.Organizador));

  // Dynamic section titles
  readonly operationSectionTitle = computed(() => this.isOrganizador() ? 'MIS EVENTOS' : 'OPERACIÓN');

  // Feature Flags (EP1)
  readonly features = {
    dashboard: true,
    productions: true,
    catalog: true,
    reports: false,
    audit: false
  };

  readonly canViewProductions = computed(
    () => (this.isAdmin() || this.isProductor() || this.isOrganizador()) && this.features.productions,
  );
  readonly canViewCatalog = computed(() => (this.isAdmin() || this.isProductor()) && this.features.catalog);
  readonly canViewReports = computed(() => this.isAdmin() && this.features.reports);
  readonly canViewAudit = computed(() => (this.isAdmin() || this.isAuditor()) && this.features.audit);

  readonly currentSection = signal('Dashboard');

  /** Labels for sidebar nav items (used as tooltips when collapsed) */
  readonly navLabels = {
    dashboard: 'Dashboard',
    productions: 'Producciones',
    catalog: 'Catálogo',
    reports: 'Reportes',
    audit: 'Auditoría',
  };

  constructor() {
    const router = inject(Router);
    router.events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => {
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
      // Restore persisted state
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (stored === 'true') {
        this.sidebarCollapsed.set(true);
      }

      // Medium viewport detection (768–1199px)
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
          // Auto-collapse on medium viewport if no user preference stored
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
    });
  }

  toggleSidebar(): void {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(next);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
  }

  skipToContent(event: Event, main: HTMLElement): void {
    event.preventDefault();
    main.focus();
  }

  toggleAccountMenu(): void {
    this.accountMenuOpen.update(v => !v);
  }

  onAccountFocusOut(event: FocusEvent): void {
    if (event.relatedTarget instanceof Node &&
        !(event.currentTarget as HTMLElement).contains(event.relatedTarget)) {
      this.accountMenuOpen.set(false);
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
