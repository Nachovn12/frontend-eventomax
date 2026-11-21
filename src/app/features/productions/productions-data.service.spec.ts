import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProductionsDataService } from './productions-data.service';
import { environment } from '../../../environments/environment';
import { Production } from '../../core/models/production.model';

describe('ProductionsDataService', () => {
  let service: ProductionsDataService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProductionsDataService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ProductionsDataService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should request productions from the configured API Gateway URL', () => {
    const mockResponse: Production[] = [
      {
        id: 1,
        name: 'Prod 1',
        organizerId: 'org1',
        location: 'loc1',
        scheduledAt: '2026-09-14T09:00:00Z',
        status: 'CONFIRMADO',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    service.getProductions().subscribe((data) => {
      expect(data).toEqual(mockResponse);
    });

    const req = httpTestingController.expectOne(`${environment.apiGatewayUrl}/api/productions`);
    expect(req.request.method).toEqual('GET');

    // MsalInterceptor adds Authorization internally, service should not do it manually
    expect(req.request.headers.has('Authorization')).toBe(false);

    req.flush(mockResponse);
  });

  it('should return contractual statuses', () => {
    service.getStatuses().subscribe((statuses) => {
      expect(statuses).toEqual([
        'SOLICITADO',
        'CONFIRMADO',
        'EN_MONTAJE',
        'EN_EJECUCION',
        'CERRADO',
        'CANCELADO'
      ]);
    });
  });

  it('loads production detail through API Gateway', () => {
    service.getProduction(42).subscribe();
    const req = httpTestingController.expectOne(`${environment.apiGatewayUrl}/api/productions/42`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ id: 42 });
  });

  it('creates a production with organizerId using POST, without manually setting JWT', () => {
    const body = { organizerId: 'org-7', name: 'Evento de prueba', scheduledAt: '2026-12-20T18:00:00', location: 'Santiago' };
    service.createProduction(body).subscribe();
    const req = httpTestingController.expectOne(`${environment.apiGatewayUrl}/api/productions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ id: 7, ...body, status: 'SOLICITADO' });
  });

  it('updates status with the backend contract via PUT', () => {
    service.updateStatus(7, { status: 'EN_MONTAJE' }).subscribe();
    const req = httpTestingController.expectOne(`${environment.apiGatewayUrl}/api/productions/7/status`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'EN_MONTAJE' });
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ id: 7, status: 'EN_MONTAJE' });
  });

  it('updates status with reservation items when confirming', () => {
    const updateRequest = {
      status: 'CONFIRMADO' as const,
      items: [{ equipmentId: 1, quantity: 2 }]
    };
    service.updateStatus(7, updateRequest).subscribe();
    const req = httpTestingController.expectOne(`${environment.apiGatewayUrl}/api/productions/7/status`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateRequest);
    req.flush({ id: 7, status: 'CONFIRMADO' });
  });

  it('requests crew ticket via GET /api/productions/{id}/crew-ticket', () => {
    const mockTicket = {
      id: 1,
      productionId: 42,
      eventId: 'evt-1',
      productionName: 'Prod 42',
      scheduledAt: '2026-11-20T18:00:00',
      location: 'Loc',
      status: 'EN_MONTAJE',
      instructions: 'Instrucciones',
      createdAt: '2026-10-19T10:00:00',
      updatedAt: '2026-10-19T10:00:00'
    };
    service.getCrewTicket(42).subscribe((ticket) => {
      expect(ticket).toEqual(mockTicket);
    });
    const req = httpTestingController.expectOne(`${environment.apiGatewayUrl}/api/productions/42/crew-ticket`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTicket);
  });

  it('downloads quote PDF via GET /api/productions/{id}/quote-pdf as blob', () => {
    const mockBlob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
    service.downloadQuotePdf(42).subscribe((blob) => {
      expect(blob).toEqual(mockBlob);
    });
    const req = httpTestingController.expectOne(`${environment.apiGatewayUrl}/api/productions/42/quote-pdf`);
    expect(req.request.method).toBe('GET');
    req.flush(mockBlob);
  });

  it('fetches organizer contact via GET /api/organizers/{organizerId}/contact without manual Authorization header', () => {
    const ownerId = 'f191bdc8-7926-4722-9ec0-cba663701940:11111111-2222-3333-4444-555555555555';
    const mockContact = {
      id: 1,
      organizerId: ownerId,
      email: 'ig.valeria@duocuc.cl',
      contactName: 'Ignacio Valeria',
      phone: '+56912345678',
      active: true,
    };

    service.getOrganizerContact(ownerId).subscribe((res) => {
      expect(res).toEqual(mockContact);
    });

    const req = httpTestingController.expectOne(
      `${environment.apiGatewayUrl}/api/organizers/${encodeURIComponent(ownerId)}/contact`
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(mockContact);
  });

  it('upserts organizer contact via PUT /api/organizers/{organizerId}/contact without manual Authorization header', () => {
    const body = {
      email: 'ig.valeria@duocuc.cl',
      contactName: 'Ignacio Valeria',
      phone: '+56912345678',
    };

    service.upsertOrganizerContact('org-demo-ignacio-valeria', body).subscribe((res) => {
      expect(res.email).toBe('ig.valeria@duocuc.cl');
    });

    const req = httpTestingController.expectOne(
      `${environment.apiGatewayUrl}/api/organizers/org-demo-ignacio-valeria/contact`
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ id: 1, organizerId: 'org-demo-ignacio-valeria', ...body, active: true });
  });

  it('propagates 404 and 403 errors from organizer contact endpoints', () => {
    let status404 = 0;
    service.getOrganizerContact('org-missing').subscribe({
      error: (err) => (status404 = err.status),
    });
    const req404 = httpTestingController.expectOne(`${environment.apiGatewayUrl}/api/organizers/org-missing/contact`);
    req404.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
    expect(status404).toBe(404);

    let status403 = 0;
    service.upsertOrganizerContact('org-other', { email: 'a@b.cl' }).subscribe({
      error: (err) => (status403 = err.status),
    });
    const req403 = httpTestingController.expectOne(`${environment.apiGatewayUrl}/api/organizers/org-other/contact`);
    req403.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    expect(status403).toBe(403);
  });
});
