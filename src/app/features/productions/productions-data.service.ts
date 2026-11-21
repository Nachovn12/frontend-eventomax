import { Injectable, inject } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import {
  Production,
  ProductionStatus,
  CreateProductionRequest,
  ProductionStatusUpdateRequest,
  CrewTicket,
  OrganizerContact,
  OrganizerContactRequest,
} from '../../core/models/production.model';
import { ApiClientService } from '../../core/http/api-client.service';
import { environment } from '../../../environments/environment';
import { ActiveProductionsStore } from '../../core/state/active-productions.store';

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
  private readonly activeStore = inject(ActiveProductionsStore);

  getProductions(): Observable<readonly Production[]> {
    return this.apiClient.get<readonly Production[]>(`${environment.apiGatewayUrl}/api/productions`).pipe(
      tap((productions) => this.activeStore.updateFromProductions(productions))
    );
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

  getCrewTicket(productionId: number): Observable<CrewTicket> {
    return this.apiClient.get<CrewTicket>(`${environment.apiGatewayUrl}/api/productions/${productionId}/crew-ticket`);
  }

  downloadQuotePdf(productionId: number): Observable<Blob> {
    return this.apiClient.getBlob(`${environment.apiGatewayUrl}/api/productions/${productionId}/quote-pdf`);
  }

  getOrganizerContact(organizerId: string): Observable<OrganizerContact> {
    return this.apiClient.get<OrganizerContact>(
      `${environment.apiGatewayUrl}/api/organizers/${encodeURIComponent(organizerId.trim())}/contact`
    );
  }

  upsertOrganizerContact(organizerId: string, request: OrganizerContactRequest): Observable<OrganizerContact> {
    return this.apiClient.put<OrganizerContact>(
      `${environment.apiGatewayUrl}/api/organizers/${encodeURIComponent(organizerId.trim())}/contact`,
      request
    );
  }

  getStatuses(): Observable<readonly ProductionStatus[]> {
    return of(PRODUCTION_STATUSES);
  }
}
