import { test, expect } from '@playwright/test';

test.describe('Smoke E2E — Carga de aplicación y navegación pública', () => {
  test('redirige la raíz "/" hacia "/login" en un contexto limpio y renderiza el acceso corporativo', async ({
    page,
    context,
  }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Acceso a EventoMax', level: 1 })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Iniciar sesión con Microsoft/i }),
    ).toBeEnabled();
    await expect(page.getByText('Acceso protegido mediante Microsoft Entra ID')).toBeVisible();

    const cookies = await context.cookies();
    expect(cookies).toHaveLength(0);

    const authTokenOrAccountKeys = await page.evaluate(() => {
      const isAuthCredentialKey = (key: string) =>
        /account|idtoken|accesstoken|refreshtoken|active-account/i.test(key);
      return {
        session: Object.keys(window.sessionStorage).filter(isAuthCredentialKey),
        local: Object.keys(window.localStorage).filter(isAuthCredentialKey),
      };
    });
    expect(authTokenOrAccountKeys.session).toHaveLength(0);
    expect(authTokenOrAccountKeys.local).toHaveLength(0);
  });

  test('permite interactuar con el carrusel informativo en "/login"', async ({ page }) => {
    await page.goto('/login');

    const dots = page.locator('.b-dots .b-dot');
    await expect(dots).toHaveCount(3);
    await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true');

    await dots.nth(1).click();
    await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('.b-slide.active')).toHaveCount(1);
  });

  test('renderiza correctamente la vista pública "/forbidden" (403)', async ({ page }) => {
    await page.goto('/forbidden');

    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(
      page.getByRole('heading', { name: 'Acceso no autorizado', level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/403\s*·\s*Acceso restringido/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Volver al dashboard/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cerrar sesión/i })).toBeVisible();
  });

  test('renderiza la página 404 para rutas inexistentes', async ({ page }) => {
    await page.goto('/ruta-inexistente-ep2-verificacion');

    await expect(
      page.getByRole('heading', { name: 'Página no encontrada', level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/ERROR\s*·\s*404/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Volver/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Ir al panel/i })).toBeVisible();
  });
});

