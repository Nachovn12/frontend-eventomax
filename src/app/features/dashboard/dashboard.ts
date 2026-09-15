import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { DashboardDataService } from './dashboard-data.service';
import { Icon } from '../../shared/ui/icon';
import { ProductionTable } from '../../shared/ui/production-table';
import { StatusChip } from '../../shared/ui/status-chip';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, Icon, ProductionTable, StatusChip],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly authz = inject(AuthorizationService);
  private readonly dataService = inject(DashboardDataService);

  readonly canViewProductions = computed(() =>
    this.authz
      .roles()
      .some((role) => [AppRole.Admin, AppRole.Producer, AppRole.Organizer].includes(role)),
  );
  readonly canViewCatalog = computed(() =>
    this.authz.roles().some((role) => [AppRole.Admin, AppRole.Producer].includes(role)),
  );
  readonly isAdmin = computed(() => this.authz.roles().includes(AppRole.Admin));
  readonly isAuditor = computed(() => this.authz.roles().includes(AppRole.Auditor));
  readonly isOrganizerOnly = computed(
    () => this.authz.roles().includes(AppRole.Organizer) && !this.canViewCatalog(),
  );

  readonly period = toSignal(this.dataService.getPeriod(), { initialValue: '' });

  private readonly allProductions = toSignal(this.dataService.getProductions(), { initialValue: [] });

  readonly productions = computed(() =>
    this.allProductions().filter((item) => !['CERRADO', 'CANCELADO'].includes(item.status))
  );

  readonly upcoming = computed(() => this.productions().slice(0, 4));
  readonly requested = computed(() => this.productions().filter((item) => item.status === 'SOLICITADO').length);
  readonly confirmed = computed(() => this.productions().filter((item) => item.status === 'CONFIRMADO').length);
  readonly live = computed(() => this.productions().filter((item) => ['EN_MONTAJE', 'EN_EJECUCION'].includes(item.status)).length);

  readonly inventory = toSignal(this.dataService.getInventory(), { initialValue: { total: 0, reserved: 0, maintenance: 0, available: 0 } });

  private readonly allAudit = toSignal(this.dataService.getAuditActivity(), { initialValue: [] });
  readonly activity = computed(() => this.allAudit().slice(0, 3));
}
