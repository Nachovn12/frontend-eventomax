import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Catalog } from './catalog';
import { CatalogDataService } from './catalog-data.service';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { CatalogService } from './models/catalog-service.model';

describe('Catalog EP2 actions', () => {
  const service: CatalogService = {
    id: 3,
    name: 'Sonido',
    description: 'Equipos PA',
    rate: 25000,
    active: true
  };

  async function setup(admin: boolean) {
    const api = {
      getServices: vi.fn(() => of([service])),
      createService: vi.fn(() => of(service)),
      updateService: vi.fn(() => of(service)),
      getEquipment: vi.fn(() => of([])),
      createEquipment: vi.fn(() => of({ id: 1, name: 'Parlante', description: 'Audio', active: true, availableQty: 5, reservedQty: 0, totalQuantity: 5, availableQuantity: 5, status: 'DISPONIBLE' })),
      updateEquipment: vi.fn(() => of({ id: 1, name: 'Parlante', description: 'Audio', active: true, availableQty: 5, reservedQty: 0, totalQuantity: 5, availableQuantity: 5, status: 'DISPONIBLE' })),
    };
    await TestBed.configureTestingModule({
      imports: [Catalog],
      providers: [
        { provide: CatalogDataService, useValue: api },
        { provide: AuthorizationService, useValue: {
          hasRole: () => admin,
          hasScope: () => admin
        } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(Catalog);
    fixture.detectChanges();
    return { api, fixture, component: fixture.componentInstance };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('prevents non-admins from opening the create form', async () => {
    const { component, fixture } = await setup(false);
    component.openCreate();
    expect(component.showEditor()).toBe(false);
    expect(fixture.nativeElement.querySelector('[aria-label="Formulario de servicio"]')).toBeNull();
  });

  it('creates a service using the exact backend fields', async () => {
    const { component, api } = await setup(true);
    component.openCreate();
    component.serviceForm.setValue({
      name: 'Sonido',
      description: 'Equipos PA',
      rate: 25000,
      active: true
    });
    component.submitService();
    expect(api.createService).toHaveBeenCalledWith({
      name: 'Sonido', description: 'Equipos PA', rate: 25000, active: true
    });
    expect(component.saveMessage()).toContain('guardado');
  });

  it('updates services using PUT and blocks invalid rates', async () => {
    const { component, api } = await setup(true);
    component.openEdit(service);
    component.serviceForm.controls.rate.setValue(0);
    component.submitService();
    expect(api.updateService).not.toHaveBeenCalled();
    component.serviceForm.controls.rate.setValue(26000.25);
    component.submitService();
    expect(api.updateService).toHaveBeenCalledWith(3, {
      name: 'Sonido', description: 'Equipos PA', rate: 26000.25, active: true
    });
  });

  it('prevents non-admins from opening the equipment create form', async () => {
    const nonAdmin = await setup(false);
    nonAdmin.component.openCreateEquipment();
    expect(nonAdmin.component.showEquipmentEditor()).toBe(false);
  });

  it('allows admins to create equipment with exact backend fields', async () => {
    const admin = await setup(true);
    admin.component.openCreateEquipment();
    expect(admin.component.showEquipmentEditor()).toBe(true);

    admin.component.equipmentForm.patchValue({
      name: 'Parlante Line Array',
      description: 'Sistema PA',
      initialAvailableQty: 10,
      active: true,
    });
    admin.component.submitEquipment();
    expect(admin.api.createEquipment).toHaveBeenCalledWith({
      name: 'Parlante Line Array',
      description: 'Sistema PA',
      active: true,
      initialAvailableQty: 10,
    });
    expect(admin.component.saveEquipmentMessage()).toContain('creado correctamente');
  });

  it('allows admins to update equipment with exact backend fields and PUT', async () => {
    const admin = await setup(true);
    const equip = { id: 7, name: 'Parlante', description: 'Audio', active: true, availableQty: 5, reservedQty: 0, totalQuantity: 5, availableQuantity: 5, status: 'DISPONIBLE' };
    admin.component.openEditEquipment(equip);
    expect(admin.component.showEquipmentEditor()).toBe(true);

    admin.component.equipmentForm.patchValue({
      name: 'Parlante Pro',
      description: 'Audio Pro',
      stockMode: 'adjust',
      adjustedAvailableQty: 0,
    });
    admin.component.submitEquipment();
    expect(admin.api.updateEquipment).toHaveBeenCalledWith(7, {
      name: 'Parlante Pro',
      description: 'Audio Pro',
      active: true,
      availableQty: 0,
    });
    expect(admin.component.saveEquipmentMessage()).toContain('actualizado correctamente');
  });
});
