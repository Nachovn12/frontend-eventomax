import {
  IPublicClientApplication,
  PublicClientApplication,
  BrowserCacheLocation,
  LogLevel,
} from '@azure/msal-browser';
import { environment } from '../../../environments/environment';

/**
 * Factory that creates a typed IPublicClientApplication instance
 * configured for EventoMax with Authorization Code Flow + PKCE.
 *
 * PKCE is managed internally by MSAL Browser — no manual configuration needed.
 * No client secrets — this is a public SPA client.
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
