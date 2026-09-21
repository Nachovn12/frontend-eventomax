import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Catalog } from './catalog';
import { CatalogDataService } from './catalog-data.service';
import { CatalogService } from './models/catalog-service.model';
import { Subject } from 'rxjs';

describe('Catalog', () => {
  let fixture: ComponentFixture<Catalog>;
  let dataServiceMock: any;
  let servicesSubject: Subject<readonly CatalogService[]>;

  const mockServices: CatalogService[] = [
    { id: 1, name: 'Servicio Audio', description: 'Sistema PA', rate: 100000, active: true },
    { id: 2, name: 'Iluminación', description: 'Luces LED', rate: 50000, active: false }
  ];

  beforeEach(async () => {
    servicesSubject = new Subject<readonly CatalogService[]>();
    dataServiceMock = {
      getServices: vi.fn(() => servicesSubject.asObservable()),
    };

    await TestBed.configureTestingModule({
      imports: [Catalog],
      providers: [{ provide: CatalogDataService, useValue: dataServiceMock }]
    }).compileComponents();
  });

  it('shows loading state initially, then data', async () => {
    fixture = TestBed.createComponent(Catalog);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando catálogo...');

    servicesSubject.next(mockServices);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('shows empty state when data is empty', async () => {
    fixture = TestBed.createComponent(Catalog);
    fixture.detectChanges();
    servicesSubject.next([]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Catálogo vacío');
  });

  it('shows error state and allows retry', async () => {
    fixture = TestBed.createComponent(Catalog);
    fixture.detectChanges();

    servicesSubject.error(new Error('Network error'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar el catálogo');

    servicesSubject = new Subject<readonly CatalogService[]>();
    dataServiceMock.getServices.mockReturnValue(servicesSubject.asObservable());

    const retryBtn = fixture.nativeElement.querySelector('.empty-state button');
    retryBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando catálogo...');
    servicesSubject.next(mockServices);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('filters by search and status, and can recover from an empty result', async () => {
    fixture = TestBed.createComponent(Catalog);
    fixture.detectChanges();
    servicesSubject.next(mockServices);
    fixture.detectChanges();
    await fixture.whenStable();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#catalog-status');
    select.value = 'active';
    select.dispatchEvent(new Event('change'));

    const input: HTMLInputElement = fixture.nativeElement.querySelector('#catalog-search');
    input.value = 'Audio';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);

    input.value = 'ZZZ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sin coincidencias');

    fixture.nativeElement.querySelector('.empty-state button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
  });
});
