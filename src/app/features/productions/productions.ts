import { Component, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, of } from 'rxjs';
import { switchMap, map, catchError, startWith } from 'rxjs/operators';
import {
  LucideCalendarDays,
  LucideClock3,
  LucideActivity,
  LucideCircleCheck,
  LucideSearch,
  LucideCalendarX2,
  LucideCircleAlert
} from '@lucide/angular';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { Production, ProductionStatus, ProductionReservationItemRequest } from '../../core/models/production.model';
import { ProductionTable } from '../../shared/ui/production-table';
import { ProductionsDataService } from './productions-data.service';
import { CatalogDataService } from '../catalog/catalog-data.service';
import { Equipment, EquipmentReservationItem } from '../catalog/models/equipment.model';

@Component({
  selector: 'app-productions',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ProductionTable,
    LucideCalendarDays,
    LucideClock3,
    LucideActivity,
    LucideCircleCheck,
    LucideSearch,
    LucideCalendarX2,
    LucideCircleAlert
  ],
  templateUrl: './productions.html',
  styleUrl: './productions.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Productions {
  private readonly dataService = inject(ProductionsDataService);
  private readonly catalogDataService = inject(CatalogDataService);

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

  private readonly authz = inject(AuthorizationService);
  readonly canCreate = computed(() => this.authz.hasAnyRole([AppRole.Productor, AppRole.Organizador]) && this.authz.hasScope('access_as_user'));
  readonly canUpdate = computed(() => this.authz.hasAnyRole([AppRole.Admin, AppRole.Productor]) && this.authz.hasScope('access_as_user'));
  readonly showCreate = signal(false);
  readonly saving = signal(false);
  readonly operationError = signal('');
  readonly operationSuccess = signal('');
  readonly detail = signal<Production | null>(null);
  readonly detailId = new FormControl('', { nonNullable: true });
  readonly updateId = new FormControl('', { nonNullable: true });
  readonly nextStatus = new FormControl<ProductionStatus>('CONFIRMADO', { nonNullable: true });

  // Reservation items for CONFIRMADO transition & Detail inquiry
  readonly availableEquipment = toSignal(
    this.catalogDataService.getEquipment().pipe(catchError(() => of([] as readonly Equipment[]))),
    { initialValue: [] as readonly Equipment[] }
  );
  readonly reservationItems = signal<ProductionReservationItemRequest[]>([]);
  readonly productionReservations = signal<readonly EquipmentReservationItem[]>([]);
  readonly selectedEquipmentId = new FormControl<string>('', { nonNullable: true });
  readonly selectedQuantity = new FormControl<number>(1, { nonNullable: true });
  readonly reservationInputError = signal('');

  readonly createForm = new FormGroup({
    organizerId: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    scheduledAt: new FormControl('', { nonNullable: true, validators: Validators.required }),
    location: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
  });

  private errorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) return 'No se pudo conectar con API Gateway. Comprueba tu conexión y el despliegue cloud.';
    if (error.status === 401) return 'Tu sesión expiró o el token no es válido. Inicia sesión nuevamente.';
    if (error.status === 403) return 'No tienes permisos para realizar esta operación.';
    if (error.status === 409) {
      return (error.error && typeof error.error === 'object' && error.error.message)
        ? error.error.message
        : 'La transición no está permitida para el estado actual de la producción.';
    }
    if (error.status === 400) {
      return (error.error && typeof error.error === 'object' && error.error.message)
        ? error.error.message
        : 'Los datos enviados no cumplen las validaciones del backend.';
    }
    if (error.status === 404) return 'La producción ya no existe.';
    return 'No fue posible completar la operación. Inténtalo nuevamente.';
  }

  submitCreate(): void {
    if (!this.canCreate() || this.saving()) return;
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid) return;
    const request = this.createForm.getRawValue();
    if (!Number.isFinite(Date.parse(request.scheduledAt)) || new Date(request.scheduledAt).getTime() < Date.now()) {
      this.operationError.set('Ingresa una fecha programada actual o futura.');
      return;
    }
    this.saving.set(true);
    this.operationError.set('');
    this.operationSuccess.set('');
    this.dataService.createProduction({
      organizerId: request.organizerId.trim(),
      name: request.name.trim(),
      scheduledAt: request.scheduledAt,
      location: request.location.trim()
    }).subscribe({
      next: (production) => {
        this.saving.set(false);
        this.operationSuccess.set(`Producción #${production.id} creada correctamente.`);
        this.createForm.reset();
        this.showCreate.set(false);
        this.retry();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.operationError.set(this.errorMessage(error));
      }
    });
  }

  consultDetail(): void {
    const id = Number(this.detailId.value);
    if (!Number.isSafeInteger(id) || id < 1) return;
    this.operationError.set('');
    this.detail.set(null);
    this.productionReservations.set([]);
    this.dataService.getProduction(id).subscribe({
      next: (result) => {
        this.detail.set(result);
        this.catalogDataService.getReservationsByProduction(id).subscribe({
          next: (res) => this.productionReservations.set(res),
          error: () => this.productionReservations.set([]),
        });
      },
      error: (error: HttpErrorResponse) => this.operationError.set(this.errorMessage(error))
    });
  }

  addReservationItem(): void {
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
    if (!Number.isSafeInteger(qty) || qty < 1) {
      this.reservationInputError.set('La cantidad debe ser un entero positivo.');
      return;
    }
    if (qty > eq.availableQuantity) {
      this.reservationInputError.set(`Stock insuficiente: solo hay ${eq.availableQuantity} disponibles.`);
      return;
    }

    const current = this.reservationItems();
    const existingIdx = current.findIndex(i => i.equipmentId === eqId);
    if (existingIdx >= 0) {
      const newTotal = current[existingIdx].quantity + qty;
      if (newTotal > eq.availableQuantity) {
        this.reservationInputError.set(`Stock insuficiente acumulado: máximo ${eq.availableQuantity}.`);
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
    const current = this.reservationItems();
    this.reservationItems.set(current.filter((_, i) => i !== index));
  }

  getEquipmentName(eqId: number): string {
    const eq = this.availableEquipment().find(e => e.id === eqId);
    if (!eq) return `Equipo #${eqId}`;
    const detail = eq.description || eq.category;
    return detail ? `${eq.name} (${detail})` : eq.name;
  }

  submitStatus(): void {
    if (!this.canUpdate() || this.saving()) return;
    const id = Number(this.updateId.value);
    if (!Number.isSafeInteger(id) || id < 1) {
      this.operationError.set('Selecciona una producción.');
      return;
    }

    const next = this.nextStatus.value;
    let items: ProductionReservationItemRequest[] | undefined;

    if (next === 'CONFIRMADO') {
      if (this.reservationItems().length === 0) {
        this.operationError.set('Debes asignar al menos un ítem de equipamiento para confirmar la producción.');
        return;
      }
      items = this.reservationItems();
    }

    this.saving.set(true);
    this.operationError.set('');
    this.operationSuccess.set('');

    this.dataService.updateStatus(id, { status: next, items }).subscribe({
      next: (production) => {
        this.saving.set(false);
        this.operationSuccess.set(`Producción #${production.id} actualizada a ${production.status}.`);
        this.detail.set(production);
        this.reservationItems.set([]);
        if (next === 'CONFIRMADO') {
          this.catalogDataService.getReservationsByProduction(id).subscribe({
            next: (res) => this.productionReservations.set(res),
            error: () => this.productionReservations.set([]),
          });
        }
        this.retry();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.operationError.set(this.errorMessage(error));
      }
    });
  }

  getLabel(status: string): string {
    return status === 'EN_EJECUCION' ? 'EN_EJECUCIÓN' : status;
  }

  clearFilters(): void {
    this.search.setValue('');
    this.status.setValue('');
  }

  retry(): void {
    this.retrySubject.next();
  }
}
