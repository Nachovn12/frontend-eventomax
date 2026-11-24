import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, merge, of, timer } from 'rxjs';
import { catchError, map, startWith, switchMap, tap } from 'rxjs/operators';
import { DEFAULT_POLL_INTERVAL_MS } from '../../core/utils/live-polling';
import {
  AuditTimestampChile,
  chileLocalInputToAuditUtc,
  formatAuditTimestampChile,
  formatCalendarRangeToChileDatetimeLocal,
  formatInstantToChileDatetimeLocal,
  getChileMonthStartDatetimeLocal,
} from '../../core/utils/chile-time';
import {
  LucideActivity,
  LucideCircleCheck,
  LucideCircleAlert,
  LucideLayers,
  LucideUser,
  LucideArrowRight,
  LucideCopy,
  LucideCheck,
  LucideFilter,
  LucideShieldCheck,
  LucideRefreshCw,
  LucideChevronDown,
} from '@lucide/angular';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { AuditDataService } from './audit-data.service';
import { AuditEvent, AuditTimelineFilters } from './models/audit-event.model';
import { DatePickerPreset, DateRangePickerComponent } from '../../shared/ui/date-picker/date-range-picker.component';
import { ButtonDirective } from '../../shared/ui/button.component';

export interface DecodedAuditDetails {
  productionId?: number | string;
  productionName?: string;
  organizerId?: string;
  previousStatus?: string;
  newStatus?: string;
  status?: string;
  scheduledAt?: string;
  location?: string;
  occurredAt?: string;
  crewId?: string;
  crewName?: string;
  [key: string]: unknown;
}

interface AuditViewState {
  readonly items: readonly AuditEvent[];
  readonly loading: boolean;
  readonly error: number | null;
}

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DateRangePickerComponent,
    LucideActivity,
    LucideCircleCheck,
    LucideCircleAlert,
    LucideLayers,
    LucideUser,
    LucideArrowRight,
    LucideCopy,
    LucideCheck,
    LucideFilter,
    LucideShieldCheck,
    LucideRefreshCw,
    LucideChevronDown,
    ButtonDirective,
  ],
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
  readonly auditRangePreset = signal<string>('all');
  readonly filterError = signal('');
  readonly page = signal(0);
  readonly copiedKey = signal<string | null>(null);
  readonly expandedEventIds = signal<ReadonlySet<string>>(new Set());

  readonly auditPresets: readonly DatePickerPreset[] = [
    { id: 'all', label: 'Cualquier fecha' },
    { id: 'last24h', label: 'Últimas 24 horas' },
    { id: 'last7d', label: 'Últimos 7 días' },
    { id: 'last30d', label: 'Últimos 30 días' },
    { id: 'thisMonth', label: 'Este mes' },
  ];

  private readonly querySubject = new BehaviorSubject<AuditTimelineFilters>({ page: 0, size: this.pageSize });
  private cachedItems: readonly AuditEvent[] = [];

  private readonly timelineState = toSignal(
    merge(
      this.querySubject.pipe(map((filters) => ({ filters, isBackground: false }))),
      timer(DEFAULT_POLL_INTERVAL_MS, DEFAULT_POLL_INTERVAL_MS).pipe(
        map(() => ({ filters: this.querySubject.value, isBackground: true }))
      ),
    ).pipe(
      switchMap(({ filters, isBackground }) => {
        if (!this.canView()) {
          return of<AuditViewState>({ items: [], loading: false, error: 403 });
        }
        const hasCache = this.cachedItems.length > 0;
        return this.api.getTimeline(filters).pipe(
          tap((items) => {
            this.cachedItems = items;
            this.pruneExpandedEventIds(items);
          }),
          map((items): AuditViewState => ({ items, loading: false, error: null })),
          catchError((error: HttpErrorResponse) => {
            this.cachedItems = [];
            this.clearExpandedEventIds();
            return of<AuditViewState>({ items: [], loading: false, error: error.status });
          }),
          startWith<AuditViewState>({
            items: isBackground ? this.cachedItems : [],
            loading: !(isBackground && hasCache),
            error: null,
          }),
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

  readonly totalEventsCount = computed(() => this.items().length);

  readonly uniqueActorsCount = computed(() => {
    const actors = new Set(this.items().map(i => i.actor).filter(Boolean));
    return actors.size;
  });

  readonly traceIntegrityPercent = computed(() => {
    const list = this.items();
    if (!list.length) return 100;
    const ok = list.filter(i => i.traceId && i.eventId).length;
    return Math.round((ok / list.length) * 100);
  });

  parseDetails(details: string | null | undefined): DecodedAuditDetails | null {
    if (!details) return null;
    try {
      return JSON.parse(details) as DecodedAuditDetails;
    } catch {
      return null;
    }
  }

  formatJson(details: string | null | undefined): string {
    if (!details) return '';
    try {
      return JSON.stringify(JSON.parse(details), null, 2);
    } catch {
      return details;
    }
  }

  formatStatus(status: string | undefined): string {
    if (!status) return '';
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

  private static readonly CANONICAL_TID_OID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  private static readonly UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  private static readonly OPAQUE_SUB_PATTERN =
    /^(?:(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z0-9_-]{22,}|[A-Za-z0-9_-]{32,})$/;
  private static readonly DELIVERABLE_EMAIL_PATTERN =
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  isTechnicalActorId(actor: string | null | undefined): boolean {
    const value = actor?.trim();
    if (!value) return false;
    return (
      Audit.CANONICAL_TID_OID_PATTERN.test(value) ||
      Audit.UUID_PATTERN.test(value) ||
      Audit.OPAQUE_SUB_PATTERN.test(value)
    );
  }

  formatActorLabel(item: AuditEvent): string {
    const displayName = item.actorDisplayName?.trim();
    if (displayName) return displayName;
    if (item.actorResolutionSource === 'SYSTEM') return 'Sistema';
    const rawActor = item.actor?.trim();
    if (!rawActor) return 'No informado';
    if (rawActor.toLowerCase() === 'system') return 'Sistema';
    if (item.actorResolutionSource === 'UNRESOLVED' || this.isTechnicalActorId(rawActor)) {
      return 'Usuario autenticado';
    }
    return rawActor;
  }

  formatActorEmail(item: AuditEvent): string | null {
    const email = item.actorEmail?.trim();
    if (!email || email.toUpperCase().includes('#EXT#')) {
      return null;
    }
    return Audit.DELIVERABLE_EMAIL_PATTERN.test(email) ? email : null;
  }

  formatResolutionSource(item: AuditEvent): string | null {
    switch (item.actorResolutionSource) {
      case 'EVENT':
        return 'Nombre registrado en el evento';
      case 'ENTRA_DIRECTORY':
        return 'Directorio Microsoft Entra ID (datos actuales)';
      case 'VERIFIED_SUB_TO_ENTRA_DIRECTORY':
        return 'Identidad histórica vinculada mediante asociación verificada';
      case 'SYSTEM':
        return 'Sistema';
      case 'LEGACY':
        return 'Identificador histórico legible';
      case 'UNRESOLVED':
        return 'Identidad no resuelta';
      default:
        return null;
    }
  }

  actorInitial(item: AuditEvent): string {
    const label = this.formatActorLabel(item);
    return label.charAt(0).toUpperCase() || '?';
  }

  hasExpandableDetails(item: AuditEvent): boolean {
    return Boolean(item.details?.trim() || item.actor?.trim() || item.actorResolutionSource);
  }

  formatEventType(type: string): string {
    switch (type) {
      case 'ProductionCreated': return 'Creación de Producción';
      case 'ProductionStatusChanged': return 'Cambio de Estado';
      default: return type;
    }
  }

  copyText(text: string | null | undefined, key: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (!text) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.copiedKey.set(key);
        setTimeout(() => {
          if (this.copiedKey() === key) {
            this.copiedKey.set(null);
          }
        }, 2000);
      }).catch(() => {});
    }
  }

  isCopied(key: string): boolean {
    return this.copiedKey() === key;
  }

  detailsPanelId(eventId: string): string {
    return `audit-details-panel-${eventId.replace(/[^A-Za-z0-9_-]/g, '_')}`;
  }

  isDetailsExpanded(eventId: string): boolean {
    return this.expandedEventIds().has(eventId);
  }

  toggleDetails(eventId: string): void {
    this.expandedEventIds.update((current) => {
      const next = new Set(current);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }

  private pruneExpandedEventIds(items: readonly AuditEvent[]): void {
    const current = this.expandedEventIds();
    if (current.size === 0) return;
    const visibleIds = new Set(items.map((item) => item.eventId));
    let changed = false;
    const pruned = new Set<string>();
    for (const id of current) {
      if (visibleIds.has(id)) {
        pruned.add(id);
      } else {
        changed = true;
      }
    }
    if (changed) {
      this.expandedEventIds.set(pruned);
    }
  }

  private clearExpandedEventIds(): void {
    if (this.expandedEventIds().size > 0) {
      this.expandedEventIds.set(new Set());
    }
  }

  /** Inputs datetime-local representan hora de Chile continental (America/Santiago): serializar como UTC SIN Z para el contrato Audit. */
  private toAuditUtc(input: string): string | undefined {
    return chileLocalInputToAuditUtc(input);
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
    this.clearExpandedEventIds();
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
    this.auditRangePreset.set('all');
    this.filterError.set('');
    this.page.set(0);
    this.clearExpandedEventIds();
    this.querySubject.next({ page: 0, size: this.pageSize });
  }

  onAuditRangePicked(preset: string): void {
    this.auditRangePreset.set(preset);
    const now = new Date();
    if (preset === 'all') {
      this.filtersForm.patchValue({ from: '', to: '' });
      return;
    }
    if (preset === 'last24h') {
      const from = new Date(now.getTime() - 86400000);
      this.filtersForm.patchValue({
        from: formatInstantToChileDatetimeLocal(from),
        to: formatInstantToChileDatetimeLocal(now),
      });
    } else if (preset === 'last7d') {
      const from = new Date(now.getTime() - 7 * 86400000);
      this.filtersForm.patchValue({
        from: formatInstantToChileDatetimeLocal(from),
        to: formatInstantToChileDatetimeLocal(now),
      });
    } else if (preset === 'last30d') {
      const from = new Date(now.getTime() - 30 * 86400000);
      this.filtersForm.patchValue({
        from: formatInstantToChileDatetimeLocal(from),
        to: formatInstantToChileDatetimeLocal(now),
      });
    } else if (preset === 'thisMonth') {
      this.filtersForm.patchValue({
        from: getChileMonthStartDatetimeLocal(now),
        to: formatInstantToChileDatetimeLocal(now),
      });
    }
  }

  onAuditRangeChange(range: { start: Date; end: Date }): void {
    this.auditRangePreset.set('custom');
    const bounds = formatCalendarRangeToChileDatetimeLocal(range.start, range.end);
    this.filtersForm.patchValue({
      from: bounds.from,
      to: bounds.to,
    });
  }

  nextPage(): void {
    if (!this.canAdvance() || this.isLoading()) return;
    this.page.update((value) => value + 1);
    this.clearExpandedEventIds();
    this.querySubject.next({ ...this.querySubject.value, page: this.page() });
  }

  previousPage(): void {
    if (this.page() === 0 || this.isLoading()) return;
    this.page.update((value) => value - 1);
    this.clearExpandedEventIds();
    this.querySubject.next({ ...this.querySubject.value, page: this.page() });
  }

  retry(): void {
    this.querySubject.next({ ...this.querySubject.value });
  }

  /** Audit define timestamp ISO sin offset, cuyo valor representa UTC. */
  timestampUtc(value: string): string {
    return /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
  }

  /** Presentación estándar de Chile continental (America/Santiago, es-CL, 24h, CLST/CLT dinámico). */
  formatTimestampChile(value: string): AuditTimestampChile {
    return formatAuditTimestampChile(value);
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
