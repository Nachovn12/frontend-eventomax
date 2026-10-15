import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { Dashboard } from './dashboard';
import { DashboardDataService } from './dashboard-data.service';
import { ReportsDataService } from '../reports/reports-data.service';
import { ReportKpisResponse } from '../reports/models/report.model';
import { of, throwError, Subject } from 'rxjs';
import { Production } from '../../core/models/production.model';
import { CatalogService } from '../catalog/models/catalog-service.model';

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  const roles = signal<AppRole[]>([]);
  let dataServiceMock: any;
  let reportsMock: { getKpis: ReturnType<typeof vi.fn> };

  const reportResponse: ReportKpisResponse = {
    range: 'last24h', from: '2026-10-14T00:00:00Z', to: '2026-10-15T00:00:00Z',
    generatedAt: '2026-10-15T00:00:00Z',
    partialCoverage: { isPartial: true, description: 'Datos parciales de transiciones' },
    metrics: { totalStatusChanges: 3, closedCount: 1, cancelledCount: 0,
      currentStatusDistribution: { CONFIRMADO: 3 }, transitions: [] }
  };

  beforeEach(async () => {
    roles.set([]);

    dataServiceMock = {
      getProductions: vi.fn(() => of([])),
      getCatalogServices: vi.fn(() => of([])),
    };

    reportsMock = { getKpis: vi.fn(() => of(reportResponse)) };
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        { provide: AuthorizationService, useValue: { roles, hasScope: () => true } },
        { provide: DashboardDataService, useValue: dataServiceMock },
        { provide: ReportsDataService, useValue: reportsMock }
      ],
    }).compileComponents();
  });

  it('renders loading state initially, then real operational metrics', async () => {
    roles.set([AppRole.Admin]);
    dataServiceMock.getProductions.mockReturnValue(of([
      { id: 1, name: 'P1', organizerId: 'org', location: 'L1', scheduledAt: '2026-09-14', status: 'SOLICITADO', createdAt: '', updatedAt: '' },
      { id: 2, name: 'P2', organizerId: 'org', location: 'L2', scheduledAt: '2026-09-15', status: 'CONFIRMADO', createdAt: '', updatedAt: '' }
    ]));
    dataServiceMock.getCatalogServices.mockReturnValue(of([
      { id: 1, name: 'S1', description: '', rate: 10, active: true },
      { id: 2, name: 'S2', description: '', rate: 20, active: false }
    ]));

    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Producciones2');
    expect(text).toContain('Pendientes1');
    expect(text).toContain('En operación0');
    expect(text).toContain('Servicios activos 1/2');
  });

  it('orders upcoming productions chronologically and takes first 4', async () => {
    roles.set([AppRole.Admin]);
    dataServiceMock.getProductions.mockReturnValue(of([
      { id: 1, name: 'P1', organizerId: 'org', location: 'L1', scheduledAt: '2026-09-20T00:00:00Z', status: 'CONFIRMADO', createdAt: '', updatedAt: '' },
      { id: 2, name: 'P2', organizerId: 'org', location: 'L2', scheduledAt: '2026-09-10T00:00:00Z', status: 'SOLICITADO', createdAt: '', updatedAt: '' },
      { id: 3, name: 'P3', organizerId: 'org', location: 'L3', scheduledAt: '2026-09-15T00:00:00Z', status: 'CONFIRMADO', createdAt: '', updatedAt: '' },
      { id: 4, name: 'P4', organizerId: 'org', location: 'L4', scheduledAt: '2026-09-25T00:00:00Z', status: 'CONFIRMADO', createdAt: '', updatedAt: '' },
      { id: 5, name: 'P5', organizerId: 'org', location: 'L5', scheduledAt: '2026-09-12T00:00:00Z', status: 'CONFIRMADO', createdAt: '', updatedAt: '' }
    ]));

    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const upcoming = fixture.componentInstance.upcoming();
    expect(upcoming.length).toBe(4);
    expect(upcoming[0].id).toBe(2);
    expect(upcoming[1].id).toBe(5);
    expect(upcoming[2].id).toBe(3);
    expect(upcoming[3].id).toBe(1);
  });

  it('displays organizer isolation note and skips catalog and productions requests', async () => {
    roles.set([AppRole.Organizador]);
    dataServiceMock.getProductions.mockReturnValue(of([]));

    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(dataServiceMock.getProductions).not.toHaveBeenCalled();
    expect(dataServiceMock.getCatalogServices).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('La consulta personalizada de producciones estará disponible cuando el servicio aplique el alcance de datos por organizador');
  });

  it('shows error state when requests fail and can retry', async () => {
    roles.set([AppRole.Admin]);
    dataServiceMock.getProductions.mockReturnValue(throwError(() => new Error('Network error')));

    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar tu panel');
    expect(fixture.nativeElement.querySelector('.metric-value')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    dataServiceMock.getProductions.mockReturnValue(of([]));
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    fixture.detectChanges();
    expect(dataServiceMock.getProductions).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.metric-value')).toHaveLength(4);
  });

  it('keeps metrics hidden until both API requests complete', () => {
    roles.set([AppRole.Admin]);
    const productions = new Subject<readonly Production[]>();
    const catalog = new Subject<readonly CatalogService[]>();
    dataServiceMock.getProductions.mockReturnValue(productions);
    dataServiceMock.getCatalogServices.mockReturnValue(catalog);
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.metric-value')).toBeNull();
    productions.next([]);
    productions.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.metric-value')).toBeNull();
    catalog.error(new Error('Catalog unavailable'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.metric-value')).toBeNull();
  });

  it('auditor does not fetch any API data and shows safe state', async () => {
    roles.set([AppRole.Auditor]);
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(dataServiceMock.getProductions).not.toHaveBeenCalled();
    expect(dataServiceMock.getCatalogServices).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Revisa los eventos reales y su trazabilidad en el módulo Auditoría');
  });

  it('shows Admin Report KPIs and links to protected /reports without inventing totals', async () => {
    roles.set([AppRole.Admin]);
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(reportsMock.getKpis).toHaveBeenCalledWith('last24h');
    expect(fixture.nativeElement.textContent).toContain('Cambios de estado observados');
    expect(fixture.nativeElement.textContent).toContain('Datos parciales de transiciones');
    expect(fixture.nativeElement.querySelector('a[href="/reports"]')).not.toBeNull();
  });

  it('does not fetch Report or expose Report link for Productor', async () => {
    roles.set([AppRole.Productor]);
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(reportsMock.getKpis).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('a[href="/reports"]')).toBeNull();
  });

  it('keeps operational dashboard visible when Report fails', async () => {
    roles.set([AppRole.Admin]);
    reportsMock.getKpis.mockReturnValue(throwError(() => ({ status: 502 })));
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('El resto del panel continúa operativo');
    expect(fixture.nativeElement.querySelectorAll('.metric-value')).toHaveLength(4);
  });

  it('provides Auditor navigation without leaking operational data', async () => {
    roles.set([AppRole.Auditor]);
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a[href="/audit"]')).not.toBeNull();
    expect(reportsMock.getKpis).not.toHaveBeenCalled();
    expect(dataServiceMock.getProductions).not.toHaveBeenCalled();
  });

});
