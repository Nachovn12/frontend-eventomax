import { Injectable } from '@angular/core';
import { DEMO_PRODUCTIONS, DEMO_STATUSES } from '../../demo/eventomax.fixtures';

@Injectable({ providedIn: 'root' })
export class ProductionsDataService {
  getProductions() {
    return DEMO_PRODUCTIONS;
  }

  getStatuses() {
    return DEMO_STATUSES;
  }
}
