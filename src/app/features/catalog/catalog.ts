import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
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
} from '@lucide/angular';
import { CatalogDataService } from './catalog-data.service';
import { CatalogService, CatalogServiceUpsertRequest } from './models/catalog-service.model';
import { BehaviorSubject, of } from 'rxjs';
import { switchMap, map, catchError, startWith } from 'rxjs/operators';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';

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
  ],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalog {
  private readonly dataService = inject(CatalogDataService);
  private readonly retrySubject = new BehaviorSubject<void>(undefined);

  private readonly catalogState = toSignal(
    this.retrySubject.pipe(
      switchMap(() =>
        this.dataService.getServices().pipe(
          map((data) => ({ data, loading: false, error: false })),
          catchError(() =>
            of({ data: [] as readonly CatalogService[], loading: false, error: true }),
          ),
          startWith({ data: [] as readonly CatalogService[], loading: true, error: false }),
        ),
      ),
    ),
    { initialValue: { data: [], loading: true, error: false } },
  );

  readonly isLoading = computed(() => this.catalogState().loading);
  readonly isError = computed(() => this.catalogState().error);
  private readonly allServices = computed(() => this.catalogState().data);

  readonly total = computed(() => this.allServices().length);
  readonly activeCount = computed(() => this.allServices().filter((s) => s.active === true).length);
  readonly inactiveCount = computed(
    () => this.allServices().filter((s) => s.active === false).length,
  );

  readonly search = new FormControl('', { nonNullable: true });
  readonly status = new FormControl('', { nonNullable: true });

  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  private readonly selectedStatus = toSignal(this.status.valueChanges, { initialValue: '' });

  readonly hasActiveFilters = computed(
    () => this.query().trim() !== '' || this.selectedStatus() !== '',
  );

  readonly rows = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('es');
    return this.allServices().filter((item) => {
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


  private readonly authz = inject(AuthorizationService);
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
      active: item.active
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
    if (!Number.isFinite(input.rate) || input.rate <= 0 || !Number.isInteger(input.rate * 100)) {
      this.saveError.set('Ingresa una tarifa positiva con máximo dos decimales.');
      return;
    }
    const request: CatalogServiceUpsertRequest = {
      name: input.name.trim(),
      description: input.description.trim() || null,
      rate: input.rate,
      active: input.active
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
      }
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
}
