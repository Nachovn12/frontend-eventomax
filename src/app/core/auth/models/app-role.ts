/**
 * Application roles expected from Microsoft Entra ID claims.
 * Defined strictly according to the backend and Entra app manifest.
 */
export enum AppRole {
  Admin = 'Admin',
  Producer = 'Producer',
  Organizer = 'Organizer',
  Auditor = 'Auditor',
}
