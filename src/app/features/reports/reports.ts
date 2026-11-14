import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, of, timer } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import {
  LucideActivity,
  LucideClock,
  LucideCircleCheck,
  LucideCircleAlert,
  LucideInfo,
  LucideArrowRight,
  LucideCalendar,
  LucideRefreshCw,
} from '@lucide/angular';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { ReportKpisResponse, ReportRange, ReportTopServicesResponse } from './models/report.model';
import { ReportsDataService } from './reports-data.service';
import { StatusDistributionChart } from './status-distribution-chart';
import { DailyEventsChart } from './daily-events-chart';
import { DatePickerPreset, DateRangePickerComponent } from '../../shared/ui/date-picker/date-range-picker.component';
import { ButtonDirective } from '../../shared/ui/button.component';

interface ReportViewState {
  readonly data: ReportKpisResponse | null;
  readonly loading: boolean;
  readonly error: number | null;
}

interface TopServicesViewState {
  readonly data: ReportTopServicesResponse | null;
  readonly loading: boolean;
  readonly error: number | null;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    StatusDistributionChart,
    DailyEventsChart,
    LucideActivity,
    LucideClock,
    LucideCircleCheck,
    LucideCircleAlert,
    LucideInfo,
    LucideArrowRight,
    LucideCalendar,
    LucideRefreshCw,
    DateRangePickerComponent,
    ButtonDirective,
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reports {
  private readonly authz = inject(AuthorizationService);
  private readonly reports = inject(ReportsDataService);

  readonly canView = computed(() => this.authz.hasRole(AppRole.Admin) && this.authz.hasScope('access_as_user'));
  readonly reportPresets: readonly DatePickerPreset[] = [
    { id: 'last24h', label: 'Últimas 24 horas' },
    { id: 'last7d', label: 'Últimos 7 días' },
  ];
  readonly rangeControl = new FormControl<ReportRange>('last24h', { nonNullable: true });
  private readonly refreshSubject = new BehaviorSubject<void>(undefined);

  onRangePicked(preset: string): void {
    if (preset === 'last24h' || preset === 'last7d') {
      this.rangeControl.setValue(preset);
    }
  }

  private readonly reportState = toSignal(
    combineLatest([
      this.rangeControl.valueChanges.pipe(startWith(this.rangeControl.value)),
      this.refreshSubject,
    ]).pipe(
      switchMap(([range]) => {
        if (!this.canView()) {
          return of<ReportViewState>({ data: null, loading: false, error: 403 });
        }
        return this.reports.getKpis(range).pipe(
          map((data): ReportViewState => ({ data, loading: false, error: null })),
          catchError((error: HttpErrorResponse) =>
            of<ReportViewState>({ data: null, loading: false, error: error.status })
          ),
          startWith<ReportViewState>({ data: null, loading: true, error: null }),
        );
      })
    ),
    { initialValue: { data: null, loading: true, error: null } as ReportViewState }
  );

  private readonly topServicesState = toSignal(
    combineLatest([
      this.rangeControl.valueChanges.pipe(startWith(this.rangeControl.value)),
      this.refreshSubject,
    ]).pipe(
      switchMap(([range]) => {
        if (!this.canView()) {
          return of<TopServicesViewState>({ data: null, loading: false, error: 403 });
        }
        return this.reports.getTopServices(range).pipe(
          map((data): TopServicesViewState => ({ data, loading: false, error: null })),
          catchError((error: HttpErrorResponse) =>
            of<TopServicesViewState>({ data: null, loading: false, error: error.status })
          ),
          startWith<TopServicesViewState>({ data: null, loading: true, error: null }),
        );
      })
    ),
    { initialValue: { data: null, loading: true, error: null } as TopServicesViewState }
  );

  readonly isLoading = computed(() => this.reportState().loading);
  readonly response = computed(() => this.reportState().data);
  readonly errorCode = computed(() => this.reportState().error);

  readonly isLoadingTopServices = computed(() => this.topServicesState().loading);
  readonly topServicesResponse = computed(() => this.topServicesState().data);
  readonly topServicesError = computed(() => this.topServicesState().error);
  readonly topServicesItems = computed(() => this.topServicesResponse()?.items ?? []);

  readonly statusBars = computed(() => {
    const distribution = this.response()?.metrics.currentStatusDistribution ?? {};
    const rows = Object.entries(distribution)
      .map(([status, count]) => ({
        status,
        count: Number(count),
      }))
      .filter((item) => item.count > 0);
    const maximum = Math.max(1, ...rows.map((item) => item.count));
    return rows.sort((a, b) => b.count - a.count).map((item) => ({
      ...item,
      percent: Math.round((item.count / maximum) * 100),
    }));
  });

  readonly transitions = computed(() => this.response()?.metrics.transitions ?? []);

  readonly averageMontageTime = computed(() => {
    const val = this.response()?.metrics.averageMontageTimeMinutes;
    if (val === undefined || val === null || val <= 0) return 0;
    return Math.round(val * 10) / 10;
  });

  readonly eventsPerDay = computed(() => this.response()?.metrics.eventsPerDay ?? []);

  readonly maxServiceHires = computed(() => {
    const items = this.topServicesItems();
    return Math.max(1, ...items.map((i) => i.hireCount));
  });

  calcServicePercent(hires: number): number {
    const max = this.maxServiceHires();
    return Math.round((hires / max) * 100);
  }

  readonly operationalSuccessRate = computed(() => {
    const closed = this.response()?.metrics.closedCount ?? 0;
    const cancelled = this.response()?.metrics.cancelledCount ?? 0;
    const total = closed + cancelled;
    if (total === 0) return 100;
    return Math.round((closed / total) * 100);
  });

  formatStatus(status: string): string {
    switch (status) {
      case 'SOLICITADO': return 'Solicitado';
      case 'CONFIRMADO': return 'Confirmado';
      case 'EN_MONTAJE': return 'En montaje';
      case 'EN_EJECUCION': return 'En ejecución';
      case 'CERRADO': return 'Cerrado';
      case 'CANCELADO': return 'Cancelado';
      default: return status;
    }
  }

  errorText(code: number | null): string {
    if (code === 401) return 'La sesión expiró o el token fue rechazado. Inicia sesión nuevamente.';
    if (code === 403) return 'Se requiere el rol Admin y el permiso access_as_user para ver este reporte.';
    if (code === 404) return 'El servicio de analítica no se encuentra disponible en este momento.';
    if (code === 0 || code === 502 || code === 503) return 'Report no está disponible. Revisa la conectividad cloud.';
    return 'No fue posible cargar la información. Intenta nuevamente.';
  }

  retry(): void {
    this.refreshSubject.next();
  }
}
