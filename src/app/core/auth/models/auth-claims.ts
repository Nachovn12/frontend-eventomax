/**
 * Minimal type definition for the claims expected from Entra ID tokens.
 * Fail-closed design: fields are marked optional and typed as unknown
 * to prevent assuming they are always present or correctly typed arrays/strings.
 */
export interface AuthClaims {
  aud?: unknown;
  iss?: unknown;
  exp?: unknown;
  roles?: unknown;
  scp?: unknown;
  tid?: unknown;
  oid?: unknown;
  sub?: unknown;
  [key: string]: unknown;
}
