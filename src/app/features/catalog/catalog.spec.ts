import { TestBed, ComponentFixture } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCL from '@angular/common/locales/es-CL';
import { Subject } from 'rxjs';
import { Catalog } from './catalog';
import { CatalogDataService } from './catalog-data.service';
import { CatalogService } from './models/catalog-service.model';

registerLocaleData(localeEsCL);

describe('Catalog', () => {
  let fixture: ComponentFixture<Catalog>;
  let servicesSubject: Subject<readonly CatalogService[]>;
  let dataServiceMock: { getServices: ReturnType<typeof vi.fn> };
  let element: HTMLElement;

  const services: readonly CatalogService[] = [
    { id: 1, name: 'Servicio Audio', description: 'Sistema PA', rate: 100000, active: true },
    { id: 2, name: 'Iluminación', description: 'Luces LED', rate: 50000, active: false },
  ];

  beforeEach(async () => {
    servicesSubject = new Subject<readonly CatalogService[]>();
    dataServiceMock = { getServices: vi.fn(() => servicesSubject.asObservable()) };
    await TestBed.configureTestingModule({
      imports: [Catalog],
      providers: [
        { provide: CatalogDataService, useValue: dataServiceMock },
        { provide: LOCALE_ID, useValue: 'es-CL' },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Catalog);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  async function receive(data: readonly CatalogService[] = services): Promise<void> {
    servicesSubject.next(data);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function search(value: string): void {
    const input = element.querySelector<HTMLInputElement>('#catalog-search')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function selectStatus(value: string): void {
    const select = element.querySelector<HTMLSelectElement>('#catalog-status')!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function metricValues(): (string | null)[] {
    return Array.from(element.querySelectorAll('.metric-value'), (node) => node.textContent);
  }

  it('shows skeletons without zero metrics, filters or counts while loading, then renders data', async () => {
    expect(element.querySelector('h1')?.textContent).toBe('Catálogo de servicios');
    expect(element.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(element.querySelector('.skeleton')).toBeTruthy();
    expect(element.querySelector('.metric-value')).toBeNull();
    expect(element.querySelector('.panel-footer')).toBeNull();
    expect(element.querySelector('input')).toBeNull();
    expect(element.textContent).not.toContain('0 de 0');
    expect(element.textContent).not.toContain('Registros actualizados');

    await receive();
    expect(element.querySelector('[aria-busy="true"]')).toBeNull();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('shows the shared error without metrics, filters or footer and can retry successfully', async () => {
    servicesSubject.error(new Error('Network error'));
    fixture.detectChanges();
    await fixture.whenStable();

    const error = element.querySelector('[role="alert"]')!;
    expect(error.textContent).toContain('No pudimos cargar el catálogo');
    expect(error.textContent).toContain('No fue posible obtener la información en este momento.');
    expect(element.querySelector('.catalog-metrics')).toBeNull();
    expect(element.querySelector('.panel-footer')).toBeNull();
    expect(element.querySelector('input')).toBeNull();
    expect(element.textContent).not.toContain('0 de 0');
    expect(element.textContent).not.toContain('Registros actualizados');

    servicesSubject = new Subject<readonly CatalogService[]>();
    dataServiceMock.getServices.mockReturnValue(servicesSubject.asObservable());
    error.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(dataServiceMock.getServices).toHaveBeenCalledTimes(2);
    expect(element.querySelector('.skeleton')).toBeTruthy();
    expect(element.querySelector('.metric-value')).toBeNull();
    expect(element.querySelector('.panel-footer')).toBeNull();

    await receive();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('shows genuine zero counts for a successful empty catalog, without a creation action', async () => {
    await receive([]);
    expect(metricValues()).toEqual(['0', '0', '0']);
    expect(element.textContent).toContain('No hay servicios registrados');
    expect(element.textContent).toContain(
      'Los servicios disponibles aparecerán aquí cuando sean registrados.',
    );
    expect(element.querySelector('.panel-footer')?.textContent).toContain(
      '0 de 0 servicios visibles',
    );
    expect(element.querySelector('button')).toBeNull();
    expect(element.querySelector('input')).toBeNull();
  });

  it('renders real metrics and catalog states without operational or availability claims', async () => {
    await receive();
    expect(metricValues()).toEqual(['2', '1', '1']);
    expect(element.textContent).toContain('Servicios activos en catálogo');
    expect(element.textContent).toContain('Servicios inactivos en catálogo');
    expect(
      Array.from(element.querySelectorAll('.catalog-status'), (node) => node.textContent?.trim()),
    ).toEqual(['Activo', 'Inactivo']);
    expect(element.querySelector('.danger')).toBeNull();
    expect(element.textContent).not.toMatch(
      /Servicios en operación|Servicios no disponibles|Registros actualizados/,
    );
    expect(element.querySelector('button')).toBeNull();
    expect(element.querySelector('emx-icon')).toBeNull();
  });

  it.each([
    [' AUDIO ', 'Servicio Audio'],
    ['luces', 'Iluminación'],
    ['2', 'Iluminación'],
  ])('searches names, descriptions and IDs locally: %s', async (query, name) => {
    await receive();
    search(query);
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(element.querySelector('tbody')?.textContent).toContain(name);
    expect(element.querySelector('.panel-footer')?.textContent).toContain(
      '1 de 2 servicios visibles',
    );
    expect(metricValues()).toEqual(['2', '1', '1']);
    expect(dataServiceMock.getServices).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['active', 'Servicio Audio'],
    ['inactive', 'Iluminación'],
  ])('filters %s services without refetching', async (status, name) => {
    await receive();
    selectStatus(status);
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(element.querySelector('tbody')?.textContent).toContain(name);
    expect(dataServiceMock.getServices).toHaveBeenCalledTimes(1);
  });

  it('combines filters, distinguishes no matches from an empty catalog, and restores search focus', async () => {
    await receive();
    search('Audio');
    selectStatus('inactive');
    expect(element.textContent).toContain('No encontramos servicios');
    expect(element.textContent).toContain('Prueba con otro nombre, descripción o estado.');
    expect(element.textContent).not.toContain('No hay servicios registrados');
    expect(element.querySelector('.panel-footer')?.textContent).toContain(
      '0 de 2 servicios visibles',
    );
    expect(metricValues()).toEqual(['2', '1', '1']);

    element.querySelector<HTMLButtonElement>('.empty-state button')!.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(element.querySelector<HTMLInputElement>('#catalog-search')!.value).toBe('');
    expect(element.querySelector<HTMLSelectElement>('#catalog-status')!.value).toBe('');
    expect(document.activeElement).toBe(element.querySelector('#catalog-search'));
    expect(element.querySelector('.catalog-clear')).toBeNull();
  });

  it('shows the toolbar clear action only for effective filters and clears them', async () => {
    await receive();
    expect(element.querySelector('.catalog-clear')).toBeNull();
    search('   ');
    expect(element.querySelector('.catalog-clear')).toBeNull();
    search('Audio');
    element.querySelector<HTMLButtonElement>('.catalog-clear')!.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(element.querySelector('.catalog-clear')).toBeNull();
  });

  it('presents received decimal rates in es-CL without changing their values', async () => {
    const data = [{ ...services[0], rate: 1234.56, description: null }];
    await receive(data);
    const rate = element.querySelector('.catalog-rate-cell strong')?.textContent;
    expect(rate).toContain('1.234,56');
    expect(rate).toContain('CLP');
    expect(fixture.componentInstance.rows()[0].rate).toBe(1234.56);
    expect(element.querySelector('.catalog-description')).toBeNull();
    search('Audio');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
  });
});
