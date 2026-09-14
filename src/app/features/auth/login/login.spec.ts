import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Login } from './login';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthorizationService } from '../../../core/auth/authorization.service';
import { MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus, AccountInfo } from '@azure/msal-browser';
import { BehaviorSubject } from 'rxjs';
import { AppRole } from '../../../core/auth/models/app-role';

describe('Login Component', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authMock: any;
  let authzMock: any;
  let broadcastMock: any;
  let inProgressSubject: BehaviorSubject<InteractionStatus>;

  const mockAccount: AccountInfo = {
    homeAccountId: '123',
    environment: 'login.windows.net',
    tenantId: 'tenant-123',
    username: 'test@eventomax.local',
    localAccountId: '456',
    name: 'Test User',
  };

  beforeEach(async () => {
    inProgressSubject = new BehaviorSubject<InteractionStatus>(InteractionStatus.Startup);
    broadcastMock = {
      inProgress$: inProgressSubject.asObservable(),
    };

    authMock = {
      login: vi.fn(),
      logout: vi.fn(),
      getAccount: vi.fn(),
      acquireAccessToken: vi.fn(),
    };

    authzMock = {
      roles: vi.fn().mockReturnValue([]),
      refreshAuthorization: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: AuthorizationService, useValue: authzMock },
        { provide: MsalBroadcastService, useValue: broadcastMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit
  });

  it('should create and show loading initially', () => {
    expect(component).toBeTruthy();
    expect(component.isLoading()).toBe(true);
  });

  it('should show unauthenticated when no account', async () => {
    authMock.getAccount.mockReturnValue(null);
    inProgressSubject.next(InteractionStatus.None);
    // Allow async checkAccount to finish
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(component.isLoading()).toBe(false);
    expect(component.isAuthenticated()).toBe(false);
  });

  it('should display account when logged in', async () => {
    authMock.getAccount.mockReturnValue(mockAccount);
    inProgressSubject.next(InteractionStatus.None);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(component.isAuthenticated()).toBe(true);
    expect(component.accountName()).toBe('Test User');
  });

  it('should display "Administrador" when user has Admin role', () => {
    authzMock.roles.mockReturnValue([AppRole.Admin]);
    expect(component.displayRole()).toBe('Administrador');
  });

  it('should display "Sin rol asignado" when user has no roles', () => {
    authzMock.roles.mockReturnValue([]);
    expect(component.displayRole()).toBe('Sin rol asignado');
  });

  it('should display multiple roles separated by comma', () => {
    authzMock.roles.mockReturnValue([AppRole.Producer, AppRole.Organizer]);
    expect(component.displayRole()).toBe('Productor, Organizador');
  });

  it('should trigger login on onLogin', () => {
    component.onLogin();
    expect(authMock.login).toHaveBeenCalled();
  });

  it('should trigger logout and set isLoggingOut flag', () => {
    component.onLogout();
    expect(component.isLoggingOut()).toBe(true);
    expect(authMock.logout).toHaveBeenCalled();
  });
});
