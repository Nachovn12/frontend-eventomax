import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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

  async function setup(authorised: boolean) {
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
      downloadQuotePdf: vi.fn(() => of(new Blob(['%PDF-1.4'], { type: 'application/pdf' })))
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
        { provide: AuthorizationService, useValue: {
          hasAnyRole: () => authorised,
          hasScope: () => authorised
        } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    return { api, catalogApi, fixture, component: fixture.componentInstance };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('does not expose write actions without role and scope', async () => {
    const { fixture, component } = await setup(false);
    expect(component.canCreate()).toBe(false);
    expect(component.canUpdate()).toBe(false);
    expect(fixture.nativeElement.querySelector('[aria-label="Crear producción"]')).toBeNull();
    component.submitStatus();
  });

  it('creates a production with the real request contract', async () => {
    const { api, component, fixture } = await setup(true);
    component.createForm.setValue({
      organizerId: 'org-demo',
      name: 'Evento EP2',
      location: 'Santiago',
      scheduledAt: '2030-11-20T18:00'
    });
    component.submitCreate();
    fixture.detectChanges();
    expect(api.createProduction).toHaveBeenCalledWith({
      organizerId: 'org-demo',
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
    expect(notice.textContent).toContain('Producción cerrada');
    expect(notice.textContent).toContain('No se permiten nuevas transiciones');

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
});
