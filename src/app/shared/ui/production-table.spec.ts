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
});
