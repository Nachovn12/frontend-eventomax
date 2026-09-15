import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Productions } from './productions';
import { DEMO_STATUSES } from '../../demo/eventomax.fixtures';

describe('Productions', () => {
  let fixture: ComponentFixture<Productions>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Productions] }).compileComponents();
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
  });
  it('shows realistic demo rows and all six status chips', () => {
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(8);

    for (const status of DEMO_STATUSES) {
      const label = status === 'EN_EJECUCION' ? 'EN_EJECUCIÓN' : status;
      expect(fixture.nativeElement.textContent).toContain(label);
    }
  });
  it('combines the visible search and status controls', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#production-search');
    input.value = '  AURA ';
    input.dispatchEvent(new Event('input'));
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#production-status');
    select.value = 'CONFIRMADO';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Lanzamiento Aura');
    select.value = 'CANCELADO';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin coincidencias');
    fixture.nativeElement.querySelector('.empty-state button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(8);
  });
  it.each(['empty', 'error'] as const)(
    'renders the %s scenario and restores the local demo',
    (scenario) => {
      const select: HTMLSelectElement = fixture.nativeElement.querySelector('#production-scenario');
      select.value = scenario;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('table')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain(
        scenario === 'error' ? 'Error simulado' : 'Tu agenda empieza'
      );
      if (scenario === 'error')
        expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
      fixture.nativeElement.querySelector('.empty-state button').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(8);
      expect(select.value).toBe('data');
    },
  );
});
