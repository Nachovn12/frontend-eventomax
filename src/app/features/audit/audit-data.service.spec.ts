import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditDataService } from './audit-data.service';
import { environment } from '../../../environments/environment';

describe('AuditDataService (EMX-108)', () => {
  let service: AuditDataService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuditDataService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuditDataService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('queries Audit via Gateway with default pagination, GET only', () => {
    service.getTimeline().subscribe(value => expect(value).toEqual([]));
    const req = http.expectOne(`${environment.apiGatewayUrl}/api/audit/timeline?page=0&size=50`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('Authorization')).toBe(false); // MSAL handles bearer
    req.flush([]);
  });

  it('encodes filters and preserves ISO local timestamps without offset', () => {
    service.getTimeline({
      actor: 'user@example.com', type: 'ProductionStatusChanged',
      from: '2026-10-01T10:00:00', to: '2026-10-15T18:30:00',
      page: 2, size: 25
    }).subscribe();
    const req = http.expectOne(r => r.urlWithParams.startsWith(`${environment.apiGatewayUrl}/api/audit/timeline?`));
    expect(req.request.method).toBe('GET');
    const params = new URL(req.request.urlWithParams).searchParams;
    expect(params.get('actor')).toBe('user@example.com');
    expect(params.get('type')).toBe('ProductionStatusChanged');
    expect(params.get('from')).toBe('2026-10-01T10:00:00');
    expect(params.get('to')).toBe('2026-10-15T18:30:00');
    expect(params.get('page')).toBe('2');
    expect(params.get('size')).toBe('25');
    req.flush([]);
  });
});
