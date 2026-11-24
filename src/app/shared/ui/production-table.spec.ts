import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProductionTable } from './production-table';

describe('ProductionTable role actions', () => {
  async function render(actionLabel: string, detailLinks = false) {
    await TestBed.configureTestingModule({ imports: [ProductionTable], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(ProductionTable);
    fixture.componentRef.setInput('rows', [{ id: 7, name: 'Own event', location: 'Venue', scheduledAt: '2030-01-01T12:00:00', status: 'SOLICITADO' }]);
    fixture.componentRef.setInput('selectable', !detailLinks);
    fixture.componentRef.setInput('actionLabel', actionLabel);
    fixture.componentRef.setInput('detailLinks', detailLinks);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('uses Ver detalle and an accessible label for organizer selection', async () => {
    const fixture = await render('Ver detalle');
    const button = fixture.nativeElement.querySelector('button');
    expect(button.textContent).toContain('Ver detalle');
    expect(button.getAttribute('aria-label')).toBe('Ver detalle: Own event');
    const selected = vi.fn();
    fixture.componentInstance.selectProduction.subscribe(selected);
    button.click();
    expect(selected).toHaveBeenCalledTimes(1);
  });

  it('preserves Gestionar for operational roles', async () => {
    const fixture = await render('Gestionar');
    expect(fixture.nativeElement.querySelector('button').textContent).toContain('Gestionar');
  });

  it('links dashboard events to the existing detail route without operational controls', async () => {
    const fixture = await render('Ver detalle', true);
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/productions?productionId=7');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('displays backend organizerDisplayName without rendering raw canonical UUID', async () => {
    const rawCanonicalId = 'f191bdc8-7926-4722-9ec0-cba663701940:7d300514-1e39-4013-85e5-02efa3fd42df';
    await TestBed.configureTestingModule({ imports: [ProductionTable], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(ProductionTable);
    fixture.componentRef.setInput('rows', [{
      id: 10,
      organizerId: rawCanonicalId,
      organizerDisplayName: 'Valentina Rojas',
      organizerResolutionSource: 'ENTRA_GRAPH',
      name: 'Cumbre Tech',
      location: 'Santiago',
      scheduledAt: '2030-11-24T19:00:00',
      status: 'SOLICITADO',
      createdAt: '2026-11-22T10:00:00',
      updatedAt: '2026-11-22T10:00:00',
    }]);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Valentina Rojas');
    expect(text).not.toContain(rawCanonicalId);
  });

  it('uses safe fallbacks without raw UUID when organizerDisplayName is absent (legacy or Graph unavailable)', async () => {
    const rawCanonicalId = 'f191bdc8-7926-4722-9ec0-cba663701940:11111111-2222-4333-8444-555555555555';
    await TestBed.configureTestingModule({ imports: [ProductionTable], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(ProductionTable);
    fixture.componentRef.setInput('rows', [
      {
        id: 10,
        organizerId: rawCanonicalId,
        name: 'Evento Entra Sin Nombre',
        location: 'Santiago',
        scheduledAt: '2030-11-24T19:00:00',
        status: 'SOLICITADO',
        createdAt: '2026-11-22T10:00:00',
        updatedAt: '2026-11-22T10:00:00',
      },
      {
        id: 11,
        organizerId: 'ext-client-99',
        name: 'Evento Cliente Externo',
        location: 'Valparaíso',
        scheduledAt: '2030-11-25T19:00:00',
        status: 'SOLICITADO',
        createdAt: '2026-11-22T10:00:00',
        updatedAt: '2026-11-22T10:00:00',
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Organizador no disponible');
    expect(text).toContain('Cliente externo');
    expect(text).not.toContain(rawCanonicalId);
  });

  it('formats scheduledAt in Chile standard dd/MM/yyyy and dynamic 24h CLST/CLT', async () => {
    await TestBed.configureTestingModule({ imports: [ProductionTable], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(ProductionTable);
    fixture.componentRef.setInput('rows', [
      { id: 13, name: 'Verano CLST', location: 'Santiago', scheduledAt: '2026-11-25T09:00:00', status: 'SOLICITADO' },
      { id: 14, name: 'Invierno CLT', location: 'Concepción', scheduledAt: '2026-07-15T18:00:00Z', status: 'CONFIRMADO' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const times = Array.from(fixture.nativeElement.querySelectorAll('.schedule-time')) as HTMLElement[];
    const dates = Array.from(fixture.nativeElement.querySelectorAll('.schedule-date')) as HTMLElement[];
    expect(times[0].textContent?.trim()).toBe('09:00 CLST');
    expect(dates[0].textContent?.trim()).toBe('25/11/2026');
    expect(times[1].textContent?.trim()).toBe('14:00 CLT');
    expect(dates[1].textContent?.trim()).toBe('15/07/2026');
  });
});
