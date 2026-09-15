import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { DEMO_AUDIT } from '../../demo/eventomax.fixtures';
import { Icon } from '../../shared/ui/icon';
import { StatusChip } from '../../shared/ui/status-chip';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, Icon, StatusChip],
  templateUrl: './audit.html',
  styleUrl: './audit.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Audit {
  private readonly authz = inject(AuthorizationService);

  readonly displayRole = computed(() => {
    const roleMap: Record<AppRole, string> = {
      [AppRole.Admin]: 'Administrador',
      [AppRole.Producer]: 'Productor',
      [AppRole.Auditor]: 'Auditor',
      [AppRole.Organizer]: 'Organizador',
    };
    const role = this.authz.roles()[0];
    return role ? roleMap[role] : 'Sin rol';
  });

  readonly search = new FormControl('', { nonNullable: true });
  readonly production = new FormControl('', { nonNullable: true });

  readonly events = DEMO_AUDIT;

  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  private readonly selectedProduction = toSignal(this.production.valueChanges, { initialValue: '' });

  readonly rows = computed(() => {
    const q = this.query().toLowerCase();
    const p = this.selectedProduction();
    return this.events.filter(e =>
      (!p || e.production === p) &&
      (!q || e.actor.toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || e.trace.toLowerCase().includes(q))
    );
  });

  clearFilters() {
    this.search.setValue('');
    this.production.setValue('');
  }
}
