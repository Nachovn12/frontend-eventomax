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
import { Production, ProductionStatus } from '../../core/models/production.model';
import { ProductionTable } from '../../shared/ui/production-table';
import { ProductionsDataService } from './productions-data.service';

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
    if (error.status === 409) return 'La transición no está permitida para el estado actual de la producción.';
    if (error.status === 400) return 'Los datos enviados no cumplen las validaciones del backend.';
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
    this.dataService.getProduction(id).subscribe({
      next: (result) => this.detail.set(result),
      error: (error: HttpErrorResponse) => this.operationError.set(this.errorMessage(error))
    });
  }

  submitStatus(): void {
    if (!this.canUpdate() || this.saving()) return;
    const id = Number(this.updateId.value);
    if (!Number.isSafeInteger(id) || id < 1) {
      this.operationError.set('Selecciona una producción.');
      return;
    }
    this.saving.set(true);
    this.operationError.set('');
    this.operationSuccess.set('');
    this.dataService.updateStatus(id, { status: this.nextStatus.value }).subscribe({
      next: (production) => {
        this.saving.set(false);
        this.operationSuccess.set(`Producción #${production.id} actualizada a ${production.status}.`);
        this.detail.set(production);
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
