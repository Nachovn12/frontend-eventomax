import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult } from '@azure/msal-browser';

/**
 * Root shell component.
 *
 * Processes the redirect response from Microsoft Entra ID after login.
 * Sets the active account when a successful result arrives,
 * or recovers an existing cached account.
 */
@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly msal = inject(MsalService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.msal.handleRedirectObservable()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: AuthenticationResult | null) => {
          if (result?.account) {
            this.msal.instance.setActiveAccount(result.account);
          } else {
            const accounts = this.msal.instance.getAllAccounts();
            if (accounts.length > 0 && !this.msal.instance.getActiveAccount()) {
              this.msal.instance.setActiveAccount(accounts[0]);
            }
          }
        },
        error: (error: unknown) => {
          // Log a safe message — never expose JWT or sensitive data
          console.error('MSAL redirect error:', error instanceof Error ? error.message : 'Unknown error');
        },
      });
  }
}
