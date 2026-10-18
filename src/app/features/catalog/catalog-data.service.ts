import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CatalogService, CatalogServiceUpsertRequest } from './models/catalog-service.model';
import { Equipment, CreateEquipmentRequest, EquipmentUpdateRequest, EquipmentReservationItem, BackendEquipmentResponse } from './models/equipment.model';
import { ApiClientService } from '../../core/http/api-client.service';
import { environment } from '../../../environments/environment';

function mapEquipmentResponse(raw: BackendEquipmentResponse): Equipment {
  const available = raw.availableQty ?? raw.availableQuantity ?? 0;
  const reserved = raw.reservedQty ?? 0;
  const total = raw.totalQuantity ?? (available + reserved);
  const active = raw.active ?? true;
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? null,
    category: raw.category ?? null,
    active,
    availableQty: available,
    reservedQty: reserved,
    totalQuantity: total,
    availableQuantity: available,
    status: active ? (available > 0 ? 'DISPONIBLE' : 'AGOTADO') : 'INACTIVO',
  };
}

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
    return this.apiClient.get<readonly BackendEquipmentResponse[]>(`${environment.apiGatewayUrl}/api/catalog/equipment`).pipe(
      map((items) => (items || []).map(mapEquipmentResponse))
    );
  }

  createEquipment(request: CreateEquipmentRequest): Observable<Equipment> {
    const payload = {
      name: request.name.trim(),
      description: request.description ? request.description.trim() : null,
      active: request.active ?? true,
      initialAvailableQty: request.initialAvailableQty,
    };
    return this.apiClient.post<BackendEquipmentResponse>(`${environment.apiGatewayUrl}/api/catalog/equipment`, payload).pipe(
      map(mapEquipmentResponse)
    );
  }

  updateEquipment(id: number, request: EquipmentUpdateRequest): Observable<Equipment> {
    const payload: {
      name: string;
      description: string | null;
      active: boolean;
      availableQty?: number;
    } = {
      name: request.name.trim(),
      description: request.description ? request.description.trim() : null,
      active: request.active,
    };
    if (request.availableQty !== undefined && request.availableQty !== null) {
      payload.availableQty = request.availableQty;
    }
    return this.apiClient
      .put<BackendEquipmentResponse>(`${environment.apiGatewayUrl}/api/catalog/equipment/${id}`, payload)
      .pipe(map(mapEquipmentResponse));
  }

  getReservationsByProduction(productionId: number): Observable<readonly EquipmentReservationItem[]> {
    return this.apiClient.get<readonly EquipmentReservationItem[]>(`${environment.apiGatewayUrl}/api/catalog/reservations/production/${productionId}`);
  }
}
