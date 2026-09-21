import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Production, ProductionStatus } from '../../core/models/production.model';
import { ApiClientService } from '../../core/http/api-client.service';
import { environment } from '../../../environments/environment';

export const PRODUCTION_STATUSES: readonly ProductionStatus[] = [
  'SOLICITADO',
  'CONFIRMADO',
  'EN_MONTAJE',
  'EN_EJECUCION',
  'CERRADO',
  'CANCELADO',
];

@Injectable({ providedIn: 'root' })
export class ProductionsDataService {
  private readonly apiClient = inject(ApiClientService);

  getProductions(): Observable<readonly Production[]> {
    return this.apiClient.get<readonly Production[]>(`${environment.apiGatewayUrl}/api/productions`);
  }

  getStatuses(): Observable<readonly ProductionStatus[]> {
    return of(PRODUCTION_STATUSES);
  }
}
