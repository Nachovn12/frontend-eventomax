import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import {
  DEMO_INVENTORY,
  DEMO_PRODUCTIONS,
  DEMO_PERIOD,
  DEMO_AUDIT,
} from '../../demo/eventomax.fixtures';
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
  readonly period = DEMO_PERIOD;
  readonly productions = DEMO_PRODUCTIONS.filter(
    (item) => !['CERRADO', 'CANCELADO'].includes(item.status),
  );
  readonly upcoming = this.productions.slice(0, 4);
  readonly requested = this.productions.filter((item) => item.status === 'SOLICITADO').length;
  readonly confirmed = this.productions.filter((item) => item.status === 'CONFIRMADO').length;
  readonly live = this.productions.filter((item) =>
    ['EN_MONTAJE', 'EN_EJECUCIÓN'].includes(item.status),
  ).length;
  readonly inventory = DEMO_INVENTORY;
  readonly activity = DEMO_AUDIT.slice(0, 3);
}
