import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MSAL_INSTANCE, MsalService, MsalBroadcastService } from '@azure/msal-angular';

import { routes } from './app.routes';
import { createMsalInstance } from './core/auth/msal.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    {
      provide: MSAL_INSTANCE,
      useFactory: createMsalInstance,
    },
    MsalService,
    MsalBroadcastService,
  ],
};
