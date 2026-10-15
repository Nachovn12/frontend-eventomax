import { Component, ChangeDetectionStrategy, computed, inject, signal, Signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  LucidePackage,
  LucideCircleCheck,
  LucideCirclePause,
  LucideSearch,
  LucideChevronDown,
  LucidePackageOpen,
  LucideSearchX,
  LucideCircleAlert,
  LucideBoxes,
  LucideLayers,
} from '@lucide/angular';
import { CatalogDataService } from './catalog-data.service';
import { CatalogService, CatalogServiceUpsertRequest } from './models/catalog-service.model';
import { Equipment, CreateEquipmentRequest } from './models/equipment.model';
import { BehaviorSubject, of, Observable } from 'rxjs';
import { switchMap, map, catchError, startWith } from 'rxjs/operators';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';

interface CatalogServicesState {
  readonly data: readonly CatalogService[];
  readonly loading: boolean;
  readonly error: boolean;
}

interface EquipmentState {
  readonly data: readonly Equipment[];
  readonly loading: boolean;
  readonly error: boolean;
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    LucidePackage,
    LucideCircleCheck,
    LucideCirclePause,
    LucideSearch,
    LucideChevronDown,
    LucidePackageOpen,
    LucideSearchX,
    LucideCircleAlert,
    LucideBoxes,
    LucideLayers,
  ],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalog {
  private readonly dataService = inject(CatalogDataService);
  private readonly authz = inject(AuthorizationService);

  readonly activeTab = signal<'services' | 'equipment'>('services');

  setActiveTab(tab: 'services' | 'equipment'): void {
    this.activeTab.set(tab);
  }

  // --- Services state ---
  private readonly retrySubject = new BehaviorSubject<void>(undefined);

  private readonly catalogState: Signal<CatalogServicesState> = toSignal(
    this.retrySubject.pipe(
      switchMap(() =>
        this.dataService.getServices().pipe(
          map((data): CatalogServicesState => ({ data, loading: false, error: false })),
          catchError((): Observable<CatalogServicesState> =>
            of({ data: [] as readonly CatalogService[], loading: false, error: true }),
          ),
          startWith<CatalogServicesState>({ data: [] as readonly CatalogService[], loading: true, error: false }),
        ),
      ),
    ),
    { initialValue: { data: [] as readonly CatalogService[], loading: true, error: false } },
  );

  readonly isLoading = computed(() => this.catalogState().loading);
  readonly isError = computed(() => this.catalogState().error);
  private readonly allServices: Signal<readonly CatalogService[]> = computed(() => this.catalogState().data);

  readonly total = computed(() => this.allServices().length);
  readonly activeCount = computed(() => this.allServices().filter((s: CatalogService) => s.active === true).length);
  readonly inactiveCount = computed(
    () => this.allServices().filter((s: CatalogService) => s.active === false).length,
  );

  readonly search = new FormControl('', { nonNullable: true });
  readonly status = new FormControl('', { nonNullable: true });

  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  private readonly selectedStatus = toSignal(this.status.valueChanges, { initialValue: '' });

  readonly hasActiveFilters = computed(
    () => this.query().trim() !== '' || this.selectedStatus() !== '',
  );

  readonly rows: Signal<readonly CatalogService[]> = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('es');
    return this.allServices().filter((item: CatalogService) => {
      const matchesStatus =
        !this.selectedStatus() || (this.selectedStatus() === 'active' ? item.active : !item.active);
      return (
        matchesStatus &&
        [String(item.id), item.name, item.description || ''].some((value) =>
          value.toLocaleLowerCase('es').includes(query),
        )
      );
    });
  });

  readonly canManage = computed(() => this.authz.hasRole(AppRole.Admin) && this.authz.hasScope('access_as_user'));
  readonly showEditor = signal(false);
  readonly editingService = signal<CatalogService | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly saveMessage = signal('');

  readonly serviceForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    description: new FormControl('', { nonNullable: true, validators: Validators.maxLength(500) }),
    rate: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0.01)] }),
    active: new FormControl(true, { nonNullable: true }),
  });

  openCreate(): void {
    if (!this.canManage()) return;
    this.editingService.set(null);
    this.serviceForm.reset({ name: '', description: '', rate: 0, active: true });
    this.saveError.set('');
    this.saveMessage.set('');
    this.showEditor.set(true);
  }

  openEdit(item: CatalogService): void {
    if (!this.canManage()) return;
    this.editingService.set(item);
    this.serviceForm.setValue({
      name: item.name,
      description: item.description ?? '',
      rate: item.rate,
      active: item.active,
    });
    this.saveError.set('');
    this.saveMessage.set('');
    this.showEditor.set(true);
  }

  closeEditor(): void {
    if (this.saving()) return;
    this.showEditor.set(false);
    this.editingService.set(null);
  }

  submitService(): void {
    if (!this.canManage() || this.saving()) return;
    this.serviceForm.markAllAsTouched();
    if (this.serviceForm.invalid) return;
    const input = this.serviceForm.getRawValue();
    if (!Number.isFinite(input.rate) || input.rate <= 0 || Math.abs(input.rate * 100 - Math.round(input.rate * 100)) > 1e-6) {
      this.saveError.set('Ingresa una tarifa positiva con máximo dos decimales.');
      return;
    }
    const request: CatalogServiceUpsertRequest = {
      name: input.name.trim(),
      description: input.description.trim() || null,
      rate: input.rate,
      active: input.active,
    };
    if (!request.name) {
      this.saveError.set('El nombre del servicio es obligatorio.');
      return;
    }
    const existing = this.editingService();
    this.saving.set(true);
    this.saveError.set('');
    this.saveMessage.set('');
    const request$ = existing
      ? this.dataService.updateService(existing.id, request)
      : this.dataService.createService(request);
    request$.subscribe({
      next: (result) => {
        this.saving.set(false);
        this.showEditor.set(false);
        this.editingService.set(null);
        this.saveMessage.set(`Servicio #${result.id} guardado correctamente.`);
        this.retry();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.saveError.set(this.saveErrorText(error));
      },
    });
  }

  private saveErrorText(error: HttpErrorResponse): string {
    if (error.status === 0) return 'API Gateway no está disponible. Revisa la conexión y el despliegue.';
    if (error.status === 401) return 'Inicia sesión nuevamente para gestionar el catálogo.';
    if (error.status === 403) return 'Solo Admin puede crear o actualizar servicios.';
    if (error.status === 400) return 'El backend rechazó los datos. Revisa nombre y tarifa.';
    if (error.status === 404) return 'El servicio ya no existe. Actualiza el listado.';
    return 'No se pudo guardar el servicio. Intenta nuevamente.';
  }

  clearFilters(): void {
    this.search.setValue('');
    this.status.setValue('');
  }

  retry(): void {
    this.retrySubject.next();
  }

  // --- Equipment & Inventory state ---
  private readonly equipmentRetrySubject = new BehaviorSubject<void>(undefined);

  private readonly equipmentState: Signal<EquipmentState> = toSignal(
    this.equipmentRetrySubject.pipe(
      switchMap(() =>
        this.dataService.getEquipment().pipe(
          map((data): EquipmentState => ({ data, loading: false, error: false })),
          catchError((): Observable<EquipmentState> =>
            of({ data: [] as readonly Equipment[], loading: false, error: true }),
          ),
          startWith<EquipmentState>({ data: [] as readonly Equipment[], loading: true, error: false }),
        ),
      ),
    ),
    { initialValue: { data: [] as readonly Equipment[], loading: true, error: false } },
  );

  readonly isEquipmentLoading = computed(() => this.equipmentState().loading);
  readonly isEquipmentError = computed(() => this.equipmentState().error);
  private readonly allEquipment: Signal<readonly Equipment[]> = computed(() => this.equipmentState().data);

  readonly totalEquipment = computed(() => this.allEquipment().length);
  readonly totalStockAvailable = computed(() =>
    this.allEquipment().reduce((acc, eq: Equipment) => acc + (eq.availableQty ?? eq.availableQuantity ?? 0), 0),
  );
  readonly totalStockReserved = computed(() =>
    this.allEquipment().reduce((acc, eq: Equipment) => acc + (eq.reservedQty ?? 0), 0),
  );

  readonly equipmentSearch = new FormControl('', { nonNullable: true });
  readonly equipmentStatus = new FormControl('', { nonNullable: true });

  private readonly equipmentQuery = toSignal(this.equipmentSearch.valueChanges, { initialValue: '' });
  private readonly selectedEquipmentStatus = toSignal(this.equipmentStatus.valueChanges, { initialValue: '' });

  readonly hasActiveEquipmentFilters = computed(
    () => this.equipmentQuery().trim() !== '' || this.selectedEquipmentStatus() !== '',
  );

  readonly equipmentRows: Signal<readonly Equipment[]> = computed(() => {
    const query = this.equipmentQuery().trim().toLocaleLowerCase('es');
    return this.allEquipment().filter((item: Equipment) => {
      const matchesStatus =
        !this.selectedEquipmentStatus() ||
        (this.selectedEquipmentStatus() === 'active' ? item.active : !item.active);
      return (
        matchesStatus &&
        [String(item.id), item.name, item.description || ''].some((value) =>
          value.toLocaleLowerCase('es').includes(query),
        )
      );
    });
  });

  // Equipment Admin Management
  readonly showEquipmentEditor = signal(false);
  readonly savingEquipment = signal(false);
  readonly saveEquipmentError = signal('');
  readonly saveEquipmentMessage = signal('');

  readonly equipmentForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
    initialAvailableQty: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    active: new FormControl(true, { nonNullable: true }),
  });

  openCreateEquipment(): void {
    if (!this.canManage()) return;
    this.equipmentForm.reset({ name: '', description: '', initialAvailableQty: 1, active: true });
    this.saveEquipmentError.set('');
    this.saveEquipmentMessage.set('');
    this.showEquipmentEditor.set(true);
  }

  closeEquipmentEditor(): void {
    if (this.savingEquipment()) return;
    this.showEquipmentEditor.set(false);
  }

  submitEquipment(): void {
    if (!this.canManage() || this.savingEquipment()) return;
    this.equipmentForm.markAllAsTouched();
    if (this.equipmentForm.invalid) return;

    const input = this.equipmentForm.getRawValue();
    if (!Number.isSafeInteger(input.initialAvailableQty) || input.initialAvailableQty < 0) {
      this.saveEquipmentError.set('Ingresa una cantidad inicial entera mayor o igual a 0.');
      return;
    }
    const request: CreateEquipmentRequest = {
      name: input.name.trim(),
      description: input.description.trim() || null,
      active: input.active,
      initialAvailableQty: input.initialAvailableQty,
    };
    if (!request.name) {
      this.saveEquipmentError.set('El nombre del equipo es obligatorio.');
      return;
    }

    this.savingEquipment.set(true);
    this.saveEquipmentError.set('');
    this.saveEquipmentMessage.set('');

    this.dataService.createEquipment(request).subscribe({
      next: (result) => {
        this.savingEquipment.set(false);
        this.showEquipmentEditor.set(false);
        this.saveEquipmentMessage.set(`Equipo #${result.id} (${result.name}) creado correctamente con stock inicial ${result.availableQty}.`);
        this.retryEquipment();
      },
      error: (error: HttpErrorResponse) => {
        this.savingEquipment.set(false);
        this.saveEquipmentError.set(this.saveEquipmentErrorText(error));
      },
    });
  }

  private saveEquipmentErrorText(error: HttpErrorResponse): string {
    if (error.status === 0) return 'API Gateway no está disponible. Revisa la conexión y el despliegue.';
    if (error.status === 401) return 'Inicia sesión nuevamente para gestionar equipos.';
    if (error.status === 403) return 'Solo Admin puede registrar nuevos equipos.';
    if (error.status === 400) return 'El backend rechazó los datos del equipo. Revisa nombre y stock inicial.';
    return 'No se pudo crear el equipo. Intenta nuevamente.';
  }

  clearEquipmentFilters(): void {
    this.equipmentSearch.setValue('');
    this.equipmentStatus.setValue('');
  }

  retryEquipment(): void {
    this.equipmentRetrySubject.next();
  }
}
