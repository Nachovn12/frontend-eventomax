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

});
