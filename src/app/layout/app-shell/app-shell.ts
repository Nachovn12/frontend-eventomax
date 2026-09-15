import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
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
      [AppRole.Producer]: 'Productor',
      [AppRole.Organizer]: 'Organizador',
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
  readonly isProducer = computed(() => this.authz.roles().includes(AppRole.Producer));
  readonly isOrganizer = computed(() => this.authz.roles().includes(AppRole.Organizer));
  readonly canViewProductions = computed(
    () => this.isAdmin() || this.isProducer() || this.isOrganizer(),
  );
  readonly canViewCatalog = computed(() => this.isAdmin() || this.isProducer());
  readonly canViewReports = computed(() => this.isAdmin());
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
