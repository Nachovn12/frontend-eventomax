import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { DashboardDataService } from './dashboard-data.service';
import {
  LucideCalendarDays,
  LucideClock3,
  LucideActivity,
  LucidePackage,
  LucideArrowRight,
  LucideCircleAlert
} from '@lucide/angular';
import { ProductionTable } from '../../shared/ui/production-table';
import { BehaviorSubject, catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { Production } from '../../core/models/production.model';
import { CatalogService } from '../catalog/models/catalog-service.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    ProductionTable,
    LucideCalendarDays,
    LucideClock3,
    LucideActivity,
    LucidePackage,
    LucideArrowRight,
    LucideCircleAlert
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly authz = inject(AuthorizationService);
  private readonly dataService = inject(DashboardDataService);

  readonly canViewProductions = computed(() =>
    this.authz.roles().some((role) => [AppRole.Admin, AppRole.Productor].includes(role))
  );
  readonly canViewCatalog = computed(() =>
    this.authz.roles().some((role) => [AppRole.Admin, AppRole.Productor].includes(role))
  );
  readonly isAdmin = computed(() => this.authz.roles().includes(AppRole.Admin));
  readonly isAuditor = computed(() => this.authz.roles().includes(AppRole.Auditor));
  readonly isOrganizerOnly = computed(
    () => this.authz.roles().includes(AppRole.Organizador) && !this.canViewCatalog()
  );

  private readonly retrySubject = new BehaviorSubject<void>(undefined);

  private readonly dashboardState = toSignal(
    this.retrySubject.pipe(
      switchMap(() => {
        // Auditor and Organizer do not fetch API data in Dashboard to avoid 403s or data leakage
        if ((this.authz.roles().length === 1 && this.isAuditor()) || this.isOrganizerOnly()) {
          return of({ productions: [], catalog: [], loading: false, error: false });
        }

        const fetchProductions = this.canViewProductions() ? this.dataService.getProductions() : of([] as readonly Production[]);
        const fetchCatalog = this.canViewCatalog() ? this.dataService.getCatalogServices() : of([] as readonly CatalogService[]);

        return forkJoin({ productions: fetchProductions, catalog: fetchCatalog }).pipe(
          map(({ productions, catalog }) => ({ productions, catalog, loading: false, error: false })),
          catchError(() => of({ productions: [], catalog: [], loading: false, error: true })),
          startWith({ productions: [], catalog: [], loading: true, error: false })
        );
      })
    ),
    { initialValue: { productions: [], catalog: [], loading: true, error: false } }
  );

  readonly isLoading = computed(() => this.dashboardState().loading);
  readonly isError = computed(() => this.dashboardState().error);

  private readonly allProductions = computed(() => this.dashboardState().productions);
  private readonly allCatalog = computed(() => this.dashboardState().catalog);

  readonly activeProductions = computed(() => {
    const active = this.allProductions().filter((item) => !['CERRADO', 'CANCELADO'].includes(item.status));
    return [...active].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  });

  readonly upcoming = computed(() => this.activeProductions().slice(0, 4));

  readonly totalProductions = computed(() => this.allProductions().length);
  readonly requested = computed(() => this.allProductions().filter((item) => item.status === 'SOLICITADO').length);
  readonly confirmed = computed(() => this.allProductions().filter((item) => item.status === 'CONFIRMADO').length);
  readonly live = computed(() => this.allProductions().filter((item) => ['EN_MONTAJE', 'EN_EJECUCION'].includes(item.status)).length);
  readonly closed = computed(() => this.allProductions().filter((item) => item.status === 'CERRADO').length);

  readonly activeServicesCount = computed(() => this.allCatalog().filter(s => s.active).length);
  readonly totalServicesCount = computed(() => this.allCatalog().length);

  retry(): void {
    this.retrySubject.next();
  }
}
