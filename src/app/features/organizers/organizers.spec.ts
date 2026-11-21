import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { Organizers } from './organizers';
import { ProductionsDataService } from '../productions/productions-data.service';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { OrganizerContact } from '../../core/models/production.model';

describe('Organizers admin feature (/organizers)', () => {
  const existingContact: OrganizerContact = {
    id: 1,
    organizerId: 'org-demo-ignacio-valeria',
    email: 'ig.valeria@duocuc.cl',
    contactName: 'Ignacio Valeria',
    phone: '+56912345678',
    userOid: '11111111-2222-3333-4444-555555555555',
    active: true,
  };

  async function setup(options?: {
    roles?: readonly AppRole[];
    getImpl?: (id: string) => any;
    upsertImpl?: (id: string, body: any) => any;
  }) {
    const roles = options?.roles ?? [AppRole.Admin];
    const api = {
      getOrganizerContact: vi.fn(options?.getImpl ?? (() => of(existingContact))),
      upsertOrganizerContact: vi.fn(
        options?.upsertImpl ??
          ((organizerId: string, body: any) =>
            of({
              id: 1,
              organizerId,
              email: body.email,
              contactName: body.contactName ?? null,
              phone: body.phone ?? null,
              userOid: body.userOid ?? null,
              active: true,
            } as OrganizerContact))
      ),
    };

    await TestBed.configureTestingModule({
      imports: [Organizers],
      providers: [
        { provide: ProductionsDataService, useValue: api },
        {
          provide: AuthorizationService,
          useValue: {
            hasAnyRole: (allowed: readonly AppRole[]) => roles.some((r) => allowed.includes(r)),
            hasScope: (scope: string) => scope === 'access_as_user',
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Organizers);
    fixture.detectChanges();
    return { api, fixture, component: fixture.componentInstance };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('Admin: consults existing contact (200), preserves userOid when updating email, and labels as Contacto registrado', async () => {
    const { api, fixture, component } = await setup();

    component.searchOrganizerId.setValue('org-demo-ignacio-valeria');
    component.submitLookup();
    fixture.detectChanges();

    expect(api.getOrganizerContact).toHaveBeenCalledWith('org-demo-ignacio-valeria');
    expect(component.contact()?.email).toBe('ig.valeria@duocuc.cl');
    const text = (fixture.nativeElement.textContent as string).toLowerCase();
    expect(text).toContain('contacto registrado');
    expect(text).not.toContain('correo verificado');

    // Update email while clearing userOid input -> must preserve existing userOid
    component.contactForm.controls.email.setValue('nuevo@duocuc.cl');
    component.contactForm.controls.userOid.setValue('');
    component.submitSave();
    fixture.detectChanges();

    expect(api.upsertOrganizerContact).toHaveBeenCalledWith('org-demo-ignacio-valeria', {
      email: 'nuevo@duocuc.cl',
      contactName: 'Ignacio Valeria',
      phone: '+56912345678',
      userOid: '11111111-2222-3333-4444-555555555555',
    });
    expect(component.saveSuccess()).toContain('nuevo@duocuc.cl');
  });

  it('Admin: handles 404 and registers new contact without inventing userOid', async () => {
    const { api, fixture, component } = await setup({
      getImpl: () => throwError(() => new HttpErrorResponse({ status: 404 })),
    });

    component.searchOrganizerId.setValue('org-nuevo');
    component.submitLookup();
    fixture.detectChanges();

    expect(component.notFound()).toBe(true);
    component.contactForm.setValue({
      email: 'ig.valeria@duocuc.cl',
      contactName: 'Ignacio Valeria',
      phone: '',
      userOid: '',
    });
    component.submitSave();
    fixture.detectChanges();

    expect(api.upsertOrganizerContact).toHaveBeenCalledWith('org-nuevo', {
      email: 'ig.valeria@duocuc.cl',
      contactName: 'Ignacio Valeria',
      phone: undefined,
    });
    expect(component.notFound()).toBe(false);
    expect(component.contact()?.email).toBe('ig.valeria@duocuc.cl');
  });

  it('handles HTTP 400, 401, 403 and network errors on lookup and save', async () => {
    for (const [status, expected] of [
      [400, 'no es válido'],
      [401, 'Sesión expirada'],
      [403, 'No tienes permisos'],
      [0, 'No fue posible conectar'],
    ] as const) {
      const { component } = await setup({
        getImpl: () => throwError(() => new HttpErrorResponse({ status })),
      });
      component.searchOrganizerId.setValue('org-err');
      component.submitLookup();
      expect(component.lookupError()).toContain(expected);
      TestBed.resetTestingModule();
    }

    const { component } = await setup({
      getImpl: () => throwError(() => new HttpErrorResponse({ status: 404 })),
      upsertImpl: () => throwError(() => new HttpErrorResponse({ status: 403 })),
    });
    component.searchOrganizerId.setValue('org-err');
    component.submitLookup();
    component.contactForm.controls.email.setValue('ig.valeria@duocuc.cl');
    component.submitSave();
    expect(component.saveError()).toContain('No tienes permisos');
  });

  it('ignores stale async responses when organizerId changes quickly', async () => {
    const first$ = new Subject<OrganizerContact>();
    const second$ = new Subject<OrganizerContact>();
    const { component } = await setup({
      getImpl: (id: string) => (id === 'org-1' ? first$.asObservable() : second$.asObservable()),
    });

    component.searchOrganizerId.setValue('org-1');
    component.submitLookup();
    component.searchOrganizerId.setValue('org-2');
    component.submitLookup();

    second$.next({ ...existingContact, organizerId: 'org-2', email: 'segundo@duocuc.cl' });
    second$.complete();
    first$.next({ ...existingContact, organizerId: 'org-1', email: 'obsoleto@duocuc.cl' });
    first$.complete();

    expect(component.activeOrganizerId()).toBe('org-2');
    expect(component.contact()?.email).toBe('segundo@duocuc.cl');
  });

  it('blocks non-Admin roles (Auditor / Productor) from invoking admin operations', async () => {
    const { api, component } = await setup({ roles: [AppRole.Auditor] });
    expect(component.canAdmin()).toBe(false);
    component.searchOrganizerId.setValue('org-demo-ignacio-valeria');
    component.submitLookup();
    expect(api.getOrganizerContact).not.toHaveBeenCalled();
  });
});
