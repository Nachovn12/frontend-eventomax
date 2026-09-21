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
});
