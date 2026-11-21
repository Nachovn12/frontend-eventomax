import { Injectable, InjectionToken, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthorizationService } from './authorization.service';
import { environment } from '../../../environments/environment';

/**
 * Explicit opt-in flag preventing automatic write requests to AWS before backend deployment.
 * Defaults to environment.enableAuditActorAliasRegistration (false in all environments).
 */
export const AUDIT_ACTOR_ALIAS_REGISTRATION_ENABLED = new InjectionToken<boolean>(
  'AUDIT_ACTOR_ALIAS_REGISTRATION_ENABLED',
  {
    providedIn: 'root',
    factory: () => environment.enableAuditActorAliasRegistration === true,
  }
);

const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 409]);

/**
 * Silently registers the authenticated user's own verified (issuer, audience, sub) -> tid:oid alias
 * via POST /api/audit/actor-aliases/me with an empty (null) body.
 *
 * Security & resilience guarantees:
 * - Disabled by default via environment.enableAuditActorAliasRegistration.
 * - Never sends sub, oid, tid, or JSON {} in the request body.
 * - Deduplicates concurrent and repeated calls per session/identity in memory (no new persistence).
 * - Never blocks login or navigation on error and never logs tokens or sensitive identifiers.
 */
@Injectable({ providedIn: 'root' })
export class AuditActorAliasRegistrationService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly authz = inject(AuthorizationService);
  private readonly enabled = inject(AUDIT_ACTOR_ALIAS_REGISTRATION_ENABLED);

  private readonly completedOrBlockedKeys = new Set<string>();
  private readonly inFlightKeys = new Set<string>();

  async registerIfEligible(): Promise<void> {
    if (!this.enabled || !this.http) {
      return;
    }

    if (
      !this.authz.hasScope('access_as_user') ||
      this.authz.roles().length === 0
    ) {
      return;
    }

    const sessionKey = this.authz.ownerId().trim();
    if (!sessionKey) {
      return;
    }

    if (this.completedOrBlockedKeys.has(sessionKey) || this.inFlightKeys.has(sessionKey)) {
      return;
    }

    this.inFlightKeys.add(sessionKey);
    try {
      await firstValueFrom(
        this.http.post<void>(
          `${environment.apiGatewayUrl}/api/audit/actor-aliases/me`,
          null
        )
      );
      this.completedOrBlockedKeys.add(sessionKey);
    } catch (error: unknown) {
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      if (NON_RETRYABLE_STATUSES.has(status)) {
        this.completedOrBlockedKeys.add(sessionKey);
      }
      // Safe diagnostic only — never log JWT, headers, or personal identifiers
      console.warn(`Audit actor alias registration not completed (HTTP ${status || 'network'}).`);
    } finally {
      this.inFlightKeys.delete(sessionKey);
    }
  }

  reset(): void {
    this.completedOrBlockedKeys.clear();
    this.inFlightKeys.clear();
  }
}
