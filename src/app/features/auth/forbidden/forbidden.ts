import { Component, ChangeDetectionStrategy, inject, computed, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthorizationService } from '../../../core/auth/authorization.service';
import { Icon } from '../../../shared/ui/icon';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink, Icon],
  templateUrl: './forbidden.html',
  styleUrl: './forbidden.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Forbidden implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly authz = inject(AuthorizationService);

  readonly account = this.auth.getAccount();
  readonly userName = this.account?.name || this.account?.username || 'Usuario EventoMax';
  readonly isResolvingRoles = signal<boolean>(false);

  readonly userRoles = computed(() => {
    const roles = this.authz.roles();
    return roles.length > 0 ? roles.join(', ') : null;
  });

  async ngOnInit(): Promise<void> {
    if (this.account && this.authz.roles().length === 0) {
      try {
        this.isResolvingRoles.set(true);
        await this.authz.refreshAuthorization();
      } catch (error) {
        console.error('Error refreshing authorization', error);
      } finally {
        this.isResolvingRoles.set(false);
      }
    }
  }

  onLogout(): void {
    this.auth.logout();
  }
}
