import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';
import { filter } from 'rxjs/operators';

import { AuthService } from '../../../core/auth/auth.service';
import { AuthorizationService } from '../../../core/auth/authorization.service';
import { AppRole } from '../../../core/auth/models/app-role';

/**
 * Login page component — EMX-9.
 *
 * Reacts to MSAL interaction status to distinguish:
 *  1. MSAL initializing (spinner)
 *  2. User not authenticated (CTA)
 *  3. User authenticated (account info + token check)
 */
@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly broadcastService = inject(MsalBroadcastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly authz = inject(AuthorizationService);

  /** True while MSAL interaction is in progress. */
  readonly isLoading = signal(true);

  /** Whether the user has a valid account. */
  readonly isAuthenticated = signal(false);

  /** Display name of the active account. */
  readonly accountName = signal('');

  /** Email / UPN of the active account. */
  readonly accountEmail = signal('');

  /** User role string for display. */
  readonly displayRole = computed(() => {
    const roles = this.authz.roles();
    if (roles.length === 0) {
      return 'Sin rol asignado';
    }
    const roleMap: Record<AppRole, string> = {
      [AppRole.Admin]: 'Administrador',
      [AppRole.Producer]: 'Productor',
      [AppRole.Organizer]: 'Organizador',
      [AppRole.Auditor]: 'Auditor',
    };
    return roles.map(r => roleMap[r]).join(', ');
  });

  /** Status text for the token test. */
  readonly tokenStatus = signal('');

  /** Whether token acquisition succeeded. */
  readonly tokenSuccess = signal(false);

  /** Whether a token acquisition is in progress. */
  readonly tokenLoading = signal(false);

  /** True while logout redirect is being triggered. */
  readonly isLoggingOut = signal(false);

  ngOnInit(): void {
    this.broadcastService.inProgress$
      .pipe(
        filter(
          (status: InteractionStatus) =>
            status === InteractionStatus.None,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.checkAccount();
        this.isLoading.set(false);
      });
  }

  /** Trigger login redirect. */
  onLogin(): void {
    this.auth.login();
  }

  /** Verify that acquireTokenSilent works without exposing the JWT. */
  async onTestToken(): Promise<void> {
    this.tokenLoading.set(true);
    this.tokenStatus.set('');

    try {
      const result = await this.auth.acquireAccessToken();
      const expiresOn = result.expiresOn
        ? result.expiresOn.toLocaleString()
        : 'no disponible';
      this.tokenSuccess.set(true);
      this.tokenStatus.set(
        `Access Token obtenido correctamente. Expira: ${expiresOn}`,
      );
    } catch {
      this.tokenSuccess.set(false);
      this.tokenStatus.set(
        'No se pudo obtener el token. Es posible que se requiera interacción.',
      );
    } finally {
      this.tokenLoading.set(false);
    }
  }

  /** Trigger logout redirect. */
  onLogout(): void {
    this.isLoggingOut.set(true);
    this.auth.logout();
  }

  /** Refresh local signals from MSAL account state and authorization. */
  private checkAccount(): void {
    const account = this.auth.getAccount();
    this.isAuthenticated.set(account !== null);
    this.accountName.set(account?.name ?? '');
    this.accountEmail.set(account?.username ?? '');
  }
}
