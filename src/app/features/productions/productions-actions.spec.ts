import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { Productions } from './productions';
import { ProductionsDataService, PRODUCTION_STATUSES } from './productions-data.service';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { Production } from '../../core/models/production.model';

import { CatalogDataService } from '../catalog/catalog-data.service';

describe('Productions EP2 actions', () => {
  const production: Production = {
    id: 4,
    organizerId: 'org-demo',
    name: 'Evento EP2',
    location: 'Santiago',
    scheduledAt: '2030-11-20T18:00:00',
    status: 'SOLICITADO',
    createdAt: '2026-10-15T10:00:00',
    updatedAt: '2026-10-15T10:00:00'
  };

  async function setup(authorised: boolean, initialQueryParams: Record<string, string> = {}) {
    const queryParamMap$ = new BehaviorSubject(convertToParamMap(initialQueryParams));
    const routerMock = {
      navigate: vi.fn().mockResolvedValue(true)
    };
    const productionStore: Record<number, Production> = {
      4: production,
      5: { ...production, id: 5, status: 'CERRADO' },
      6: { ...production, id: 6, status: 'EN_EJECUCION' },
      10: { ...production, id: 10, status: 'CERRADO' },
      11: { ...production, id: 11, status: 'CANCELADO' }
    };
    const api = {
      getProductions: vi.fn(() => of([production])),
      getStatuses: vi.fn(() => of(PRODUCTION_STATUSES)),
      createProduction: vi.fn(() => of(production)),
      getProduction: vi.fn((id: number) => of(productionStore[id] ?? { ...production, id })),
      updateStatus: vi.fn((_id: number, _req: any) => of({ ...production, status: 'EN_MONTAJE' } as Production)),
      getCrewTicket: vi.fn(() => of({
        id: 1,
        productionId: 4,
        eventId: 'evt-4',
        productionName: 'Evento EP2',
        scheduledAt: '2030-11-20T18:00:00',
        location: 'Santiago',
        status: 'EN_MONTAJE',
        instructions: 'Montaje de prueba',
        createdAt: '2026-10-19T10:00:00',
        updatedAt: '2026-10-19T10:00:00'
      })),
      downloadQuotePdf: vi.fn(() => of(new Blob(['%PDF-1.4'], { type: 'application/pdf' }))),
      getOrganizerContact: vi.fn(() => of(null))
    };
    const catalogApi = {
      getEquipment: vi.fn(() => of([
        { id: 1, name: 'Parlante Line Array', category: 'Audio', totalQuantity: 10, availableQuantity: 8, status: 'DISPONIBLE' }
      ])),
      getServices: vi.fn(() => of([])),
      getReservationsByProduction: vi.fn(() => of([
        { reservationId: 10, equipmentId: 1, equipmentName: 'Parlante Line Array', quantity: 2, status: 'RESERVED' }
      ]))
    };
    await TestBed.configureTestingModule({
      imports: [Productions],
      providers: [
        { provide: ProductionsDataService, useValue: api },
        { provide: CatalogDataService, useValue: catalogApi },
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParamMap$.asObservable(), snapshot: { queryParamMap: convertToParamMap(initialQueryParams) } } },
        { provide: Router, useValue: routerMock },
        { provide: AuthorizationService, useValue: {
          hasAnyRole: () => authorised,
          hasScope: () => authorised,
          ownerId: () => (authorised ? 'tenant-ep2:owner-ep2' : '')
        } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    return { api, catalogApi, routerMock, queryParamMap$, fixture, component: fixture.componentInstance };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('does not expose write actions without role and scope', async () => {
    const { fixture, component } = await setup(false);
    expect(component.canCreate()).toBe(false);
    expect(component.canUpdate()).toBe(false);
    expect(fixture.nativeElement.querySelector('[aria-label="Crear producción"]')).toBeNull();
    component.submitStatus();
  }, 15000);

  it('creates a production with the real SELF request contract including canonical organizerId', async () => {
    const { api, component, fixture } = await setup(true);
    component.createForm.setValue({
      name: 'Evento EP2',
      location: 'Santiago',
      scheduledAt: '2030-11-20T18:00'
    });
    component.submitCreate();
    fixture.detectChanges();
    expect(api.createProduction).toHaveBeenCalledWith({
      organizerMode: 'SELF',
      organizerId: 'tenant-ep2:owner-ep2',
      name: 'Evento EP2',
      location: 'Santiago',
      scheduledAt: '2030-11-20T18:00'
    });
    expect(component.operationSuccess()).toContain('creada');
  });

  it('consults detail and delegates status validation to backend', async () => {
    const { api, component } = await setup(true);
    component.detailId.setValue('4');
    component.consultDetail();
    expect(api.getProduction).toHaveBeenCalledWith(4);
    expect(component.detail()?.id).toBe(4);

    component.updateId.setValue('4');
    component.nextStatus.setValue('EN_MONTAJE');
    component.submitStatus();
    expect(api.updateStatus).toHaveBeenCalledWith(4, { status: 'EN_MONTAJE' });
    expect(component.operationSuccess()).toContain('EN_MONTAJE');
  });

  it('requires items when confirming a production and submits reservation items to updateStatus', async () => {
    const { api, component } = await setup(true);
    component.updateId.setValue('4');
    component.nextStatus.setValue('CONFIRMADO');

    // Attempt submit without items
    component.submitStatus();
    expect(component.operationError()).toContain('asignar al menos un ítem');
    expect(api.updateStatus).not.toHaveBeenCalled();

    // Add reservation item
    component.selectedEquipmentId.setValue('1');
    component.selectedQuantity.setValue(2);
    component.addReservationItem();
    expect(component.reservationItems()).toEqual([{ equipmentId: 1, quantity: 2 }]);

    // Submit with item
    api.updateStatus.mockReturnValue(of({ ...production, status: 'CONFIRMADO' } as Production));
    component.submitStatus();
    expect(api.updateStatus).toHaveBeenCalledWith(4, {
      status: 'CONFIRMADO',
      items: [{ equipmentId: 1, quantity: 2 }]
    });
    expect(component.operationSuccess()).toContain('CONFIRMADO');
  });

  it('opens and views crew ticket for a production', async () => {
    const { api, component } = await setup(true);
    component.viewCrewTicket(4);
    expect(component.showTicketModal()).toBe(true);
    expect(api.getCrewTicket).toHaveBeenCalledWith(4);
    expect(component.currentTicket()?.id).toBe(1);
    expect(component.currentTicket()?.instructions).toBe('Montaje de prueba');

    component.closeTicketModal();
    expect(component.showTicketModal()).toBe(false);
  });

  it('renders Editorial Sheet crew ticket modal with resolved crew, reservations, distilled directive, copyable Event ID and print action', async () => {
    const { api, catalogApi, component, fixture } = await setup(true);
    api.getCrewTicket.mockReturnValue(of({
      id: 10,
      productionId: 4,
      eventId: '2e80febd-3715-4804-9ae3-4bc6ab0004bd',
      productionName: 'Cumbre Cloud Native EventoMax 2026',
      scheduledAt: '2030-11-25T20:00:00',
      location: 'Centro Parque · Gran Salón, Las Condes',
      status: 'EN_MONTAJE',
      instructions: "Hoja de ruta para montaje de equipamiento de la producción 'Cumbre Cloud Native EventoMax 2026' en recinto: Centro Parque · Gran Salón, Las Condes. Estado operacional: EN_MONTAJE. Cuadrilla asignada: Cuadrilla Técnica Alfa (crew-alfa-01). Verificar dotación técnica y conexiones de energía/sonido.",
      createdAt: '2026-11-07T12:05:00',
      updatedAt: '2026-11-07T12:05:00'
    }));

    component.selectProduction(production);
    component.viewCrewTicket(4);
    fixture.detectChanges();

    const modal: HTMLElement | null = fixture.nativeElement.querySelector('.ticket-modal-card');
    expect(modal).not.toBeNull();
    const modalLogo: HTMLImageElement | null = modal!.querySelector('img.ticket-brand-logo');
    expect(modalLogo).not.toBeNull();
    expect(modalLogo?.getAttribute('src')).toBe('/branding/eventomax/logos/eventomax-logo-dark.svg');
    expect(modal?.textContent).toContain('Producción #4');
    expect(modal?.textContent).toContain('Ticket #10');
    expect(modal?.querySelector('#ticket-modal-title')?.textContent).toContain('Cumbre Cloud Native EventoMax 2026');

    // Resolved crew from instructions even whenCrewTicket has no dedicated crewName field
    expect(component.resolvedTicketCrew()).toEqual({
      crewName: 'Cuadrilla Técnica Alfa',
      crewId: 'crew-alfa-01'
    });
    expect(modal?.textContent).toContain('Cuadrilla Técnica Alfa');
    expect(modal?.textContent).toContain('crew-alfa-01');

    // Connected equipment reservations for matching production
    expect(modal?.textContent).toContain('Equipos para montaje');
    expect(modal?.textContent).toContain('Parlante Line Array');
    expect(modal?.textContent).toContain('2 u.');

    // Distilled directive without repeating boilerplate metadata
    const directiveEl: HTMLElement | null = modal!.querySelector('.ticket-instructions');
    expect(directiveEl).not.toBeNull();
    expect(directiveEl?.textContent?.trim()).toBe('Verificar dotación técnica y conexiones de energía/sonido.');

    // Truncated Event ID in footer + clipboard copy
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } });

    const copyBtn: HTMLButtonElement | null = modal!.querySelector('.btn-copy-event-id');
    expect(copyBtn).not.toBeNull();
    expect(copyBtn?.textContent).toContain('2e80febd…0004bd');
    copyBtn!.click();
    fixture.detectChanges();
    expect(writeTextMock).toHaveBeenCalledWith('2e80febd-3715-4804-9ae3-4bc6ab0004bd');
    expect(component.ticketCopied()).toBe(true);

    // Isolated A4 print frame using Propuesta C v2 with fresh API data
    const windowPrintSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const printBtn: HTMLButtonElement | null = modal!.querySelector('.btn-ticket-print');
    expect(printBtn).not.toBeNull();
    expect(printBtn?.disabled).toBe(false);
    expect(api.getProduction).toHaveBeenCalledWith(4);
    expect(catalogApi.getReservationsByProduction).toHaveBeenCalledWith(4);
    printBtn!.click();

    expect(windowPrintSpy).not.toHaveBeenCalled();
    const printFrame = document.querySelector<HTMLIFrameElement>('iframe[data-print-frame="crew-ticket"]');
    expect(printFrame).not.toBeNull();
    const frameHtml = printFrame?.contentDocument?.documentElement.outerHTML ?? '';
    expect(frameHtml).toContain('@page');
    expect(frameHtml).toContain('A4');
    expect(frameHtml).toContain('emx-official-logo');
    expect(frameHtml).toContain('#024ffc');
    expect(frameHtml).toContain('Orden de Trabajo Técnica');
    expect(frameHtml).toContain('OT-0010');
    expect(frameHtml).toContain('EMX-OT-PRD-4-0010');
    expect(frameHtml).toContain('Cumbre Cloud Native EventoMax 2026');
    expect(frameHtml).toContain('Cuadrilla Técnica Alfa');
    expect(frameHtml).toContain('crew-alfa-01');
    expect(frameHtml).toContain('EQ-001');
    expect(frameHtml).toContain('Parlante Line Array');
    expect(frameHtml).toContain('Entrega / Despacho Bodega');
    expect(frameHtml).toContain('Responsable de Cuadrilla');
    expect(frameHtml).toContain('Recepción en Terreno / Producción');
    expect(frameHtml).toContain('emx-trace-qr');
    expect(frameHtml).toContain('2e80febd-3715-4804-9ae3-4bc6ab0004bd');
    expect(frameHtml).not.toContain('EVENTOMAX SpA');
    expect(frameHtml).not.toContain('TIMBRE OPERATIVO EVENTOMAX');
    expect(frameHtml).not.toContain('S.I.I.');

    // Ctrl+P shortcut inside modal also intercepts browser SPA print
    const ctrlPEvent = new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, cancelable: true });
    component.onTicketKeydown(ctrlPEvent);
    expect(ctrlPEvent.defaultPrevented).toBe(true);
    expect(windowPrintSpy).not.toHaveBeenCalled();

    printFrame?.remove();
    windowPrintSpy.mockRestore();
  });

  it('5. handles production without crew ticket (404) with clear message, retry action and no print frame', async () => {
    const { api, component, fixture } = await setup(true);
    api.getCrewTicket.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    component.viewCrewTicket(4);
    fixture.detectChanges();

    expect(component.ticketError()).toBe('No se ha emitido un ticket de cuadrilla para esta producción.');
    expect(component.ticketPrintReady()).toBe(false);
    expect(fixture.nativeElement.querySelector('.btn-ticket-print')).toBeNull();
    const retryBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.btn-ticket-retry');
    expect(retryBtn).not.toBeNull();
  });

  it('9. blocks printing and allows retry when Catalog reservations query fails instead of faking empty equipment', async () => {
    const { catalogApi, component, fixture } = await setup(true);
    catalogApi.getReservationsByProduction.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );

    component.viewCrewTicket(4);
    fixture.detectChanges();

    expect(component.ticketReservationsError()).toContain('No se pudo consultar el manifiesto de equipamiento');
    expect(component.ticketPrintReady()).toBe(false);
    const printBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.btn-ticket-print');
    expect(printBtn?.disabled).toBe(true);

    // Calling printCrewTicket while Catalog failed must NOT create an iframe
    component.printCrewTicket();
    expect(document.querySelector('iframe[data-print-frame="crew-ticket"]')).toBeNull();

    // Retry succeeds with real Catalog reservations and unlocks printing
    const retryBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.btn-ticket-retry');
    expect(retryBtn).not.toBeNull();
    retryBtn!.click();
    fixture.detectChanges();

    expect(component.ticketReservationsError()).toBeNull();
    expect(component.ticketPrintReady()).toBe(true);
    expect(component.ticketReservations().length).toBe(1);
  });

  it('9b. blocks printing and allows retry when GET /api/productions/{id} fails instead of printing stale list data', async () => {
    const { api, component, fixture } = await setup(true);
    api.getProduction.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );

    component.viewCrewTicket(4);
    fixture.detectChanges();

    expect(component.ticketProductionError()).toContain('No se pudo obtener el estado actualizado de la producción');
    expect(component.ticketPrintReady()).toBe(false);
    const printBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.btn-ticket-print');
    expect(printBtn?.disabled).toBe(true);

    component.printCrewTicket();
    expect(document.querySelector('iframe[data-print-frame="crew-ticket"]')).toBeNull();

    const retryBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector('.btn-ticket-retry');
    expect(retryBtn).not.toBeNull();
    retryBtn!.click();
    fixture.detectChanges();

    expect(component.ticketProductionError()).toBeNull();
    expect(component.ticketPrintReady()).toBe(true);
  });

  it('11. queries fresh GET /api/productions/{id} before printing and reflects live organizer & status changes over stale list cache', async () => {
    const { api, component, fixture } = await setup(true);
    api.getProduction.mockReturnValue(of({
      ...production,
      id: 4,
      status: 'CERRADO',
      organizerId: 'f191bdc8-7926-4722-9ec0-cba663701940:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      organizerDisplayName: 'Valentina Muñoz Vera',
      organizerResolutionSource: 'ENTRA_GRAPH',
      crewName: 'Cuadrilla Actualizada Sur',
      crewId: 'crew-sur-99',
      updatedAt: '2026-11-23T02:10:23',
    }));

    const windowPrintSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    component.viewCrewTicket(4);
    fixture.detectChanges();
    component.printCrewTicket();

    expect(api.getProduction).toHaveBeenCalledWith(4);
    const printFrame = document.querySelector<HTMLIFrameElement>('iframe[data-print-frame="crew-ticket"]');
    const frameHtml = printFrame?.contentDocument?.documentElement.outerHTML ?? '';
    expect(frameHtml).toContain('Valentina Muñoz Vera');
    expect(frameHtml).toContain('EN MONTAJE');
    expect(frameHtml).toContain('CERRADO');
    expect(frameHtml).toContain('Consultado:');
    // H-M1: ticket had no historical crew -> historical card stays "Sin registro", current crew appears only as current note
    expect(frameHtml).toContain('<h2 class="card-heading">Sin registro</h2>');
    expect(frameHtml).toContain(
      'Cuadrilla vigente en producción: <strong>Cuadrilla Actualizada Sur</strong> (crew-sur-99).',
    );

    printFrame?.remove();
    windowPrintSpy.mockRestore();
  });

  it('H-M3. ignores out-of-order HTTP responses when switching from Production A to Production B while requests are in flight', async () => {
    const { api, catalogApi, component, fixture } = await setup(true);

    const ticketA$ = new Subject<any>();
    const prodA$ = new Subject<Production>();
    const resA$ = new Subject<any>();

    const ticketB$ = new Subject<any>();
    const prodB$ = new Subject<Production>();
    const resB$ = new Subject<any>();

    api.getCrewTicket.mockReturnValueOnce(ticketA$).mockReturnValueOnce(ticketB$);
    api.getProduction.mockReturnValueOnce(prodA$).mockReturnValueOnce(prodB$);
    catalogApi.getReservationsByProduction.mockReturnValueOnce(resA$).mockReturnValueOnce(resB$);

    // Start loading Production A (id=4)
    component.viewCrewTicket(4);
    expect(component.ticketPrintReady()).toBe(false);

    // Switch immediately to Production B (id=9) before A responds
    component.viewCrewTicket(9);
    expect(component.ticketProductionId()).toBe(9);
    expect(component.ticketPrintReady()).toBe(false);

    // Production B responds first
    ticketB$.next({
      id: 90,
      productionId: 9,
      eventId: 'evt-prod-b-90',
      productionName: 'Producción B Vigente',
      scheduledAt: '2026-12-01T10:00:00',
      location: 'Recinto B',
      status: 'EN_MONTAJE',
      instructions: 'Cuadrilla asignada: Cuadrilla B (crew-b-09). Directiva B.',
      createdAt: '2026-11-23T15:00:00',
      updatedAt: '2026-11-23T15:00:00',
    });
    prodB$.next({
      ...production,
      id: 9,
      name: 'Producción B Vigente',
      status: 'EN_MONTAJE',
      crewId: 'crew-b-09',
      crewName: 'Cuadrilla B',
    });
    resB$.next([
      {
        reservationId: 901,
        equipmentId: 91,
        equipmentName: 'Consola B Exclusiva',
        quantity: 3,
        status: 'CONFIRMED',
      },
    ]);
    fixture.detectChanges();

    expect(component.ticketPrintReady()).toBe(true);
    expect(component.currentTicket()?.productionId).toBe(9);

    // Stale Production A responses arrive late -> MUST NOT overwrite Production B state
    ticketA$.next({
      id: 40,
      productionId: 4,
      eventId: 'evt-stale-a-40',
      productionName: 'Producción A Obsoleta',
      scheduledAt: '2026-11-20T08:00:00',
      location: 'Recinto A',
      status: 'EN_MONTAJE',
      instructions: 'Directiva A obsoleta.',
      createdAt: '2026-11-20T10:00:00',
      updatedAt: '2026-11-20T10:00:00',
    });
    prodA$.next({ ...production, id: 4, name: 'Producción A Obsoleta', status: 'CANCELADO' });
    resA$.next([
      {
        reservationId: 401,
        equipmentId: 41,
        equipmentName: 'Equipo Obsoleto A',
        quantity: 1,
        status: 'RESERVED',
      },
    ]);
    fixture.detectChanges();

    expect(component.currentTicket()?.productionId).toBe(9);
    expect(component.currentTicket()?.productionName).toBe('Producción B Vigente');
    expect(component.ticketProduction()?.id).toBe(9);
    expect(component.ticketReservations()).toHaveLength(1);
    expect(component.ticketReservations()[0].equipmentName).toBe('Consola B Exclusiva');
  });

  it('H-M3. discards late HTTP responses when the crew ticket modal is closed before requests settle', async () => {
    const { api, catalogApi, component, fixture } = await setup(true);

    const ticket$ = new Subject<any>();
    const prod$ = new Subject<Production>();
    const res$ = new Subject<any>();

    api.getCrewTicket.mockReturnValue(ticket$);
    api.getProduction.mockReturnValue(prod$);
    catalogApi.getReservationsByProduction.mockReturnValue(res$);

    component.viewCrewTicket(4);
    expect(component.showTicketModal()).toBe(true);
    expect(component.ticketPrintReady()).toBe(false);

    component.closeTicketModal();
    expect(component.showTicketModal()).toBe(false);

    // Late emissions after modal close must be completely ignored
    ticket$.next({
      id: 55,
      productionId: 4,
      eventId: 'evt-late-55',
      productionName: 'Evento Tardío',
      scheduledAt: '2026-11-25T10:00:00',
      location: 'Recinto Tardío',
      status: 'EN_MONTAJE',
      instructions: 'Instrucción tardía.',
      createdAt: '2026-11-23T12:00:00',
      updatedAt: '2026-11-23T12:00:00',
    });
    prod$.next({ ...production, id: 4 });
    res$.next([
      { reservationId: 55, equipmentId: 5, equipmentName: 'Equipo Tardío', quantity: 1, status: 'RESERVED' },
    ]);
    fixture.detectChanges();

    expect(component.showTicketModal()).toBe(false);
    expect(component.currentTicket()).toBeNull();
    expect(component.ticketProduction()).toBeNull();
    expect(component.ticketReservations()).toEqual([]);
    expect(component.ticketPrintReady()).toBe(false);
  });

  it('H-B6. displays coherent America/Santiago timestamps between the modal and printed PDF for CLST and CLT', async () => {
    const { api, component, fixture } = await setup(true);
    const windowPrintSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    try {
      // Summer (CLST, UTC-3): 2026-11-23T02:03:24.116572 UTC -> 22/11/2026, 23:03 h (CLST, UTC-3)
      api.getCrewTicket.mockReturnValueOnce(of({
        id: 7,
        productionId: 4,
        eventId: 'evt-summer-7',
        productionName: 'Evento Verano CLST',
        scheduledAt: '2026-11-25T09:00:00',
        location: 'Concepción',
        status: 'EN_MONTAJE',
        instructions: 'Directiva verano.',
        createdAt: '2026-11-23T02:03:24.116572',
        updatedAt: '2026-11-23T02:03:24.116572',
      }));

      component.viewCrewTicket(4);
      fixture.detectChanges();
      const modalSummerText = fixture.nativeElement.querySelector('.ticket-modal-card')?.textContent ?? '';
      expect(modalSummerText).toContain('22/11/2026, 23:03 h (CLST, UTC-3)');
      expect(modalSummerText).toContain('25/11/2026, 09:00 h (CLST, UTC-3)');

      component.printCrewTicket();
      let printFrame = document.querySelector<HTMLIFrameElement>('iframe[data-print-frame="crew-ticket"]');
      let frameHtml = printFrame?.contentDocument?.documentElement.outerHTML ?? '';
      expect(frameHtml).toContain('22/11/2026, 23:03 h (CLST, UTC-3)');
      expect(frameHtml).toContain('25/11/2026, 09:00 h (CLST, UTC-3)');
      printFrame?.remove();

      // Winter (CLT, UTC-4): 2026-07-15T14:30:00 UTC -> 15/07/2026, 10:30 h (CLT, UTC-4)
      api.getCrewTicket.mockReturnValueOnce(of({
        id: 8,
        productionId: 4,
        eventId: 'evt-winter-8',
        productionName: 'Evento Invierno CLT',
        scheduledAt: '2026-07-20T09:30:00',
        location: 'Santiago',
        status: 'EN_MONTAJE',
        instructions: 'Directiva invierno.',
        createdAt: '2026-07-15T14:30:00',
        updatedAt: '2026-07-15T14:30:00',
      }));

      component.viewCrewTicket(4);
      fixture.detectChanges();
      const modalWinterText = fixture.nativeElement.querySelector('.ticket-modal-card')?.textContent ?? '';
      expect(modalWinterText).toContain('15/07/2026, 10:30 h (CLT, UTC-4)');
      expect(modalWinterText).toContain('20/07/2026, 09:30 h (CLT, UTC-4)');

      component.printCrewTicket();
      printFrame = document.querySelector<HTMLIFrameElement>('iframe[data-print-frame="crew-ticket"]');
      frameHtml = printFrame?.contentDocument?.documentElement.outerHTML ?? '';
      expect(frameHtml).toContain('15/07/2026, 10:30 h (CLT, UTC-4)');
      expect(frameHtml).toContain('20/07/2026, 09:30 h (CLT, UTC-4)');
      printFrame?.remove();
    } finally {
      windowPrintSpy.mockRestore();
    }
  });

  it('closes crew ticket modal on Escape key and manages trigger focus', async () => {
    const { component } = await setup(true);
    const triggerBtn = document.createElement('button');
    document.body.appendChild(triggerBtn);
    triggerBtn.focus();

    component.viewCrewTicket(4, triggerBtn);
    expect(component.showTicketModal()).toBe(true);

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    component.onTicketKeydown(escapeEvent);
    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(component.showTicketModal()).toBe(false);

    document.body.removeChild(triggerBtn);
  });

  it('downloads quote PDF for a closed production', async () => {
    const { api, component } = await setup(true);
    component.downloadQuotePdf(4);
    expect(api.downloadQuotePdf).toHaveBeenCalledWith(4);
  });

  it('hides transition controls, reservation builders and service contracting for CERRADO status', async () => {
    const { fixture, component } = await setup(true);
    const closedProd: Production = { ...production, id: 10, status: 'CERRADO' };
    component.selectProduction(closedProd);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.status-workflow-section')).toBeNull();
    expect(fixture.nativeElement.querySelector('#production-next-status')).toBeNull();
    expect(fixture.nativeElement.querySelector('.btn-submit-status')).toBeNull();
    expect(fixture.nativeElement.querySelector('.reservation-builder')).toBeNull();
    expect(fixture.nativeElement.querySelector('.services-contract-builder')).toBeNull();

    const notice = fixture.nativeElement.querySelector('.terminal-notice-section');
    expect(notice).not.toBeNull();
    expect(notice.textContent).toContain('Ciclo operativo finalizado');
    expect(notice.textContent).toContain('Estado terminal · Solo lectura');

    expect(fixture.nativeElement.querySelector('[aria-label="Resumen de producción"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.detail-meta-grid')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-labelledby="reservations-heading"]')).not.toBeNull();

    expect(fixture.nativeElement.querySelector('.btn-ticket-view')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.btn-quote-download')).not.toBeNull();
  });

  it('hides mutation controls for CANCELADO status and keeps consultation information', async () => {
    const { fixture, component } = await setup(true);
    const cancelledProd: Production = { ...production, id: 11, status: 'CANCELADO' };
    component.selectProduction(cancelledProd);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.status-workflow-section')).toBeNull();
    expect(fixture.nativeElement.querySelector('#production-next-status')).toBeNull();
    expect(fixture.nativeElement.querySelector('.reservation-builder')).toBeNull();
    const notice = fixture.nativeElement.querySelector('.terminal-notice-section');
    expect(notice).not.toBeNull();
    expect(notice.textContent).toContain('Producción cancelada');

    expect(fixture.nativeElement.querySelector('.btn-ticket-view')).toBeNull();
    expect(fixture.nativeElement.querySelector('.btn-quote-download')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Resumen de producción"]')).not.toBeNull();
  });

  it('ensures suggestNextStatus does not suggest CONFIRMADO for terminal statuses', async () => {
    const { component } = await setup(true);

    component.suggestNextStatus('CERRADO');
    expect(component.nextStatus.value).toBe('');

    component.suggestNextStatus('CANCELADO');
    expect(component.nextStatus.value).toBe('');

    component.suggestNextStatus('SOLICITADO');
    expect(component.nextStatus.value).toBe('CONFIRMADO');

    component.suggestNextStatus('CONFIRMADO');
    expect(component.nextStatus.value).toBe('EN_MONTAJE');

    component.suggestNextStatus('EN_MONTAJE');
    expect(component.nextStatus.value).toBe('EN_EJECUCION');

    component.suggestNextStatus('EN_EJECUCION');
    expect(component.nextStatus.value).toBe('CERRADO');
  });

  it('prevents residual nextStatus across production selections and detail closing', async () => {
    const { component } = await setup(true);

    component.selectProduction({ ...production, id: 1, status: 'SOLICITADO' });
    expect(component.nextStatus.value).toBe('CONFIRMADO');

    component.selectProduction({ ...production, id: 10, status: 'CERRADO' });
    expect(component.nextStatus.value).toBe('');

    component.closeDetail();
    expect(component.nextStatus.value).toBe('');
    expect(component.detail()).toBeNull();
  });

  it('blocks mutation attempts in frontend handlers for terminal productions', async () => {
    const { api, component } = await setup(true);
    const closedProd: Production = { ...production, id: 5, status: 'CERRADO' };
    component.selectProduction(closedProd);

    component.submitStatus();
    expect(component.operationError()).toContain('cerrada');
    expect(api.updateStatus).not.toHaveBeenCalled();

    component.selectedEquipmentId.setValue('1');
    component.selectedQuantity.setValue(2);
    component.addReservationItem();
    expect(component.reservationItems().length).toBe(0);

    component.toggleService(99);
    expect(component.selectedServiceIds()).toEqual([]);
  });

  it('preserves valid transition from EN_EJECUCION to CERRADO', async () => {
    const { api, component, fixture } = await setup(true);
    const runningProd: Production = { ...production, id: 6, status: 'EN_EJECUCION' };
    component.selectProduction(runningProd);
    fixture.detectChanges();

    expect(component.nextStatus.value).toBe('CERRADO');
    expect(fixture.nativeElement.querySelector('.status-workflow-section')).not.toBeNull();

    component.submitStatus();
    expect(api.updateStatus).toHaveBeenCalledWith(6, { status: 'CERRADO' });
  });

  it('auto-opens production context and triggers PDF download when deep-linked with ?productionId=10&action=download-pdf', async () => {
    const { api, routerMock, component } = await setup(true, {
      productionId: '10',
      action: 'download-pdf',
    });

    expect(api.getProduction).toHaveBeenCalledWith(10);
    expect(component.detail()?.id).toBe(10);
    expect(api.downloadQuotePdf).toHaveBeenCalledWith(10);
    expect(routerMock.navigate).toHaveBeenCalledWith([], {
      queryParams: { action: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('auto-opens production context and opens crew ticket modal when deep-linked with ?productionId=4&action=view-ticket', async () => {
    const { api, routerMock, component } = await setup(true, {
      productionId: '4',
      action: 'view-ticket',
    });

    expect(api.getProduction).toHaveBeenCalledWith(4);
    expect(api.getCrewTicket).toHaveBeenCalledWith(4);
    expect(component.showTicketModal()).toBe(true);
    expect(routerMock.navigate).toHaveBeenCalledWith([], {
      queryParams: { action: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });
});
