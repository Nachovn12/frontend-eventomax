import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { MsalGuard, MSAL_GUARD_CONFIG, MSAL_INTERCEPTOR_CONFIG } from '@azure/msal-angular';
import { appConfig } from './app.config';

describe('App Configuration DI', () => {
  it('should successfully resolve MsalGuard and its configuration from the root injector', () => {
    TestBed.configureTestingModule({
      providers: appConfig.providers,
    });

    // Attempt to inject MsalGuard. If it's missing or misconfigured, this will throw NG0201.
    const guard = TestBed.inject(MsalGuard);
    expect(guard).toBeTruthy();

    const guardConfig = TestBed.inject(MSAL_GUARD_CONFIG);
    expect(guardConfig).toBeTruthy();
    expect(guardConfig.interactionType).toBeDefined();
    expect(guardConfig.authRequest).toBeDefined();
    expect(guardConfig.loginFailedRoute).toBe('/login');
  });

  it('should successfully resolve HttpClient and MSAL_INTERCEPTOR_CONFIG', () => {
    TestBed.configureTestingModule({
      providers: appConfig.providers,
    });

    const httpClient = TestBed.inject(HttpClient);
    expect(httpClient).toBeTruthy();

    const interceptorConfig = TestBed.inject(MSAL_INTERCEPTOR_CONFIG);
    expect(interceptorConfig).toBeTruthy();
    expect(interceptorConfig.interactionType).toBeDefined();
    expect(interceptorConfig.protectedResourceMap).toBeDefined();
  });
});
