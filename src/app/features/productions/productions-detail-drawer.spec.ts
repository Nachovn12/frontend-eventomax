import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { Productions } from './productions';
import { ProductionsDataService } from './productions-data.service';
import { CatalogDataService } from '../catalog/catalog-data.service';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { Production, ProductionStatus } from '../../core/models/production.model';
import { Equipment, EquipmentReservationItem } from '../catalog/models/equipment.model';
import { CatalogService } from '../catalog/models/catalog-service.model';

const BASE_FIXTURES: Record<ProductionStatus, Production> = {
  SOLICITADO: {
    id: 101,
    organizerId: 'tenant:org-1',
    organizerDisplayName: 'Camila Soto',
    name: 'Cumbre Tecnológica Nacional 2026',
    scheduledAt: '2030-11-28T19:00:00',
    location: 'Centro Parque, Salón Principal, Las Condes',
    status: 'SOLICITADO',
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z',
  },
  CONFIRMADO: {
    id: 102,
    organizerId: 'tenant:org-1',
    organizerDisplayName: 'Camila Soto',
    name: 'Foro Innovación Energética',
    scheduledAt: '2030-11-30T10:00:00',
    location: 'Estación Mapocho, Nave Central',
    status: 'CONFIRMADO',
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-02T10:00:00Z',
  },
  EN_MONTAJE: {
    id: 103,
    organizerId: 'tenant:org-1',
    organizerDisplayName: 'Camila Soto',
    name: 'Gala Corporativa Anual',
    scheduledAt: '2030-12-02T20:00:00',
    location: 'Hotel W Santiago, Gran Salón',
    status: 'EN_MONTAJE',
    crewId: 'crew-alfa-stgo',
    crewName: 'Cuadrilla Técnica Alfa',
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-03T10:00:00Z',
  },
  EN_EJECUCION: {
    id: 104,
    organizerId: 'tenant:org-1',
    organizerDisplayName: 'Camila Soto',
    name: 'Congreso Cloud Native Chile',
    scheduledAt: '2030-12-04T09:00:00',
    location: 'CasaPiedra, Auditorio Sur',
    status: 'EN_EJECUCION',
    crewId: 'crew-beta-stgo',
    crewName: 'Cuadrilla Técnica Beta',
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-04T10:00:00Z',
  },
  CERRADO: {
    id: 105,
    organizerId: 'tenant:org-1',
    organizerDisplayName: 'Camila Soto',
    name: 'Lanzamiento Producto Enterprise',
    scheduledAt: '2030-10-15T18:30:00',
    location: 'Espacio Riesco, Pabellón 2',
    status: 'CERRADO',
    crewId: 'crew-gamma-stgo',
    crewName: 'Cuadrilla Técnica Gamma',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-16T10:00:00Z',
  },
  CANCELADO: {
    id: 106,
    organizerId: 'tenant:org-1',
    organizerDisplayName: 'Camila Soto',
    name: 'Seminario Suspendido',
    scheduledAt: '2030-12-10T15:00:00',
    location: 'Teatro Oriente',
    status: 'CANCELADO',
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-05T10:00:00Z',
  },
};

const MOCK_EQUIPMENT: readonly Equipment[] = [
  {
    id: 10,
    name: 'Consola Digital Midas M32',
    category: 'Audio',
    description: 'Consola 32 canales FOH con stagebox',
    active: true,
    availableQty: 4,
    reservedQty: 1,
    totalQuantity: 5,
    availableQuantity: 4,
    status: 'AVAILABLE',
  },
  {
    id: 11,
    name: 'Pantalla LED P2.6 Modular',
    category: 'Video',
    description: 'Panel LED indoor 500x500mm de alto contraste',
    active: true,
    availableQty: 0,
    reservedQty: 6,
    totalQuantity: 6,
    availableQuantity: 0,
    status: 'OUT_OF_STOCK',
  },
  {
    id: 12,
    name: 'Foco Robótico Beam 230W',
    category: 'Iluminación',
    description: 'Cabeza móvil beam con prisma rotativo',
    active: true,
    availableQty: 8,
    reservedQty: 0,
    totalQuantity: 8,
    availableQuantity: 8,
    status: 'AVAILABLE',
  },
];

const MOCK_SERVICES: readonly CatalogService[] = [
  {
    id: 201,
    name: 'Operación de sonido en vivo',
    description: 'Ingeniero FOH y monitores durante toda la jornada',
    rate: 450000,
    active: true,
  },
  {
    id: 202,
    name: 'Streaming multicámara HD',
    description: 'Transmisión en vivo con 3 cámaras y switcher',
    rate: 620000,
    active: true,
  },
];

const MOCK_RESERVATIONS: readonly EquipmentReservationItem[] = [
  {
    reservationId: 501,
    equipmentId: 10,
    equipmentName: 'Consola Digital Midas M32',
    quantity: 2,
    status: 'RESERVED',
  },
];

describe('Productions Detail Drawer (UI/UX-04)', () => {
  const setup = (
    status: ProductionStatus,
    roles: readonly AppRole[] = [AppRole.Productor],
    reservations: readonly EquipmentReservationItem[] = []
  ) => {
    TestBed.resetTestingModule();
    const production = BASE_FIXTURES[status];
    const dataServiceMock = {
      getStatuses: vi.fn().mockReturnValue(of(Object.keys(BASE_FIXTURES) as ProductionStatus[])),
      getProductions: vi.fn().mockReturnValue(of([production])),
      getProduction: vi.fn().mockReturnValue(of(production)),
      createProduction: vi.fn(),
      updateStatus: vi.fn().mockImplementation((_id, payload) =>
        of({ ...production, status: payload.status, crewId: payload.crewId ?? production.crewId, crewName: payload.crewName ?? production.crewName })
      ),
      getCrewTicket: vi.fn().mockReturnValue(of({ eventId: 'evt-1', productionId: production.id, status: production.status, instructions: 'Ok' })),
      downloadQuotePdf: vi.fn().mockReturnValue(of(new Blob(['pdf']))),
      getOrganizerContact: vi.fn().mockReturnValue(of({ organizerId: 'tenant:org-1', email: 'c@duocuc.cl' })),
    };

    const catalogServiceMock = {
      getEquipment: vi.fn().mockReturnValue(of(MOCK_EQUIPMENT)),
      getServices: vi.fn().mockReturnValue(of(MOCK_SERVICES)),
      getReservationsByProduction: vi.fn().mockReturnValue(of(reservations)),
    };

    const authzMock = {
      hasAnyRole: vi.fn((allowed: readonly AppRole[]) => roles.some((r) => allowed.includes(r))),
      hasScope: vi.fn().mockReturnValue(true),
      ownerId: vi.fn().mockReturnValue('tenant:prod-1'),
      userEmail: vi.fn().mockReturnValue('prod@duocuc.cl'),
      userDisplayName: vi.fn().mockReturnValue('Productor Demo'),
    };

    TestBed.configureTestingModule({
      imports: [Productions],
      providers: [
        { provide: ProductionsDataService, useValue: dataServiceMock },
        { provide: CatalogDataService, useValue: catalogServiceMock },
        { provide: AuthorizationService, useValue: authzMock },
      ],
    });

    const fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    fixture.componentInstance.selectProduction(production);
    fixture.detectChanges();

    return { fixture, component: fixture.componentInstance, dataServiceMock, catalogServiceMock };
  };

  it('enforces exact backend transition matrix across all 6 operational states and renders accurate lifecycle indicators', () => {
    const expectedMatrix: Record<ProductionStatus, readonly ProductionStatus[]> = {
      SOLICITADO: ['CONFIRMADO', 'CANCELADO'],
      CONFIRMADO: ['EN_MONTAJE', 'CANCELADO'],
      EN_MONTAJE: ['EN_EJECUCION', 'CANCELADO'],
      EN_EJECUCION: ['CERRADO', 'CANCELADO'],
      CERRADO: [],
      CANCELADO: [],
    };

    for (const status of Object.keys(expectedMatrix) as ProductionStatus[]) {
      const { fixture, component, dataServiceMock } = setup(status, [AppRole.Productor]);
      expect(component.allowedNextStatuses()).toEqual(expectedMatrix[status]);

      if (status === 'CANCELADO') {
        expect(fixture.nativeElement.querySelector('.lifecycle-stepper')).toBeNull();
        expect(fixture.nativeElement.querySelector('.lifecycle-cancelled-strip')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('#production-next-status')).toBeNull();
        expect(fixture.nativeElement.querySelector('.terminal-notice-card.cancelled')).not.toBeNull();
      } else if (status === 'CERRADO') {
        expect(fixture.nativeElement.querySelectorAll('.lifecycle-step').length).toBe(5);
        expect(fixture.nativeElement.querySelector('.lifecycle-step.is-current')?.textContent).toContain('Cierre');
        expect(fixture.nativeElement.querySelector('#production-next-status')).toBeNull();
        expect(fixture.nativeElement.querySelector('.terminal-notice-card')).not.toBeNull();
      } else {
        expect(fixture.nativeElement.querySelectorAll('.lifecycle-step').length).toBe(5);
        const trigger = fixture.nativeElement.querySelector('#production-next-status') as HTMLButtonElement;
        expect(trigger).not.toBeNull();
        trigger.click();
        fixture.detectChanges();

        const renderedOpts = Array.from(
          fixture.nativeElement.querySelectorAll('button[data-status-option]')
        ).map((el) => (el as HTMLElement).dataset['statusOption']);
        expect(renderedOpts).toEqual(expectedMatrix[status]);
        // Opening/navigating selector must NEVER fire mutating HTTP calls
        expect(dataServiceMock.updateStatus).not.toHaveBeenCalled();
      }
    }
  }, 15000);

  it('respects document visibility rules per state and role (Admin, Productor, Organizador) without empty sections', () => {
    // SOLICITADO -> no premature document buttons
    const sol = setup('SOLICITADO', [AppRole.Admin]);
    expect(sol.fixture.nativeElement.querySelector('.btn-ticket-view')).toBeNull();
    expect(sol.fixture.nativeElement.querySelector('.btn-quote-download')).toBeNull();
    expect(sol.fixture.nativeElement.querySelector('.docs-contextual-note')).not.toBeNull();

    // EN_MONTAJE -> Productor sees Ticket only; Organizador sees neither
    const montProd = setup('EN_MONTAJE', [AppRole.Productor], MOCK_RESERVATIONS);
    expect(montProd.fixture.nativeElement.querySelector('.btn-ticket-view')).not.toBeNull();
    expect(montProd.fixture.nativeElement.querySelector('.btn-quote-download')).toBeNull();

    const montOrg = setup('EN_MONTAJE', [AppRole.Organizador], MOCK_RESERVATIONS);
    expect(montOrg.fixture.nativeElement.querySelector('.btn-ticket-view')).toBeNull();
    expect(montOrg.fixture.nativeElement.querySelector('.docs-section')).toBeNull();

    // CERRADO -> Admin sees Ticket + Acta PDF; Organizador sees Acta PDF only
    const cerrAdmin = setup('CERRADO', [AppRole.Admin], MOCK_RESERVATIONS);
    expect(cerrAdmin.fixture.nativeElement.querySelector('.btn-ticket-view')).not.toBeNull();
    expect(cerrAdmin.fixture.nativeElement.querySelector('.btn-quote-download')).not.toBeNull();

    const cerrOrg = setup('CERRADO', [AppRole.Organizador], MOCK_RESERVATIONS);
    expect(cerrOrg.fixture.nativeElement.querySelector('.btn-ticket-view')).toBeNull();
    expect(cerrOrg.fixture.nativeElement.querySelector('.btn-quote-download')).not.toBeNull();

    // CANCELADO -> no unsupported document actions
    const canc = setup('CANCELADO', [AppRole.Admin]);
    expect(canc.fixture.nativeElement.querySelector('.btn-ticket-view')).toBeNull();
    expect(canc.fixture.nativeElement.querySelector('.btn-quote-download')).toBeNull();
    expect(canc.fixture.nativeElement.querySelector('.docs-section')).toBeNull();
  });

  it('supports equipment combobox local search, disables out-of-stock items, stepper bounds, provisional items, services, and exact CONFIRMADO payload', () => {
    const { fixture, component, dataServiceMock, catalogServiceMock } = setup('SOLICITADO', [AppRole.Productor]);
    const initialEquipCalls = catalogServiceMock.getEquipment.mock.calls.length;

    const comboTrigger = fixture.nativeElement.querySelector('#equipment-select') as HTMLButtonElement;
    comboTrigger.click();
    fixture.detectChanges();

    // Out-of-stock item (#11) is disabled and non-selectable
    const outOfStockBtn = fixture.nativeElement.querySelector('button[data-equipment-id="11"]') as HTMLButtonElement;
    expect(outOfStockBtn.disabled).toBe(true);
    expect(outOfStockBtn.textContent).toContain('Sin stock');

    // Local search filters without extra HTTP calls
    const searchInput = fixture.nativeElement.querySelector('.eqc-search-input') as HTMLInputElement;
    searchInput.value = 'Midas';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.eqc-option').length).toBe(1);
    expect(catalogServiceMock.getEquipment.mock.calls.length).toBe(initialEquipCalls);

    // Empty search state
    searchInput.value = 'inexistente-xyz';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.eqc-empty')).not.toBeNull();

    // Escape closes ONLY combobox, NOT parent detail drawer
    const popover = fixture.nativeElement.querySelector('.eqc-popover') as HTMLElement;
    popover.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.eqc-popover')).toBeNull();
    expect(component.detail()).not.toBeNull();

    // Select Midas (#10, stock 4), use stepper +1 -> qty 2, add item (must NOT call updateStatus)
    comboTrigger.click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button[data-equipment-id="10"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const plusBtn = fixture.nativeElement.querySelector('button[aria-label="Aumentar cantidad"]') as HTMLButtonElement;
    plusBtn.click();
    fixture.detectChanges();
    expect(component.selectedQuantity.value).toBe(2);

    (fixture.nativeElement.querySelector('.btn-add-item') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(dataServiceMock.updateStatus).not.toHaveBeenCalled();
    expect(component.reservationItems()).toEqual([{ equipmentId: 10, quantity: 2 }]);

    // Attempting accumulated quantity exceeding stock (2 + 3 > 4) is rejected
    component.selectedQuantity.setValue(3);
    component.addReservationItem();
    fixture.detectChanges();
    expect(component.reservationInputError()).toContain('Stock insuficiente acumulado');

    // Toggle optional service 201 and submit CONFIRMADO -> exact HTTP payload equivalence
    const serviceInputs = fixture.nativeElement.querySelectorAll('.service-checkbox-input') as NodeListOf<HTMLInputElement>;
    serviceInputs[0].click();
    fixture.detectChanges();

    const submitBtn = fixture.nativeElement.querySelector('.btn-submit-status') as HTMLButtonElement;
    expect(submitBtn.textContent?.trim()).toBe('Confirmar y reservar equipos');
    submitBtn.click();
    fixture.detectChanges();

    expect(dataServiceMock.updateStatus).toHaveBeenCalledWith(101, {
      status: 'CONFIRMADO',
      items: [{ equipmentId: 10, quantity: 2 }],
      serviceIds: [201],
    });
  });

  it('renders contextual workflow panels and preserves exact HTTP payloads for EN_MONTAJE, EN_EJECUCION, CERRADO, and CANCELADO', () => {
    // CONFIRMADO -> EN_MONTAJE (with crewName & crewId)
    const s1 = setup('CONFIRMADO', [AppRole.Productor], MOCK_RESERVATIONS);
    expect(s1.fixture.nativeElement.querySelector('.btn-submit-status')?.textContent?.trim()).toBe('Iniciar montaje');
    s1.component.crewNameControl.setValue('Cuadrilla Sur');
    s1.component.crewIdControl.setValue('crew-sur-01');
    s1.component.submitStatus();
    expect(s1.dataServiceMock.updateStatus).toHaveBeenCalledWith(102, {
      status: 'EN_MONTAJE',
      crewId: 'crew-sur-01',
      crewName: 'Cuadrilla Sur',
    });

    // EN_MONTAJE -> EN_EJECUCION
    const s2 = setup('EN_MONTAJE', [AppRole.Admin], MOCK_RESERVATIONS);
    expect(s2.fixture.nativeElement.querySelector('.btn-submit-status')?.textContent?.trim()).toBe('Iniciar ejecución');
    s2.component.submitStatus();
    expect(s2.dataServiceMock.updateStatus).toHaveBeenCalledWith(103, { status: 'EN_EJECUCION' });

    // EN_EJECUCION -> CERRADO
    const s3 = setup('EN_EJECUCION', [AppRole.Admin], MOCK_RESERVATIONS);
    expect(s3.fixture.nativeElement.querySelector('.btn-submit-status')?.textContent?.trim()).toBe('Cerrar producción');
    s3.component.submitStatus();
    expect(s3.dataServiceMock.updateStatus).toHaveBeenCalledWith(104, { status: 'CERRADO' });

    // Switch SOLICITADO -> CANCELADO via corporate status selector -> danger CTA & exact payload
    const s4 = setup('SOLICITADO', [AppRole.Productor]);
    const statusTrigger = s4.fixture.nativeElement.querySelector('#production-next-status') as HTMLButtonElement;
    statusTrigger.click();
    s4.fixture.detectChanges();
    (s4.fixture.nativeElement.querySelector('button[data-status-option="CANCELADO"]') as HTMLButtonElement).click();
    s4.fixture.detectChanges();

    const cancelSubmit = s4.fixture.nativeElement.querySelector('.btn-submit-status') as HTMLButtonElement;
    expect(cancelSubmit.textContent?.trim()).toBe('Cancelar producción');
    expect(cancelSubmit.classList.contains('is-danger')).toBe(true);
    expect(s4.fixture.nativeElement.querySelector('.contextual-stage-card.danger')).not.toBeNull();
    cancelSubmit.click();
    expect(s4.dataServiceMock.updateStatus).toHaveBeenCalledWith(101, { status: 'CANCELADO' });
  });

  it('renders single-indicator service checkbox cards with optional tag, dynamic selection counter, and multi-select payload integrity (UI/UX-04.1)', () => {
    const { fixture, component, dataServiceMock } = setup('SOLICITADO', [AppRole.Productor]);
    const el: HTMLElement = fixture.nativeElement;

    const section = el.querySelector('.services-contract-builder') as HTMLElement;
    expect(section).not.toBeNull();
    expect(section.querySelector('.services-title-group h4')?.textContent?.trim()).toBe('Servicios a contratar');
    expect(section.querySelector('.optional-tag')?.textContent?.trim()).toBe('Opcional');
    expect(section.querySelector('.draft-summary-pill')).toBeNull();

    const cards = Array.from(section.querySelectorAll('.service-checkbox-card')) as HTMLLabelElement[];
    expect(cards.length).toBe(2);
    for (const card of cards) {
      expect(card.querySelectorAll('input[type="checkbox"].service-checkbox-input').length).toBe(1);
      expect(card.querySelectorAll('.service-checkbox-box').length).toBe(1);
      expect(card.querySelector('.service-checkbox-check')).toBeNull();
      expect(card.querySelector('.service-card-name')?.textContent?.trim().length).toBeGreaterThan(0);
      expect(card.querySelector('.service-card-rate')?.textContent?.trim()).toMatch(/^\$/);
    }

    // Select first service via label/card click -> 1 seleccionado + checkmark rendered
    cards[0].click();
    fixture.detectChanges();
    expect(component.selectedServiceIds()).toEqual([201]);
    expect(cards[0].classList.contains('selected')).toBe(true);
    expect(cards[0].querySelector('.service-checkbox-check')).not.toBeNull();
    expect(section.querySelector('.draft-summary-pill')?.textContent?.trim()).toBe('1 seleccionado');

    // Multi-select second service -> 2 seleccionados
    cards[1].click();
    fixture.detectChanges();
    expect(component.selectedServiceIds()).toEqual([201, 202]);
    expect(cards[1].classList.contains('selected')).toBe(true);
    expect(section.querySelector('.draft-summary-pill')?.textContent?.trim()).toBe('2 seleccionados');

    // Add 1 equipment item and submit CONFIRMADO -> exact serviceIds payload preserved
    component.selectedEquipmentId.setValue('10');
    component.selectedQuantity.setValue(1);
    component.addReservationItem();
    fixture.detectChanges();
    (el.querySelector('.btn-submit-status') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(dataServiceMock.updateStatus).toHaveBeenCalledWith(101, {
      status: 'CONFIRMADO',
      items: [{ equipmentId: 10, quantity: 1 }],
      serviceIds: [201, 202],
    });
  });

  it('renders two-level provisional equipment cards with structured fields, thumbnails/fallback, icon delete, unique summary, and calm empty state (UI/UX-04.2)', () => {
    const { fixture, component } = setup('SOLICITADO', [AppRole.Productor]);
    const el: HTMLElement = fixture.nativeElement;

    // 1. Calm compact empty state (no error role, no summary pill)
    const emptyBox = el.querySelector('.draft-empty-state') as HTMLElement;
    expect(emptyBox).not.toBeNull();
    expect(emptyBox.getAttribute('role')).toBe('status');
    expect(emptyBox.textContent).toContain('Sin equipos agregados');
    expect(emptyBox.textContent).toContain('Agrega al menos un equipo para confirmar la producción');
    expect(el.querySelector('.reservation-builder-head .draft-summary-pill')).toBeNull();

    // 2. Add two equipments (#10 Audio, #12 Iluminación)
    component.selectedEquipmentId.setValue('10');
    component.selectedQuantity.setValue(2);
    component.addReservationItem();
    component.selectedEquipmentId.setValue('12');
    component.selectedQuantity.setValue(3);
    component.addReservationItem();
    fixture.detectChanges();

    // Unique summary pill reflects real reservationItems()
    const summaryPills = el.querySelectorAll('.reservation-builder .draft-summary-pill');
    expect(summaryPills.length).toBe(1);
    expect(summaryPills[0].textContent?.trim()).toBe('2 equipos · 5 unidades');
    expect(el.querySelector('.draft-pending-tag')?.textContent?.trim()).toBe('Provisional');
    expect(el.querySelector('.draft-empty-state')).toBeNull();

    const cards = Array.from(el.querySelectorAll('.added-item-card')) as HTMLLIElement[];
    expect(cards.length).toBe(2);

    // Card 0: commercial name ONLY (NO parenthesized description), structured category, Package fallback, two levels
    const title0 = cards[0].querySelector('.draft-item-name')?.textContent?.trim();
    expect(title0).toBe('Consola Digital Midas M32');
    expect(title0).not.toContain('(');
    expect(title0).not.toContain('stagebox');
    expect(cards[0].querySelector('.added-item-meta')?.textContent?.trim()).toBe('Equipo #10 · Audio');
    expect(cards[0].querySelector('.draft-thumb-fallback')).not.toBeNull();
    expect(cards[0].querySelector('.draft-pending-state')?.textContent?.trim()).toBe('Pendiente de reserva');
    expect(cards[0].querySelector('.draft-qty-label')?.textContent?.trim()).toBe('Cantidad');
    expect(cards[0].querySelector('.draft-qty-value')?.textContent?.trim()).toBe('2 u.');

    // Icon-only delete button with tooltip, contextual aria-label, type=button
    const delBtn0 = cards[0].querySelector('.btn-remove-item') as HTMLButtonElement;
    expect(delBtn0.type).toBe('button');
    expect(delBtn0.title).toBe('Quitar equipo');
    expect(delBtn0.getAttribute('aria-label')).toBe('Quitar Consola Digital Midas M32');
    expect(delBtn0.textContent?.trim()).toBe('');

    // Legacy getEquipmentName() stays untouched
    expect(component.getEquipmentName(10)).toBe('Consola Digital Midas M32 (Consola 32 canales FOH con stagebox)');

    // 3. Remove first item -> summary updates immediately to 1 equipo · 3 unidades
    delBtn0.click();
    fixture.detectChanges();
    expect(component.reservationItems()).toEqual([{ equipmentId: 12, quantity: 3 }]);
    expect(el.querySelector('.reservation-builder .draft-summary-pill')?.textContent?.trim()).toBe(
      '1 equipo · 3 unidades'
    );

    // 4. Remove last item -> returns cleanly to calm empty state
    (el.querySelector('.added-item-card .btn-remove-item') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.reservationItems()).toEqual([]);
    expect(el.querySelector('.draft-empty-state')).not.toBeNull();
  });

  it('renders compact document action cards, two-level reserved equipment cards without delete buttons, and a pinned drawer footer (UI/UX-04.3)', () => {
    // 1. EN_MONTAJE (Productor): Ticket action card + two-level reservation card + pinned footer
    const mont = setup('EN_MONTAJE', [AppRole.Productor], MOCK_RESERVATIONS);
    const mel: HTMLElement = mont.fixture.nativeElement;

    const ticketCard = mel.querySelector('button.doc-action-card.btn-ticket-view') as HTMLButtonElement;
    expect(ticketCard).not.toBeNull();
    expect(ticketCard.querySelector('.doc-card-title')?.textContent?.trim()).toBe('Ticket de Cuadrilla');
    expect(ticketCard.querySelector('.doc-card-subtitle')?.textContent?.trim()).toBe('Orden de Trabajo Técnica');
    expect(ticketCard.querySelector('.doc-card-trailing')).not.toBeNull();

    const resCard = mel.querySelector('.reservation-card-item') as HTMLLIElement;
    expect(resCard).not.toBeNull();
    expect(resCard.querySelector('.draft-item-thumb')).not.toBeNull();
    expect(resCard.querySelector('.res-item-name')?.textContent?.trim()).toBe('Consola Digital Midas M32');
    expect(resCard.querySelector('.reservation-item-meta')?.textContent?.trim()).toBe('Reserva #501 · Equipo #10');
    expect(resCard.querySelector('.reservation-status-tag.is-reserved')?.textContent?.trim()).toBe('Reservado');
    expect(resCard.querySelector('.reservation-qty')?.textContent?.trim()).toBe('2 u.');
    // Registered reservations must NEVER expose delete or edit buttons
    expect(resCard.querySelector('button')).toBeNull();

    // Pinned footer is a direct child of .detail-drawer linked to #production-workflow-form
    const footer = mel.querySelector('.detail-drawer > footer.detail-workflow-footer') as HTMLElement;
    expect(footer).not.toBeNull();
    const submitBtn = footer.querySelector('button.btn-submit-status') as HTMLButtonElement;
    expect(submitBtn.getAttribute('form')).toBe('production-workflow-form');
    expect(submitBtn.querySelector('.submit-btn-icon')).not.toBeNull();
    expect(submitBtn.textContent?.trim()).toBe('Iniciar ejecución');

    // 2. CERRADO (Admin): both Ticket + Acta de Cierre PDF action cards and NO pinned workflow footer
    const cerr = setup('CERRADO', [AppRole.Admin], MOCK_RESERVATIONS);
    const cel: HTMLElement = cerr.fixture.nativeElement;
    expect(cel.querySelector('button.doc-action-card.btn-ticket-view')).not.toBeNull();
    const pdfCard = cel.querySelector('button.doc-action-card.btn-quote-download') as HTMLButtonElement;
    expect(pdfCard).not.toBeNull();
    expect(pdfCard.querySelector('.doc-card-title')?.textContent?.trim()).toBe('Acta de Cierre PDF');
    expect(pdfCard.querySelector('.doc-card-subtitle')?.textContent?.trim()).toBe('Documento oficial de cierre operativo');
    expect(cel.querySelector('footer.detail-workflow-footer')).toBeNull();

    // 3. CANCELADO (Admin): NO pinned workflow footer
    const canc = setup('CANCELADO', [AppRole.Admin]);
    expect(canc.fixture.nativeElement.querySelector('footer.detail-workflow-footer')).toBeNull();
  });

  it('renders CERRADO emerald lifecycle & closure card and refined Crew Ticket modal preserving historical EN_MONTAJE status and print (UI/UX-04.4)', () => {
    const cerr = setup('CERRADO', [AppRole.Admin], MOCK_RESERVATIONS);
    const cel: HTMLElement = cerr.fixture.nativeElement;

    // 1. All 5 lifecycle steps have checkmarks and stage 5 is differentiated as terminal closed
    const steps = Array.from(cel.querySelectorAll('.lifecycle-step'));
    expect(steps.length).toBe(5);
    expect(cel.querySelectorAll('.lifecycle-step .lifecycle-check-icon').length).toBe(5);
    expect(steps[4].classList.contains('is-terminal-closed')).toBe(true);

    // 2. Refined emerald closure card with Lock read-only metadata and NO operational footer
    const closedCard = cel.querySelector('.terminal-notice-card.closed') as HTMLElement;
    expect(closedCard).not.toBeNull();
    expect(closedCard.querySelector('.terminal-notice-title')?.textContent?.trim()).toBe('Ciclo operativo finalizado');
    expect(closedCard.querySelector('.terminal-notice-desc')?.textContent?.trim()).toBe(
      'La producción se encuentra cerrada administrativamente y su información permanece disponible para consulta.'
    );
    expect(closedCard.querySelector('.terminal-readonly-meta')?.textContent?.trim()).toBe('Estado terminal · Solo lectura');
    expect(closedCard.querySelector('.terminal-lock-icon')).not.toBeNull();
    expect(cel.querySelector('footer.detail-workflow-footer')).toBeNull();

    // 3. Open Crew Ticket from CERRADO production -> historical EN_MONTAJE preserved under "Estado al emitir"
    cerr.dataServiceMock.getCrewTicket.mockReturnValue(
      of({
        id: 19,
        productionId: 105,
        eventId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        productionName: 'Lanzamiento Producto Enterprise',
        scheduledAt: '2030-10-15T18:30:00',
        location: 'Espacio Riesco, Pabellón 2',
        status: 'EN_MONTAJE',
        crewId: 'crew-gamma-stgo',
        crewName: 'Cuadrilla Técnica Gamma',
        instructions: 'Verificar energía trifásica y montaje FOH antes de las 15:00.',
        createdAt: '2026-10-02T14:00:00Z',
        updatedAt: '2026-10-02T14:00:00Z',
      })
    );

    const ticketBtn = cel.querySelector('button.doc-action-card.btn-ticket-view') as HTMLButtonElement;
    ticketBtn.click();
    cerr.fixture.detectChanges();

    const modal = cel.querySelector('.ticket-modal-card') as HTMLElement;
    expect(modal).not.toBeNull();
    expect(modal.querySelector('.ticket-emitted-label')?.textContent?.trim()).toBe('Estado al emitir');
    expect(modal.querySelector('.ticket-emitted-status [data-status="EN_MONTAJE"]')).not.toBeNull();
    expect(modal.querySelector('.ticket-info-card')?.textContent).toContain('Cuadrilla Técnica Gamma');
    expect(modal.querySelector('.ticket-info-card')?.textContent).toContain('crew-gamma-stgo');
    expect(modal.querySelector('.ticket-count-pill')?.textContent?.trim()).toBe('1 equipo · 2 unidades');

    const equipCards = Array.from(modal.querySelectorAll('.ticket-equip-card'));
    expect(equipCards.length).toBe(1);
    expect(equipCards[0].querySelector('.ticket-equip-thumb')).not.toBeNull();
    expect(equipCards[0].querySelector('.ticket-equip-name')?.textContent?.trim()).toBe('Consola Digital Midas M32');
    expect(equipCards[0].querySelector('.ticket-equip-meta')?.textContent?.trim()).toBe('Reserva #501');
    expect(equipCards[0].querySelector('.ticket-qty-val')?.textContent?.trim()).toBe('2 u.');
    expect(equipCards[0].querySelector('button')).toBeNull();

    expect(modal.querySelector('.ticket-directive-card .ticket-instructions')?.textContent?.trim()).toBe(
      'Verificar energía trifásica y montaje FOH antes de las 15:00.'
    );
    expect(modal.querySelector('.btn-copy-event-id')).not.toBeNull();
    expect(modal.querySelector('.btn-ticket-print')).not.toBeNull();
    expect(modal.querySelector('.btn-ticket-close')).not.toBeNull();
  });
});
