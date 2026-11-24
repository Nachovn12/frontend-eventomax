import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCL from '@angular/common/locales/es-CL';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Reports } from './reports';
import { ReportsDataService } from './reports-data.service';
import { KafkaAdminDataService } from './kafka-admin-data.service';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { ReportKpisResponse, ReportTopServicesResponse } from './models/report.model';

registerLocaleData(localeEsCL);

describe('Reports EP2 (EMX-105)', () => {
  const response: ReportKpisResponse = {
    range: 'last24h',
    from: '2026-10-14T11:00:00Z',
    to: '2026-10-15T11:00:00Z',
    generatedAt: '2026-10-15T11:00:00Z',
    partialCoverage: {
      isPartial: true,
      description: 'Solo eventos ProductionStatusChanged en la ventana temporal'
    },
    metrics: {
      totalStatusChanges: 4,
      currentStatusDistribution: { CONFIRMADO: 3, EN_MONTAJE: 1 },
      transitions: [{ previousStatus: 'SOLICITADO', newStatus: 'CONFIRMADO', count: 3 }],
      cancelledCount: 0,
      closedCount: 1
    }
  };

  const topServicesResponse: ReportTopServicesResponse = {
    range: 'last7d',
    from: '2026-10-08T11:00:00Z',
    to: '2026-10-15T11:00:00Z',
    generatedAt: '2026-10-15T11:00:00Z',
    partialCoverage: {
      isPartial: true,
      description: 'Ranking calculado exclusivamente sobre contrataciones registradas en eventos de confirmación'
    },
    items: [
      { serviceId: 10, serviceName: 'Sonido e Iluminación Pro', hireCount: 5 },
      { serviceId: 20, serviceName: 'Catering Premium', hireCount: 3 }
    ]
  };

  async function setup(allowed = true) {
    const api = {
      getKpis: vi.fn(() => of(response)),
      getTopServices: vi.fn(() => of(topServicesResponse))
    };
    await TestBed.configureTestingModule({
      imports: [Reports],
      providers: [
        { provide: ReportsDataService, useValue: api },
        { provide: KafkaAdminDataService, useValue: { isAvailable: false } },
        { provide: AuthorizationService, useValue: {
          hasRole: () => allowed, hasScope: () => allowed
        } },
        { provide: LOCALE_ID, useValue: 'es-CL' }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(Reports);
    fixture.detectChanges();
    await fixture.whenStable();
    return { api, fixture, component: fixture.componentInstance };
  }

  it('renders KPI response and coverage disclaimer without invented production totals', async () => {
    const { api, fixture } = await setup();
    expect(api.getKpis).toHaveBeenCalledWith('last24h');
    expect(fixture.nativeElement.textContent).toContain('Cambios de estado');
    expect(fixture.nativeElement.textContent).toContain('Solo eventos ProductionStatusChanged');
    expect(fixture.nativeElement.textContent).toContain('CONFIRMADO');
    expect(fixture.nativeElement.querySelectorAll('.report-bar-row')).toHaveLength(2);
    // Report period timestamps rendered in Chile standard (October = CLST, UTC-3) with UTC tooltip
    expect(fixture.nativeElement.textContent).toContain('14/10/2026 · 08:00 CLST (UTC-3)');
    expect(fixture.nativeElement.textContent).toContain('15/10/2026 · 08:00 CLST (UTC-3)');
  });

  it('requests the selected reporting period', async () => {
    const { component, api } = await setup();
    component.rangeControl.setValue('last7d');
    expect(api.getKpis).toHaveBeenLastCalledWith('last7d');
    expect(api.getTopServices).toHaveBeenLastCalledWith('last7d');
  });

  it('renders top-services ranking table with items and coverage disclaimer', async () => {
    const { api, fixture } = await setup();
    expect(api.getTopServices).toHaveBeenCalledWith('last24h');
    expect(fixture.nativeElement.textContent).toContain('Servicios más contratados');
    expect(fixture.nativeElement.textContent).toContain('Sonido e Iluminación Pro');
    expect(fixture.nativeElement.textContent).toContain('Catering Premium');
    expect(fixture.nativeElement.textContent).toContain('Ranking calculado exclusivamente');
  });

  it('renders empty message when top-services has no items in range', async () => {
    const emptyTopServices: ReportTopServicesResponse = {
      ...topServicesResponse,
      items: []
    };
    const api = {
      getKpis: vi.fn(() => of(response)),
      getTopServices: vi.fn(() => of(emptyTopServices))
    };
    await TestBed.configureTestingModule({
      imports: [Reports],
      providers: [
        { provide: ReportsDataService, useValue: api },
        { provide: KafkaAdminDataService, useValue: { isAvailable: false } },
        { provide: AuthorizationService, useValue: {
          hasRole: () => true, hasScope: () => true
        } },
        { provide: LOCALE_ID, useValue: 'es-CL' }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(Reports);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Sin contrataciones de servicios registradas en este período');
  });

  it('does not request KPIs or top-services for a user without Admin and scope', async () => {
    const { api, fixture } = await setup(false);
    expect(api.getKpis).not.toHaveBeenCalled();
    expect(api.getTopServices).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Acceso restringido');
  });

  it('displays an actionable cloud error and retries', async () => {
    const { api, fixture, component } = await setup();
    api.getKpis.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 502 })));
    component.retry();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Report no está disponible');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('displays generic error text without mentioning KPIs when top-services fails with generic error (H04)', async () => {
    const { api, fixture, component } = await setup();
    api.getTopServices.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 500 })));
    component.retry();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No pudimos obtener el ranking de servicios');
    expect(fixture.nativeElement.textContent).toContain('No fue posible cargar la información. Intenta nuevamente.');
    expect(fixture.nativeElement.textContent).not.toContain('No fue posible cargar los KPIs.');
  });

  it('refreshes KPIs and top-services automatically every 30s without blanking view', async () => {
    vi.useFakeTimers();
    try {
      const api = {
        getKpis: vi.fn(() => of(response)),
        getTopServices: vi.fn(() => of(topServicesResponse))
      };
      await TestBed.configureTestingModule({
        imports: [Reports],
        providers: [
          { provide: ReportsDataService, useValue: api },
          { provide: AuthorizationService, useValue: {
            hasRole: () => true, hasScope: () => true
          } },
          { provide: LOCALE_ID, useValue: 'es-CL' }
        ]
      }).compileComponents();
      const fixture = TestBed.createComponent(Reports);
      fixture.detectChanges();

      expect(api.getKpis).toHaveBeenCalledTimes(1);
      expect(api.getTopServices).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(30_000);
      fixture.detectChanges();

      expect(api.getKpis).toHaveBeenCalledTimes(2);
      expect(api.getTopServices).toHaveBeenCalledTimes(2);
      expect(fixture.nativeElement.textContent).toContain('Cambios de estado');
    } finally {
      vi.useRealTimers();
    }
  });

  // =========================================================================
  // UI/UX-08 — Refinamiento integral de Reportes y Analítica
  // =========================================================================

  it('UI/UX-08: renders polling copy, es-CL decimal montage time, honest terminal ratio and tied top services', async () => {
    const tiedServices: ReportTopServicesResponse = {
      ...topServicesResponse,
      items: [
        { serviceId: 1, serviceName: 'Sonido Profesional Line Array', hireCount: 3 },
        { serviceId: 4, serviceName: 'Streaming y Circuito Cerrado 4K', hireCount: 3 },
      ],
    };
    const reportWithDecimal: ReportKpisResponse = {
      ...response,
      metrics: {
        ...response.metrics,
        averageMontageTimeMinutes: 3.14,
        closedCount: 2,
        cancelledCount: 0,
      },
    };
    const api = {
      getKpis: vi.fn(() => of(reportWithDecimal)),
      getTopServices: vi.fn(() => of(tiedServices)),
    };
    await TestBed.configureTestingModule({
      imports: [Reports],
      providers: [
        { provide: ReportsDataService, useValue: api },
        { provide: KafkaAdminDataService, useValue: { isAvailable: false } },
        { provide: AuthorizationService, useValue: { hasRole: () => true, hasScope: () => true } },
        { provide: LOCALE_ID, useValue: 'es-CL' },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Reports);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sincronización automática · 30 s');
    expect(text).not.toContain('Tiempo real · 30s');
    expect(text).toContain('3,1 min');
    expect(text).toContain('Transiciones a Cerrado');
    expect(text).toContain('Transiciones a Cancelado');
    expect(text).toContain('Cierres sobre terminales:');
    expect(text).not.toContain('Tasa operativa:');
    expect(text).toContain('Empate en primer lugar: 2 servicios (3 contrataciones)');
    expect(text).not.toContain('Líder de demanda:');
  });
});
