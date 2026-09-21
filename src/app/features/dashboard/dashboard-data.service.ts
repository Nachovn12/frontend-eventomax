import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Production } from '../../core/models/production.model';
import { CatalogService } from '../catalog/models/catalog-service.model';
import { ApiClientService } from '../../core/http/api-client.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  private readonly apiClient = inject(ApiClientService);

  getProductions(): Observable<readonly Production[]> {
    return this.apiClient.get<readonly Production[]>(`${environment.apiGatewayUrl}/api/productions`);
  }

  getCatalogServices(): Observable<readonly CatalogService[]> {
    return this.apiClient.get<readonly CatalogService[]>(`${environment.apiGatewayUrl}/api/catalog/services`);
  }
}
