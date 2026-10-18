import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { AppRole } from './models/app-role';
import { AuthClaims } from './models/auth-claims';
import { environment } from '../../../environments/environment';

const EVENTOMAX_API_CLIENT_ID = 'a1a87bcd-fed7-4d65-83c3-338389b80093';
const ALLOWED_AUDIENCES: ReadonlySet<string> = new Set([
  EVENTOMAX_API_CLIENT_ID,
  `api://${EVENTOMAX_API_CLIENT_ID}`,
]);

/**
 * Authorization service.
 * Inspects MSAL access token claims for eventomax-api
 * to resolve roles and scopes safely.
 */
@Injectable({ providedIn: 'root' })
export class AuthorizationService {
  private readonly auth = inject(AuthService);

  private readonly _roles = signal<readonly AppRole[]>([]);
  private readonly _scopes = signal<readonly string[]>([]);
  private readonly _ownerId = signal<string>('');

  /** Returns normalized roles from the current access token. */
  roles(): readonly AppRole[] {
    return this._roles();
  }

  /** Returns normalized scopes from the current access token. */
  scopes(): readonly string[] {
    return this._scopes();
  }

  /** Returns canonical owner identifier resolved from current access token (tid:oid, oid, or sub). */
  ownerId(): string {
    return this._ownerId();
  }

  /** Check if the user has a specific role. */
  hasRole(role: AppRole): boolean {
    return this._roles().includes(role);
  }

  /** Check if the user has at least one of the provided roles. */
  hasAnyRole(roles: readonly AppRole[]): boolean {
    const userRoles = this._roles();
    return roles.some(r => userRoles.includes(r));
  }

  /** Check if the user has a specific scope. */
  hasScope(scope: string): boolean {
    return this._scopes().includes(scope);
  }

  /** Clears authorization state. */
  clear(): void {
    this._roles.set([]);
    this._scopes.set([]);
    this._ownerId.set('');
  }

  /**
   * Acquires the access token and decodes its payload to populate roles/scopes.
   * NOTE: This decoding is for UI purposes only and does NOT constitute cryptographic validation.
   */
  async refreshAuthorization(): Promise<void> {
    try {
      const result = await this.auth.acquireAccessToken();
      const payload = this.decodeJwtPayload(result.accessToken);

      if (!this.isValidPayload(payload)) {
        this.clear();
        return;
      }

      this.populateFromPayload(payload);
    } catch {
      // Fail closed on error (e.g. acquireTokenSilent fails or no active account)
      this.clear();
    }
  }

  private decodeJwtPayload(token: string): AuthClaims | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // base64url decode
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.length % 4;
      if (pad) {
        base64 += '='.repeat(4 - pad);
      }

      // Decode base64 to utf-8 string, then parse JSON safely
      const jsonStr = decodeURIComponent(
        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );

      return JSON.parse(jsonStr) as AuthClaims;
    } catch {
      return null;
    }
  }

  private isValidPayload(payload: AuthClaims | null): payload is AuthClaims {
    if (!payload) return false;

    // Validate audience (eventomax-api App ID GUID or Application ID URI)
    if (!this.hasValidAudience(payload['aud'])) {
      return false;
    }

    // Validate issuer (exact match)
    if (payload['iss'] !== environment.expectedIssuer) {
      return false;
    }

    // Validate expiration
    if (typeof payload['exp'] === 'number') {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (payload['exp'] < nowInSeconds) {
        return false;
      }
    } else {
      return false; // Fail closed if exp is missing or invalid
    }

    return true;
  }

  private hasValidAudience(aud: unknown): boolean {
    if (typeof aud === 'string') {
      return ALLOWED_AUDIENCES.has(aud);
    }
    if (Array.isArray(aud)) {
      return (
        aud.length > 0 &&
        aud.every((entry): entry is string => typeof entry === 'string') &&
        aud.some((entry) => ALLOWED_AUDIENCES.has(entry))
      );
    }
    return false;
  }

  private populateFromPayload(payload: AuthClaims): void {
    // Process Roles
    let resolvedRoles: AppRole[] = [];
    if (Array.isArray(payload.roles)) {
      resolvedRoles = payload.roles.filter((role): role is AppRole =>
        Object.values(AppRole).includes(role as AppRole)
      );
    }
    this._roles.set(resolvedRoles);

    // Process Scopes
    let resolvedScopes: string[] = [];
    if (typeof payload.scp === 'string') {
      resolvedScopes = payload.scp.split(' ').filter(s => s.length > 0);
    }
    this._scopes.set(resolvedScopes);

    // Process Owner ID (canonical tid:oid, fallback oid, fallback sub)
    const tid = typeof payload['tid'] === 'string' && payload['tid'].trim().length > 0 ? payload['tid'].trim() : null;
    const oid = typeof payload['oid'] === 'string' && payload['oid'].trim().length > 0 ? payload['oid'].trim() : null;
    const sub = typeof payload['sub'] === 'string' && payload['sub'].trim().length > 0 ? payload['sub'].trim() : null;

    let resolvedOwnerId = '';
    if (tid && oid) {
      resolvedOwnerId = `${tid}:${oid}`;
    } else if (oid) {
      resolvedOwnerId = oid;
    } else if (sub) {
      resolvedOwnerId = sub;
    }
    this._ownerId.set(resolvedOwnerId);
  }
}
