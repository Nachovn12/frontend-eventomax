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
  afterEach(() => vi.restoreAllMocks());
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

  it('shows organizer upcoming, overdue and live events with detail links from the authorized API list', async () => {
    roles.set([AppRole.Organizador]);
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-10T12:00:00Z').getTime());
    const sample = (id: number, scheduledAt: string, status: Production['status']): Production => ({
      id, name: `Own ${id}`, organizerId: 'business-own', location: 'Venue', scheduledAt, status,
      createdAt: '', updatedAt: ''
    });
    dataServiceMock.getProductions.mockReturnValue(of([
      sample(1, '2030-01-11T12:00:00Z', 'SOLICITADO'),
      sample(2, '2030-01-09T12:00:00Z', 'CONFIRMADO'),
      sample(3, '2030-01-09T12:00:00Z', 'EN_MONTAJE'),
      sample(4, '2030-01-11T12:00:00Z', 'CERRADO')
    ]));
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.upcoming().map(p => p.id)).toEqual([1]);
    expect(fixture.componentInstance.overdueProductions().map(p => p.id)).toEqual([2]);
    expect(fixture.componentInstance.liveProductions().map(p => p.id)).toEqual([3]);
    expect(fixture.nativeElement.querySelector('a[href="/productions?productionId=1"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Mis eventos');
    expect(fixture.nativeElement.textContent).toContain('Pendientes atrasadas');
    expect(fixture.nativeElement.textContent).not.toContain('Own 4');
    expect(dataServiceMock.getCatalogServices).not.toHaveBeenCalled();
    expect(reportsMock.getKpis).not.toHaveBeenCalled();
  });

  it('filters the entire agenda before limiting to four and treats the exact current instant as upcoming', async () => {
    roles.set([AppRole.Productor]);
    const now = new Date('2030-01-10T12:00:00Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    dataServiceMock.getProductions.mockReturnValue(of(Array.from({ length: 7 }, (_, i): Production => ({
      id: i + 1, name: `Event ${i}`, organizerId: 'org', location: 'Venue',
      scheduledAt: new Date(now + i * 3600000).toISOString(),
      status: i < 5 ? 'CONFIRMADO' : 'SOLICITADO', createdAt: '', updatedAt: ''
    }))));
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.setPipelineFilter('requested');
    fixture.detectChanges();
    expect(fixture.componentInstance.filteredUpcoming().map(p => p.id)).toEqual([6, 7]);
    expect(fixture.componentInstance.upcomingProductions()).toHaveLength(7);
    expect(fixture.nativeElement.textContent).toContain('Mostrando 2 de 2');
  });

  it('distinguishes organizer loading and network failure from an empty authorized list and allows retry', async () => {
    roles.set([AppRole.Organizador]);
    const pending = new Subject<readonly Production[]>();
    dataServiceMock.getProductions.mockReturnValue(pending);
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.skeleton')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('No tienes próximas');
    pending.error(new Error('Network unavailable'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('No tienes próximas');
    dataServiceMock.getProductions.mockReturnValue(of([]));
    fixture.nativeElement.querySelector('[role="alert"] button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No tienes próximas');
    expect(dataServiceMock.getCatalogServices).not.toHaveBeenCalled();
    expect(reportsMock.getKpis).not.toHaveBeenCalled();
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
    expect(text).toContain('2 abiertas');
    expect(text).toContain('Pendientes1');
    expect(text).toContain('En operación0');
    expect(text).toContain('Servicios activos 1/2');
  });

  it('orders future productions chronologically and takes first 4', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-01T00:00:00Z').getTime());
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
    vi.restoreAllMocks();
  });

  it('loads the organizer authorized list without catalog or reports', async () => {
    roles.set([AppRole.Organizador]);
    dataServiceMock.getProductions.mockReturnValue(of([]));

    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(dataServiceMock.getProductions).toHaveBeenCalledTimes(1);
    expect(dataServiceMock.getCatalogServices).not.toHaveBeenCalled();
    expect(reportsMock.getKpis).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Mis eventos');
    expect(fixture.nativeElement.textContent).toContain('No tienes próximas producciones');
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

  it('polls productions, catalog and Admin KPIs every 30s for quasi-real-time updates', async () => {
    vi.useFakeTimers();
    try {
      roles.set([AppRole.Admin]);
      fixture = TestBed.createComponent(Dashboard);
      fixture.detectChanges();

      expect(dataServiceMock.getProductions).toHaveBeenCalledTimes(1);
      expect(reportsMock.getKpis).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(30_000);
      fixture.detectChanges();

      expect(dataServiceMock.getProductions).toHaveBeenCalledTimes(2);
      expect(reportsMock.getKpis).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses dynamic Chile timezone abbreviations (CLST in summer, CLT in winter) on telemetry axis instead of hardcoded CLT', async () => {
    roles.set([AppRole.Admin]);
    // Summer anchor (November = CLST, UTC-3): 22:00Z -> 19:00 CLST
    reportsMock.getKpis.mockReturnValue(of({
      ...reportResponse,
      generatedAt: '2026-11-23T22:00:00Z',
    }));
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.telemetryAxisLabels().now).toBe('19:00');
    expect(fixture.componentInstance.telemetryAxisLabels().tzAbbr).toBe('CLST');
    expect(fixture.nativeElement.textContent).toContain('Tiempo Real (19:00 CLST)');
    expect(fixture.nativeElement.textContent).not.toContain('Tiempo Real (19:00 CLT)');

    // Winter anchor (July = CLT, UTC-4): 22:00Z -> 18:00 CLT
    reportsMock.getKpis.mockReturnValue(of({
      ...reportResponse,
      generatedAt: '2026-07-15T22:00:00Z',
    }));
    fixture.componentInstance.retry();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.telemetryAxisLabels().now).toBe('18:00');
    expect(fixture.componentInstance.telemetryAxisLabels().tzAbbr).toBe('CLT');
    expect(fixture.nativeElement.textContent).toContain('Tiempo Real (18:00 CLT)');
  });

});
