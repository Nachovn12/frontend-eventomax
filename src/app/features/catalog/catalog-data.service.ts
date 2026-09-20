import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DEMO_EQUIPMENT, DEMO_INVENTORY } from '../../demo/eventomax.fixtures';
import { Equipment } from './models/equipment.model';
import { InventorySummary } from './models/inventory.model';

@Injectable({ providedIn: 'root' })
export class CatalogDataService {
  getEquipment(): Observable<readonly Equipment[]> {
    return of(DEMO_EQUIPMENT);
  }

  getInventory(): Observable<InventorySummary> {
    return of(DEMO_INVENTORY);
  }
}
