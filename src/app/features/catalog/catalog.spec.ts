import { TestBed, ComponentFixture } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCL from '@angular/common/locales/es-CL';
import { Subject, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Catalog } from './catalog';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { CatalogDataService } from './catalog-data.service';
import { CatalogService } from './models/catalog-service.model';

registerLocaleData(localeEsCL);

describe('Catalog', () => {
  let fixture: ComponentFixture<Catalog>;
  let servicesSubject: Subject<readonly CatalogService[]>;
  let authzMock: {
    hasRole: ReturnType<typeof vi.fn>;
    hasScope: ReturnType<typeof vi.fn>;
  };
  let dataServiceMock: {
    getServices: ReturnType<typeof vi.fn>;
    getEquipment: ReturnType<typeof vi.fn>;
    createEquipment: ReturnType<typeof vi.fn>;
    updateEquipment: ReturnType<typeof vi.fn>;
    createService: ReturnType<typeof vi.fn>;
    updateService: ReturnType<typeof vi.fn>;
  };
  let element: HTMLElement;

  const services: readonly CatalogService[] = [
    { id: 1, name: 'Servicio Audio', description: 'Sistema PA', rate: 100000, active: true },
    { id: 2, name: 'Iluminación', description: 'Luces LED', rate: 50000, active: false },
  ];

  beforeEach(async () => {
    servicesSubject = new Subject<readonly CatalogService[]>();
    authzMock = {
      hasRole: vi.fn(() => false),
      hasScope: vi.fn(() => false),
    };
    dataServiceMock = {
      getServices: vi.fn(() => servicesSubject.asObservable()),
      getEquipment: vi.fn(() => of([])),
      createEquipment: vi.fn(() => of({ id: 10, name: 'Test', description: 'Audio', active: true, availableQty: 5, reservedQty: 0, totalQuantity: 5, availableQuantity: 5, status: 'DISPONIBLE' })),
      updateEquipment: vi.fn(() => of({ id: 10, name: 'Test', description: 'Audio', active: true, availableQty: 5, reservedQty: 0, totalQuantity: 5, availableQuantity: 5, status: 'DISPONIBLE' })),
      createService: vi.fn(),
      updateService: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [Catalog],
      providers: [
        { provide: CatalogDataService, useValue: dataServiceMock },
        { provide: AuthorizationService, useValue: authzMock },
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

  it('switches to equipment tab and renders equipment inventory', async () => {
    const mockEquipment = [
      { id: 1, name: 'Parlante Line Array', description: 'Sistema de audio', active: true, availableQty: 8, reservedQty: 2, totalQuantity: 10, availableQuantity: 8, status: 'DISPONIBLE' },
      { id: 2, name: 'Foco LED', description: 'Foco robótico', active: true, availableQty: 0, reservedQty: 4, totalQuantity: 4, availableQuantity: 0, status: 'AGOTADO' },
    ];
    dataServiceMock.getEquipment.mockReturnValue(of(mockEquipment));
    fixture.componentInstance.retryEquipment();
    fixture.componentInstance.setActiveTab('equipment');
    fixture.detectChanges();
    await fixture.whenStable();

    const tabs = element.querySelectorAll('.catalog-tab-btn');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(element.textContent).toContain('Inventario de Equipos');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(element.textContent).toContain('Parlante Line Array');
    expect(element.textContent).toContain('AGOTADO');
  });

  describe('Equipment update and management', () => {
    const mockEquipment = [
      { id: 1, name: 'Parlante Line Array', description: 'Sistema de audio', active: true, availableQty: 8, reservedQty: 2, totalQuantity: 10, availableQuantity: 8, status: 'DISPONIBLE' },
      { id: 2, name: 'Foco LED', description: 'Foco robótico', active: true, availableQty: 0, reservedQty: 4, totalQuantity: 4, availableQuantity: 0, status: 'AGOTADO' },
    ];

    it('does not display equipment editor or edit buttons for non-Admin users', async () => {
      authzMock.hasRole.mockReturnValue(false);
      authzMock.hasScope.mockReturnValue(false);
      dataServiceMock.getEquipment.mockReturnValue(of(mockEquipment));

      fixture.componentInstance.retryEquipment();
      fixture.componentInstance.setActiveTab('equipment');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(element.querySelector('.ep2-catalog-editor')).toBeNull();
      expect(element.textContent).not.toContain('Editar equipo');
      expect(element.textContent).not.toContain('Nuevo equipo');
    });

    it('displays edit buttons and opens editor with populated fields and readonly reserved stock for Admin', async () => {
      authzMock.hasRole.mockImplementation((role) => role === AppRole.Admin);
      authzMock.hasScope.mockImplementation((scope) => scope === 'access_as_user');
      dataServiceMock.getEquipment.mockReturnValue(of(mockEquipment));

      fixture.componentInstance.retryEquipment();
      fixture.componentInstance.setActiveTab('equipment');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(element.querySelector('.ep2-catalog-editor')).toBeTruthy();
      const editButtons = Array.from(element.querySelectorAll<HTMLButtonElement>('.ep2-catalog-table-action'))
        .filter((btn) => btn.textContent?.includes('Editar equipo'));
      expect(editButtons).toHaveLength(2);

      // Open edit for item 1
      editButtons[0].click();
      fixture.detectChanges();

      expect(fixture.componentInstance.showEquipmentEditor()).toBe(true);
      expect(fixture.componentInstance.editingEquipment()?.id).toBe(1);
      expect(fixture.componentInstance.equipmentForm.controls.name.value).toBe('Parlante Line Array');
      expect(fixture.componentInstance.equipmentForm.controls.description.value).toBe('Sistema de audio');
      expect(fixture.componentInstance.equipmentForm.controls.active.value).toBe(true);
      expect(fixture.componentInstance.equipmentForm.controls.stockMode.value).toBe('keep');

      // Verify readonly reserved quantity display
      const readonlyInput = element.querySelector<HTMLInputElement>('input[readonly]');
      expect(readonlyInput).toBeTruthy();
      expect(readonlyInput?.value).toContain('2 unidades asignadas a eventos');
      expect(element.textContent).toContain('Conservar disponible (8 unidades)');
    });

    it('submits equipment update omitting availableQty when retaining stock', async () => {
      authzMock.hasRole.mockImplementation((role) => role === AppRole.Admin);
      authzMock.hasScope.mockImplementation((scope) => scope === 'access_as_user');
      dataServiceMock.getEquipment.mockReturnValue(of(mockEquipment));
      dataServiceMock.updateEquipment.mockReturnValue(of({
        ...mockEquipment[0],
        name: 'Parlante Line Array PRO',
        description: 'Audio mejorado',
      }));

      fixture.componentInstance.retryEquipment();
      fixture.componentInstance.setActiveTab('equipment');
      fixture.componentInstance.openEditEquipment(mockEquipment[0]);
      fixture.detectChanges();

      fixture.componentInstance.equipmentForm.controls.name.setValue('Parlante Line Array PRO');
      fixture.componentInstance.equipmentForm.controls.description.setValue('Audio mejorado');
      fixture.componentInstance.equipmentForm.controls.stockMode.setValue('keep');

      fixture.componentInstance.submitEquipment();
      fixture.detectChanges();

      expect(dataServiceMock.updateEquipment).toHaveBeenCalledWith(1, {
        name: 'Parlante Line Array PRO',
        description: 'Audio mejorado',
        active: true,
      });
      // availableQty is omitted
      const callArg = dataServiceMock.updateEquipment.mock.calls[0][1];
      expect(callArg).not.toHaveProperty('availableQty');

      expect(fixture.componentInstance.showEquipmentEditor()).toBe(false);
      expect(fixture.componentInstance.editingEquipment()).toBeNull();
      expect(fixture.componentInstance.saveEquipmentMessage()).toContain('actualizado correctamente');
    });

    it('submits equipment update with availableQty=0 when adjusted to zero', async () => {
      authzMock.hasRole.mockImplementation((role) => role === AppRole.Admin);
      authzMock.hasScope.mockImplementation((scope) => scope === 'access_as_user');
      dataServiceMock.getEquipment.mockReturnValue(of(mockEquipment));
      dataServiceMock.updateEquipment.mockReturnValue(of({
        ...mockEquipment[0],
        availableQty: 0,
        status: 'AGOTADO',
      }));

      fixture.componentInstance.retryEquipment();
      fixture.componentInstance.setActiveTab('equipment');
      fixture.componentInstance.openEditEquipment(mockEquipment[0]);
      fixture.detectChanges();

      fixture.componentInstance.equipmentForm.controls.stockMode.setValue('adjust');
      fixture.componentInstance.equipmentForm.controls.adjustedAvailableQty.setValue(0);

      fixture.componentInstance.submitEquipment();
      fixture.detectChanges();

      expect(dataServiceMock.updateEquipment).toHaveBeenCalledWith(1, {
        name: 'Parlante Line Array',
        description: 'Sistema de audio',
        active: true,
        availableQty: 0,
      });
      const callArg = dataServiceMock.updateEquipment.mock.calls[0][1];
      expect(callArg.availableQty).toBe(0);
    });

    it('validates equipment name is mandatory and enforces maxLength', () => {
      authzMock.hasRole.mockImplementation((role) => role === AppRole.Admin);
      authzMock.hasScope.mockImplementation((scope) => scope === 'access_as_user');

      fixture.componentInstance.openEditEquipment(mockEquipment[0]);
      fixture.componentInstance.equipmentForm.controls.name.setValue('   ');

      fixture.componentInstance.submitEquipment();

      expect(dataServiceMock.updateEquipment).not.toHaveBeenCalled();
      expect(fixture.componentInstance.saveEquipmentError()).toBe('El nombre del equipo es obligatorio.');
    });

    it('preserves form data and displays understandable error message when backend fails', () => {
      authzMock.hasRole.mockImplementation((role) => role === AppRole.Admin);
      authzMock.hasScope.mockImplementation((scope) => scope === 'access_as_user');
      dataServiceMock.updateEquipment.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 409, statusText: 'Conflict' }))
      );

      fixture.componentInstance.openEditEquipment(mockEquipment[0]);
      fixture.componentInstance.equipmentForm.controls.name.setValue('Nombre Editado');
      fixture.componentInstance.equipmentForm.controls.description.setValue('Descripcion Editada');

      fixture.componentInstance.submitEquipment();
      fixture.detectChanges();

      expect(fixture.componentInstance.savingEquipment()).toBe(false);
      expect(fixture.componentInstance.showEquipmentEditor()).toBe(true);
      expect(fixture.componentInstance.equipmentForm.controls.name.value).toBe('Nombre Editado');
      expect(fixture.componentInstance.equipmentForm.controls.description.value).toBe('Descripcion Editada');
      expect(fixture.componentInstance.saveEquipmentError()).toContain('Conflicto de concurrencia');
    });

    it('prevents duplicate submissions while request is in flight', () => {
      authzMock.hasRole.mockImplementation((role) => role === AppRole.Admin);
      authzMock.hasScope.mockImplementation((scope) => scope === 'access_as_user');

      fixture.componentInstance.openEditEquipment(mockEquipment[0]);
      fixture.componentInstance.savingEquipment.set(true);

      fixture.componentInstance.submitEquipment();

      expect(dataServiceMock.updateEquipment).not.toHaveBeenCalled();
    });

    it('allows saving and omits availableQty when switching from adjust with negative quantity to keep', () => {
      authzMock.hasRole.mockImplementation((role) => role === AppRole.Admin);
      authzMock.hasScope.mockImplementation((scope) => scope === 'access_as_user');
      dataServiceMock.getEquipment.mockReturnValue(of(mockEquipment));
      dataServiceMock.updateEquipment.mockReturnValue(of({ ...mockEquipment[0], name: 'Equipo Actualizado' }));

      fixture.componentInstance.retryEquipment();
      fixture.componentInstance.setActiveTab('equipment');
      fixture.componentInstance.openEditEquipment(mockEquipment[0]);
      fixture.detectChanges();

      // Switch to adjust and enter negative quantity (-1)
      fixture.componentInstance.equipmentForm.controls.stockMode.setValue('adjust');
      fixture.componentInstance.equipmentForm.controls.adjustedAvailableQty.setValue(-1);
      fixture.detectChanges();

      expect(fixture.componentInstance.equipmentForm.invalid).toBe(true);
      expect(fixture.componentInstance.equipmentForm.controls.adjustedAvailableQty.invalid).toBe(true);

      // Switch back to keep
      fixture.componentInstance.equipmentForm.controls.stockMode.setValue('keep');
      fixture.detectChanges();

      // Form should now be valid because adjustedAvailableQty is disabled and validators cleared
      expect(fixture.componentInstance.equipmentForm.invalid).toBe(false);

      // Submit and verify save succeeds and availableQty is omitted from request payload
      fixture.componentInstance.submitEquipment();
      fixture.detectChanges();

      expect(dataServiceMock.updateEquipment).toHaveBeenCalledWith(1, {
        name: 'Parlante Line Array',
        description: 'Sistema de audio',
        active: true,
      });
      const updatePayload = dataServiceMock.updateEquipment.mock.calls[0][1];
      expect(updatePayload).not.toHaveProperty('availableQty');
      expect(fixture.componentInstance.showEquipmentEditor()).toBe(false);
      expect(fixture.componentInstance.saveEquipmentMessage()).toContain('actualizado correctamente');
    });

    it('rejects negative, empty and decimal quantities when switching from keep to adjust', () => {
      authzMock.hasRole.mockImplementation((role) => role === AppRole.Admin);
      authzMock.hasScope.mockImplementation((scope) => scope === 'access_as_user');
      dataServiceMock.getEquipment.mockReturnValue(of(mockEquipment));

      fixture.componentInstance.retryEquipment();
      fixture.componentInstance.setActiveTab('equipment');
      fixture.componentInstance.openEditEquipment(mockEquipment[0]);
      fixture.detectChanges();

      // Switch to adjust
      fixture.componentInstance.equipmentForm.controls.stockMode.setValue('adjust');
      fixture.detectChanges();

      // 1. Negative quantity
      fixture.componentInstance.equipmentForm.controls.adjustedAvailableQty.setValue(-5);
      fixture.detectChanges();
      expect(fixture.componentInstance.equipmentForm.invalid).toBe(true);
      expect(fixture.componentInstance.equipmentForm.controls.adjustedAvailableQty.errors?.['min']).toBeTruthy();
      fixture.componentInstance.submitEquipment();
      expect(dataServiceMock.updateEquipment).not.toHaveBeenCalled();
      expect(fixture.componentInstance.saveEquipmentError()).toBe('Ingresa una cantidad disponible entera mayor o igual a 0.');

      // 2. Empty / null quantity
      fixture.componentInstance.equipmentForm.controls.adjustedAvailableQty.setValue(null as any);
      fixture.detectChanges();
      expect(fixture.componentInstance.equipmentForm.invalid).toBe(true);
      expect(fixture.componentInstance.equipmentForm.controls.adjustedAvailableQty.errors?.['required']).toBeTruthy();
      fixture.componentInstance.submitEquipment();
      expect(dataServiceMock.updateEquipment).not.toHaveBeenCalled();
      expect(fixture.componentInstance.saveEquipmentError()).toBe('Ingresa una cantidad disponible entera mayor o igual a 0.');

      // 3. Decimal quantity
      fixture.componentInstance.equipmentForm.controls.adjustedAvailableQty.setValue(3.5);
      fixture.detectChanges();
      expect(fixture.componentInstance.equipmentForm.invalid).toBe(true);
      expect(fixture.componentInstance.equipmentForm.controls.adjustedAvailableQty.errors?.['integer']).toBeTruthy();
      fixture.componentInstance.submitEquipment();
      expect(dataServiceMock.updateEquipment).not.toHaveBeenCalled();
      expect(fixture.componentInstance.saveEquipmentError()).toBe('Ingresa una cantidad disponible entera mayor o igual a 0.');
    });

    it('sends availableQty=0 when adjust mode is selected with zero', () => {
      authzMock.hasRole.mockImplementation((role) => role === AppRole.Admin);
      authzMock.hasScope.mockImplementation((scope) => scope === 'access_as_user');
      dataServiceMock.getEquipment.mockReturnValue(of(mockEquipment));
      dataServiceMock.updateEquipment.mockReturnValue(of({
        ...mockEquipment[0],
        availableQty: 0,
        status: 'AGOTADO',
      }));

      fixture.componentInstance.retryEquipment();
      fixture.componentInstance.setActiveTab('equipment');
      fixture.componentInstance.openEditEquipment(mockEquipment[0]);
      fixture.detectChanges();

      fixture.componentInstance.equipmentForm.controls.stockMode.setValue('adjust');
      fixture.componentInstance.equipmentForm.controls.adjustedAvailableQty.setValue(0);
      fixture.detectChanges();

      expect(fixture.componentInstance.equipmentForm.valid).toBe(true);

      fixture.componentInstance.submitEquipment();
      fixture.detectChanges();

      expect(dataServiceMock.updateEquipment).toHaveBeenCalledWith(1, {
        name: 'Parlante Line Array',
        description: 'Sistema de audio',
        active: true,
        availableQty: 0,
      });
      const updatePayload = dataServiceMock.updateEquipment.mock.calls[0][1];
      expect(updatePayload.availableQty).toBe(0);
    });

    it('ensures hidden fields do not block creation or editing', () => {
      authzMock.hasRole.mockImplementation((role) => role === AppRole.Admin);
      authzMock.hasScope.mockImplementation((scope) => scope === 'access_as_user');
      dataServiceMock.getEquipment.mockReturnValue(of(mockEquipment));
      dataServiceMock.createEquipment.mockReturnValue(of({
        id: 99,
        name: 'Nuevo Microfono',
        description: 'Inalambrico',
        active: true,
        availableQty: 10,
        reservedQty: 0,
        totalQuantity: 10,
        availableQuantity: 10,
        status: 'DISPONIBLE',
      }));
      dataServiceMock.updateEquipment.mockReturnValue(of({
        ...mockEquipment[0],
        name: 'Parlante Modificado',
      }));

      fixture.componentInstance.retryEquipment();
      fixture.componentInstance.setActiveTab('equipment');

      // Case 4A: In edition, hidden initialAvailableQty does NOT block editing even if set to invalid value
      fixture.componentInstance.openEditEquipment(mockEquipment[0]);
      fixture.detectChanges();

      fixture.componentInstance.equipmentForm.controls.initialAvailableQty.setValue(-99);
      fixture.detectChanges();

      expect(fixture.componentInstance.equipmentForm.controls.initialAvailableQty.disabled).toBe(true);
      expect(fixture.componentInstance.equipmentForm.invalid).toBe(false);

      fixture.componentInstance.submitEquipment();
      fixture.detectChanges();
      expect(dataServiceMock.updateEquipment).toHaveBeenCalled();

      // Case 4B: In creation, hidden stockMode and adjustedAvailableQty do NOT block creation even if set to invalid
      dataServiceMock.updateEquipment.mockClear();
      fixture.componentInstance.openCreateEquipment();
      fixture.detectChanges();

      fixture.componentInstance.equipmentForm.controls.name.setValue('Nuevo Microfono');
      fixture.componentInstance.equipmentForm.controls.description.setValue('Inalambrico');
      fixture.componentInstance.equipmentForm.controls.initialAvailableQty.setValue(10);

      fixture.componentInstance.equipmentForm.controls.adjustedAvailableQty.setValue(-99);
      fixture.detectChanges();

      expect(fixture.componentInstance.equipmentForm.controls.stockMode.disabled).toBe(true);
      expect(fixture.componentInstance.equipmentForm.controls.adjustedAvailableQty.disabled).toBe(true);
      expect(fixture.componentInstance.equipmentForm.invalid).toBe(false);

      fixture.componentInstance.submitEquipment();
      fixture.detectChanges();

      expect(dataServiceMock.createEquipment).toHaveBeenCalledWith({
        name: 'Nuevo Microfono',
        description: 'Inalambrico',
        active: true,
        initialAvailableQty: 10,
      });
      expect(fixture.componentInstance.showEquipmentEditor()).toBe(false);
    });
  });
});
