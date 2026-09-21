import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { Icon } from '../../shared/ui/icon';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './app-shell.html',
  styleUrls: [
    './app-shell.css',
    './shell-responsive.css',
    '../../shared/ui/workspace-reset.css',
    '../../shared/ui/workspace.css',
    '../../shared/ui/workspace-tables.css',
    '../../shared/ui/workspace-forms.css',
  ],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {
  private readonly auth = inject(AuthService);
  private readonly authz = inject(AuthorizationService);
  readonly menuOpen = signal(false);
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
  readonly canViewProductions = computed(
    () => this.isAdmin() || this.isProductor() || this.isOrganizador(),
  );
  readonly canViewCatalog = computed(() => this.isAdmin() || this.isProductor());
  readonly canViewReports = computed(() => this.isAdmin());

  readonly currentSection = signal('Dashboard');

  constructor() {
    const router = inject(Router);
    router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      const url = router.url;
      let section = 'Operación';
      if (url.includes('/dashboard')) section = 'Dashboard';
      else if (url.includes('/productions')) section = 'Producciones';
      else if (url.includes('/catalog')) section = 'Catálogo';
      else if (url.includes('/reports')) section = 'Reportes';
      else if (url.includes('/audit')) section = 'Auditoría';
      this.currentSection.set(section);
    });
  }

  skipToContent(event: Event, main: HTMLElement): void {
    event.preventDefault();
    main.focus();
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
