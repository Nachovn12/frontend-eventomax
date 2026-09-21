import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { Icon } from '../../shared/ui/icon';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [RouterLink, Icon],
  templateUrl: './audit.html',
  styleUrl: './audit.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Audit {
  private readonly authz = inject(AuthorizationService);

  readonly displayRole = computed(() => {
    const roleMap: Record<AppRole, string> = {
      [AppRole.Admin]: 'Administrador',
      [AppRole.Productor]: 'Productor',
      [AppRole.Auditor]: 'Auditor',
      [AppRole.Organizador]: 'Organizador',
    };
    const role = this.authz.roles()[0];
    return role ? roleMap[role] : 'Sin rol';
  });
}
