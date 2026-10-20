import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../../core/http/api-client.service';
import { environment } from '../../../environments/environment';
import { AuditEvent, AuditTimelineFilters } from './models/audit-event.model';

@Injectable({ providedIn: 'root' })
export class AuditDataService {
  private readonly api = inject(ApiClientService);

  /** API Gateway → BFF → Audit; el backend retorna un array sin total de páginas. */
  getTimeline(filters: AuditTimelineFilters = {}): Observable<readonly AuditEvent[]> {
    const params = new URLSearchParams();
    if (filters.actor?.trim()) params.set('actor', filters.actor.trim());
    if (filters.type?.trim()) params.set('type', filters.type.trim());
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    params.set('page', String(filters.page ?? 0));
    params.set('size', String(filters.size ?? 50));
    return this.api.get<readonly AuditEvent[]>(
      `${environment.apiGatewayUrl}/api/audit/timeline?${params.toString()}`
    );
  }
}
