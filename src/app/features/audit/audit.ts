import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, of } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { AuditDataService } from './audit-data.service';
import { AuditEvent, AuditTimelineFilters } from './models/audit-event.model';

interface AuditViewState {
  readonly items: readonly AuditEvent[];
  readonly loading: boolean;
  readonly error: number | null;
}

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './audit.html',
  styleUrl: './audit.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Audit {
  private readonly authz = inject(AuthorizationService);
  private readonly api = inject(AuditDataService);
  readonly pageSize = 25;
  readonly canView = computed(() =>
    this.authz.hasAnyRole([AppRole.Admin, AppRole.Auditor]) &&
    this.authz.hasScope('access_as_user')
  );

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

  readonly filtersForm = new FormGroup({
    actor: new FormControl('', { nonNullable: true }),
    type: new FormControl('', { nonNullable: true }),
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
  });
  readonly filterError = signal('');
  readonly page = signal(0);
  private readonly querySubject = new BehaviorSubject<AuditTimelineFilters>({ page: 0, size: this.pageSize });

  private readonly timelineState = toSignal(
    this.querySubject.pipe(
      switchMap((filters) => {
        if (!this.canView()) {
          return of<AuditViewState>({ items: [], loading: false, error: 403 });
        }
        return this.api.getTimeline(filters).pipe(
          map((items): AuditViewState => ({ items, loading: false, error: null })),
          catchError((error: HttpErrorResponse) =>
            of<AuditViewState>({ items: [], loading: false, error: error.status })
          ),
          startWith<AuditViewState>({ items: [], loading: true, error: null }),
        );
      })
    ),
    { initialValue: { items: [], loading: true, error: null } as AuditViewState }
  );

  readonly items = computed(() => this.timelineState().items);
  readonly isLoading = computed(() => this.timelineState().loading);
  readonly errorCode = computed(() => this.timelineState().error);
  /** El backend solo devuelve un array; no hay total de páginas ni cursores. */
  readonly canAdvance = computed(() => !this.isLoading() && this.items().length === this.pageSize);

  /** Inputs datetime-local representan hora local del navegador: serializar como UTC SIN Z para el contrato Audit. */
  private toAuditUtc(input: string): string | undefined {
    if (!input) return undefined;
    const date = new Date(input);
    return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 19) : undefined;
  }

  applyFilters(): void {
    if (!this.canView()) return;
    const { actor, type, from, to } = this.filtersForm.getRawValue();
    const utcFrom = this.toAuditUtc(from);
    const utcTo = this.toAuditUtc(to);
    if ((from && !utcFrom) || (to && !utcTo) ||
        (utcFrom && utcTo && utcFrom > utcTo)) {
      this.filterError.set('Revisa el intervalo: la fecha inicial debe ser anterior o igual a la fecha final.');
      return;
    }
    this.filterError.set('');
    this.page.set(0);
    this.querySubject.next({
      actor: actor.trim() || undefined,
      type: type.trim() || undefined,
      from: utcFrom,
      to: utcTo,
      page: 0,
      size: this.pageSize
    });
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.filterError.set('');
    this.page.set(0);
    this.querySubject.next({ page: 0, size: this.pageSize });
  }

  nextPage(): void {
    if (!this.canAdvance() || this.isLoading()) return;
    this.page.update((value) => value + 1);
    this.querySubject.next({ ...this.querySubject.value, page: this.page() });
  }

  previousPage(): void {
    if (this.page() === 0 || this.isLoading()) return;
    this.page.update((value) => value - 1);
    this.querySubject.next({ ...this.querySubject.value, page: this.page() });
  }

  retry(): void {
    this.querySubject.next({ ...this.querySubject.value });
  }

  /** Audit define timestamp ISO sin offset, cuyo valor representa UTC. */
  timestampUtc(value: string): string {
    return /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
  }

  errorText(status: number | null): string {
    if (status === 401) return 'La sesión no es válida. Inicia sesión nuevamente.';
    if (status === 403) return 'Necesitas rol Admin/Auditor y el permiso access_as_user.';
    if (status === 400) return 'El backend rechazó los filtros; revisa las fechas y los parámetros.';
    if (status === 404) return 'La ruta /api/audit/timeline aún no está habilitada en API Gateway o BFF.';
    if (status === 0 || status === 502 || status === 503) return 'Audit no está disponible en cloud.';
    return 'No fue posible obtener la auditoría. Inténtalo nuevamente.';
  }
}
