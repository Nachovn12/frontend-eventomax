import { TestBed } from '@angular/core/testing';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { AccountInfo, EndSessionRequest, EventMessage, EventType, InteractionType } from '@azure/msal-browser';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let msalServiceMock: any;
  let instanceMock: any;
  let events: Subject<EventMessage>;

  const mockAccount: AccountInfo = {
    homeAccountId: '123',
    environment: 'login.windows.net',
    tenantId: 'tenant-123',
    username: 'test@eventomax.local',
    localAccountId: '456',
    name: 'Test User',
  };

  beforeEach(() => {
    events = new Subject<EventMessage>();
    instanceMock = {
      getActiveAccount: vi.fn(),
      getAllAccounts: vi.fn(),
      setActiveAccount: vi.fn(),
    };

    msalServiceMock = {
      instance: instanceMock,
      logoutRedirect: vi.fn(),
      loginRedirect: vi.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: MsalBroadcastService, useValue: { msalSubject$: events } },
        { provide: MsalService, useValue: msalServiceMock }
      ]
    });
    service = TestBed.inject(AuthService);
  });

  it('promotes a cached account when no active account exists', () => {
    instanceMock.getActiveAccount.mockReturnValue(null);
    instanceMock.getAllAccounts.mockReturnValue([mockAccount]);
    expect(service.isAuthenticated()).toBe(true);
    expect(instanceMock.setActiveAccount).toHaveBeenCalledWith(mockAccount);
  });

  it('keeps the existing active account', () => {
    instanceMock.getActiveAccount.mockReturnValue(mockAccount);
    expect(service.getAccount()).toBe(mockAccount);
    expect(instanceMock.setActiveAccount).not.toHaveBeenCalled();
  });

  it('returns unauthenticated after logout has cleared all accounts', () => {
    instanceMock.getActiveAccount.mockReturnValue(null);
    instanceMock.getAllAccounts.mockReturnValue([]);
    expect(service.isAuthenticated()).toBe(false);
    expect(instanceMock.setActiveAccount).not.toHaveBeenCalled();
  });

  it('retains callback failures for the lazy login component', () => {
    events.next({ eventType: EventType.ACQUIRE_TOKEN_FAILURE, interactionType: InteractionType.Redirect } as EventMessage);
    expect(service.loginError()).toContain('No pudimos iniciar sesión');
  });

  it('observes redirect failures and clears the message on retry', async () => {
    msalServiceMock.loginRedirect.mockReturnValueOnce(throwError(() => new Error('Failed')));
    await expect(service.login()).rejects.toThrow('Failed');
    expect(service.loginError()).toBeTruthy();
    await service.login();
    expect(service.loginError()).toBeNull();
    expect(msalServiceMock.loginRedirect).toHaveBeenCalledWith({ scopes: [environment.apiScope] });
  });

  it('should call logoutRedirect with the active account and postLogoutRedirectUri', () => {
    instanceMock.getActiveAccount.mockReturnValue(mockAccount);

    service.logout();

    const expectedRequest: EndSessionRequest = {
      account: mockAccount,
      postLogoutRedirectUri: 'http://localhost:4200/',
    };

    expect(msalServiceMock.logoutRedirect).toHaveBeenCalledWith(expectedRequest);
  });
});
