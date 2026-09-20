import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ProductionViewModel } from '../../core/models/production.model';
import { DEMO_INVENTORY, DEMO_PRODUCTIONS, DEMO_PERIOD, DEMO_AUDIT } from '../../demo/eventomax.fixtures';

@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  getPeriod(): Observable<string> {
    return of(DEMO_PERIOD);
  }

  getProductions(): Observable<readonly ProductionViewModel[]> {
    return of(DEMO_PRODUCTIONS);
  }

  getInventory(): Observable<any> {
    return of(DEMO_INVENTORY);
  }

  getAuditActivity(): Observable<readonly any[]> {
    return of(DEMO_AUDIT);
  }
}
