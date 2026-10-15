import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportsDataService } from './reports-data.service';
import { environment } from '../../../environments/environment';
import { ReportKpisResponse } from './models/report.model';

describe('ReportsDataService (EMX-104)', () => {
  let service: ReportsDataService;
  let http: HttpTestingController;

  const response: ReportKpisResponse = {
    range: 'last24h',
    from: '2026-10-14T00:00:00Z',
    to: '2026-10-15T00:00:00Z',
    generatedAt: '2026-10-15T00:00:00Z',
    partialCoverage: { isPartial: true, description: 'Solo transiciones observadas' },
    metrics: {
      totalStatusChanges: 1,
      currentStatusDistribution: { CONFIRMADO: 1 },
      transitions: [{ previousStatus: 'SOLICITADO', newStatus: 'CONFIRMADO', count: 1 }],
      cancelledCount: 0,
      closedCount: 0
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReportsDataService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ReportsDataService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends a GET to API Gateway with last24h by default', () => {
    service.getKpis().subscribe(result => expect(result).toEqual(response));
    const req = http.expectOne(`${environment.apiGatewayUrl}/api/report/kpis?range=last24h`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('Authorization')).toBe(false); // MSAL interceptor owns JWT
    req.flush(response);
  });

  it('supports the contractual last7d window', () => {
    service.getKpis('last7d').subscribe();
    const req = http.expectOne(`${environment.apiGatewayUrl}/api/report/kpis?range=last7d`);
    expect(req.request.method).toBe('GET');
    req.flush({ ...response, range: 'last7d' });
  });
});
