import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, of } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { ReportKpisResponse, ReportRange } from './models/report.model';
import { ReportsDataService } from './reports-data.service';

interface ReportViewState {
  readonly data: ReportKpisResponse | null;
  readonly loading: boolean;
  readonly error: number | null;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reports {
  private readonly authz = inject(AuthorizationService);
  private readonly reports = inject(ReportsDataService);
  readonly canView = computed(() => this.authz.hasRole(AppRole.Admin) && this.authz.hasScope('access_as_user'));
  readonly rangeControl = new FormControl<ReportRange>('last24h', { nonNullable: true });
  private readonly refreshSubject = new BehaviorSubject<void>(undefined);

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

  readonly isLoading = computed(() => this.reportState().loading);
  readonly response = computed(() => this.reportState().data);
  readonly errorCode = computed(() => this.reportState().error);
  readonly statusBars = computed(() => {
    const distribution = this.response()?.metrics.currentStatusDistribution ?? {};
    const rows = Object.entries(distribution).map(([status, count]) => ({
      status,
      count: Number(count),
    }));
    const maximum = Math.max(1, ...rows.map((item) => item.count));
    return rows.sort((a, b) => b.count - a.count).map((item) => ({
      ...item,
      percent: Math.round((item.count / maximum) * 100),
    }));
  });

  readonly transitions = computed(() => this.response()?.metrics.transitions ?? []);

  errorText(code: number | null): string {
    if (code === 401) return 'La sesión expiró o el token fue rechazado. Inicia sesión nuevamente.';
    if (code === 403) return 'Se requiere el rol Admin y el permiso access_as_user para ver este reporte.';
    if (code === 404) return 'La ruta de Report todavía no está configurada en API Gateway o BFF.';
    if (code === 0 || code === 502 || code === 503) return 'Report no está disponible. Revisa la conectividad cloud.';
    return 'No fue posible cargar los KPIs. Intenta nuevamente.';
  }

  retry(): void {
    this.refreshSubject.next();
  }
}
