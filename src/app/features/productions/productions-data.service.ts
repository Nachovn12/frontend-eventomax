import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DEMO_PRODUCTIONS, DEMO_STATUSES } from '../../demo/eventomax.fixtures';
import { ProductionViewModel, ProductionStatus } from '../../core/models/production.model';

@Injectable({ providedIn: 'root' })
export class ProductionsDataService {
  getProductions(): Observable<readonly ProductionViewModel[]> {
    return of(DEMO_PRODUCTIONS);
  }

  getStatuses(): Observable<readonly ProductionStatus[]> {
    return of(DEMO_STATUSES);
  }
}
