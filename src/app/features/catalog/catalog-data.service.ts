import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CatalogService } from './models/catalog-service.model';
import { ApiClientService } from '../../core/http/api-client.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CatalogDataService {
  private readonly apiClient = inject(ApiClientService);

  getServices(): Observable<readonly CatalogService[]> {
    return this.apiClient.get<readonly CatalogService[]>(`${environment.apiGatewayUrl}/api/catalog/services`);
  }
}
