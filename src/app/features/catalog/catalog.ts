import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Icon } from '../../shared/ui/icon';
import { CatalogDataService } from './catalog-data.service';
import { CatalogService } from './models/catalog-service.model';
import { BehaviorSubject, of } from 'rxjs';
import { switchMap, map, catchError, startWith } from 'rxjs/operators';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [ReactiveFormsModule, Icon, CurrencyPipe],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalog {
  private readonly dataService = inject(CatalogDataService);
  private readonly retrySubject = new BehaviorSubject<void>(undefined);

  private readonly catalogState = toSignal(
    this.retrySubject.pipe(
      switchMap(() => this.dataService.getServices().pipe(
        map((data) => ({ data, loading: false, error: false })),
        catchError(() => of({ data: [] as readonly CatalogService[], loading: false, error: true })),
        startWith({ data: [] as readonly CatalogService[], loading: true, error: false })
      ))
    ),
    { initialValue: { data: [], loading: true, error: false } }
  );

  readonly isLoading = computed(() => this.catalogState().loading);
  readonly isError = computed(() => this.catalogState().error);
  private readonly allServices = computed(() => this.catalogState().data);

  readonly total = computed(() => this.allServices().length);
  readonly activeCount = computed(() => this.allServices().filter((s) => s.active).length);
  readonly inactiveCount = computed(() => this.allServices().filter((s) => !s.active).length);

  readonly search = new FormControl('', { nonNullable: true });
  readonly status = new FormControl('', { nonNullable: true });

  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  private readonly selectedStatus = toSignal(this.status.valueChanges, { initialValue: '' });

  readonly rows = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('es');
    return this.allServices().filter((item) => {
      const matchesStatus =
        !this.selectedStatus() ||
        (this.selectedStatus() === 'active' ? item.active : !item.active);
      return (
        matchesStatus &&
        [String(item.id), item.name, item.description || ''].some((value) =>
          value.toLocaleLowerCase('es').includes(query),
        )
      );
    });
  });

  clearFilters(): void {
    this.search.setValue('');
    this.status.setValue('');
  }

  retry(): void {
    this.retrySubject.next();
  }
}
