import { TestBed } from '@angular/core/testing';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo, EndSessionRequest } from '@azure/msal-browser';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let msalServiceMock: any;
  let instanceMock: any;

  const mockAccount: AccountInfo = {
    homeAccountId: '123',
    environment: 'login.windows.net',
    tenantId: 'tenant-123',
    username: 'test@eventomax.local',
    localAccountId: '456',
    name: 'Test User',
  };

  beforeEach(() => {
    instanceMock = {
      getActiveAccount: vi.fn(),
      getAllAccounts: vi.fn(),
      setActiveAccount: vi.fn(),
    };

    msalServiceMock = {
      instance: instanceMock,
      logoutRedirect: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: MsalService, useValue: msalServiceMock }
      ]
    });
    service = TestBed.inject(AuthService);
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
