import { Component, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, of } from 'rxjs';
import { switchMap, map, catchError, startWith } from 'rxjs/operators';
import { ProductionStatus } from '../../core/models/production.model';
import { Icon } from '../../shared/ui/icon';
import { ProductionTable } from '../../shared/ui/production-table';
import { ProductionsDataService } from './productions-data.service';

@Component({
  selector: 'app-productions',
  standalone: true,
  imports: [ReactiveFormsModule, Icon, ProductionTable],
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
