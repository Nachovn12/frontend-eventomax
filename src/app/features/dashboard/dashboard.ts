import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly auth = inject(AuthService);
  private readonly authz = inject(AuthorizationService);

  readonly displayRole = computed(() => {
    const roles = this.authz.roles();
    if (roles.length === 0) {
      return 'Sin rol asignado';
    }
    const roleMap: Record<AppRole, string> = {
      [AppRole.Admin]: 'Administrador',
      [AppRole.Producer]: 'Productor',
      [AppRole.Organizer]: 'Organizador',
      [AppRole.Auditor]: 'Auditor',
    };
    return roles.map(r => roleMap[r]).join(', ');
  });

  onLogout(): void {
    this.auth.logout();
  }
}
