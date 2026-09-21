import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult, AccountInfo } from '@azure/msal-browser';
import { of, throwError } from 'rxjs';
import { App } from './app';
import { AuthService } from './core/auth/auth.service';
import { AuthorizationService } from './core/auth/authorization.service';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let app: App;
  let msalMock: any;
  let authMock: any;
  let authzMock: any;

  const mockAccount: AccountInfo = {
    homeAccountId: '123',
    environment: 'login',
    tenantId: 'tenant',
    username: 'user',
    localAccountId: '456',
    name: 'User',
  };

  beforeEach(async () => {
    msalMock = {
      handleRedirectObservable: vi.fn(),
      instance: {
        setActiveAccount: vi.fn(),
      }
    };

    authMock = {
      getAccount: vi.fn(),
    };

    authzMock = {
      refreshAuthorization: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: MsalService, useValue: msalMock },
        { provide: AuthService, useValue: authMock },
        { provide: AuthorizationService, useValue: authzMock },
      ],
    }).compileComponents();
  });

  const createComponent = () => {
    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit
  };

  it('should create the app', () => {
    msalMock.handleRedirectObservable.mockReturnValue(of(null));
    createComponent();
    expect(app).toBeTruthy();
  });

  it('should setActiveAccount and refresh authorization if redirect has account', async () => {
    const result = { account: mockAccount } as AuthenticationResult;
    msalMock.handleRedirectObservable.mockReturnValue(of(result));
    authMock.getAccount.mockReturnValue(mockAccount);

    createComponent();
    // Allow promises to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(msalMock.instance.setActiveAccount).toHaveBeenCalledWith(mockAccount);
    expect(authzMock.refreshAuthorization).toHaveBeenCalled();
  });

  it('should refresh authorization if redirect is null but account is recoverable', async () => {
    msalMock.handleRedirectObservable.mockReturnValue(of(null));
    authMock.getAccount.mockReturnValue(mockAccount);

    createComponent();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(msalMock.instance.setActiveAccount).not.toHaveBeenCalled(); // Handled by authService.getAccount instead
    expect(authzMock.refreshAuthorization).toHaveBeenCalled();
  });

  it('should clear authorization if no account exists', async () => {
    msalMock.handleRedirectObservable.mockReturnValue(of(null));
    authMock.getAccount.mockReturnValue(null);

    createComponent();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(authzMock.clear).toHaveBeenCalled();
    expect(authzMock.refreshAuthorization).not.toHaveBeenCalled();
  });

  it('should clear authorization on redirect error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    msalMock.handleRedirectObservable.mockReturnValue(throwError(() => new Error('redirect error')));

    createComponent();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(consoleSpy).toHaveBeenCalled();
    expect(authzMock.clear).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
