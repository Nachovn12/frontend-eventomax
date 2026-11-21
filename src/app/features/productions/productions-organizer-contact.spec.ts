import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { Productions } from './productions';
import { ProductionsDataService, PRODUCTION_STATUSES } from './productions-data.service';
import { CatalogDataService } from '../catalog/catalog-data.service';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { OrganizerContact, Production } from '../../core/models/production.model';

describe('Productions organizer contact behavior (Caso 8)', () => {
  const canonicalOwnerId = 'f191bdc8-7926-4722-9ec0-cba663701940:11111111-2222-3333-4444-555555555555';

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

  async function setup(options: {
    roles: readonly AppRole[];
    ownerId?: string;
    userEmail?: string;
    userDisplayName?: string;
    productions?: readonly Production[];
    getContactImpl?: (organizerId: string) => any;
    upsertContactImpl?: (organizerId: string, body: any) => any;
  }) {
    const queryParamMap$ = new BehaviorSubject(convertToParamMap({}));
    const list = options.productions ?? [aliasProduction];
    const api = {
      getProductions: vi.fn(() => of(list)),
      getStatuses: vi.fn(() => of(PRODUCTION_STATUSES)),
      createProduction: vi.fn(() => of(list[0])),
      getProduction: vi.fn((id: number) => of(list.find((p) => p.id === id) ?? list[0])),
      updateStatus: vi.fn(() => of(list[0])),
      getCrewTicket: vi.fn(() => of(null)),
      downloadQuotePdf: vi.fn(() => of(new Blob())),
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

  it('Organizador: preserves self-contact panel, prefills login email as suggestion, saves via PUT and labels as registered (not verified)', async () => {
    const { api, fixture, component } = await setup({
      roles: [AppRole.Organizador],
      productions: [ownProduction],
      userEmail: 'ig.valeria@duocuc.cl',
      userDisplayName: 'Ignacio Valeria',
    });

    expect(api.getOrganizerContact).toHaveBeenCalledWith(canonicalOwnerId);
    expect(component.selfContactMissing()).toBe(true);

    component.openSelfContactForm();
    fixture.detectChanges();
    expect(component.selfContactForm.controls.email.value).toBe('ig.valeria@duocuc.cl');

    component.selfContactForm.controls.email.setValue('contacto.confirmado@duocuc.cl');
    component.submitSelfContact();
    fixture.detectChanges();

    expect(api.upsertOrganizerContact).toHaveBeenCalledWith(canonicalOwnerId, {
      email: 'contacto.confirmado@duocuc.cl',
      contactName: 'Ignacio Valeria',
      phone: undefined,
    });
    expect(component.selfContact()?.email).toBe('contacto.confirmado@duocuc.cl');
    const text = (fixture.nativeElement.textContent as string).toLowerCase();
    expect(text).toContain('contacto registrado');
    expect(text).not.toContain('correo verificado');
  });

  it('Organizador: handles 403 on self-contact lookup and update gracefully', async () => {
    const { fixture, component } = await setup({
      roles: [AppRole.Organizador],
      productions: [ownProduction],
      getContactImpl: () => throwError(() => new HttpErrorResponse({ status: 403 })),
      upsertContactImpl: () => throwError(() => new HttpErrorResponse({ status: 403 })),
    });

    expect(component.selfContactError()).toContain('No tienes permisos');
    component.openSelfContactForm();
    component.selfContactForm.controls.email.setValue('ig.valeria@duocuc.cl');
    component.submitSelfContact();
    fixture.detectChanges();

    expect(component.selfContactError()).toContain('No tienes permisos');
  });

  it('Detail drawer does NOT render organizer contact management or perform redundant contact HTTP calls for Admin', async () => {
    const { api, fixture, component } = await setup({
      roles: [AppRole.Admin],
      productions: [aliasProduction],
    });

    component.selectProduction(aliasProduction);
    fixture.detectChanges();

    expect(api.getOrganizerContact).not.toHaveBeenCalled();
    const drawer = fixture.nativeElement.querySelector('.detail-drawer') as HTMLElement;
    expect(drawer).not.toBeNull();
    expect(drawer.textContent).toContain('DEMO-NOTIFY-V2-20261121');
    expect(drawer.textContent).toContain('org-demo-ignacio-valeria');
    expect(drawer.textContent).not.toContain('Contacto del organizador');
    expect(drawer.textContent).not.toContain('Registrar contacto');
    expect(drawer.textContent).not.toContain('Sin contacto registrado');
  });

  it('Detail drawer does NOT render organizer contact management or perform redundant contact HTTP calls for Productor', async () => {
    const { api, fixture, component } = await setup({
      roles: [AppRole.Productor],
      productions: [aliasProduction],
    });

    component.selectProduction(aliasProduction);
    fixture.detectChanges();

    expect(api.getOrganizerContact).not.toHaveBeenCalled();
    const drawer = fixture.nativeElement.querySelector('.detail-drawer') as HTMLElement;
    expect(drawer).not.toBeNull();
    expect(drawer.textContent).not.toContain('Contacto del organizador');
    expect(drawer.textContent).not.toContain('Registrar contacto');
    expect(drawer.textContent).not.toContain('Sin contacto registrado');
  });

  it('Productor create modal: checks organizer contact passively (200/404/errors), ignores stale responses, cleans up on close and does not block creation', async () => {
    const first$ = new Subject<OrganizerContact>();
    const second$ = new Subject<OrganizerContact>();
    let callCount = 0;

    const { api, fixture, component } = await setup({
      roles: [AppRole.Productor],
      productions: [aliasProduction],
      getContactImpl: (id: string) => {
        callCount++;
        if (id === 'org-slow') return first$.asObservable();
        if (id === 'org-fast') return second$.asObservable();
        if (id === 'org-missing') return throwError(() => new HttpErrorResponse({ status: 404 }));
        if (id === 'org-forbidden') return throwError(() => new HttpErrorResponse({ status: 403 }));
        if (id === 'org-net') return throwError(() => new HttpErrorResponse({ status: 0 }));
        return of({
          id: 1,
          organizerId: id,
          email: 'ig.valeria@duocuc.cl',
          active: true,
        });
      },
    });

    component.openCreateModal();
    fixture.detectChanges();

    // Stale async response protection
    component.createForm.controls.organizerId.setValue('org-slow');
    component.checkCreateOrganizerContact();
    component.createForm.controls.organizerId.setValue('org-fast');
    component.checkCreateOrganizerContact();

    second$.next({ id: 2, organizerId: 'org-fast', email: 'vigente@duocuc.cl', active: true });
    second$.complete();
    first$.next({ id: 1, organizerId: 'org-slow', email: 'obsoleto@duocuc.cl', active: true });
    first$.complete();
    fixture.detectChanges();

    expect(callCount).toBe(2);
    expect(component.createContactStatus()).toBe('found');
    expect(component.createContactEmail()).toBe('vigente@duocuc.cl');

    // 404 shows discreet warning but does NOT block creation
    component.createForm.controls.organizerId.setValue('org-missing');
    component.checkCreateOrganizerContact();
    fixture.detectChanges();
    expect(component.createContactStatus()).toBe('missing');
    expect(component.createContactMessage()).toContain('Organizadores');

    component.createForm.patchValue({
      name: 'Evento sin contacto',
      scheduledAt: '2030-12-01T18:00',
      location: 'Santiago',
    });
    component.submitCreate();
    expect(api.createProduction).toHaveBeenCalledWith(
      expect.objectContaining({ organizerId: 'org-missing' })
    );

    // 403 and network errors handled cleanly
    component.openCreateModal();
    component.createForm.controls.organizerId.setValue('org-forbidden');
    component.checkCreateOrganizerContact();
    expect(component.createContactStatus()).toBe('error');
    expect(component.createContactMessage()).toContain('No tienes permisos');

    component.createForm.controls.organizerId.setValue('org-net');
    component.checkCreateOrganizerContact();
    expect(component.createContactStatus()).toBe('error');
    expect(component.createContactMessage()).toContain('No se pudo conectar');

    // Close resets state
    component.closeCreateModal();
    expect(component.createContactStatus()).toBe('idle');
    expect(component.createContactMessage()).toBe('');
  });

  it('warns non-blockingly before confirming SOLICITADO production when organizer contact is 404', async () => {
    const solicitadoProd: Production = { ...aliasProduction, id: 12, status: 'SOLICITADO' };
    const { fixture, component } = await setup({
      roles: [AppRole.Productor],
      productions: [solicitadoProd],
      getContactImpl: () => throwError(() => new HttpErrorResponse({ status: 404 })),
    });

    component.selectProduction(solicitadoProd);
    fixture.detectChanges();

    expect(component.confirmContactMissing()).toBe(true);
    const drawer = fixture.nativeElement.querySelector('.detail-drawer') as HTMLElement;
    expect(drawer.textContent).toContain('el organizador no tiene un contacto registrado');
    expect(drawer.textContent).not.toContain('Contacto del organizador');
    expect(drawer.textContent).not.toContain('Registrar contacto');
  });

  it('Organizador: can create own production using tid:oid, renders Nueva producción button, and cannot update/confirm/close', async () => {
    const { api, fixture, component } = await setup({
      roles: [AppRole.Organizador],
      productions: [ownProduction],
    });

    expect(component.canCreate()).toBe(true);
    expect(component.canUpdate()).toBe(false);
    expect(component.canViewCrewTicket()).toBe(false);

    const createBtn = fixture.nativeElement.querySelector('.btn-create-primary') as HTMLButtonElement | null;
    expect(createBtn).not.toBeNull();
    expect(createBtn?.textContent).toContain('Nueva producción');

    component.openCreateModal();
    fixture.detectChanges();

    const orgInput = fixture.nativeElement.querySelector('#create-organizer-input') as HTMLInputElement | null;
    expect(orgInput).not.toBeNull();
    expect(orgInput?.readOnly).toBe(true);
    expect(component.createForm.controls.organizerId.value).toBe(canonicalOwnerId);

    // Even if organizerId control were altered, submitCreate enforces currentOwnerId() (tid:oid)
    component.createForm.patchValue({
      organizerId: 'org-otro-no-autorizado',
      name: 'Evento propio de Organizador',
      scheduledAt: '2030-12-15T19:00',
      location: 'Centro Cultural',
    });
    component.submitCreate();
    fixture.detectChanges();

    expect(api.createProduction).toHaveBeenCalledWith({
      organizerId: canonicalOwnerId,
      name: 'Evento propio de Organizador',
      scheduledAt: '2030-12-15T19:00',
      location: 'Centro Cultural',
    });

    // Cannot confirm, assign crew, or close productions
    component.selectProduction({ ...ownProduction, status: 'SOLICITADO' });
    fixture.detectChanges();
    const drawer = fixture.nativeElement.querySelector('.detail-drawer') as HTMLElement;
    expect(drawer.querySelector('.workflow-form')).toBeNull();

    component.updateId.setValue(String(ownProduction.id));
    component.nextStatus.setValue('CONFIRMADO');
    component.submitStatus();
    expect(api.updateStatus).not.toHaveBeenCalled();
  });

  it('Role permission matrix: Productor creates/updates, Admin-only updates without creating, Admin+Productor creates, Auditor is read-only', async () => {
    // Productor
    {
      const { fixture, component } = await setup({ roles: [AppRole.Productor] });
      expect(component.canCreate()).toBe(true);
      expect(component.canUpdate()).toBe(true);
      expect(fixture.nativeElement.querySelector('.btn-create-primary')).not.toBeNull();
      TestBed.resetTestingModule();
    }

    // Admin alone (cannot create without Productor/Organizador authorization)
    {
      const { fixture, component } = await setup({ roles: [AppRole.Admin] });
      expect(component.canCreate()).toBe(false);
      expect(component.canUpdate()).toBe(true);
      expect(fixture.nativeElement.querySelector('.btn-create-primary')).toBeNull();
      TestBed.resetTestingModule();
    }

    // Admin + Productor (can create because of Productor authorization)
    {
      const { fixture, component } = await setup({ roles: [AppRole.Admin, AppRole.Productor] });
      expect(component.canCreate()).toBe(true);
      expect(component.canUpdate()).toBe(true);
      expect(fixture.nativeElement.querySelector('.btn-create-primary')).not.toBeNull();
      TestBed.resetTestingModule();
    }

    // Auditor (strictly read-only)
    {
      const { api, fixture, component } = await setup({ roles: [AppRole.Auditor] });
      expect(component.canCreate()).toBe(false);
      expect(component.canUpdate()).toBe(false);
      expect(component.canViewCrewTicket()).toBe(false);
      expect(fixture.nativeElement.querySelector('.btn-create-primary')).toBeNull();
      component.submitCreate();
      component.submitStatus();
      expect(api.createProduction).not.toHaveBeenCalled();
      expect(api.updateStatus).not.toHaveBeenCalled();
    }
  });
});
