/**
 * Minimal type definition for the claims expected from Entra ID tokens.
 * Fail-closed design: fields are marked optional and typed as unknown
 * to prevent assuming they are always present or correctly typed arrays/strings.
 */
export interface AuthClaims {
  roles?: unknown;
  scp?: unknown;
  [key: string]: unknown;
}
