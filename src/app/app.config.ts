import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCL from '@angular/common/locales/es-CL';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  MSAL_INSTANCE,
  MSAL_GUARD_CONFIG,
  MSAL_INTERCEPTOR_CONFIG,
  MsalService,
  MsalBroadcastService,
  MsalGuard,
  MsalInterceptor,
} from '@azure/msal-angular';

import { routes } from './app.routes';
import { createMsalInstance, msalGuardConfigFactory, msalInterceptorConfigFactory } from './core/auth/msal.config';

registerLocaleData(localeEsCL, 'es-CL');

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es-CL' },
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true,
    },
    {
      provide: MSAL_INSTANCE,
      useFactory: createMsalInstance,
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: msalGuardConfigFactory,
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: msalInterceptorConfigFactory,
    },
    MsalService,
    MsalBroadcastService,
    MsalGuard,
  ],
};
