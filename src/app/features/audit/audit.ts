import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './audit.html',
  styleUrl: './audit.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Audit {
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
}
