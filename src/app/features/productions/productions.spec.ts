import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Productions } from './productions';
import { ProductionsDataService, PRODUCTION_STATUSES } from './productions-data.service';
import { Production } from '../../core/models/production.model';
import { of, throwError, Subject } from 'rxjs';

describe('Productions', () => {
  let fixture: ComponentFixture<Productions>;
  let dataServiceMock: any;
  let productionsSubject: Subject<readonly Production[]>;

  const mockProductions: Production[] = [
    { id: 1, name: 'Lanzamiento Aura', organizerId: 'org1', location: 'Espacio Riesco', scheduledAt: '2026-09-16T19:30:00Z', status: 'CONFIRMADO', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' },
    { id: 2, name: 'Festival Indie', organizerId: 'org2', location: 'Parque', scheduledAt: '2026-09-20T19:30:00Z', status: 'CANCELADO', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' }
  ];

  beforeEach(async () => {
    productionsSubject = new Subject<readonly Production[]>();
    dataServiceMock = {
      getProductions: vi.fn(() => productionsSubject.asObservable()),
      getStatuses: vi.fn(() => of(PRODUCTION_STATUSES))
    };

    await TestBed.configureTestingModule({
      imports: [Productions],
      providers: [{ provide: ProductionsDataService, useValue: dataServiceMock }]
    }).compileComponents();
  });

  it('shows loading state initially, then data', async () => {
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando producciones...');

    productionsSubject.next(mockProductions);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('shows empty state when data is empty', async () => {
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    productionsSubject.next([]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No hay producciones registradas');
  });

  it('shows error state and allows retry', async () => {
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();

    productionsSubject.error(new Error('Network error'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar las producciones');

    // Create a new subject for the retry
    productionsSubject = new Subject<readonly Production[]>();
    dataServiceMock.getProductions.mockReturnValue(productionsSubject.asObservable());

    const retryBtn = fixture.nativeElement.querySelector('.empty-state button');
    retryBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando producciones...');
    productionsSubject.next(mockProductions);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('combines the visible search and status controls', async () => {
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    productionsSubject.next(mockProductions);
    fixture.detectChanges();
    await fixture.whenStable();

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

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
  });
});
