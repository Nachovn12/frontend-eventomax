import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCL from '@angular/common/locales/es-CL';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Reports } from './reports';
import { ReportsDataService } from './reports-data.service';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { ReportKpisResponse } from './models/report.model';

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

  async function setup(allowed = true) {
    const api = { getKpis: vi.fn(() => of(response)) };
    await TestBed.configureTestingModule({
      imports: [Reports],
      providers: [
        { provide: ReportsDataService, useValue: api },
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
  });

  it('requests the selected reporting period', async () => {
    const { component, api } = await setup();
    component.rangeControl.setValue('last7d');
    expect(api.getKpis).toHaveBeenLastCalledWith('last7d');
  });

  it('explicitly shows top-services as not implemented', async () => {
    const { fixture } = await setup();
    expect(fixture.nativeElement.textContent).toContain('501 Not Implemented');
  });

  it('does not request KPIs for a user without Admin and scope', async () => {
    const { api, fixture } = await setup(false);
    expect(api.getKpis).not.toHaveBeenCalled();
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
});
