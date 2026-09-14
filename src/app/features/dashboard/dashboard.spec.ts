import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { Dashboard } from './dashboard';
import { AuthService } from '../../core/auth/auth.service';
import { AuthorizationService } from '../../core/auth/authorization.service';
import { AppRole } from '../../core/auth/models/app-role';

describe('Dashboard Component', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let authMock: any;
  let authzMock: any;
  let rolesSignal: WritableSignal<AppRole[]>;

  beforeEach(async () => {
    rolesSignal = signal([]);
    authMock = {
      logout: vi.fn(),
    };

    authzMock = {
      roles: () => rolesSignal(),
    };

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: AuthorizationService, useValue: authzMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display "Administrador" when user has Admin role', () => {
    rolesSignal.set([AppRole.Admin]);
    expect(component.displayRole()).toBe('Administrador');
  });

  it('should display "Sin rol asignado" when user has no roles', () => {
    rolesSignal.set([]);
    expect(component.displayRole()).toBe('Sin rol asignado');
  });

  it('should trigger logout when onLogout is called', () => {
    component.onLogout();
    expect(authMock.logout).toHaveBeenCalled();
  });
});
