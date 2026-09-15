import {
  IPublicClientApplication,
  PublicClientApplication,
  BrowserCacheLocation,
  InteractionType,
} from '@azure/msal-browser';
import { MsalGuardConfiguration, MsalInterceptorConfiguration } from '@azure/msal-angular';
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

/**
 * Factory that creates the MSAL Interceptor configuration.
 * Attaches the access token automatically to the EventoMax API Gateway.
 */
export function msalInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();
  protectedResourceMap.set(`${environment.apiGatewayUrl}/*`, [environment.apiScope]);

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap,
  };
}
