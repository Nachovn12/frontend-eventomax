import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { width: 390, height: 844, label: 'Mobile (390px)' },
  { width: 768, height: 1024, label: 'Tablet (768px)' },
  { width: 1024, height: 768, label: 'Laptop (1024px)' },
  { width: 1440, height: 900, label: 'Desktop (1440px)' },
] as const;

const PUBLIC_PAGES = [
  {
    path: '/login',
    heading: 'Acceso a EventoMax',
    actionSelector: '.login-microsoft-button',
  },
  {
    path: '/forbidden',
    heading: 'Acceso no autorizado',
    actionSelector: '.fb-btn-primary',
  },
  {
    path: '/ruta-no-existente-404',
    heading: 'Página no encontrada',
    actionSelector: '.not-found-home',
  },
] as const;

test.describe('Responsive E2E — Vistas públicas sin overflow horizontal (390, 768, 1024 y 1440 px)', () => {
  for (const vp of VIEWPORTS) {
    for (const pageSpec of PUBLIC_PAGES) {
      test(`${vp.label} — "${pageSpec.path}" renderiza sin scroll horizontal ni controles cortados`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(pageSpec.path);

        const heading = page.getByRole('heading', { name: pageSpec.heading, level: 1 });
        await expect(heading).toBeVisible();

        const actionEl = page.locator(pageSpec.actionSelector);
        await expect(actionEl).toBeVisible();

        const layoutMetrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          bodyScrollWidth: document.body.scrollWidth,
        }));

        expect(layoutMetrics.scrollWidth).toBeLessThanOrEqual(layoutMetrics.clientWidth);
        expect(layoutMetrics.bodyScrollWidth).toBeLessThanOrEqual(layoutMetrics.clientWidth);

        const actionBox = await actionEl.boundingBox();
        expect(actionBox).not.toBeNull();
        expect(actionBox!.x).toBeGreaterThanOrEqual(0);
        expect(Math.round(actionBox!.x + actionBox!.width)).toBeLessThanOrEqual(vp.width);
      });
    }
  }
});

