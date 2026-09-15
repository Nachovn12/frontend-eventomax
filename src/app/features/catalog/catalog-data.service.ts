import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DEMO_EQUIPMENT, DEMO_INVENTORY } from '../../demo/eventomax.fixtures';

@Injectable({ providedIn: 'root' })
export class CatalogDataService {
  getEquipment(): Observable<readonly any[]> {
    return of(DEMO_EQUIPMENT);
  }

  getInventory(): Observable<any> {
    return of(DEMO_INVENTORY);
  }
}
