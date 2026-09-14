import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult } from '@azure/msal-browser';
import { AuthorizationService } from './core/auth/authorization.service';
import { AuthService } from './core/auth/auth.service';

/**
 * Root shell component.
 *
 * Processes the redirect response from Microsoft Entra ID after login.
 * Sets the active account when a successful result arrives,
 * or recovers an existing cached account.
 *
 * Also orchestrates the global authorization lifecycle by syncing
 * claims strictly after redirect processing completes.
 */
@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly msal = inject(MsalService);
  private readonly auth = inject(AuthService);
  private readonly authz = inject(AuthorizationService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.msal.handleRedirectObservable()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (result: AuthenticationResult | null) => {
          if (result?.account) {
            this.msal.instance.setActiveAccount(result.account);
          }
          await this.syncAuthorizationState();
        },
        error: (error: unknown) => {
          // Log a safe message — never expose JWT or sensitive data
          console.error('MSAL redirect error:', error instanceof Error ? error.message : 'Unknown error');
          this.authz.clear();
        },
      });
  }

  private async syncAuthorizationState(): Promise<void> {
    const account = this.auth.getAccount();
    if (!account) {
      this.authz.clear();
      return;
    }
    await this.authz.refreshAuthorization();
  }
}
