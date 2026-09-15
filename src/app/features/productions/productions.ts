import { Component, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
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
  private readonly allProductions = toSignal(this.dataService.getProductions(), { initialValue: [] });

  readonly search = new FormControl('', { nonNullable: true });
  readonly status = new FormControl<ProductionStatus | ''>('', { nonNullable: true });

  // Future API loading/error state
  readonly isLoading = signal(false);
  readonly scenario = new FormControl<'data' | 'empty' | 'error'>('data', { nonNullable: true });

  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  private readonly selectedStatus = toSignal(this.status.valueChanges, { initialValue: '' });
  readonly view = toSignal(this.scenario.valueChanges, { initialValue: 'data' });

  readonly announcement = signal('');

  readonly rows = computed(() => {
    if (this.view() !== 'data') return [];
    const query = this.query().trim().toLocaleLowerCase('es');
    return this.allProductions().filter(
      (item) =>
        (!this.selectedStatus() || item.status === this.selectedStatus()) &&
        [item.id, item.name, item.client, item.venue].some((value) =>
          value.toLocaleLowerCase('es').includes(query),
        ),
    );
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

  restoreDemo(): void {
    this.clearFilters();
    this.scenario.setValue('data');
    this.announcement.set('Datos de demostración restaurados.');
  }
}
