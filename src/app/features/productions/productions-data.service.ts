import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Production, ProductionStatus, CreateProductionRequest, ProductionStatusUpdateRequest } from '../../core/models/production.model';
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

  getProduction(id: number): Observable<Production> {
    return this.apiClient.get<Production>(`${environment.apiGatewayUrl}/api/productions/${id}`);
  }

  createProduction(request: CreateProductionRequest): Observable<Production> {
    return this.apiClient.post<Production>(`${environment.apiGatewayUrl}/api/productions`, request);
  }

  updateStatus(id: number, request: ProductionStatusUpdateRequest): Observable<Production> {
    return this.apiClient.put<Production>(`${environment.apiGatewayUrl}/api/productions/${id}/status`, request);
  }

  getStatuses(): Observable<readonly ProductionStatus[]> {
    return of(PRODUCTION_STATUSES);
  }
}
