import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { Productions } from './productions';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { ProductionsDataService, PRODUCTION_STATUSES } from './productions-data.service';
import { Production } from '../../core/models/production.model';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { CatalogDataService } from '../catalog/catalog-data.service';
import { Equipment, EquipmentReservationItem } from '../catalog/models/equipment.model';

describe('Productions', () => {
  let fixture: ComponentFixture<Productions>;
  let dataServiceMock: any;
  let catalogServiceMock: any;
  let rolesSignal: WritableSignal<readonly AppRole[]>;
  let scopesSignal: WritableSignal<readonly string[]>;
  let authzMock: {
    hasAnyRole: ReturnType<typeof vi.fn>;
    hasScope: ReturnType<typeof vi.fn>;
    ownerId: ReturnType<typeof vi.fn>;
  };
  let productionsSubject: Subject<readonly Production[]>;

  const mockProductions: Production[] = [
    {
      id: 1,
      name: 'Lanzamiento Aura',
      organizerId: 'org1',
      location: 'Espacio Riesco',
      scheduledAt: '2030-09-16T19:30:00Z',
      status: 'SOLICITADO',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z'
    },
    {
      id: 2,
      name: 'Festival Indie',
      organizerId: 'org2',
      location: 'Parque Bicentenario',
      scheduledAt: '2030-09-20T19:30:00Z',
      status: 'CANCELADO',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z'
    }
  ];

  const mockEquipment: Equipment[] = [
    {
      id: 10,
      name: 'Consola Digital DiGiCo',
      description: 'Audio FOH',
      category: 'Audio',
      active: true,
      availableQty: 4,
      reservedQty: 1,
      totalQuantity: 5,
      availableQuantity: 4,
      status: 'DISPONIBLE'
    }
  ];

  const mockReservations: EquipmentReservationItem[] = [
    {
      reservationId: 101,
      equipmentId: 10,
      equipmentName: 'Consola Digital DiGiCo',
      quantity: 2,
      status: 'RESERVED'
    }
  ];

  beforeEach(async () => {
    productionsSubject = new Subject<readonly Production[]>();
    rolesSignal = signal<readonly AppRole[]>([]);
    scopesSignal = signal<readonly string[]>([]);

    dataServiceMock = {
      getProductions: vi.fn(() => productionsSubject.asObservable()),
      getStatuses: vi.fn(() => of(PRODUCTION_STATUSES)),
      getProduction: vi.fn((id: number) => of(mockProductions.find(p => p.id === id) ?? mockProductions[0])),
      createProduction: vi.fn((req: any) => of({
        id: 99,
        ...req,
        status: 'SOLICITADO',
        createdAt: '2026-10-16T00:00:00Z',
        updatedAt: '2026-10-16T00:00:00Z'
      } as Production)),
      updateStatus: vi.fn((id: number, req: any) => of({
        ...mockProductions[0],
        id,
        status: req.status
      } as Production))
    };

    catalogServiceMock = {
      getEquipment: vi.fn(() => of(mockEquipment)),
      getServices: vi.fn(() => of([
        { id: 101, name: 'Sonido En Vivo', description: 'Audio', rate: 150000, active: true },
        { id: 102, name: 'Streaming HD', description: 'Video', rate: 200000, active: true },
        { id: 103, name: 'Servicio Inactivo', description: 'Desc', rate: 50000, active: false }
      ])),
      getReservationsByProduction: vi.fn(() => of(mockReservations))
    };

    authzMock = {
      hasAnyRole: vi.fn((allowed: readonly AppRole[]) =>
        allowed.some(role => rolesSignal().includes(role))
      ),
      hasScope: vi.fn((scope: string) => scopesSignal().includes(scope)),
      ownerId: vi.fn(() => '')
    };

    await TestBed.configureTestingModule({
      imports: [Productions],
      providers: [
        { provide: ProductionsDataService, useValue: dataServiceMock },
        { provide: CatalogDataService, useValue: catalogServiceMock },
        { provide: AuthorizationService, useValue: authzMock }
      ]
    }).compileComponents();
  });

  function enableRoles(roles: AppRole[]): void {
    rolesSignal.set(roles);
    scopesSignal.set(['access_as_user']);
  }

  it('shows loading state initially, then data without technical BFF/JWT jargon', async () => {
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.skeleton')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.metric-value')).toBeNull();

    productionsSubject.next(mockProductions);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
    const pageText = fixture.nativeElement.textContent;
    expect(pageText).not.toContain('BFF');
    expect(pageText).not.toContain('API Gateway');
    expect(pageText).not.toContain('locks distribuidos');
  });

  it('shows empty state when data is empty and hides CTA if user lacks create permission', async () => {
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    productionsSubject.next([]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No hay producciones registradas');
    expect(Array.from(fixture.nativeElement.querySelectorAll('.metric-value'),
      (node: any) => node.textContent)).toEqual(['0', '0', '0', '0']);
    expect(fixture.nativeElement.querySelector('.empty-state button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.btn-create-primary')).toBeNull();
  });

  it('shows header button and empty-state CTA when user has Productor role', async () => {
    enableRoles([AppRole.Productor]);
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    productionsSubject.next([]);
    fixture.detectChanges();
    await fixture.whenStable();

    const headerBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.btn-create-primary');
    const emptyCtaBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.empty-state button');
    expect(headerBtn).not.toBeNull();
    expect(headerBtn?.textContent).toContain('Nueva producción');
    expect(emptyCtaBtn).not.toBeNull();
    expect(emptyCtaBtn?.textContent).toContain('Nueva producción');
  });

  it('opens creation dialog, validates required fields, closes on Escape, and submits valid production', async () => {
    enableRoles([AppRole.Productor]);
    authzMock.ownerId.mockReturnValue('tenant-duoc:prod-user-1');
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    productionsSubject.next(mockProductions);
    fixture.detectChanges();
    await fixture.whenStable();

    const headerBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-create-primary');
    headerBtn.click();
    fixture.detectChanges();

    const dialog: HTMLElement | null = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    // Submit empty form to trigger visible field validations
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form[aria-label="Crear producción"]');
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.field-error-text').length).toBe(3);
    expect(dataServiceMock.createProduction).not.toHaveBeenCalled();

    // Press Escape to close dialog
    dialog!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();

    // Reopen and submit valid production
    headerBtn.click();
    fixture.detectChanges();

    fixture.componentInstance.createForm.setValue({
      name: 'Cumbre Cloud Native',
      scheduledAt: '2030-12-01T10:00',
      location: 'Centro Parque'
    });
    fixture.componentInstance.submitCreate();
    fixture.detectChanges();

    expect(dataServiceMock.createProduction).toHaveBeenCalledWith({
      organizerMode: 'SELF',
      organizerId: 'tenant-duoc:prod-user-1',
      name: 'Cumbre Cloud Native',
      scheduledAt: '2030-12-01T10:00',
      location: 'Centro Parque'
    });
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.componentInstance.operationSuccess()).toContain('creada correctamente');
    expect(fixture.componentInstance.detail()).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('selects a production from the agenda table, opens the overlay Detail Drawer with reservations, locks scroll, and closes on Escape', async () => {
    enableRoles([AppRole.Productor]);
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    productionsSubject.next(mockProductions);
    fixture.detectChanges();
    await fixture.whenStable();

    // Initially no detail drawer is rendered
    expect(fixture.nativeElement.querySelector('.detail-drawer')).toBeNull();

    // Click row selection button ("Gestionar") in the agenda
    const selectBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.row-select-btn');
    selectBtn.click();
    fixture.detectChanges();

    expect(dataServiceMock.getProduction).toHaveBeenCalledWith(1);
    expect(catalogServiceMock.getReservationsByProduction).toHaveBeenCalledWith(1);

    const detailPanel: HTMLElement | null = fixture.nativeElement.querySelector('.detail-drawer[role="dialog"]');
    expect(detailPanel).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
    expect(detailPanel?.textContent).toContain('Lanzamiento Aura');
    expect(detailPanel?.textContent).toContain('Espacio Riesco');
    expect(detailPanel?.textContent).toContain('org1');
    expect(detailPanel?.textContent).toContain('Consola Digital DiGiCo');
    expect(detailPanel?.textContent).toContain('2 u.');

    // Shared selection: detailId and updateId are synchronized without duplicate selectors
    expect(fixture.componentInstance.detailId.value).toBe('1');
    expect(fixture.componentInstance.updateId.value).toBe('1');

    // Close drawer via Escape key and verify scroll unlock
    detailPanel!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.detail-drawer')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('enforces equipment assignment when confirming a selected production and allows removing items', async () => {
    enableRoles([AppRole.Admin]);
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    productionsSubject.next(mockProductions);
    fixture.detectChanges();
    await fixture.whenStable();

    // Select production #1 (status SOLICITADO -> suggests CONFIRMADO)
    fixture.componentInstance.selectProduction(mockProductions[0]);
    fixture.detectChanges();

    expect(fixture.componentInstance.nextStatus.value).toBe('CONFIRMADO');
    expect(fixture.nativeElement.querySelector('.reservation-builder')).not.toBeNull();

    // Attempt to confirm without equipment
    fixture.componentInstance.submitStatus();
    fixture.detectChanges();
    expect(fixture.componentInstance.operationError()).toContain('asignar al menos un ítem');
    expect(dataServiceMock.updateStatus).not.toHaveBeenCalled();

    // Validate stock limit
    fixture.componentInstance.selectedEquipmentId.setValue('10');
    fixture.componentInstance.selectedQuantity.setValue(99);
    fixture.componentInstance.addReservationItem();
    expect(fixture.componentInstance.reservationInputError()).toContain('Stock insuficiente');

    // Add valid item and accumulate duplicate
    fixture.componentInstance.selectedQuantity.setValue(1);
    fixture.componentInstance.addReservationItem();
    fixture.componentInstance.selectedQuantity.setValue(2);
    fixture.componentInstance.addReservationItem();
    fixture.detectChanges();

    expect(fixture.componentInstance.reservationItems()).toEqual([{ equipmentId: 10, quantity: 3 }]);
    expect(fixture.nativeElement.querySelectorAll('.added-item-card').length).toBe(1);

    // Remove item and re-add
    fixture.componentInstance.removeReservationItem(0);
    fixture.detectChanges();
    expect(fixture.componentInstance.reservationItems()).toEqual([]);
    expect(fixture.nativeElement.querySelectorAll('.added-item-card').length).toBe(0);

    fixture.componentInstance.selectedQuantity.setValue(2);
    fixture.componentInstance.addReservationItem();
    fixture.componentInstance.submitStatus();
    fixture.detectChanges();

    expect(dataServiceMock.updateStatus).toHaveBeenCalledWith(1, {
      status: 'CONFIRMADO',
      items: [{ equipmentId: 10, quantity: 2 }]
    });
    expect(fixture.componentInstance.operationSuccess()).toContain('CONFIRMADO');
  });

  it('shows error state and allows retry', async () => {
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();

    productionsSubject.error(new Error('Network error'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar las producciones');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.metric-value')).toBeNull();

    productionsSubject = new Subject<readonly Production[]>();
    dataServiceMock.getProductions.mockReturnValue(productionsSubject.asObservable());

    const retryBtn = fixture.nativeElement.querySelector('.empty-state button');
    retryBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.skeleton')).toBeTruthy();
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

    const searchInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type="search"]');
    searchInput.value = 'Lanz';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const statusTrigger: HTMLButtonElement = fixture.nativeElement.querySelector('#production-status');
    statusTrigger.click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button[data-filter-status="SOLICITADO"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Lanzamiento Aura');

    statusTrigger.click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button[data-filter-status="CANCELADO"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No encontramos producciones');

    fixture.nativeElement.querySelector('.empty-state button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
    expect(document.activeElement).toBe(searchInput);
  });

  it('sorts rows chronologically', async () => {
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    productionsSubject.next([
      { ...mockProductions[0], id: 1, scheduledAt: '2030-09-20T19:30:00Z' },
      { ...mockProductions[0], id: 2, scheduledAt: '2030-09-10T19:30:00Z' },
      { ...mockProductions[0], id: 3, scheduledAt: '2030-09-15T19:30:00Z' }
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const rows = fixture.componentInstance.rows();
    expect(rows[0].id).toBe(2);
    expect(rows[1].id).toBe(3);
    expect(rows[2].id).toBe(1);
  });

  it('defaults to implicit SELF mode without organizerId input for Organizador-only role on modal open', async () => {
    enableRoles([AppRole.Organizador]);
    authzMock.ownerId.mockReturnValue('tenant-duoc:org-user-1');
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();

    expect(fixture.componentInstance.isOrganizerOnly()).toBe(true);
    expect(fixture.componentInstance.canUseExternalMode()).toBe(false);

    fixture.componentInstance.openCreateModal();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#create-organizer-input')).toBeNull();
    expect(fixture.nativeElement.querySelector('.create-mode-tabs')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('La producción quedará asociada automáticamente a tu cuenta.');
  });

  it('submits SELF payload with canonical organizerId for Organizador-only role', async () => {
    enableRoles([AppRole.Organizador]);
    authzMock.ownerId.mockReturnValue('tenant-duoc:org-user-1');
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();

    fixture.componentInstance.openCreateModal();
    fixture.componentInstance.createForm.controls.name.setValue('Concierto Primavera');
    fixture.componentInstance.createForm.controls.scheduledAt.setValue('2030-10-10T20:00');
    fixture.componentInstance.createForm.controls.location.setValue('Teatro Caupolicán');

    fixture.componentInstance.submitCreate();
    fixture.detectChanges();

    expect(dataServiceMock.createProduction).toHaveBeenCalledWith({
      organizerMode: 'SELF',
      organizerId: 'tenant-duoc:org-user-1',
      name: 'Concierto Primavera',
      scheduledAt: '2030-10-10T20:00',
      location: 'Teatro Caupolicán'
    });
  });

  it('blocks SELF submission and displays a clear error when authenticated ownerId is unavailable', async () => {
    enableRoles([AppRole.Organizador]);
    authzMock.ownerId.mockReturnValue('   ');
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();

    fixture.componentInstance.openCreateModal();
    fixture.componentInstance.createForm.setValue({
      name: 'Concierto Sin Identidad',
      scheduledAt: '2030-10-10T20:00',
      location: 'Teatro Caupolicán'
    });

    fixture.componentInstance.submitCreate();
    fixture.detectChanges();

    expect(dataServiceMock.createProduction).not.toHaveBeenCalled();
    expect(fixture.componentInstance.operationError()).toContain('No se pudo verificar tu identidad autenticada');
  });

  it('clears detail and sets friendly error when 403 Forbidden is returned loading production context', async () => {
    dataServiceMock.getProduction.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403, statusText: 'Forbidden' }))
    );
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();

    fixture.componentInstance.selectProduction(mockProductions[0]);
    fixture.detectChanges();

    expect(fixture.componentInstance.detail()).toBeNull();
    expect(fixture.componentInstance.operationError()).toContain('No tienes permisos para acceder a esta producción.');
  });

  it('displays error banner and retry button when reservations call fails with 502/503 without swallowing into empty array', async () => {
    catalogServiceMock.getReservationsByProduction.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 502, statusText: 'Bad Gateway' }))
    );
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    productionsSubject.next(mockProductions);
    fixture.detectChanges();

    fixture.componentInstance.selectProduction(mockProductions[0]);
    fixture.detectChanges();

    expect(fixture.componentInstance.reservationsLoading()).toBe(false);
    expect(fixture.componentInstance.reservationsError()).toContain('El servicio de inventario o catálogo no se encuentra disponible');
    expect(fixture.componentInstance.productionReservations()).toEqual([]);

    const errorBanner: HTMLElement | null = fixture.nativeElement.querySelector('.reservations-error-state');
    expect(errorBanner).not.toBeNull();
    expect(errorBanner?.textContent).toContain('El servicio de inventario o catálogo no se encuentra disponible');

    const retryBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.btn-retry-reservations');
    expect(retryBtn).not.toBeNull();

    // Now mock recovery on retry
    catalogServiceMock.getReservationsByProduction.mockReturnValue(of(mockReservations));
    retryBtn!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.reservationsError()).toBeNull();
    expect(fixture.componentInstance.productionReservations()).toEqual(mockReservations);
    expect(fixture.nativeElement.querySelector('.reservations-error-state')).toBeNull();
  });

  it('displays empty state message when reservations list is empty without error', async () => {
    catalogServiceMock.getReservationsByProduction.mockReturnValue(of([]));
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    productionsSubject.next(mockProductions);
    fixture.detectChanges();

    fixture.componentInstance.selectProduction(mockProductions[0]);
    fixture.detectChanges();

    expect(fixture.componentInstance.reservationsLoading()).toBe(false);
    expect(fixture.componentInstance.reservationsError()).toBeNull();
    expect(fixture.nativeElement.querySelector('.reservations-error-state')).toBeNull();
    expect(fixture.nativeElement.querySelector('.detail-empty-note')?.textContent).toContain(
      'Sin reservas de equipamiento registradas para esta producción.'
    );
  });

  it('handles 403 Forbidden specifically on reservations query', async () => {
    catalogServiceMock.getReservationsByProduction.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403, statusText: 'Forbidden' }))
    );
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();

    fixture.componentInstance.selectProduction(mockProductions[0]);
    fixture.detectChanges();

    expect(fixture.componentInstance.reservationsError()).toContain(
      'No tienes permisos para ver las reservas de esta producción.'
    );
  });

  it('does not request catalog equipment when user is Organizador, Auditor, or lacks roles/scope', async () => {
    // 1. No roles or scope
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    expect(catalogServiceMock.getEquipment).not.toHaveBeenCalled();
    expect(fixture.componentInstance.availableEquipment()).toEqual([]);

    // 2. Organizador with access_as_user scope
    enableRoles([AppRole.Organizador]);
    fixture.detectChanges();
    expect(catalogServiceMock.getEquipment).not.toHaveBeenCalled();
    expect(fixture.componentInstance.availableEquipment()).toEqual([]);

    // 3. Auditor with access_as_user scope
    enableRoles([AppRole.Auditor]);
    fixture.detectChanges();
    expect(catalogServiceMock.getEquipment).not.toHaveBeenCalled();
    expect(fixture.componentInstance.availableEquipment()).toEqual([]);

    // 4. Admin without access_as_user scope
    rolesSignal.set([AppRole.Admin]);
    scopesSignal.set([]);
    fixture.detectChanges();
    expect(catalogServiceMock.getEquipment).not.toHaveBeenCalled();
  });

  it('requests catalog equipment for Admin and Productor, including after asynchronous MSAL claim resolution', async () => {
    // Starts with uninitialized MSAL claims
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    expect(catalogServiceMock.getEquipment).not.toHaveBeenCalled();
    expect(fixture.componentInstance.availableEquipment()).toEqual([]);

    // Async MSAL resolution for Productor + access_as_user
    enableRoles([AppRole.Productor]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(catalogServiceMock.getEquipment).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.availableEquipment()).toEqual(mockEquipment);

    // Transition to Admin keeps equipment loaded without duplicate call
    enableRoles([AppRole.Admin]);
    fixture.detectChanges();
    expect(catalogServiceMock.getEquipment).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.availableEquipment()).toEqual(mockEquipment);
  });

  it('submits status and equipment reservation via native DOM click on button.btn-submit-status without page reload', async () => {
    enableRoles([AppRole.Productor]);
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    productionsSubject.next(mockProductions);
    fixture.detectChanges();
    await fixture.whenStable();

    const manageBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.row-select-btn');
    manageBtn.click();
    fixture.detectChanges();

    const workflowFormEl: HTMLFormElement | null = fixture.nativeElement.querySelector('form.workflow-form');
    expect(workflowFormEl).not.toBeNull();

    let submitDefaultPrevented = false;
    workflowFormEl!.addEventListener('submit', (event: SubmitEvent) => {
      submitDefaultPrevented = event.defaultPrevented;
    });

    const equipTrigger: HTMLButtonElement = fixture.nativeElement.querySelector('#equipment-select');
    equipTrigger.click();
    fixture.detectChanges();
    const equipOpt: HTMLButtonElement = fixture.nativeElement.querySelector('button[data-equipment-id="10"]');
    equipOpt.click();
    fixture.detectChanges();

    const qtyInput: HTMLInputElement = fixture.nativeElement.querySelector('#equipment-qty');
    qtyInput.value = '2';
    qtyInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const addItemBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button.btn-add-item');
    addItemBtn.click();
    fixture.detectChanges();

    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button.btn-submit-status');
    expect(submitBtn.textContent).toContain('Confirmar y reservar equipos');
    submitBtn.click();
    fixture.detectChanges();

    expect(submitDefaultPrevented).toBe(true);
    expect(dataServiceMock.updateStatus).toHaveBeenCalledWith(1, {
      status: 'CONFIRMADO',
      items: [{ equipmentId: 10, quantity: 2 }],
    });
    expect(fixture.componentInstance.operationSuccess()).toContain('CONFIRMADO');
  });

  it('allows selecting active services and sends serviceIds on confirmation', async () => {
    enableRoles([AppRole.Admin]);
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    productionsSubject.next(mockProductions);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.selectProduction(mockProductions[0]);
    fixture.detectChanges();

    // Active services are loaded (101 and 102 active, 103 inactive filtered out)
    expect(fixture.componentInstance.availableServices().length).toBe(2);
    expect(fixture.nativeElement.querySelector('.services-contract-builder')).not.toBeNull();

    // Toggle service 101
    fixture.componentInstance.toggleService(101);
    fixture.detectChanges();
    expect(fixture.componentInstance.isServiceSelected(101)).toBe(true);
    expect(fixture.componentInstance.selectedServiceIds()).toEqual([101]);

    // Add required equipment
    fixture.componentInstance.selectedEquipmentId.setValue('10');
    fixture.componentInstance.selectedQuantity.setValue(1);
    fixture.componentInstance.addReservationItem();

    // Submit
    fixture.componentInstance.submitStatus();
    fixture.detectChanges();

    expect(dataServiceMock.updateStatus).toHaveBeenCalledWith(1, {
      status: 'CONFIRMADO',
      items: [{ equipmentId: 10, quantity: 1 }],
      serviceIds: [101]
    });
    expect(fixture.componentInstance.selectedServiceIds()).toEqual([]);
  });

  it('UI/UX-03: integrates corporate DateTime Picker inside Nueva producción modal with payload equivalence and Escape isolation', async () => {
    enableRoles([AppRole.Productor]);
    authzMock.ownerId.mockReturnValue('tenant-duoc:prod-user-1');
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();

    fixture.componentInstance.openCreateModal();
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('#create-scheduled-input') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.textContent?.trim()).toBe('Seleccionar fecha y hora');

    // Open picker; pressing Escape closes ONLY the picker and leaves parent modal open
    trigger.click();
    fixture.detectChanges();
    const popover = fixture.nativeElement.querySelector('.emx-dtp-popover') as HTMLElement;
    expect(popover).not.toBeNull();
    popover.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.emx-dtp-popover')).toBeNull();
    expect(fixture.componentInstance.showCreate()).toBe(true);

    // Reopen, choose 2035-06-15 19:45 via selects + day + 24h inputs, apply and submit
    trigger.click();
    fixture.detectChanges();
    const yearSelect = fixture.nativeElement.querySelector('.emx-dtp-select--year') as HTMLSelectElement;
    const monthSelect = fixture.nativeElement.querySelector('.emx-dtp-select--month') as HTMLSelectElement;
    yearSelect.value = '2035';
    yearSelect.dispatchEvent(new Event('change'));
    monthSelect.value = '6';
    monthSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button[data-day-key="2035-06-15"]') as HTMLButtonElement).click();
    const hourInput = fixture.nativeElement.querySelector('#create-scheduled-input-hour') as HTMLInputElement;
    const minInput = fixture.nativeElement.querySelector('#create-scheduled-input-minute') as HTMLInputElement;
    hourInput.value = '19';
    hourInput.dispatchEvent(new Event('input'));
    minInput.value = '45';
    minInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.emx-dtp-btn-apply') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.createForm.controls.scheduledAt.value).toBe('2035-06-15T19:45');
    expect(trigger.textContent?.trim()).toBe('15/06/2035 · 19:45 h');

    fixture.componentInstance.createForm.controls.name.setValue('Evento DateTime Corporativo');
    fixture.componentInstance.createForm.controls.location.setValue('Centro Parque');
    fixture.componentInstance.submitCreate();

    expect(dataServiceMock.createProduction).toHaveBeenCalledWith({
      organizerMode: 'SELF',
      organizerId: 'tenant-duoc:prod-user-1',
      name: 'Evento DateTime Corporativo',
      scheduledAt: '2035-06-15T19:45',
      location: 'Centro Parque',
    });
  });

  // =========================================================================
  // UI/UX-06 — Refinamiento integral de la pantalla principal de Producciones
  // =========================================================================

  it('UI/UX-06: renders semantically accurate KPI cards without misleading copy or blue pending track', async () => {
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    productionsSubject.next([
      { ...mockProductions[0], id: 11, status: 'SOLICITADO' },
      { ...mockProductions[1], id: 12, status: 'EN_MONTAJE' },
      { ...mockProductions[0], id: 13, name: 'Foro Cerrado', status: 'CERRADO' },
      { ...mockProductions[0], id: 14, name: 'Seminario Cerrado', status: 'CERRADO' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Producciones registradas');
    expect(text).toContain('1 pendiente de confirmación');
    expect(text).toContain('Producciones en montaje o ejecución');
    expect(text).toContain('Cerradas');
    expect(text).toContain('Estado terminal');

    expect(text).not.toContain('cotizar rider');
    expect(text).not.toContain('Cuadrilla técnica en terreno');
    expect(text).not.toContain('Acta de cierre completada');
    expect(text).not.toContain('Finalizadas');
    expect(fixture.nativeElement.querySelector('.kpi-track-bicolor-blue')).toBeNull();
    expect(fixture.nativeElement.querySelector('.selection-hint')).toBeNull();

    const values = Array.from(fixture.nativeElement.querySelectorAll('.metric-value')).map((el: any) =>
      el.textContent.trim(),
    );
    expect(values).toEqual(['4', '1', '1', '2']);
  });

  it('UI/UX-06: exposes corporate status filter with all 7 consultable options and keyboard navigation', async () => {
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    productionsSubject.next([
      { ...mockProductions[0], id: 11, name: 'Evento Solicitado', status: 'SOLICITADO' },
      { ...mockProductions[1], id: 12, name: 'Evento Cerrado', status: 'CERRADO' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const trigger = fixture.nativeElement.querySelector('#production-status') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.textContent?.trim()).toContain('Todos los estados');

    // Open with ArrowDown
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    const options = Array.from(
      fixture.nativeElement.querySelectorAll('button[role="option"][data-filter-status]'),
    ) as HTMLButtonElement[];
    expect(options.map((o) => o.getAttribute('data-filter-status'))).toEqual([
      'ALL',
      'SOLICITADO',
      'CONFIRMADO',
      'EN_MONTAJE',
      'EN_EJECUCION',
      'CERRADO',
      'CANCELADO',
    ]);

    // Escape closes without mutating filter
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
    expect(fixture.componentInstance.status.value).toBe('');

    // Filter to CERRADO via click (local filtering, zero extra HTTP calls)
    const callsBefore = dataServiceMock.getProductions.mock.calls.length;
    trigger.click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button[data-filter-status="CERRADO"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.rows().length).toBe(1);
    expect(fixture.componentInstance.rows()[0].status).toBe('CERRADO');
    expect(dataServiceMock.getProductions.mock.calls.length).toBe(callsBefore);
  });

  it('UI/UX-06: provides inline search clear button without extra HTTP calls', async () => {
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    productionsSubject.next(mockProductions);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.search-clear-btn')).toBeNull();

    const searchInput = fixture.nativeElement.querySelector('#production-search') as HTMLInputElement;
    const callsBefore = dataServiceMock.getProductions.mock.calls.length;
    searchInput.value = 'Aura';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const clearBtn = fixture.nativeElement.querySelector('.search-clear-btn') as HTMLButtonElement;
    expect(clearBtn).not.toBeNull();
    expect(clearBtn.getAttribute('aria-label')).toBe('Limpiar búsqueda');
    expect(fixture.componentInstance.rows().length).toBe(1);

    clearBtn.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.search.value).toBe('');
    expect(fixture.componentInstance.rows().length).toBe(2);
    expect(fixture.nativeElement.querySelector('.search-clear-btn')).toBeNull();
    expect(dataServiceMock.getProductions.mock.calls.length).toBe(callsBefore);
  });

  it('UI/UX-06: differentiates contextual row actions (Gestionar for active, Consultar for terminal and read-only)', async () => {
    enableRoles([AppRole.Productor]);
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    productionsSubject.next([
      { ...mockProductions[0], id: 21, name: 'Activa', status: 'EN_MONTAJE', scheduledAt: '2030-09-10T10:00:00Z' },
      { ...mockProductions[0], id: 22, name: 'Cerrada', status: 'CERRADO', scheduledAt: '2030-09-11T10:00:00Z' },
      { ...mockProductions[0], id: 23, name: 'Cancelada', status: 'CANCELADO', scheduledAt: '2030-09-12T10:00:00Z' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('.row-select-btn')) as HTMLButtonElement[];
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Gestionar', 'Consultar', 'Consultar']);

    // Read-only Organizador gets Consultar on all rows
    enableRoles([AppRole.Organizador]);
    const roFixture = TestBed.createComponent(Productions);
    roFixture.detectChanges();
    productionsSubject.next([
      { ...mockProductions[0], id: 31, name: 'Propia Activa', status: 'SOLICITADO', scheduledAt: '2030-09-10T10:00:00Z' },
      { ...mockProductions[0], id: 32, name: 'Propia Cerrada', status: 'CERRADO', scheduledAt: '2030-09-11T10:00:00Z' },
    ]);
    roFixture.detectChanges();
    await roFixture.whenStable();

    const roButtons = Array.from(roFixture.nativeElement.querySelectorAll('.row-select-btn')) as HTMLButtonElement[];
    expect(roButtons.map((b) => b.textContent?.trim())).toEqual(['Consultar', 'Consultar']);
    roFixture.destroy();
  });

  it('UI/UX-06: renders Mi contacto as corporate secondary button preserving permission gates', async () => {
    enableRoles([AppRole.Productor]);
    authzMock.ownerId.mockReturnValue('tenant-duoc:prod-user-1');
    fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    productionsSubject.next(mockProductions);
    fixture.detectChanges();
    await fixture.whenStable();

    const contactBtn = fixture.nativeElement.querySelector('.btn-self-contact-discreet') as HTMLButtonElement;
    expect(contactBtn).not.toBeNull();
    expect(contactBtn.textContent?.trim()).toContain('Mi contacto');
    expect(contactBtn.classList.contains('emx-btn--secondary')).toBe(true);
    expect(contactBtn.querySelector('svg')).not.toBeNull();
  });
});
