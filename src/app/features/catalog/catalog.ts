import { Component, ChangeDetectionStrategy, computed, inject, signal, Signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

export function integerValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return { integer: true };
  }
  return null;
}
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
import { Equipment, CreateEquipmentRequest, EquipmentUpdateRequest } from './models/equipment.model';
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
  readonly editingEquipment = signal<Equipment | null>(null);
  readonly savingEquipment = signal(false);
  readonly saveEquipmentError = signal('');
  readonly saveEquipmentMessage = signal('');

  readonly equipmentForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
    initialAvailableQty: new FormControl<number | null>(1, { validators: [Validators.required, Validators.min(0), integerValidator] }),
    active: new FormControl(true, { nonNullable: true }),
    stockMode: new FormControl<'keep' | 'adjust'>('keep', { nonNullable: true }),
    adjustedAvailableQty: new FormControl<number | null>(0),
  });

  constructor() {
    this.setupStockModeListener();
    this.configureEquipmentFormMode(false);
  }

  private setupStockModeListener(): void {
    this.equipmentForm.controls.stockMode.valueChanges.subscribe((mode) => {
      this.syncStockModeValidation(mode);
    });
  }

  private syncStockModeValidation(mode: 'keep' | 'adjust' | null | undefined): void {
    const adjustedControl = this.equipmentForm.controls.adjustedAvailableQty;
    if (mode === 'adjust') {
      adjustedControl.enable();
      adjustedControl.setValidators([Validators.required, Validators.min(0), integerValidator]);
    } else {
      adjustedControl.disable();
      adjustedControl.clearValidators();
    }
    adjustedControl.updateValueAndValidity();
  }

  private configureEquipmentFormMode(isEdit: boolean): void {
    const initialQtyControl = this.equipmentForm.controls.initialAvailableQty;
    const stockModeControl = this.equipmentForm.controls.stockMode;

    if (isEdit) {
      initialQtyControl.disable();
      initialQtyControl.clearValidators();
      initialQtyControl.updateValueAndValidity();

      stockModeControl.enable();
      stockModeControl.updateValueAndValidity();
      this.syncStockModeValidation(stockModeControl.value);
    } else {
      stockModeControl.disable();
      stockModeControl.clearValidators();
      stockModeControl.updateValueAndValidity();

      this.syncStockModeValidation('keep');

      initialQtyControl.enable();
      initialQtyControl.setValidators([Validators.required, Validators.min(0), integerValidator]);
      initialQtyControl.updateValueAndValidity();
    }
    this.equipmentForm.updateValueAndValidity();
  }

  openCreateEquipment(): void {
    if (!this.canManage()) return;
    this.editingEquipment.set(null);
    this.equipmentForm.reset({
      name: '',
      description: '',
      initialAvailableQty: 1,
      active: true,
      stockMode: 'keep',
      adjustedAvailableQty: 0,
    });
    this.configureEquipmentFormMode(false);
    this.saveEquipmentError.set('');
    this.saveEquipmentMessage.set('');
    this.showEquipmentEditor.set(true);
  }

  openEditEquipment(item: Equipment): void {
    if (!this.canManage()) return;
    this.editingEquipment.set(item);
    this.equipmentForm.reset({
      name: item.name,
      description: item.description ?? '',
      initialAvailableQty: item.availableQty,
      active: item.active,
      stockMode: 'keep',
      adjustedAvailableQty: item.availableQty,
    });
    this.configureEquipmentFormMode(true);
    this.saveEquipmentError.set('');
    this.saveEquipmentMessage.set('');
    this.showEquipmentEditor.set(true);
  }

  closeEquipmentEditor(): void {
    if (this.savingEquipment()) return;
    this.showEquipmentEditor.set(false);
    this.editingEquipment.set(null);
    this.configureEquipmentFormMode(false);
  }

  submitEquipment(): void {
    if (!this.canManage() || this.savingEquipment()) return;
    const isEdit = this.editingEquipment() !== null;
    this.configureEquipmentFormMode(isEdit);
    this.equipmentForm.markAllAsTouched();

    if (this.equipmentForm.invalid) {
      if (this.equipmentForm.controls.name.invalid) {
        this.saveEquipmentError.set('El nombre del equipo es obligatorio.');
      } else if (isEdit && this.equipmentForm.controls.stockMode.value === 'adjust' && this.equipmentForm.controls.adjustedAvailableQty.invalid) {
        this.saveEquipmentError.set('Ingresa una cantidad disponible entera mayor o igual a 0.');
      } else if (!isEdit && this.equipmentForm.controls.initialAvailableQty.invalid) {
        this.saveEquipmentError.set('Ingresa una cantidad inicial entera mayor o igual a 0.');
      } else {
        this.saveEquipmentError.set('Revisa los datos del formulario.');
      }
      return;
    }

    const input = this.equipmentForm.getRawValue();
    const nameTrimmed = input.name.trim();
    if (!nameTrimmed) {
      this.saveEquipmentError.set('El nombre del equipo es obligatorio.');
      return;
    }
    if (nameTrimmed.length > 150) {
      this.saveEquipmentError.set('El nombre del equipo no puede superar 150 caracteres.');
      return;
    }
    const descriptionTrimmed = input.description ? input.description.trim() || null : null;
    if (descriptionTrimmed && descriptionTrimmed.length > 500) {
      this.saveEquipmentError.set('La descripción no puede superar 500 caracteres.');
      return;
    }

    const current = this.editingEquipment();
    if (current) {
      let adjustedQty: number | undefined = undefined;
      if (input.stockMode === 'adjust') {
        const rawVal = input.adjustedAvailableQty;
        if (rawVal === null || rawVal === undefined || !Number.isSafeInteger(Number(rawVal)) || Number(rawVal) < 0) {
          this.saveEquipmentError.set('Ingresa una cantidad disponible entera mayor o igual a 0.');
          return;
        }
        adjustedQty = Number(rawVal);
      }

      const request: EquipmentUpdateRequest = {
        name: nameTrimmed,
        description: descriptionTrimmed,
        active: input.active,
        ...(adjustedQty !== undefined ? { availableQty: adjustedQty } : {}),
      };

      this.savingEquipment.set(true);
      this.saveEquipmentError.set('');
      this.saveEquipmentMessage.set('');

      this.dataService.updateEquipment(current.id, request).subscribe({
        next: (result) => {
          this.savingEquipment.set(false);
          this.showEquipmentEditor.set(false);
          this.editingEquipment.set(null);
          this.configureEquipmentFormMode(false);
          this.saveEquipmentMessage.set(`Equipo #${result.id} (${result.name}) actualizado correctamente.`);
          this.retryEquipment();
        },
        error: (error: HttpErrorResponse) => {
          this.savingEquipment.set(false);
          this.saveEquipmentError.set(this.saveEquipmentErrorText(error));
        },
      });
    } else {
      const rawInit = input.initialAvailableQty;
      if (rawInit === null || rawInit === undefined || !Number.isSafeInteger(Number(rawInit)) || Number(rawInit) < 0) {
        this.saveEquipmentError.set('Ingresa una cantidad inicial entera mayor o igual a 0.');
        return;
      }
      const request: CreateEquipmentRequest = {
        name: nameTrimmed,
        description: descriptionTrimmed,
        active: input.active,
        initialAvailableQty: Number(rawInit),
      };

      this.savingEquipment.set(true);
      this.saveEquipmentError.set('');
      this.saveEquipmentMessage.set('');

      this.dataService.createEquipment(request).subscribe({
        next: (result) => {
          this.savingEquipment.set(false);
          this.showEquipmentEditor.set(false);
          this.configureEquipmentFormMode(false);
          this.saveEquipmentMessage.set(`Equipo #${result.id} (${result.name}) creado correctamente con stock inicial ${result.availableQty}.`);
          this.retryEquipment();
        },
        error: (error: HttpErrorResponse) => {
          this.savingEquipment.set(false);
          this.saveEquipmentError.set(this.saveEquipmentErrorText(error));
        },
      });
    }
  }

  private saveEquipmentErrorText(error: HttpErrorResponse): string {
    if (error.status === 0) return 'API Gateway no está disponible. Revisa la conexión y el despliegue.';
    if (error.status === 401) return 'Inicia sesión nuevamente para gestionar equipos.';
    if (error.status === 403) return 'Solo Admin puede registrar o actualizar equipos.';
    if (error.status === 400) return 'El backend rechazó los datos del equipo. Revisa nombre y cantidades.';
    if (error.status === 404) return 'El equipo ya no existe. Actualiza el listado.';
    if (error.status === 409) return 'Conflicto de concurrencia al actualizar el inventario. Reintenta la operación.';
    return 'No se pudo guardar el equipo. Intenta nuevamente.';
  }

  clearEquipmentFilters(): void {
    this.equipmentSearch.setValue('');
    this.equipmentStatus.setValue('');
  }

  retryEquipment(): void {
    this.equipmentRetrySubject.next();
  }
}
