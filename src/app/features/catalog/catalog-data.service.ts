import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CatalogService, CatalogServiceUpsertRequest } from './models/catalog-service.model';
import { Equipment, CreateEquipmentRequest, EquipmentReservationItem } from './models/equipment.model';
import { ApiClientService } from '../../core/http/api-client.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CatalogDataService {
  private readonly apiClient = inject(ApiClientService);

  createService(request: CatalogServiceUpsertRequest): Observable<CatalogService> {
    return this.apiClient.post<CatalogService>(`${environment.apiGatewayUrl}/api/catalog/services`, request);
  }

  updateService(id: number, request: CatalogServiceUpsertRequest): Observable<CatalogService> {
    return this.apiClient.put<CatalogService>(`${environment.apiGatewayUrl}/api/catalog/services/${id}`, request);
  }

  getServices(): Observable<readonly CatalogService[]> {
    return this.apiClient.get<readonly CatalogService[]>(`${environment.apiGatewayUrl}/api/catalog/services`);
  }

  getEquipment(): Observable<readonly Equipment[]> {
    return this.apiClient.get<readonly Equipment[]>(`${environment.apiGatewayUrl}/api/catalog/equipment`);
  }

  createEquipment(request: CreateEquipmentRequest): Observable<Equipment> {
    return this.apiClient.post<Equipment>(`${environment.apiGatewayUrl}/api/catalog/equipment`, request);
  }

  getReservationsByProduction(productionId: number): Observable<readonly EquipmentReservationItem[]> {
    return this.apiClient.get<readonly EquipmentReservationItem[]>(`${environment.apiGatewayUrl}/api/catalog/reservations/production/${productionId}`);
  }
}
