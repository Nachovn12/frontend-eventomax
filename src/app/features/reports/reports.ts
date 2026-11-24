import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, of } from 'rxjs';
import { catchError, map, startWith, switchMap, tap } from 'rxjs/operators';
import {
  OperationalTimestampChile,
  formatOperationalTimestampChile,
  getChileDateTimeParts,
  parseServerTimestampAsUtc,
} from '../../core/utils/chile-time';
import {
  LucideActivity,
  LucideBan,
  LucideClock,
  LucideCircleCheck,
  LucideCircleAlert,
  LucideInfo,
  LucideArrowRight,
  LucideCalendarDays,
  LucideRefreshCw,
} from '@lucide/angular';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { ReportKpisResponse, ReportRange, ReportTopServicesResponse } from './models/report.model';
import { ReportsDataService } from './reports-data.service';
import { StatusDistributionChart } from './status-distribution-chart';
import { DailyEventsChart } from './daily-events-chart';
import { KafkaMonitorComponent } from './kafka-monitor/kafka-monitor';
import { withLivePolling } from '../../core/utils/live-polling';
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
    ReactiveFormsModule,
    StatusDistributionChart,
    DailyEventsChart,
    KafkaMonitorComponent,
    LucideActivity,
    LucideBan,
    LucideClock,
    LucideCircleCheck,
    LucideCircleAlert,
    LucideInfo,
    LucideArrowRight,
    LucideCalendarDays,
    LucideRefreshCw,
    DateRangePickerComponent,
    ButtonDirective,
  ],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css', './reports-page.css'],
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
  private cachedKpis: ReportKpisResponse | null = null;
  private cachedTopServices: ReportTopServicesResponse | null = null;
  private lastKpisRange: ReportRange | null = null;
  private lastTopServicesRange: ReportRange | null = null;

  onRangePicked(preset: string): void {
    if (preset === 'last24h' || preset === 'last7d') {
      this.rangeControl.setValue(preset);
    }
  }

  private readonly reportState = toSignal(
    combineLatest([
      this.rangeControl.valueChanges.pipe(startWith(this.rangeControl.value)),
      withLivePolling(this.refreshSubject),
    ]).pipe(
      switchMap(([range, isBackground]) => {
        if (!this.canView()) {
          return of<ReportViewState>({ data: null, loading: false, error: 403 });
        }
        const rangeChanged = this.lastKpisRange !== range;
        if (rangeChanged) {
          this.cachedKpis = null;
          this.lastKpisRange = range;
        }
        const hasCache = this.cachedKpis !== null;
        return this.reports.getKpis(range).pipe(
          tap((data) => { this.cachedKpis = data; }),
          map((data): ReportViewState => ({ data, loading: false, error: null })),
          catchError((error: HttpErrorResponse) =>
            of<ReportViewState>({ data: isBackground ? this.cachedKpis : null, loading: false, error: error.status })
          ),
          startWith<ReportViewState>({
            data: isBackground ? this.cachedKpis : null,
            loading: !(isBackground && hasCache),
            error: null,
          }),
        );
      })
    ),
    { initialValue: { data: null, loading: true, error: null } as ReportViewState }
  );

  private readonly topServicesState = toSignal(
    combineLatest([
      this.rangeControl.valueChanges.pipe(startWith(this.rangeControl.value)),
      withLivePolling(this.refreshSubject),
    ]).pipe(
      switchMap(([range, isBackground]) => {
        if (!this.canView()) {
          return of<TopServicesViewState>({ data: null, loading: false, error: 403 });
        }
        const rangeChanged = this.lastTopServicesRange !== range;
        if (rangeChanged) {
          this.cachedTopServices = null;
          this.lastTopServicesRange = range;
        }
        const hasCache = this.cachedTopServices !== null;
        return this.reports.getTopServices(range).pipe(
          tap((data) => { this.cachedTopServices = data; }),
          map((data): TopServicesViewState => ({ data, loading: false, error: null })),
          catchError((error: HttpErrorResponse) =>
            of<TopServicesViewState>({ data: isBackground ? this.cachedTopServices : null, loading: false, error: error.status })
          ),
          startWith<TopServicesViewState>({
            data: isBackground ? this.cachedTopServices : null,
            loading: !(isBackground && hasCache),
            error: null,
          }),
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

  readonly montageTransitionsCount = computed(() => {
    return this.transitions()
      .filter((t) => t.previousStatus === 'EN_MONTAJE' && t.newStatus === 'EN_EJECUCION')
      .reduce((acc, t) => acc + t.count, 0);
  });

  readonly averageMontageTime = computed(() => {
    const val = this.response()?.metrics.averageMontageTimeMinutes;
    if (val === undefined || val === null || val <= 0) return 0;
    return Math.round(val * 10) / 10;
  });

  readonly averageMontageLabel = computed(() => {
    const avg = this.averageMontageTime();
    if (avg > 0) {
      const formatted = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(avg);
      return `${formatted} min`;
    }
    if (this.montageTransitionsCount() > 0) return '< 1 min';
    return '0 min';
  });

  readonly eventsPerDay = computed(() => {
    const res = this.response();
    const raw = res?.metrics.eventsPerDay ?? [];
    if (raw.length > 0) return raw;
    const total = res?.metrics.totalStatusChanges ?? 0;
    if (total > 0) {
      const refInstant = parseServerTimestampAsUtc(res?.to || res?.generatedAt);
      const fallbackDate = refInstant
        ? getChileDateTimeParts(refInstant).dateKey
        : (res?.to || res?.generatedAt || '').slice(0, 10) || 'Período actual';
      return [{ date: fallbackDate, count: total }];
    }
    return [];
  });

  readonly totalDailyEvents = computed(() =>
    this.eventsPerDay().reduce((acc, item) => acc + item.count, 0)
  );

  readonly peakDailyEvent = computed(() =>
    this.eventsPerDay().reduce(
      (peak, item) => (item.count > peak.count ? item : peak),
      { date: '—', count: 0 }
    )
  );

  readonly totalObservedProductions = computed(() =>
    this.statusBars().reduce((acc, item) => acc + item.count, 0)
  );

  readonly totalServiceHires = computed(() =>
    this.topServicesItems().reduce((acc, item) => acc + item.hireCount, 0)
  );

  readonly maxServiceHires = computed(() => {
    const items = this.topServicesItems();
    return Math.max(1, ...items.map((i) => i.hireCount));
  });

  readonly topServiceLeaders = computed(() => {
    const items = this.topServicesItems();
    if (items.length === 0) return [];
    const max = this.maxServiceHires();
    return items.filter((item) => item.hireCount === max);
  });

  readonly hasTopServiceTie = computed(() => this.topServiceLeaders().length > 1);

  calcServicePercent(hires: number): number {
    const total = this.totalServiceHires();
    if (total <= 0) return 0;
    return Math.round((hires / total) * 100);
  }

  calcServiceBarWidth(hires: number): number {
    const max = this.maxServiceHires();
    return Math.round((hires / max) * 100);
  }

  calcTransitionPercent(count: number): number {
    const total = this.response()?.metrics.totalStatusChanges ?? 0;
    if (total <= 0) return 0;
    return Math.round((count / total) * 100);
  }

  selectRange(range: ReportRange): void {
    if (this.rangeControl.value !== range) {
      this.rangeControl.setValue(range);
    }
  }

  readonly terminalTransitionsTotal = computed(() => {
    const closed = this.response()?.metrics.closedCount ?? 0;
    const cancelled = this.response()?.metrics.cancelledCount ?? 0;
    return closed + cancelled;
  });

  readonly operationalSuccessRate = computed(() => {
    const closed = this.response()?.metrics.closedCount ?? 0;
    const total = this.terminalTransitionsTotal();
    if (total === 0) return 100;
    return Math.round((closed / total) * 100);
  });

  readonly cancelledTerminalRate = computed(() => {
    const cancelled = this.response()?.metrics.cancelledCount ?? 0;
    const total = this.terminalTransitionsTotal();
    if (total === 0) return 0;
    return Math.round((cancelled / total) * 100);
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

  formatReportTimestamp(iso: string | null | undefined): OperationalTimestampChile {
    return formatOperationalTimestampChile(iso);
  }

  retry(): void {
    this.refreshSubject.next();
  }
}
