import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Catalog } from './catalog';

describe('Catalog', () => {
  let fixture: ComponentFixture<Catalog>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Catalog] }).compileComponents();
    fixture = TestBed.createComponent(Catalog);
    fixture.detectChanges();
  });
  it('renders equipment, service capacity and explicit demo labelling', () => {
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(8);

    expect(fixture.nativeElement.textContent).toContain('cuadrillas');
  });
  it('filters zero availability without conflating maintenance and reservations', () => {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#catalog-availability');
    select.value = 'unavailable';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Torre de truss');
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain(
      'Sin disponibilidad',
    );
  });
  it('combines category with search and can recover from an empty result', () => {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#catalog-category');
    select.value = 'Servicios';
    select.dispatchEvent(new Event('change'));
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#catalog-search');
    input.value = 'sonido';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    input.value = 'ZZZ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No encontramos ese recurso');
    fixture.nativeElement.querySelector('.empty-state button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(8);
  });
});
