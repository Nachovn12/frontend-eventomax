import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { Productions } from './productions';
import { ProductionsDataService, PRODUCTION_STATUSES } from './productions-data.service';
import { CatalogDataService } from '../catalog/catalog-data.service';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { EligibleOrganizersPage, OrganizerContact, Production } from '../../core/models/production.model';

describe('Productions SELF / EXTERNAL & organizer contact behavior (Etapa 4)', () => {
  const canonicalOwnerId = 'f191bdc8-7926-4722-9ec0-cba663701940:11111111-2222-3333-4444-555555555555';
  const entraOrgId = 'f191bdc8-7926-4722-9ec0-cba663701940:e5660fea-f5dd-4974-abb0-47e92f389d63';

  const aliasProduction: Production = {
    id: 9,
    organizerId: 'org-demo-ignacio-valeria',
    name: 'DEMO-NOTIFY-V2-20261121',
    location: 'Santiago',
    scheduledAt: '2030-11-21T18:00:00',
    status: 'CONFIRMADO',
    createdAt: '2026-11-21T01:00:00',
    updatedAt: '2026-11-21T01:00:00',
  };

  const ownProduction: Production = {
    ...aliasProduction,
    id: 10,
    organizerId: canonicalOwnerId,
  };

  const sampleEligiblePage: EligibleOrganizersPage = {
    items: [
      {
        organizerId: entraOrgId,
        displayName: 'Benjamin Espinoza',
        source: 'ENTRA_ORGANIZER',
        hasRegisteredContact: true,
        maskedEmail: 'be***@duocuc.cl',
      },
      {
        organizerId: 'ext-client-01',
        displayName: 'Productora Sur',
        source: 'EXTERNAL_CONTACT',
        hasRegisteredContact: true,
        maskedEmail: 'co***@sur.cl',
      },
    ],
    page: 0,
    size: 20,
    total: 2,
    directorySyncStatus: 'OK',
  };

  async function setup(options: {
    roles: readonly AppRole[];
    ownerId?: string;
    userEmail?: string;
    userDisplayName?: string;
    productions?: readonly Production[];
    getContactImpl?: (organizerId: string) => any;
    upsertContactImpl?: (organizerId: string, body: any) => any;
    getEligibleImpl?: (params: any) => any;
    createProductionImpl?: (body: any) => any;
  }) {
    const queryParamMap$ = new BehaviorSubject(convertToParamMap({}));
    const list = options.productions ?? [aliasProduction];
    const api = {
      getProductions: vi.fn(() => of(list)),
      getStatuses: vi.fn(() => of(PRODUCTION_STATUSES)),
      createProduction: vi.fn(options.createProductionImpl ?? (() => of(list[0]))),
      getProduction: vi.fn((id: number) => of(list.find((p) => p.id === id) ?? list[0])),
      updateStatus: vi.fn(() => of(list[0])),
      getCrewTicket: vi.fn(() => of(null)),
      downloadQuotePdf: vi.fn(() => of(new Blob())),
      getEligibleOrganizers: vi.fn(options.getEligibleImpl ?? (() => of(sampleEligiblePage))),
      getOrganizerContact: vi.fn(
        options.getContactImpl ?? (() => throwError(() => new HttpErrorResponse({ status: 404 })))
      ),
      upsertOrganizerContact: vi.fn(
        options.upsertContactImpl ??
          ((organizerId: string, body: any) =>
            of({
              id: 2,
              organizerId,
              email: body.email,
              contactName: body.contactName ?? null,
              phone: body.phone ?? null,
              userOid: null,
              active: true,
            } as OrganizerContact))
      ),
    };
    const catalogApi = {
      getEquipment: vi.fn(() => of([])),
      getServices: vi.fn(() => of([])),
      getReservationsByProduction: vi.fn(() => of([])),
    };

    await TestBed.configureTestingModule({
      imports: [Productions],
      providers: [
        { provide: ProductionsDataService, useValue: api },
        { provide: CatalogDataService, useValue: catalogApi },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap$.asObservable(),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
        {
          provide: AuthorizationService,
          useValue: {
            hasAnyRole: (allowed: readonly AppRole[]) => options.roles.some((r) => allowed.includes(r)),
            hasScope: (scope: string) => scope === 'access_as_user',
            ownerId: () => options.ownerId ?? canonicalOwnerId,
            userEmail: () => options.userEmail ?? 'ig.valeria@duocuc.cl',
            userDisplayName: () => options.userDisplayName ?? 'Ignacio Valeria',
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    return { api, fixture, component: fixture.componentInstance };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('Organizador: preserves self-contact panel, submits SELF without organizerId, and cannot use EXTERNAL or updateStatus', async () => {
    const { api, fixture, component } = await setup({
      roles: [AppRole.Organizador],
      productions: [ownProduction],
    });

    expect(component.canCreate()).toBe(true);
    expect(component.canUseExternalMode()).toBe(false);
    expect(component.canUpdate()).toBe(false);
    expect(api.getOrganizerContact).toHaveBeenCalledWith(canonicalOwnerId);
    expect(component.selfContactMissing()).toBe(true);

    component.openSelfContactForm();
    fixture.detectChanges();
    component.selfContactForm.controls.email.setValue('contacto.confirmado@duocuc.cl');
    component.submitSelfContact();
    fixture.detectChanges();

    expect(api.upsertOrganizerContact).toHaveBeenCalledWith(canonicalOwnerId, {
      email: 'contacto.confirmado@duocuc.cl',
      contactName: 'Ignacio Valeria',
      phone: undefined,
    });
    const text = (fixture.nativeElement.textContent as string).toLowerCase();
    expect(text).toContain('contacto registrado');
    expect(text).not.toContain('correo verificado');

    // SELF creation omits organizerId and hides EXTERNAL mode
    component.openCreateModal();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.create-mode-tabs')).toBeNull();
    expect(fixture.nativeElement.querySelector('#create-organizer-input')).toBeNull();

    component.createForm.setValue({
      name: 'Evento Propio Organizador',
      scheduledAt: '2035-06-15T18:00',
      location: 'Centro Cultural',
    });
    component.submitCreate();
    expect(api.createProduction).toHaveBeenCalledWith({
      organizerMode: 'SELF',
      name: 'Evento Propio Organizador',
      scheduledAt: '2035-06-15T18:00',
      location: 'Centro Cultural',
    });

    // Cannot update status
    component.updateId.setValue('10');
    component.nextStatus.setValue('CONFIRMADO');
    component.submitStatus();
    expect(api.updateStatus).not.toHaveBeenCalled();
  });

  it('Productor exclusivo & Admin+Productor: show SELF & EXTERNAL modes, complete exceptional self-contact without userOid, and prevent duplicate submits', async () => {
    const pendingCreate$ = new Subject<Production>();
    const { api, fixture, component } = await setup({
      roles: [AppRole.Productor],
      productions: [ownProduction],
      createProductionImpl: () => pendingCreate$.asObservable(),
    });

    // Exceptional self-contact available for Productor exclusivo when 404
    expect(component.canManageSelfContact()).toBe(true);
    expect(component.showSelfContactPanel()).toBe(true);
    component.openSelfContactForm();
    component.selfContactForm.controls.email.setValue('productor@duocuc.cl');
    component.submitSelfContact();
    expect(api.upsertOrganizerContact).toHaveBeenCalledWith(canonicalOwnerId, {
      email: 'productor@duocuc.cl',
      contactName: 'Ignacio Valeria',
      phone: undefined,
    });
    expect((api.upsertOrganizerContact.mock.calls[0][1] as any).userOid).toBeUndefined();

    // SELF submit prevents duplicate submissions while saving
    component.openCreateModal();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.create-mode-tabs')).not.toBeNull();
    component.createForm.setValue({
      name: 'Evento Propio Productor',
      scheduledAt: '2035-06-15T18:00',
      location: 'Santiago',
    });
    component.submitCreate();
    component.submitCreate();
    expect(api.createProduction).toHaveBeenCalledTimes(1);
    expect(api.createProduction).toHaveBeenCalledWith({
      organizerMode: 'SELF',
      name: 'Evento Propio Productor',
      scheduledAt: '2035-06-15T18:00',
      location: 'Santiago',
    });
    pendingCreate$.next(ownProduction);
    pendingCreate$.complete();
  });

  it('EXTERNAL selector: searches eligible organizers, cancels stale responses, handles ENTRA_ORGANIZER, EXTERNAL_CONTACT, DISABLED, DEGRADED, pagination and NEW_EXTERNAL', async () => {
    const first$ = new Subject<EligibleOrganizersPage>();
    const second$ = new Subject<EligibleOrganizersPage>();
    let calls = 0;

    const { api, fixture, component } = await setup({
      roles: [AppRole.Admin, AppRole.Productor],
      productions: [aliasProduction],
      getEligibleImpl: (params: any) => {
        calls++;
        if (params.q === 'slow') return first$.asObservable();
        if (params.q === 'fast') return second$.asObservable();
        if (params.page === 1) {
          return of({ ...sampleEligiblePage, page: 1, total: 25 });
        }
        return of({ ...sampleEligiblePage, total: 25 });
      },
    });

    component.openCreateModal();
    component.setCreateMode('EXTERNAL');
    fixture.detectChanges();

    expect(api.getEligibleOrganizers).toHaveBeenCalledWith({ q: '', page: 0, size: 20 });
    expect(fixture.nativeElement.textContent).toContain('Benjamin Espinoza');
    expect(fixture.nativeElement.textContent).toContain('Cuenta EventoMax');
    expect(fixture.nativeElement.textContent).toContain('Productora Sur');
    expect(fixture.nativeElement.textContent).toContain('Cliente externo');

    // Pagination
    component.goToEligiblePage(1);
    expect(component.eligiblePage()).toBe(1);

    // Stale search cancellation via switchMap
    (component as any).eligibleSearchTrigger$.next({ q: 'slow', page: 0 });
    (component as any).eligibleSearchTrigger$.next({ q: 'fast', page: 0 });
    second$.next({
      items: [sampleEligiblePage.items[1]],
      page: 0,
      size: 20,
      total: 1,
      directorySyncStatus: 'DISABLED',
    });
    second$.complete();
    first$.next(sampleEligiblePage);
    first$.complete();
    fixture.detectChanges();

    expect(component.eligibleDirectoryStatus()).toBe('DISABLED');
    expect(component.eligibleOrganizers()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('temporalmente deshabilitada');

    // Selecting EXTERNAL_CONTACT produces EXISTING_EXTERNAL payload without editable email
    component.selectEligibleOrganizer(sampleEligiblePage.items[1]);
    component.createForm.setValue({
      name: 'Evento Cliente Existente',
      scheduledAt: '2035-07-01T18:00',
      location: 'Concepción',
    });
    component.submitCreate();
    expect(api.createProduction).toHaveBeenCalledWith({
      organizerMode: 'EXTERNAL',
      externalOrganizerType: 'EXISTING_EXTERNAL',
      organizerId: 'ext-client-01',
      name: 'Evento Cliente Existente',
      scheduledAt: '2035-07-01T18:00',
      location: 'Concepción',
    });

    // DEGRADED blocks selecting ENTRA_ORGANIZER
    component.openCreateModal();
    component.setCreateMode('EXTERNAL');
    component.eligibleDirectoryStatus.set('DEGRADED');
    component.selectEligibleOrganizer(sampleEligiblePage.items[0]);
    expect(component.selectedEligibleOrganizer()).toBeNull();
    expect(component.externalSelectionError()).toContain('no está disponible temporalmente');

    // OK allows selecting ENTRA_ORGANIZER
    component.eligibleDirectoryStatus.set('OK');
    component.selectEligibleOrganizer(sampleEligiblePage.items[0]);
    component.createForm.setValue({
      name: 'Evento Entra',
      scheduledAt: '2035-07-05T18:00',
      location: 'Santiago',
    });
    component.submitCreate();
    expect(api.createProduction).toHaveBeenCalledWith({
      organizerMode: 'EXTERNAL',
      externalOrganizerType: 'ENTRA_ORGANIZER',
      organizerId: entraOrgId,
      name: 'Evento Entra',
      scheduledAt: '2035-07-05T18:00',
      location: 'Santiago',
    });

    // NEW_EXTERNAL generates payload without organizerId and without extra PUT calls
    component.openCreateModal();
    component.setCreateMode('EXTERNAL');
    component.toggleNewExternalClient(true);
    fixture.detectChanges();

    component.createForm.setValue({
      name: 'Festival Nuevo Cliente',
      scheduledAt: '2035-08-10T20:00',
      location: 'Valparaíso',
    });
    component.newExternalClientForm.setValue({
      externalClientName: 'Festival Costero SpA',
      externalClientEmail: 'contacto@festivalcostero.cl',
    });
    component.submitCreate();

    expect(api.createProduction).toHaveBeenCalledWith({
      organizerMode: 'EXTERNAL',
      externalOrganizerType: 'NEW_EXTERNAL',
      externalClientName: 'Festival Costero SpA',
      externalClientEmail: 'contacto@festivalcostero.cl',
      name: 'Festival Nuevo Cliente',
      scheduledAt: '2035-08-10T20:00',
      location: 'Valparaíso',
    });
    expect(api.upsertOrganizerContact).not.toHaveBeenCalled();
    expect(calls).toBeGreaterThanOrEqual(4);
  });

  it('handles 403, 409 and 503 errors cleanly on createProduction without catalog/inventory jargon', async () => {
    for (const [status, expectedFragment] of [
      [403, 'no está autorizado'],
      [409, 'conflicto'],
      [503, 'directorio'],
    ] as const) {
      const { component } = await setup({
        roles: [AppRole.Productor],
        createProductionImpl: () => throwError(() => new HttpErrorResponse({ status })),
      });
      component.openCreateModal();
      component.createForm.setValue({
        name: 'Evento Error',
        scheduledAt: '2035-08-10T20:00',
        location: 'Santiago',
      });
      component.submitCreate();
      expect(component.operationError().toLowerCase()).toContain(expectedFragment);
      expect(component.operationError().toLowerCase()).not.toContain('inventario');
      TestBed.resetTestingModule();
    }
  });

  it('Role permission matrix: Admin-only and Auditor cannot create; detail drawer has no contact admin form', async () => {
    for (const role of [AppRole.Admin, AppRole.Auditor]) {
      const { api, fixture, component } = await setup({ roles: [role] });
      expect(component.canCreate()).toBe(false);
      expect(component.canUseExternalMode()).toBe(false);
      expect(fixture.nativeElement.querySelector('.btn-create-primary')).toBeNull();
      component.submitCreate();
      expect(api.createProduction).not.toHaveBeenCalled();
      TestBed.resetTestingModule();
    }

    // Confirm notice in SOLICITADO drawer stays non-blocking and does NOT mention /organizers
    const solicitadoProd: Production = { ...aliasProduction, id: 12, status: 'SOLICITADO' };
    const { fixture, component } = await setup({
      roles: [AppRole.Productor],
      productions: [solicitadoProd],
      getContactImpl: () => throwError(() => new HttpErrorResponse({ status: 404 })),
    });
    component.selectProduction(solicitadoProd);
    fixture.detectChanges();
    const drawer = fixture.nativeElement.querySelector('.detail-drawer') as HTMLElement;
    expect(drawer.textContent).toContain('el organizador no tiene un contacto registrado');
    expect(drawer.textContent).not.toContain('en Organizadores');
  });
});
