import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CatalogDataService } from './catalog-data.service';
import { environment } from '../../../environments/environment';
import { CatalogService } from './models/catalog-service.model';

describe('CatalogDataService', () => {
  let service: CatalogDataService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CatalogDataService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CatalogDataService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should request catalog services from the configured API Gateway URL', () => {
    const mockResponse: CatalogService[] = [
      {
        id: 1,
        name: 'Service 1',
        description: 'Desc 1',
        rate: 50000,
        active: true,
      },
    ];

    service.getServices().subscribe((data) => {
      expect(data).toEqual(mockResponse);
    });

    const req = httpTestingController.expectOne(`${environment.apiGatewayUrl}/api/catalog/services`);
    expect(req.request.method).toEqual('GET');

    // MsalInterceptor adds Authorization internally, service should not do it manually
    expect(req.request.headers.has('Authorization')).toBe(false);

    req.flush(mockResponse);
  });

  it('creates catalog services through the protected Gateway route', () => {
    const request = { name: 'Audio', description: 'Consola', rate: 1000.25, active: true };
    service.createService(request).subscribe();
    const req = httpTestingController.expectOne(`${environment.apiGatewayUrl}/api/catalog/services`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ id: 5, ...request });
  });

  it('updates catalog services through the protected Gateway route', () => {
    const request = { name: 'Audio', description: null, rate: 1100, active: false };
    service.updateService(5, request).subscribe();
    const req = httpTestingController.expectOne(`${environment.apiGatewayUrl}/api/catalog/services/5`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ id: 5, ...request });
  });

});
