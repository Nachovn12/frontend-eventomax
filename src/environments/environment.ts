/**
 * Environment configuration for EventoMax frontend.
 * Contains only public SPA configuration — no secrets.
 */
export const environment = {
  production: false,
  tenantId: 'f191bdc8-7926-4722-9ec0-cba663701940',
  frontendClientId: 'b577f07b-edd6-4c6c-8306-93aba3c6feba',
  authority:
    'https://login.microsoftonline.com/f191bdc8-7926-4722-9ec0-cba663701940',
  redirectUri: 'http://localhost:4200/',
  postLogoutRedirectUri: 'http://localhost:4200/',
  apiScope: 'api://a1a87bcd-fed7-4d65-83c3-338389b80093/access_as_user',
};
