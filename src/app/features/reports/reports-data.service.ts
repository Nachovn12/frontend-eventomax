import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../../core/http/api-client.service';
import { environment } from '../../../environments/environment';
import { ReportKpisResponse, ReportRange, ReportTopServicesResponse } from './models/report.model';

@Injectable({ providedIn: 'root' })
export class ReportsDataService {
  private readonly api = inject(ApiClientService);

  /** Solo API Gateway: MSAL agrega Bearer, BFF reenvía a Report. */
  getKpis(range: ReportRange = 'last24h'): Observable<ReportKpisResponse> {
    const params = new URLSearchParams({ range });
    return this.api.get<ReportKpisResponse>(
      `${environment.apiGatewayUrl}/api/report/kpis?${params.toString()}`
    );
  }

  getTopServices(range: ReportRange = 'last7d'): Observable<ReportTopServicesResponse> {
    const params = new URLSearchParams({ range });
    return this.api.get<ReportTopServicesResponse>(
      `${environment.apiGatewayUrl}/api/report/top-services?${params.toString()}`
    );
  }
}
