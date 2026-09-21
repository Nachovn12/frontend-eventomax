/**
 * Application roles expected from Microsoft Entra ID claims.
 * Los valores corresponden literalmente al claim "roles" emitido por Microsoft Entra ID
 * y est�n alineados al Caso EventoMax y al BFF.
 */
export enum AppRole {
  Admin = 'Admin',
  Productor = 'Productor',
  Organizador = 'Organizador',
  Auditor = 'Auditor',
}
