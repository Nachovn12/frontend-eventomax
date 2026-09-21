import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';
import { Dashboard } from './dashboard';
import { DashboardDataService } from './dashboard-data.service';
import { of, throwError } from 'rxjs';
import { Production } from '../../core/models/production.model';
import { CatalogService } from '../catalog/models/catalog-service.model';

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  const roles = signal<AppRole[]>([]);
  let dataServiceMock: any;

  beforeEach(async () => {
    roles.set([]);

    dataServiceMock = {
      getProductions: vi.fn(() => of([])),
      getCatalogServices: vi.fn(() => of([])),
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        { provide: AuthorizationService, useValue: { roles } },
        { provide: DashboardDataService, useValue: dataServiceMock }
      ],
    }).compileComponents();
  });

  it.each([
    [AppRole.Admin, ['/productions', '/catalog', '/reports']],
    [AppRole.Productor, ['/productions', '/catalog']],
    [AppRole.Organizador, []],
    [AppRole.Auditor, ['/audit']],
  ])('only provides permitted quick actions to %s', async (role, expected) => {
    roles.set([role]);
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.quick-action'),
    ).map((link) => link.getAttribute('href'));
    expect(links).toEqual(expected);
  });

  it('renders loading state initially, then real operational metrics', async () => {
    roles.set([AppRole.Admin]);
    dataServiceMock.getProductions.mockReturnValue(of([
      { id: 1, name: 'P1', organizerId: 'org', location: 'L1', scheduledAt: '2026-09-14', status: 'SOLICITADO', createdAt: '', updatedAt: '' },
      { id: 2, name: 'P2', organizerId: 'org', location: 'L2', scheduledAt: '2026-09-15', status: 'CONFIRMADO', createdAt: '', updatedAt: '' }
    ]));
    dataServiceMock.getCatalogServices.mockReturnValue(of([
      { id: 1, name: 'S1', description: '', rate: 10, active: true },
      { id: 2, name: 'S2', description: '', rate: 20, active: false }
    ]));

    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Producciones totales2');
    expect(text).toContain('Solicitudes pendientes1');
    expect(text).toContain('Servicios de catálogo1/2');
  });

  it('orders upcoming productions chronologically and takes first 4', async () => {
    roles.set([AppRole.Admin]);
    dataServiceMock.getProductions.mockReturnValue(of([
      { id: 1, name: 'P1', organizerId: 'org', location: 'L1', scheduledAt: '2026-09-20T00:00:00Z', status: 'CONFIRMADO', createdAt: '', updatedAt: '' },
      { id: 2, name: 'P2', organizerId: 'org', location: 'L2', scheduledAt: '2026-09-10T00:00:00Z', status: 'SOLICITADO', createdAt: '', updatedAt: '' },
      { id: 3, name: 'P3', organizerId: 'org', location: 'L3', scheduledAt: '2026-09-15T00:00:00Z', status: 'CONFIRMADO', createdAt: '', updatedAt: '' },
      { id: 4, name: 'P4', organizerId: 'org', location: 'L4', scheduledAt: '2026-09-25T00:00:00Z', status: 'CONFIRMADO', createdAt: '', updatedAt: '' },
      { id: 5, name: 'P5', organizerId: 'org', location: 'L5', scheduledAt: '2026-09-12T00:00:00Z', status: 'CONFIRMADO', createdAt: '', updatedAt: '' }
    ]));

    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const upcoming = fixture.componentInstance.upcoming();
    expect(upcoming.length).toBe(4);
    expect(upcoming[0].id).toBe(2);
    expect(upcoming[1].id).toBe(5);
    expect(upcoming[2].id).toBe(3);
    expect(upcoming[3].id).toBe(1);
  });

  it('displays organizer isolation note and skips catalog and productions requests', async () => {
    roles.set([AppRole.Organizador]);
    dataServiceMock.getProductions.mockReturnValue(of([]));

    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(dataServiceMock.getProductions).not.toHaveBeenCalled();
    expect(dataServiceMock.getCatalogServices).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('La consulta personalizada de producciones estará disponible cuando el servicio aplique el alcance de datos por organizador');
  });

  it('shows error state when requests fail and can retry', async () => {
    roles.set([AppRole.Admin]);
    dataServiceMock.getProductions.mockReturnValue(throwError(() => new Error('Network error')));

    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar tu panel');
  });

  it('auditor does not fetch any API data and shows safe state', async () => {
    roles.set([AppRole.Auditor]);
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(dataServiceMock.getProductions).not.toHaveBeenCalled();
    expect(dataServiceMock.getCatalogServices).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('La información de auditoría estará disponible en el módulo Auditoría');
  });
});
