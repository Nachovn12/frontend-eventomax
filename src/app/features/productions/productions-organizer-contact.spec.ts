import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
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
});
