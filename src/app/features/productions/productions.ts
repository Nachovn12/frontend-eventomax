import { Component, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DemoStatus } from '../../demo/eventomax.fixtures';
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

  readonly statuses = this.dataService.getStatuses();
  readonly search = new FormControl('', { nonNullable: true });
  readonly status = new FormControl<DemoStatus | ''>('', { nonNullable: true });
  readonly scenario = new FormControl<'data' | 'empty' | 'error'>('data', { nonNullable: true });
  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  private readonly selectedStatus = toSignal(this.status.valueChanges, { initialValue: '' });
  readonly view = toSignal(this.scenario.valueChanges, { initialValue: 'data' });
  readonly announcement = signal('');
  readonly rows = computed(() => {
    if (this.view() !== 'data') return [];
    const query = this.query().trim().toLocaleLowerCase('es');
    return this.dataService.getProductions().filter(
      (item) =>
        (!this.selectedStatus() || item.status === this.selectedStatus()) &&
        [item.id, item.name, item.client, item.venue].some((value) =>
          value.toLocaleLowerCase('es').includes(query),
        ),
    );
  });
  readonly total = this.dataService.getProductions().length;
  readonly active = this.dataService.getProductions().filter((item) =>
    ['EN_MONTAJE', 'EN_EJECUCIÓN'].includes(item.status),
  ).length;
  readonly pending = this.dataService.getProductions().filter((item) => item.status === 'SOLICITADO').length;
  readonly closed = this.dataService.getProductions().filter((item) => item.status === 'CERRADO').length;
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
