import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Production } from '../../core/models/production.model';
import { CatalogService } from '../catalog/models/catalog-service.model';
import { ApiClientService } from '../../core/http/api-client.service';
import { environment } from '../../../environments/environment';
import { ActiveProductionsStore } from '../../core/state/active-productions.store';

@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  private readonly apiClient = inject(ApiClientService);
  private readonly activeStore = inject(ActiveProductionsStore);

  getProductions(): Observable<readonly Production[]> {
    return this.apiClient.get<readonly Production[]>(`${environment.apiGatewayUrl}/api/productions`).pipe(
      tap((productions) => this.activeStore.updateFromProductions(productions))
    );
  }

  getCatalogServices(): Observable<readonly CatalogService[]> {
    return this.apiClient.get<readonly CatalogService[]>(`${environment.apiGatewayUrl}/api/catalog/services`);
  }
}
