import { test, expect } from '@playwright/test';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/productions',
  '/catalog',
  '/reports',
  '/audit',
] as const;

/**
 * Suite de verificación de Guards del cliente Angular (MsalGuard).
 *
 * Alcance estricto:
 * - Comprueba únicamente el bloqueo en cliente y la redirección iniciada por Angular
 *   cuando un usuario anónimo (sin sesión en sessionStorage/localStorage) intenta
 *   navegar a rutas protegidas.
 * - NO reemplaza ni declara validar la seguridad de tokens JWT en el API Gateway o el BFF.
 * - No inicia sesión real en Microsoft Entra ID ni utiliza tokens o mocks de sesión.
 */
test.describe('Guards de rutas protegidas en cliente Angular (acceso anónimo)', () => {
  for (const protectedPath of PROTECTED_ROUTES) {
    test(`bloquea el acceso anónimo a "${protectedPath}" sin montar el AppShell privado`, async ({
      page,
    }) => {
      let capturedEntraAuthorizeUrl: string | null = null;

      await page.route('https://login.microsoftonline.com/**/oauth2/v2.0/authorize*', async (route) => {
        capturedEntraAuthorizeUrl = route.request().url();
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<!doctype html><html lang="es"><head><title>Entra ID Redirect Intercepted</title></head><body>Redirección OAuth 2.0 interceptada por prueba E2E</body></html>',
        });
      });

      await page.goto(protectedPath);

      await expect
        .poll(
          () => {
            const currentUrl = page.url();
            return (
              capturedEntraAuthorizeUrl !== null ||
              currentUrl.includes('login.microsoftonline.com') ||
              currentUrl.endsWith('/login')
            );
          },
          { timeout: 10_000 },
        )
        .toBe(true);

      // Verifica que el contenedor privado de la aplicación jamás se monte para un visitante anónimo
      await expect(page.locator('app-shell, .shell-layout, .shell-sidebar')).toHaveCount(0);

      if (capturedEntraAuthorizeUrl) {
        const parsed = new URL(capturedEntraAuthorizeUrl);
        expect(parsed.origin).toBe('https://login.microsoftonline.com');
        expect(parsed.searchParams.get('response_type')).toBe('code');
        expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
        expect(parsed.searchParams.get('client_id')).toBeTruthy();
      } else {
        await expect(page).toHaveURL(/\/login$/);
      }
    });
  }
});

