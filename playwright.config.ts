import { defineConfig, devices } from '@playwright/test';

const DEFAULT_LOCAL_URL = 'http://localhost:4200';
const baseURL = process.env['PLAYWRIGHT_BASE_URL']?.trim() || DEFAULT_LOCAL_URL;
const isLocalDevServerTarget =
  baseURL === DEFAULT_LOCAL_URL || baseURL === 'http://127.0.0.1:4200';

// Configuración oficial de Playwright E2E para EventoMax EP2.
// - Totalmente aislada de Vitest (ng test compila solo archivos spec dentro de src/).
// - Contexto de navegador limpio por defecto (storageState vacío) sin cuentas personales ni tokens.
// - Capturas y trazas retenidas únicamente cuando falla una prueba.
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    storageState: { cookies: [], origins: [] },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: isLocalDevServerTarget
    ? {
        command: 'npm run start:local',
        url: baseURL,
        reuseExistingServer: !process.env['CI'],
        timeout: 120_000,
      }
    : undefined,
});
