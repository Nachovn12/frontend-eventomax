import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import {
  AccountInfo,
  AuthenticationResult,
  EndSessionRequest,
  EventType,
  InteractionType,
  RedirectRequest,
  SilentRequest,
} from '@azure/msal-browser';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * AuthService — thin wrapper over MsalService scoped to EMX-9.
 *
 * Responsibilities:
 *  - login via redirect (Authorization Code + PKCE)
 *  - logout via redirect
 *  - retrieve / restore the active account
 *  - acquire an access token silently for eventomax-api
 *
 * NOT implemented yet (future stories):
 *  - guards  → EMX-11
 *  - interceptor → EMX-12
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly msal = inject(MsalService);
  private readonly broadcast = inject(MsalBroadcastService);
  private readonly loginErrorState = signal<string | null>(null);
  readonly loginError = this.loginErrorState.asReadonly();

  constructor() {
    // App injects this service before processing the redirect. Retain failures
    // even when the lazy login component has not subscribed yet.
    this.broadcast.msalSubject$
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((event) => {
        if (event.eventType === EventType.ACQUIRE_TOKEN_FAILURE && event.interactionType === InteractionType.Redirect) {
          this.setLoginError();
        } else if (event.eventType === EventType.LOGIN_SUCCESS || event.eventType === EventType.LOGOUT_SUCCESS) {
          this.loginErrorState.set(null);
        }
      });
  }

  private setLoginError(): void {
    this.loginErrorState.set('No pudimos iniciar sesión. Verifica tu cuenta corporativa e inténtalo nuevamente.');
  }

  /** Redirect to Microsoft Entra ID requesting the eventomax-api scope. */
  async login(): Promise<void> {
    this.loginErrorState.set(null);
    const request: RedirectRequest = {
      scopes: [environment.apiScope],
    };
    try {
      await firstValueFrom(this.msal.loginRedirect(request));
    } catch (error) {
      this.setLoginError();
      throw error;
    }
  }

  /** Logs out the current active account. */
  logout(): void {
    const account = this.getAccount();
    const request: EndSessionRequest = {
      account,
      postLogoutRedirectUri: environment.postLogoutRedirectUri,
    };
    this.msal.logoutRedirect(request);
  }

  /**
   * Returns the current active account.
   * If none is set but accounts exist in the cache, promotes the first one.
   */
  getAccount(): AccountInfo | null {
    let account = this.msal.instance.getActiveAccount();

    if (!account) {
      const accounts = this.msal.instance.getAllAccounts();
      if (accounts.length > 0) {
        account = accounts[0];
        this.msal.instance.setActiveAccount(account);
      }
    }

    return account;
  }

  /** Whether a valid account is present. */
  isAuthenticated(): boolean {
    return this.getAccount() !== null;
  }

  /**
   * Acquires an access token silently for the eventomax-api.
   *
   * Returns the full AuthenticationResult so callers can inspect
   * expiration metadata without exposing the raw JWT to UI.
   */
  async acquireAccessToken(): Promise<AuthenticationResult> {
    const account = this.getAccount();

    if (!account) {
      throw new Error(
        'No active account. User must authenticate before acquiring a token.',
      );
    }

    const request: SilentRequest = {
      scopes: [environment.apiScope],
      account,
    };

    return firstValueFrom(this.msal.acquireTokenSilent(request));
  }
}
