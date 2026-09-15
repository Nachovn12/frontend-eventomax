import { Injectable } from '@angular/core';
import { DEMO_EQUIPMENT, DEMO_INVENTORY } from '../../demo/eventomax.fixtures';

@Injectable({ providedIn: 'root' })
export class CatalogDataService {
  getEquipment() {
    return DEMO_EQUIPMENT;
  }

  getInventory() {
    return DEMO_INVENTORY;
  }
}
