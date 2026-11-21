import { Component, ChangeDetectionStrategy, DestroyRef, OnDestroy, OnInit, computed, signal, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { switchMap, map, catchError, startWith, distinctUntilChanged } from 'rxjs/operators';
import {
  LucideCalendarDays,
  LucideClock3,
  LucideCircleCheck,
  LucideSearch,
  LucideSearchX,
  LucideCalendarX2,
  LucideCircleAlert,
  LucideX,
  LucideArrowRight,
  LucideChevronDown,
  LucideMapPin,
  LucideBuilding2,
  LucideUsers,
  LucideTicket,
  LucideDownload
} from '@lucide/angular';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import {
  Production,
  ProductionStatus,
  ProductionReservationItemRequest,
  CrewTicket,
  OrganizerContact,
  OrganizerContactRequest,
} from '../../core/models/production.model';
import { ProductionTable } from '../../shared/ui/production-table';
import { StatusChip } from '../../shared/ui/status-chip';
import { Tag } from '../../shared/ui/status-pill/status-pill';
import { ButtonDirective } from '../../shared/ui/button.component';
import { ProductionsDataService } from './productions-data.service';
import { CatalogDataService } from '../catalog/catalog-data.service';
import { Equipment, EquipmentReservationItem } from '../catalog/models/equipment.model';
import { CatalogService } from '../catalog/models/catalog-service.model';
import {
  removeExistingCrewTicketPrintFrame,
  triggerCrewTicketSinglePagePrint,
} from './crew-ticket-print';

@Component({
  selector: 'app-productions',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    ProductionTable,
    StatusChip,
    Tag,
    ButtonDirective,
    LucideCalendarDays,
    LucideClock3,
    LucideCircleCheck,
    LucideSearch,
    LucideSearchX,
    LucideCalendarX2,
    LucideCircleAlert,
    LucideX,
    LucideArrowRight,
    LucideChevronDown,
    LucideMapPin,
    LucideBuilding2,
    LucideUsers,
    LucideTicket,
    LucideDownload
  ],
  templateUrl: './productions.html',
  styleUrls: ['./productions.css', './crew-ticket-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Productions implements OnInit, OnDestroy {
  private readonly dataService = inject(ProductionsDataService);
  private readonly catalogDataService = inject(CatalogDataService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private lastDeepLinkedProductionId: number | null = null;

  readonly statuses = toSignal(this.dataService.getStatuses(), { initialValue: [] });

  private readonly retrySubject = new BehaviorSubject<void>(undefined);

  private readonly productionsState = toSignal(
    this.retrySubject.pipe(
      switchMap(() => this.dataService.getProductions().pipe(
        map((data) => ({ data, loading: false, error: false })),
        catchError(() => of({ data: [], loading: false, error: true })),
        startWith({ data: [], loading: true, error: false })
      ))
    ),
    { initialValue: { data: [], loading: true, error: false } }
  );

  readonly isLoading = computed(() => this.productionsState().loading);
  readonly isError = computed(() => this.productionsState().error);
  private readonly allProductions = computed(() => this.productionsState().data);

  readonly search = new FormControl('', { nonNullable: true });
  readonly status = new FormControl<ProductionStatus | ''>('', { nonNullable: true });

  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  private readonly selectedStatus = toSignal(this.status.valueChanges, { initialValue: '' });

  readonly hasActiveFilters = computed(() => this.query().trim() !== '' || this.selectedStatus() !== '');

  readonly announcement = signal('');

  readonly rows = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('es');
    const filtered = this.allProductions().filter(
      (item) =>
        (!this.selectedStatus() || item.status === this.selectedStatus()) &&
        [String(item.id), item.name, item.location, item.organizerId].some((value) =>
          value.toLocaleLowerCase('es').includes(query),
        ),
    );
    return [...filtered].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  });

  readonly total = computed(() => this.allProductions().length);
  readonly active = computed(() => this.allProductions().filter((item) =>
    ['EN_MONTAJE', 'EN_EJECUCION'].includes(item.status),
  ).length);
  readonly pending = computed(() => this.allProductions().filter((item) => item.status === 'SOLICITADO').length);
  readonly closed = computed(() => this.allProductions().filter((item) => item.status === 'CERRADO').length);

  readonly activePct = computed(() => {
    const t = this.total();
    return t > 0 ? Math.round((this.active() / t) * 100) : 0;
  });
  readonly closedPct = computed(() => {
    const t = this.total();
    return t > 0 ? Math.round((this.closed() / t) * 100) : 0;
  });
  readonly pendingPct = computed(() => {
    const t = this.total();
    return t > 0 ? Math.round((this.pending() / t) * 100) : 0;
  });

  private readonly authz = inject(AuthorizationService);
  readonly canCreate = computed(() => this.authz.hasAnyRole([AppRole.Productor, AppRole.Organizador]) && this.authz.hasScope('access_as_user'));
  readonly canUpdate = computed(() => this.authz.hasAnyRole([AppRole.Admin, AppRole.Productor]) && this.authz.hasScope('access_as_user'));
  readonly canViewCrewTicket = computed(() => this.authz.hasAnyRole([AppRole.Admin, AppRole.Productor]) && this.authz.hasScope('access_as_user'));
  readonly canDownloadQuote = computed(() => this.authz.hasAnyRole([AppRole.Admin, AppRole.Productor, AppRole.Organizador]) && this.authz.hasScope('access_as_user'));
  readonly isOrganizerOnly = computed(() => this.authz.hasAnyRole([AppRole.Organizador]) && !this.authz.hasAnyRole([AppRole.Admin, AppRole.Productor]));
  readonly currentOwnerId = computed(() => (typeof this.authz.ownerId === 'function' ? this.authz.ownerId() : ''));
  readonly suggestedEmail = computed(() => (typeof this.authz.userEmail === 'function' ? this.authz.userEmail() : ''));
  readonly suggestedDisplayName = computed(() => (typeof this.authz.userDisplayName === 'function' ? this.authz.userDisplayName() : ''));

  // Self organizer contact (Organizador)
  readonly selfContact = signal<OrganizerContact | null>(null);
  readonly selfContactLoading = signal(false);
  readonly selfContactMissing = signal(false);
  readonly selfContactError = signal<string | null>(null);
  readonly selfContactSuccess = signal<string | null>(null);
  readonly showSelfContactForm = signal(false);
  readonly selfContactSaving = signal(false);
  readonly selfContactForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(255)] }),
    contactName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(150)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
  });

  // Passive read-only organizer contact check in Create Production modal (Productor)
  readonly createContactStatus = signal<'idle' | 'loading' | 'found' | 'missing' | 'error'>('idle');
  readonly createContactEmail = signal('');
  readonly createContactMessage = signal('');
  private readonly createContactLookup$ = new Subject<string | null>();

  // Passive non-blocking notice before CONFIRMADO transition if organizer lacks registered contact
  readonly confirmContactMissing = signal(false);
  private readonly confirmContactLookup$ = new Subject<string | null>();
  readonly showCreate = signal(false);
  readonly createSubmitted = signal(false);
  readonly saving = signal(false);
  readonly operationError = signal('');
  readonly operationSuccess = signal('');
  readonly detail = signal<Production | null>(null);
  readonly detailLoading = signal(false);
  readonly selectedProductionId = computed(() => this.detail()?.id ?? null);
  readonly detailId = new FormControl('', { nonNullable: true });
  readonly updateId = new FormControl('', { nonNullable: true });
  readonly nextStatus = new FormControl<ProductionStatus | ''>('', { nonNullable: true });

  isTerminalStatus(status?: ProductionStatus | '' | null): boolean {
    return status === 'CERRADO' || status === 'CANCELADO';
  }

  readonly isSelectedTerminal = computed(() => {
    const current = this.detail();
    return current ? this.isTerminalStatus(current.status) : false;
  });

  private lastTriggerElement: HTMLElement | null = null;
  private detailTriggerElement: HTMLElement | null = null;
  private ticketTriggerElement: HTMLElement | null = null;

  // Reservation items for CONFIRMADO transition & Detail inquiry
  readonly availableEquipment = toSignal(
    toObservable(this.canUpdate).pipe(
      distinctUntilChanged(),
      switchMap((canQueryEquipment) =>
        canQueryEquipment
          ? this.catalogDataService.getEquipment().pipe(catchError(() => of([] as readonly Equipment[])))
          : of([] as readonly Equipment[])
      )
    ),
    { initialValue: [] as readonly Equipment[] }
  );
  readonly availableServices = toSignal(
    toObservable(this.canUpdate).pipe(
      distinctUntilChanged(),
      switchMap((canQueryServices) =>
        canQueryServices
          ? this.catalogDataService.getServices().pipe(
              map((services) => services.filter((s) => s.active)),
              catchError(() => of([] as readonly CatalogService[]))
            )
          : of([] as readonly CatalogService[])
      )
    ),
    { initialValue: [] as readonly CatalogService[] }
  );
  readonly selectedServiceIds = signal<readonly number[]>([]);
  readonly reservationItems = signal<ProductionReservationItemRequest[]>([]);
  readonly productionReservations = signal<readonly EquipmentReservationItem[]>([]);
  readonly reservationsLoading = signal(false);
  readonly reservationsError = signal<string | null>(null);
  readonly selectedEquipmentId = new FormControl<string>('', { nonNullable: true });
  readonly selectedQuantity = new FormControl<number>(1, { nonNullable: true });
  readonly crewIdControl = new FormControl<string>('', { nonNullable: true });
  readonly crewNameControl = new FormControl<string>('', { nonNullable: true });
  readonly reservationInputError = signal('');

  // Ticket de cuadrilla
  readonly ticketLoading = signal<boolean>(false);
  readonly ticketError = signal<string | null>(null);
  readonly currentTicket = signal<CrewTicket | null>(null);
  readonly showTicketModal = signal<boolean>(false);
  readonly ticketCopied = signal<boolean>(false);
  readonly ticketEquipmentReservations = signal<readonly EquipmentReservationItem[]>([]);
  private ticketCopyTimer: ReturnType<typeof setTimeout> | null = null;

  readonly ticketReservations = computed(() => {
    const fromTicket = this.ticketEquipmentReservations();
    if (fromTicket.length > 0) return fromTicket;
    const ticket = this.currentTicket();
    const selected = this.detail();
    return ticket && selected?.id === ticket.productionId ? this.productionReservations() : [];
  });

  readonly resolvedTicketCrew = computed<{ crewName: string | null; crewId: string | null }>(() => {
    const ticket = this.currentTicket();
    if (!ticket) return { crewName: null, crewId: null };

    const selected = this.detail()?.id === ticket.productionId ? this.detail() : null;
    let crewName = ticket.crewName?.trim() || selected?.crewName?.trim() || '';
    let crewId = ticket.crewId?.trim() || selected?.crewId?.trim() || '';

    if (!crewName && !crewId && ticket.instructions) {
      const match = ticket.instructions.match(
        /Cuadrilla asignada:\s*([^.()\n]+?)(?:\s*\(([^)]+)\))?\.(?:\s|$)/
      );
      if (match) {
        crewName = match[1]?.trim() ?? '';
        crewId = match[2]?.trim() ?? '';
      }
    }

    return {
      crewName: crewName || null,
      crewId: crewId || null,
    };
  });

  readonly resolvedTicketDirective = computed<string>(() => {
    const raw = this.currentTicket()?.instructions?.trim();
    if (!raw) return 'Sin instrucciones adicionales registradas.';

    const autoMatch = raw.match(
      /^Hoja de ruta para montaje de equipamiento[\s\S]*?Estado operacional:\s*[A-Z_]+\.(?:\s*Cuadrilla asignada:\s*(?:[^.()]|\([^)]*\))+\.)?\s*(.+)$/
    );
    return autoMatch?.[1]?.trim() || raw;
  });

  // Descarga de PDF
  readonly quoteDownloading = signal<boolean>(false);
  readonly quoteError = signal<string | null>(null);

  readonly workflowForm = new FormGroup({
    nextStatus: this.nextStatus,
    selectedEquipmentId: this.selectedEquipmentId,
    selectedQuantity: this.selectedQuantity,
    crewId: this.crewIdControl,
    crewName: this.crewNameControl,
  });

  readonly createForm = new FormGroup({
    organizerId: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    scheduledAt: new FormControl('', { nonNullable: true, validators: Validators.required }),
    location: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
  });

  ngOnInit(): void {
    this.setupPassiveContactLookups();
    if (this.isOrganizerOnly() && this.currentOwnerId()) {
      this.loadSelfContact();
    }
    this.route?.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const action = params.get('action');
        if (action === 'new') {
          if (this.canCreate()) {
            this.openCreateModal();
          }
          void this.router?.navigate([], {
            queryParams: { action: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
          return;
        }

        const rawId = params.get('productionId');
        if (!rawId) return;
        const id = Number(rawId);
        if (!Number.isSafeInteger(id) || id < 1) return;

        if (this.lastDeepLinkedProductionId !== id) {
          this.lastDeepLinkedProductionId = id;
          this.operationError.set('');
          this.detailId.setValue(String(id));
          this.updateId.setValue(String(id));
          this.detail.set(null);
          this.loadProductionContext(id);
        }

        if (action === 'download-pdf') {
          this.downloadQuotePdf(id);
          void this.router?.navigate([], {
            queryParams: { action: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        } else if (action === 'view-ticket') {
          this.viewCrewTicket(id);
          void this.router?.navigate([], {
            queryParams: { action: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }
      });
  }

  ngOnDestroy(): void {
    this.clearTicketCopyTimer();
    removeExistingCrewTicketPrintFrame();
    this.setBodyScrollLocked(false);
  }

  private clearTicketCopyTimer(): void {
    if (this.ticketCopyTimer !== null) {
      clearTimeout(this.ticketCopyTimer);
      this.ticketCopyTimer = null;
    }
  }

  private syncBodyScrollLock(): void {
    this.setBodyScrollLocked(this.showCreate() || this.detail() !== null || this.showTicketModal());
  }

  private setBodyScrollLocked(locked: boolean): void {
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = locked ? 'hidden' : '';
    }
  }

  private errorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) return 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo nuevamente.';
    if (error.status === 401) return 'Tu sesión expiró o el token no es válido. Inicia sesión nuevamente.';
    if (error.status === 403) return 'No tienes permisos para realizar esta operación o acceder a estos datos.';
    if (error.status === 404) return 'La producción o recurso solicitado no existe.';
    if (error.status === 409) {
      return (error.error && typeof error.error === 'object' && error.error.message)
        ? error.error.message
        : 'La transición no está permitida para el estado actual de la producción.';
    }
    if (error.status === 400) {
      return (error.error && typeof error.error === 'object' && error.error.message)
        ? error.error.message
        : 'Los datos enviados no cumplen las validaciones requeridas.';
    }
    if (error.status === 502 || error.status === 503) {
      return 'El servicio de inventario o catálogo no se encuentra disponible temporalmente. Inténtalo nuevamente en unos instantes.';
    }
    return 'No fue posible completar la operación. Inténtalo nuevamente.';
  }

  openCreateModal(trigger?: HTMLElement): void {
    if (!this.canCreate()) return;
    this.lastTriggerElement = trigger ?? (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null);
    this.detail.set(null);
    this.operationError.set('');
    this.operationSuccess.set('');
    this.createSubmitted.set(false);
    this.resetCreateContactLookup();
    if (this.isOrganizerOnly()) {
      this.createForm.controls.organizerId.setValue(this.currentOwnerId());
    }
    this.showCreate.set(true);
    this.syncBodyScrollLock();
    setTimeout(() => {
      if (typeof document !== 'undefined') {
        const firstInput = document.getElementById('create-name-input') ?? document.getElementById('create-organizer-input');
        firstInput?.focus();
      }
    }, 0);
  }

  closeCreateModal(): void {
    if (this.saving()) return;
    this.showCreate.set(false);
    this.createSubmitted.set(false);
    this.operationError.set('');
    this.resetCreateContactLookup();
    this.syncBodyScrollLock();
    const trigger = this.lastTriggerElement;
    this.lastTriggerElement = null;
    setTimeout(() => trigger?.focus(), 0);
  }

  onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (!this.saving()) {
        event.preventDefault();
        this.closeCreateModal();
      }
      return;
    }
    this.trapFocus(event);
  }

  onDetailKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (!this.saving()) {
        event.preventDefault();
        this.closeDetail();
      }
      return;
    }
    this.trapFocus(event);
  }

  private trapFocus(event: KeyboardEvent): void {
    if (event.key === 'Tab' && event.currentTarget instanceof HTMLElement) {
      const focusable = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  hasFieldError(field: 'organizerId' | 'name' | 'scheduledAt' | 'location'): boolean {
    const control = this.createForm.controls[field];
    return control.invalid && (control.touched || control.dirty || this.createSubmitted());
  }

  getFieldError(field: 'organizerId' | 'name' | 'scheduledAt' | 'location'): string {
    const control = this.createForm.controls[field];
    if (!control.errors) return '';
    switch (field) {
      case 'name':
        return control.errors['maxlength']
          ? 'El nombre del evento no puede superar los 150 caracteres.'
          : 'Ingresa el nombre del evento.';
      case 'organizerId':
        return control.errors['maxlength']
          ? 'El identificador del organizador no puede superar los 255 caracteres.'
          : 'Ingresa el identificador del organizador.';
      case 'scheduledAt':
        return 'Selecciona la fecha y hora programada para el evento.';
      case 'location':
        return control.errors['maxlength']
          ? 'La ubicación no puede superar los 255 caracteres.'
          : 'Ingresa la ubicación o recinto donde se realizará el evento.';
    }
  }

  submitCreate(): void {
    if (!this.canCreate() || this.saving()) return;
    this.createSubmitted.set(true);
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid) return;
    const request = this.createForm.getRawValue();
    if (!Number.isFinite(Date.parse(request.scheduledAt)) || new Date(request.scheduledAt).getTime() < Date.now()) {
      this.operationError.set('Ingresa una fecha programada actual o futura.');
      return;
    }
    const effectiveOrganizerId = this.isOrganizerOnly()
      ? this.currentOwnerId()
      : request.organizerId.trim();

    this.saving.set(true);
    this.operationError.set('');
    this.operationSuccess.set('');
    this.dataService.createProduction({
      organizerId: effectiveOrganizerId,
      name: request.name.trim(),
      scheduledAt: request.scheduledAt,
      location: request.location.trim()
    }).subscribe({
      next: (production) => {
        this.saving.set(false);
        this.createSubmitted.set(false);
        this.operationSuccess.set(`Producción #${production.id} («${production.name}») creada correctamente.`);
        this.createForm.reset();
        this.showCreate.set(false);
        this.syncBodyScrollLock();
        this.retry();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.operationError.set(this.errorMessage(error));
      }
    });
  }

  selectProduction(item: Production): void {
    this.detailTriggerElement = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.showCreate.set(false);
    this.detail.set(item);
    this.detailId.setValue(String(item.id));
    this.updateId.setValue(String(item.id));
    this.operationError.set('');
    this.reservationInputError.set('');
    this.reservationItems.set([]);
    this.selectedServiceIds.set([]);
    this.nextStatus.setValue('');
    this.suggestNextStatus(item.status);
    this.announcement.set(`Producción seleccionada: ${item.name}`);
    this.syncBodyScrollLock();
    this.loadProductionContext(item.id);
    setTimeout(() => {
      if (typeof document !== 'undefined') {
        const closeBtn = document.getElementById('detail-close-btn');
        closeBtn?.focus();
      }
    }, 0);
  }

  closeDetail(): void {
    if (this.saving()) return;
    this.detail.set(null);
    this.detailId.setValue('');
    this.updateId.setValue('');
    this.nextStatus.setValue('');
    this.productionReservations.set([]);
    this.reservationsLoading.set(false);
    this.reservationsError.set(null);
    this.reservationItems.set([]);
    this.selectedServiceIds.set([]);
    this.reservationInputError.set('');
    this.confirmContactLookup$.next(null);
    this.syncBodyScrollLock();
    const trigger = this.detailTriggerElement;
    this.detailTriggerElement = null;
    setTimeout(() => trigger?.focus(), 0);
  }

  suggestNextStatus(current: ProductionStatus): void {
    switch (current) {
      case 'SOLICITADO':
        this.nextStatus.setValue('CONFIRMADO');
        break;
      case 'CONFIRMADO':
        this.nextStatus.setValue('EN_MONTAJE');
        break;
      case 'EN_MONTAJE':
        this.nextStatus.setValue('EN_EJECUCION');
        break;
      case 'EN_EJECUCION':
        this.nextStatus.setValue('CERRADO');
        break;
      case 'CERRADO':
      case 'CANCELADO':
        this.nextStatus.setValue('');
        break;
      default:
        this.nextStatus.setValue('');
        break;
    }
  }

  private loadProductionContext(id: number): void {
    this.detailLoading.set(true);
    this.productionReservations.set([]);
    this.reservationsError.set(null);
    this.dataService.getProduction(id).subscribe({
      next: (result) => {
        this.detail.set(result);
        this.suggestNextStatus(result.status);
        this.detailLoading.set(false);
        this.syncBodyScrollLock();
        this.fetchReservations(id);
        this.checkConfirmContactWarning(result);
      },
      error: (error: HttpErrorResponse) => {
        this.detailLoading.set(false);
        if (error.status === 403) {
          this.detail.set(null);
          this.operationError.set('No tienes permisos para acceder a esta producción.');
        } else {
          this.operationError.set(this.errorMessage(error));
        }
      }
    });
  }

  fetchReservations(productionId: number): void {
    if (this.reservationsLoading()) return;
    this.reservationsLoading.set(true);
    this.reservationsError.set(null);
    this.catalogDataService.getReservationsByProduction(productionId).subscribe({
      next: (res) => {
        this.reservationsLoading.set(false);
        this.productionReservations.set(res);
      },
      error: (err: HttpErrorResponse) => {
        this.reservationsLoading.set(false);
        if (err.status === 401) {
          this.reservationsError.set('Sesión expirada o no válida al consultar reservas.');
        } else if (err.status === 403) {
          this.reservationsError.set('No tienes permisos para ver las reservas de esta producción.');
        } else if (err.status === 404) {
          this.reservationsError.set('No se encontraron registros de inventario para esta producción.');
        } else if (err.status === 502 || err.status === 503) {
          this.reservationsError.set('El servicio de inventario o catálogo no se encuentra disponible temporalmente. Inténtalo nuevamente en unos instantes.');
        } else {
          this.reservationsError.set('No fue posible cargar las reservas de equipamiento.');
        }
      }
    });
  }

  retryReservations(): void {
    const current = this.detail();
    if (current && !this.reservationsLoading()) {
      this.fetchReservations(current.id);
    }
  }

  consultDetail(): void {
    const id = Number(this.detailId.value);
    if (!Number.isSafeInteger(id) || id < 1) return;
    this.operationError.set('');
    this.updateId.setValue(String(id));
    this.detail.set(null);
    this.loadProductionContext(id);
  }

  addReservationItem(): void {
    if (this.isSelectedTerminal()) return;
    const rawId = this.selectedEquipmentId.value;
    const eqId = Number(rawId);
    const qty = Number(this.selectedQuantity.value);
    this.reservationInputError.set('');

    if (!rawId || !Number.isSafeInteger(eqId) || eqId < 1) {
      this.reservationInputError.set('Selecciona un equipo válido.');
      return;
    }
    const eq = this.availableEquipment().find(e => e.id === eqId);
    if (!eq) {
      this.reservationInputError.set('Equipo no encontrado en inventario.');
      return;
    }
    const maxStock = eq.availableQty ?? eq.availableQuantity;
    if (!Number.isSafeInteger(qty) || qty < 1) {
      this.reservationInputError.set('La cantidad debe ser un entero positivo.');
      return;
    }
    if (qty > maxStock) {
      this.reservationInputError.set(`Stock insuficiente: solo hay ${maxStock} disponibles.`);
      return;
    }

    const current = this.reservationItems();
    const existingIdx = current.findIndex(i => i.equipmentId === eqId);
    if (existingIdx >= 0) {
      const newTotal = current[existingIdx].quantity + qty;
      if (newTotal > maxStock) {
        this.reservationInputError.set(`Stock insuficiente acumulado: máximo ${maxStock}.`);
        return;
      }
      const updated = [...current];
      updated[existingIdx] = { equipmentId: eqId, quantity: newTotal };
      this.reservationItems.set(updated);
    } else {
      this.reservationItems.set([...current, { equipmentId: eqId, quantity: qty }]);
    }
    this.selectedQuantity.setValue(1);
  }

  removeReservationItem(index: number): void {
    if (this.isSelectedTerminal()) return;
    const current = this.reservationItems();
    this.reservationItems.set(current.filter((_, i) => i !== index));
  }

  getEquipmentName(eqId: number): string {
    const eq = this.availableEquipment().find(e => e.id === eqId);
    if (!eq) return `Equipo #${eqId}`;
    const detail = eq.description || eq.category;
    return detail ? `${eq.name} (${detail})` : eq.name;
  }

  toggleService(serviceId: number): void {
    if (this.isSelectedTerminal()) return;
    const current = this.selectedServiceIds();
    if (current.includes(serviceId)) {
      this.selectedServiceIds.set(current.filter((id) => id !== serviceId));
    } else {
      this.selectedServiceIds.set([...current, serviceId]);
    }
  }

  isServiceSelected(serviceId: number): boolean {
    return this.selectedServiceIds().includes(serviceId);
  }

  submitStatus(): void {
    if (!this.canUpdate() || this.saving()) return;
    const current = this.detail();
    if (current && this.isTerminalStatus(current.status)) {
      this.operationError.set(
        current.status === 'CERRADO'
          ? 'Producción cerrada. No se permiten nuevas transiciones de estado.'
          : 'Producción cancelada. No se permiten nuevas transiciones de estado.'
      );
      return;
    }
    const id = Number(this.updateId.value || this.detail()?.id || '');
    if (!Number.isSafeInteger(id) || id < 1) {
      this.operationError.set('Selecciona una producción.');
      return;
    }

    const next = this.nextStatus.value;
    if (!next) {
      this.operationError.set('Selecciona un estado operativo válido.');
      return;
    }
    let items: ProductionReservationItemRequest[] | undefined;
    let serviceIds: readonly number[] | undefined;
    let crewId: string | undefined;
    let crewName: string | undefined;

    if (next === 'CONFIRMADO') {
      if (this.reservationItems().length === 0) {
        this.operationError.set('Debes asignar al menos un ítem de equipamiento para confirmar la producción.');
        return;
      }
      items = this.reservationItems();
      if (this.selectedServiceIds().length > 0) {
        serviceIds = this.selectedServiceIds();
      }
    } else if (next === 'EN_MONTAJE') {
      const trimmedCrewId = this.crewIdControl.value.trim();
      const trimmedCrewName = this.crewNameControl.value.trim();
      if (trimmedCrewId) crewId = trimmedCrewId;
      if (trimmedCrewName) crewName = trimmedCrewName;
    }

    this.saving.set(true);
    this.operationError.set('');
    this.operationSuccess.set('');

    const payload: {
      status: ProductionStatus;
      items?: ProductionReservationItemRequest[];
      serviceIds?: readonly number[];
      crewId?: string;
      crewName?: string;
    } = { status: next };
    if (items !== undefined) payload.items = items;
    if (serviceIds !== undefined) payload.serviceIds = serviceIds;
    if (crewId !== undefined) payload.crewId = crewId;
    if (crewName !== undefined) payload.crewName = crewName;

    this.dataService.updateStatus(id, payload).subscribe({
      next: (production) => {
        this.saving.set(false);
        this.operationSuccess.set(`Producción #${production.id} actualizada a ${production.status}.`);
        this.detail.set(production);
        this.detailId.setValue(String(production.id));
        this.updateId.setValue(String(production.id));
        this.reservationItems.set([]);
        this.selectedServiceIds.set([]);
        this.suggestNextStatus(production.status);
        this.fetchReservations(id);
        this.retry();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.operationError.set(this.errorMessage(error));
      }
    });
  }

  getLabel(status: string): string {
    return this.getReadableStatus(status);
  }

  getReservationStatusLabel(status: string): string {
    if (status === 'RESERVED') return 'Reservado';
    return this.getReadableStatus(status);
  }

  getReadableStatus(status: string): string {
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

  clearFilters(): void {
    this.search.setValue('');
    this.status.setValue('');
  }

  retry(): void {
    this.retrySubject.next();
  }

  viewCrewTicket(productionId: number, trigger?: HTMLElement): void {
    if (!this.canViewCrewTicket()) return;
    this.ticketTriggerElement = trigger ?? (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null);
    this.ticketLoading.set(true);
    this.ticketError.set(null);
    this.currentTicket.set(null);
    this.ticketEquipmentReservations.set([]);
    this.showTicketModal.set(true);
    this.syncBodyScrollLock();

    this.catalogDataService.getReservationsByProduction(productionId).subscribe({
      next: (res) => this.ticketEquipmentReservations.set(res ?? []),
      error: () => this.ticketEquipmentReservations.set([]),
    });

    setTimeout(() => {
      if (typeof document !== 'undefined') {
        const modal = document.querySelector<HTMLElement>('.ticket-modal-card');
        modal?.focus();
      }
    }, 0);

    this.dataService.getCrewTicket(productionId).subscribe({
      next: (ticket) => {
        this.currentTicket.set(ticket);
        this.ticketLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.ticketLoading.set(false);
        if (err.status === 404) {
          this.ticketError.set('No se ha emitido un ticket de cuadrilla para esta producción.');
        } else if (err.status === 403) {
          this.ticketError.set('No tienes permisos para consultar el ticket de cuadrilla.');
        } else {
          this.ticketError.set('Error al recuperar el ticket de cuadrilla.');
        }
      }
    });
  }

  closeTicketModal(): void {
    this.clearTicketCopyTimer();
    removeExistingCrewTicketPrintFrame();
    this.ticketCopied.set(false);
    this.showTicketModal.set(false);
    this.currentTicket.set(null);
    this.ticketEquipmentReservations.set([]);
    this.ticketError.set(null);
    this.syncBodyScrollLock();
    const trigger = this.ticketTriggerElement;
    this.ticketTriggerElement = null;
    setTimeout(() => trigger?.focus(), 0);
  }

  formatShortEventId(eventId: string): string {
    if (!eventId || eventId.length <= 18) return eventId;
    return `${eventId.slice(0, 8)}…${eventId.slice(-6)}`;
  }

  copyTicketEventId(eventId: string): void {
    if (!eventId) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(eventId).catch(() => {});
    }
    this.clearTicketCopyTimer();
    this.ticketCopied.set(true);
    this.announcement.set('Identificador de evento copiado al portapapeles.');
    this.ticketCopyTimer = setTimeout(() => {
      this.ticketCopied.set(false);
      this.ticketCopyTimer = null;
    }, 1800);
  }

  printCrewTicket(): void {
    const ticket = this.currentTicket();
    if (!ticket) return;
    const crew = this.resolvedTicketCrew();
    const prod =
      (this.detail()?.id === ticket.productionId ? this.detail() : null) ??
      this.allProductions().find((p) => p.id === ticket.productionId) ??
      null;
    triggerCrewTicketSinglePagePrint({
      ticket,
      crewName: crew.crewName,
      crewId: crew.crewId,
      directive: this.resolvedTicketDirective(),
      statusLabel: this.getReadableStatus(ticket.status),
      reservations: this.ticketReservations(),
      organizerId: prod?.organizerId ?? null,
      productionStatusLabel: prod ? this.getReadableStatus(prod.status) : null,
      actorOwnerId: typeof this.authz.ownerId === 'function' ? this.authz.ownerId() || null : null,
    });
  }

  onTicketKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeTicketModal();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
      if (this.currentTicket()) {
        event.preventDefault();
        this.printCrewTicket();
      }
      return;
    }
    this.trapFocus(event);
  }

  downloadQuotePdf(productionId: number): void {
    if (!this.canDownloadQuote() || this.quoteDownloading()) return;
    this.quoteDownloading.set(true);
    this.quoteError.set(null);

    this.dataService.downloadQuotePdf(productionId).subscribe({
      next: (blob) => {
        this.quoteDownloading.set(false);
        if (typeof window !== 'undefined') {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `acta-cierre-produccion-${productionId}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.quoteDownloading.set(false);
        if (err.status === 404) {
          this.quoteError.set('El acta de cierre PDF no está disponible para esta producción.');
        } else if (err.status === 403) {
          this.quoteError.set('No tienes permisos para descargar el acta de cierre.');
        } else {
          this.quoteError.set('Error al descargar el acta de cierre PDF.');
        }
      }
    });
  }

  // --- Gestión de contacto propio del Organizador ---

  loadSelfContact(): void {
    const ownerId = this.currentOwnerId().trim();
    if (!this.isOrganizerOnly() || !ownerId || typeof this.dataService.getOrganizerContact !== 'function') {
      return;
    }
    this.selfContactLoading.set(true);
    this.selfContactMissing.set(false);
    this.selfContactError.set(null);
    this.dataService.getOrganizerContact(ownerId).subscribe({
      next: (contact) => {
        this.selfContactLoading.set(false);
        this.selfContact.set(contact);
        this.selfContactMissing.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.selfContactLoading.set(false);
        if (err.status === 404) {
          this.selfContact.set(null);
          this.selfContactMissing.set(true);
          this.prefillSelfContactForm();
        } else if (err.status === 403) {
          this.selfContactError.set('No tienes permisos para consultar este contacto de organizador.');
        } else {
          this.selfContactError.set('No pudimos consultar tu contacto de notificaciones en este momento.');
        }
      }
    });
  }

  openSelfContactForm(): void {
    if (!this.isOrganizerOnly()) return;
    this.selfContactError.set(null);
    this.selfContactSuccess.set(null);
    this.prefillSelfContactForm();
    this.showSelfContactForm.set(true);
  }

  cancelSelfContactForm(): void {
    if (this.selfContactSaving()) return;
    this.showSelfContactForm.set(false);
    this.selfContactError.set(null);
  }

  submitSelfContact(): void {
    const ownerId = this.currentOwnerId().trim();
    if (!this.isOrganizerOnly() || !ownerId || this.selfContactSaving()) return;
    this.selfContactForm.markAllAsTouched();
    if (this.selfContactForm.invalid || typeof this.dataService.upsertOrganizerContact !== 'function') return;

    const raw = this.selfContactForm.getRawValue();
    const request: OrganizerContactRequest = {
      email: raw.email.trim(),
      contactName: raw.contactName.trim() || undefined,
      phone: raw.phone.trim() || undefined,
    };

    this.selfContactSaving.set(true);
    this.selfContactError.set(null);
    this.selfContactSuccess.set(null);
    this.dataService.upsertOrganizerContact(ownerId, request).subscribe({
      next: (saved) => {
        this.selfContactSaving.set(false);
        this.selfContact.set(saved);
        this.selfContactMissing.set(false);
        this.showSelfContactForm.set(false);
        this.selfContactSuccess.set(`Contacto registrado para notificaciones: ${saved.email}.`);
      },
      error: (err: HttpErrorResponse) => {
        this.selfContactSaving.set(false);
        this.selfContactError.set(this.contactErrorMessage(err));
      }
    });
  }

  private prefillSelfContactForm(): void {
    const existing = this.selfContact();
    this.selfContactForm.reset({
      email: existing?.email ?? this.suggestedEmail(),
      contactName: existing?.contactName ?? this.suggestedDisplayName(),
      phone: existing?.phone ?? '',
    });
  }

  private contactErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 403) {
      return 'No tienes permisos para registrar o modificar el contacto de este organizador.';
    }
    if (err.status === 400) {
      return 'Verifica que el correo electrónico y los datos de contacto sean válidos.';
    }
    if (err.status === 401) {
      return 'Sesión expirada o no autorizada. Vuelve a iniciar sesión.';
    }
    return 'No pudimos guardar el contacto del organizador en este momento.';
  }

  // --- Consulta pasiva de contacto en Creación (Productor) y Confirmación ---

  private setupPassiveContactLookups(): void {
    this.createContactLookup$
      .pipe(
        switchMap((organizerId) => {
          if (!organizerId || typeof this.dataService.getOrganizerContact !== 'function') {
            this.createContactStatus.set('idle');
            this.createContactEmail.set('');
            this.createContactMessage.set('');
            return of(null);
          }
          this.createContactStatus.set('loading');
          this.createContactEmail.set('');
          this.createContactMessage.set('');
          return this.dataService.getOrganizerContact(organizerId).pipe(
            map((contact) => ({ kind: 'found' as const, email: contact.email })),
            catchError((err: HttpErrorResponse) => {
              if (err.status === 404) {
                return of({ kind: 'missing' as const });
              }
              return of({ kind: 'error' as const, status: err.status ?? 0 });
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((outcome) => {
        if (!outcome) return;
        if (outcome.kind === 'found') {
          this.createContactStatus.set('found');
          this.createContactEmail.set(outcome.email);
          this.createContactMessage.set(`Contacto registrado: ${outcome.email}.`);
        } else if (outcome.kind === 'missing') {
          this.createContactStatus.set('missing');
          this.createContactEmail.set('');
          this.createContactMessage.set(
            'Este organizador aún no tiene contacto registrado. Requiere gestión administrativa en Organizadores para recibir notificaciones.'
          );
        } else {
          this.createContactStatus.set('error');
          this.createContactEmail.set('');
          this.createContactMessage.set(this.lookupErrorMessage(outcome.status));
        }
      });

    this.confirmContactLookup$
      .pipe(
        switchMap((organizerId) => {
          if (!organizerId || typeof this.dataService.getOrganizerContact !== 'function') {
            this.confirmContactMissing.set(false);
            return of(null);
          }
          this.confirmContactMissing.set(false);
          return this.dataService.getOrganizerContact(organizerId).pipe(
            map(() => false),
            catchError((err: HttpErrorResponse) => of(err.status === 404))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((missing) => {
        if (missing !== null) {
          this.confirmContactMissing.set(missing);
        }
      });
  }

  checkCreateOrganizerContact(): void {
    if (this.isOrganizerOnly()) return;
    const organizerId = this.createForm.controls.organizerId.value.trim();
    this.createContactLookup$.next(organizerId || null);
  }

  resetCreateContactLookup(): void {
    this.createContactLookup$.next(null);
    this.createContactStatus.set('idle');
    this.createContactEmail.set('');
    this.createContactMessage.set('');
  }

  private checkConfirmContactWarning(production: Production): void {
    if (this.canUpdate() && production.status === 'SOLICITADO' && production.organizerId?.trim()) {
      this.confirmContactLookup$.next(production.organizerId.trim());
    } else {
      this.confirmContactLookup$.next(null);
    }
  }

  private lookupErrorMessage(status: number): string {
    if (status === 400) return 'El identificador de organizador ingresado no es válido.';
    if (status === 401) return 'Sesión expirada o no válida al consultar el contacto.';
    if (status === 403) return 'No tienes permisos para consultar el contacto de este organizador.';
    if (status === 0) return 'No se pudo conectar para consultar el contacto del organizador.';
    return 'No fue posible consultar el contacto del organizador en este momento.';
  }
}
