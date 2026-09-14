import {
  IPublicClientApplication,
  PublicClientApplication,
  BrowserCacheLocation,
  LogLevel,
  InteractionType,
} from '@azure/msal-browser';
import { MsalGuardConfiguration } from '@azure/msal-angular';
import { environment } from '../../../environments/environment';

/**
 * Factory that creates a typed IPublicClientApplication instance
 * configured for EventoMax with Authorization Code Flow + PKCE.
 *
 * PKCE is managed internally by MSAL Browser â€” no manual configuration needed.
 * No client secrets â€” this is a public SPA client.
 */
export function createMsalInstance(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: environment.frontendClientId,
      authority: environment.authority,
      redirectUri: environment.redirectUri,
    },
    cache: {
      cacheLocation: BrowserCacheLocation.SessionStorage,
    },
    system: {
      loggerOptions: {
        logLevel: LogLevel.Warning,
        piiLoggingEnabled: false,
      },
    },
  });
}

/**
 * Factory that creates the MSAL Guard configuration.
 */
export function msalGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: [environment.apiScope],
    },
    loginFailedRoute: '/login',
  };
}
