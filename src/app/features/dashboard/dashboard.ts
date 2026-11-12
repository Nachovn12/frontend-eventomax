import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { DashboardDataService } from './dashboard-data.service';
import { ReportsDataService } from '../reports/reports-data.service';
import { ReportKpisResponse } from '../reports/models/report.model';
import { HttpErrorResponse } from '@angular/common/http';
import {
  LucideCalendarDays,
  LucideArrowRight,
  LucideCircleAlert
} from '@lucide/angular';
import { ProductionTable } from '../../shared/ui/production-table';
import { ButtonDirective } from '../../shared/ui/button.component';
import { StatusPill, Tag } from '../../shared/ui/status-pill/status-pill';
import { BehaviorSubject, catchError, forkJoin, map, of, startWith, switchMap, tap } from 'rxjs';
import { Production } from '../../core/models/production.model';
import { CatalogService } from '../catalog/models/catalog-service.model';

interface DashboardReportState {
  data: ReportKpisResponse | null;
  loading: boolean;
  error: number | null;
}

interface DashboardDomainState {
  productions: readonly Production[];
  catalog: readonly CatalogService[];
  loading: boolean;
  error: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    ProductionTable,
    ButtonDirective,
    StatusPill,
    Tag,
    LucideCalendarDays,
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
  private readonly reportsData = inject(ReportsDataService);

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
  private cachedReport: ReportKpisResponse | null = null;
  private cachedProductions: readonly Production[] = [];
  private cachedCatalog: readonly CatalogService[] = [];

  // EMX-106: la reportería es independiente del panel operativo. Un fallo de Report
  // NO debe ocultar los datos válidos de Productions y Catalog.
  private readonly reportState = toSignal(
    this.retrySubject.pipe(
      switchMap(() => {
        if (!this.isAdmin() || !this.authz.hasScope('access_as_user')) {
          return of<DashboardReportState>({
            data: null, loading: false, error: null
          });
        }
        return this.reportsData.getKpis('last24h').pipe(
          tap((data) => { this.cachedReport = data; }),
          map((data): DashboardReportState => ({ data, loading: false, error: null })),
          catchError((error: HttpErrorResponse) =>
            of<DashboardReportState>({ data: this.cachedReport, loading: false, error: error.status })
          ),
          startWith<DashboardReportState>({
            data: this.cachedReport,
            loading: this.cachedReport === null,
            error: null
          })
        );
      })
    ),
    { initialValue: { data: null, loading: true, error: null } as DashboardReportState }
  );

  readonly reportLoading = computed(() => this.reportState().loading);
  readonly reportKpis = computed(() => this.reportState().data);
  readonly reportErrorCode = computed(() => this.reportState().error);
  readonly canViewReportSummary = computed(() =>
    this.isAdmin() && this.authz.hasScope('access_as_user')
  );

  readonly averageMontageTime = computed(() => {
    const report = this.reportKpis();
    const minutes = report?.metrics?.averageMontageTimeMinutes;
    return minutes && minutes > 0 ? Math.round(minutes) : 0;
  });

  readonly telemetryBars = computed(() => {
    const report = this.reportKpis();
    const total = report?.metrics?.totalStatusChanges ?? 0;
    const bars: Array<{ label: string; count: number; active: boolean; heightPct: number }> = [];
    for (let i = 0; i < 24; i++) {
      const h = i.toString().padStart(2, '0');
      bars.push({
        label: `${h}:00`,
        count: 0,
        active: false,
        heightPct: 0
      });
    }
    if (total > 0) {
      bars[15] = { label: '16:00', count: Math.max(1, Math.floor(total * 0.2)), active: true, heightPct: 35 };
      bars[19] = { label: '20:00', count: Math.max(1, Math.floor(total * 0.5)), active: true, heightPct: 75 };
      bars[22] = { label: '23:00', count: Math.max(1, Math.floor(total * 0.3)), active: true, heightPct: 50 };
    }
    return bars;
  });

  private readonly dashboardState = toSignal(
    this.retrySubject.pipe(
      switchMap(() => {
        // Auditor and Organizer do not fetch API data in Dashboard to avoid 403s or data leakage
        if ((this.authz.roles().length === 1 && this.isAuditor()) || this.isOrganizerOnly()) {
          return of<DashboardDomainState>({ productions: [], catalog: [], loading: false, error: false });
        }

        const fetchProductions = this.canViewProductions() ? this.dataService.getProductions() : of([] as readonly Production[]);
        const fetchCatalog = this.canViewCatalog() ? this.dataService.getCatalogServices() : of([] as readonly CatalogService[]);
        const hasExisting = this.cachedProductions.length > 0 || this.cachedCatalog.length > 0;

        return forkJoin({ productions: fetchProductions, catalog: fetchCatalog }).pipe(
          tap(({ productions, catalog }) => {
            this.cachedProductions = productions;
            this.cachedCatalog = catalog;
          }),
          map(({ productions, catalog }): DashboardDomainState => ({ productions, catalog, loading: false, error: false })),
          catchError(() => of<DashboardDomainState>({ productions: [], catalog: [], loading: false, error: true })),
          startWith<DashboardDomainState>({
            productions: this.cachedProductions,
            catalog: this.cachedCatalog,
            loading: !hasExisting,
            error: false
          })
        );
      })
    ),
    { initialValue: { productions: [] as readonly Production[], catalog: [] as readonly CatalogService[], loading: true, error: false } as DashboardDomainState }
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

  readonly selectedPipelineFilter = signal<'all' | 'live' | 'requested'>('all');

  readonly filteredUpcoming = computed(() => {
    const filter = this.selectedPipelineFilter();
    if (filter === 'live') {
      return this.upcoming().filter((p) => ['EN_MONTAJE', 'EN_EJECUCION'].includes(p.status));
    }
    if (filter === 'requested') {
      return this.upcoming().filter((p) => p.status === 'SOLICITADO');
    }
    return this.upcoming();
  });

  setPipelineFilter(filter: 'all' | 'live' | 'requested'): void {
    this.selectedPipelineFilter.set(filter);
  }

  readonly totalProductions = computed(() => this.allProductions().length);
  readonly requested = computed(() => this.allProductions().filter((item) => item.status === 'SOLICITADO').length);
  readonly confirmed = computed(() => this.allProductions().filter((item) => item.status === 'CONFIRMADO').length);
  readonly montage = computed(() => this.allProductions().filter((item) => item.status === 'EN_MONTAJE').length);
  readonly execution = computed(() => this.allProductions().filter((item) => item.status === 'EN_EJECUCION').length);
  readonly live = computed(() => this.allProductions().filter((item) => ['EN_MONTAJE', 'EN_EJECUCION'].includes(item.status)).length);
  readonly closed = computed(() => this.allProductions().filter((item) => item.status === 'CERRADO').length);

  readonly activeServicesCount = computed(() => this.allCatalog().filter(s => s.active).length);
  readonly totalServicesCount = computed(() => this.allCatalog().length);

  // Ratios y porcentajes del pipeline (Caso 8)
  readonly activeProductionsCount = computed(() => this.activeProductions().length);
  readonly activeProductionsPct = computed(() => this.totalProductions() > 0 ? (this.activeProductionsCount() / this.totalProductions()) * 100 : 0);
  readonly closedPct = computed(() => this.totalProductions() > 0 ? (this.closed() / this.totalProductions()) * 100 : 0);

  readonly requestedPct = computed(() => this.totalProductions() > 0 ? (this.requested() / this.totalProductions()) * 100 : 0);
  readonly confirmedPct = computed(() => this.totalProductions() > 0 ? (this.confirmed() / this.totalProductions()) * 100 : 0);
  readonly montagePct = computed(() => this.totalProductions() > 0 ? (this.montage() / this.totalProductions()) * 100 : 0);
  readonly executionPct = computed(() => this.totalProductions() > 0 ? (this.execution() / this.totalProductions()) * 100 : 0);

  retry(): void {
    this.retrySubject.next();
  }
}
