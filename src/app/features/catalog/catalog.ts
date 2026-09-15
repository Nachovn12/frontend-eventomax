import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Icon } from '../../shared/ui/icon';
import { CatalogDataService } from './catalog-data.service';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalog {
  private readonly dataService = inject(CatalogDataService);
  readonly inventory = this.dataService.getInventory();
  readonly categories = ['Audio', 'Iluminación', 'Escenario', 'Servicios'] as const;
  readonly search = new FormControl('', { nonNullable: true });
  readonly category = new FormControl('', { nonNullable: true });
  readonly availability = new FormControl('', { nonNullable: true });
  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  private readonly selectedCategory = toSignal(this.category.valueChanges, { initialValue: '' });
  private readonly selectedAvailability = toSignal(this.availability.valueChanges, {
    initialValue: '',
  });
  readonly rows = computed(() => {
    return this.dataService.getEquipment().filter((item) => {
      const available = item.stock - item.reserved - item.maintenance;
      const matchesAvailability =
        !this.selectedAvailability() ||
        (this.selectedAvailability() === 'available' ? available > 0 : available === 0);
      const query = this.query().trim().toLocaleLowerCase('es');
      return (
        matchesAvailability &&
        (!this.selectedCategory() || this.selectedCategory() === item.category) &&
        [item.id, item.name, item.description].some((value) =>
          value.toLocaleLowerCase('es').includes(query),
        )
      );
    });
  });
  clearFilters(): void {
    this.search.setValue('');
    this.category.setValue('');
    this.availability.setValue('');
  }
}
