import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Productions } from './productions';
import { ProductionsDataService, PRODUCTION_STATUSES } from './productions-data.service';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { Production } from '../../core/models/production.model';

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
    const api = {
      getProductions: vi.fn(() => of([production])),
      getStatuses: vi.fn(() => of(PRODUCTION_STATUSES)),
      createProduction: vi.fn(() => of(production)),
      getProduction: vi.fn(() => of(production)),
      updateStatus: vi.fn(() => of({ ...production, status: 'EN_MONTAJE' as const }))
    };
    await TestBed.configureTestingModule({
      imports: [Productions],
      providers: [
        { provide: ProductionsDataService, useValue: api },
        { provide: AuthorizationService, useValue: {
          hasAnyRole: () => authorised,
          hasScope: () => authorised
        } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(Productions);
    fixture.detectChanges();
    return { api, fixture, component: fixture.componentInstance };
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
});
