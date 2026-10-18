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

  it('requests equipment inventory from the configured API Gateway URL', () => {
    const rawBackend = [
      { id: 1, name: 'Parlante Line Array', description: 'Audio PA', active: true, availableQty: 8, reservedQty: 2 },
    ];
    service.getEquipment().subscribe((data) => {
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe(1);
      expect(data[0].name).toBe('Parlante Line Array');
      expect(data[0].description).toBe('Audio PA');
      expect(data[0].active).toBe(true);
      expect(data[0].availableQty).toBe(8);
      expect(data[0].reservedQty).toBe(2);
      expect(data[0].totalQuantity).toBe(10);
      expect(data[0].availableQuantity).toBe(8);
      expect(data[0].status).toBe('DISPONIBLE');
    });
    const req = httpTestingController.expectOne(`${environment.apiGatewayUrl}/api/catalog/equipment`);
    expect(req.request.method).toBe('GET');
    req.flush(rawBackend);
  });

  it('creates equipment through the protected Gateway route', () => {
    const request = { name: 'Foco LED RGB', description: 'Equipo de iluminación', active: true, initialAvailableQty: 20 };
    service.createEquipment(request).subscribe((data) => {
      expect(data.id).toBe(2);
      expect(data.name).toBe('Foco LED RGB');
      expect(data.availableQty).toBe(20);
      expect(data.totalQuantity).toBe(20);
      expect(data.status).toBe('DISPONIBLE');
    });
    const req = httpTestingController.expectOne(`${environment.apiGatewayUrl}/api/catalog/equipment`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ id: 2, name: 'Foco LED RGB', description: 'Equipo de iluminación', active: true, availableQty: 20, reservedQty: 0 });
  });

  it('updates equipment through the protected Gateway route omitting availableQty when retaining stock', () => {
    const request = { name: 'Foco LED RGB Actualizado', description: 'Nueva versión', active: true };
    service.updateEquipment(2, request).subscribe((data) => {
      expect(data.id).toBe(2);
      expect(data.name).toBe('Foco LED RGB Actualizado');
      expect(data.availableQty).toBe(20);
    });
    const req = httpTestingController.expectOne(`${environment.apiGatewayUrl}/api/catalog/equipment/2`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      name: 'Foco LED RGB Actualizado',
      description: 'Nueva versión',
      active: true,
    });
    expect(req.request.body).not.toHaveProperty('availableQty');
    req.flush({ id: 2, name: 'Foco LED RGB Actualizado', description: 'Nueva versión', active: true, availableQty: 20, reservedQty: 0 });
  });

  it('updates equipment through the protected Gateway route preserving availableQty=0 when adjusted to zero', () => {
    const request = { name: 'Foco LED RGB Agotado', description: null, active: true, availableQty: 0 };
    service.updateEquipment(2, request).subscribe((data) => {
      expect(data.id).toBe(2);
      expect(data.availableQty).toBe(0);
      expect(data.status).toBe('AGOTADO');
    });
    const req = httpTestingController.expectOne(`${environment.apiGatewayUrl}/api/catalog/equipment/2`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      name: 'Foco LED RGB Agotado',
      description: null,
      active: true,
      availableQty: 0,
    });
    expect(req.request.body.availableQty).toBe(0);
    req.flush({ id: 2, name: 'Foco LED RGB Agotado', description: null, active: true, availableQty: 0, reservedQty: 0 });
  });

  it('queries reservations for a production from the Gateway route', () => {
    const mockReservations = [
      { reservationId: 101, equipmentId: 1, equipmentName: 'Parlante Line Array', quantity: 2, status: 'RESERVED' },
    ];
    service.getReservationsByProduction(42).subscribe((data) => {
      expect(data).toEqual(mockReservations);
    });
    const req = httpTestingController.expectOne(`${environment.apiGatewayUrl}/api/catalog/reservations/production/42`);
    expect(req.request.method).toBe('GET');
    req.flush(mockReservations);
  });
});
