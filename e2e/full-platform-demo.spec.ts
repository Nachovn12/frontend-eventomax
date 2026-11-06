import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/Nacho/.gemini/antigravity/brain/5e0f0167-5025-4419-8ed1-9717cb4b66f2';
const TENANT_ID = 'f191bdc8-7926-4722-9ec0-cba663701940';
const CLIENT_ID = 'b577f07b-edd6-4c6c-8306-93aba3c6feba';
const API_SCOPE = 'api://a1a87bcd-fed7-4d65-83c3-338389b80093/access_as_user';
const LOCAL_OIDC_TOKEN_URL = 'http://127.0.0.1:9999/token';

interface TokenBundle {
  backendToken: string;
  frontendAccessToken: string;
  frontendIdToken: string;
}

async function fetchLocalTokens(nonce?: string): Promise<TokenBundle> {
  const url = nonce
    ? `${LOCAL_OIDC_TOKEN_URL}?nonce=${encodeURIComponent(nonce)}`
    : LOCAL_OIDC_TOKEN_URL;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch tokens from local OIDC provider: HTTP ${res.status}`);
  }
  return (await res.json()) as TokenBundle;
}

function buildClientInfo(): string {
  const payload = JSON.stringify({
    uid: '00000000-0000-0000-0000-000000000001',
    utid: TENANT_ID,
  });
  return Buffer.from(payload, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function wireLiveAuthAndBackend(page: Page, initialTokens: TokenBundle): Promise<void> {
  let capturedNonce = '';
  const clientInfo = buildClientInfo();

  // 1. Intercept OIDC Discovery & Token endpoints on login.microsoftonline.com for MSAL in browser
  await page.route(`https://login.microsoftonline.com/${TENANT_ID}/**`, async (route) => {
    const reqUrl = new URL(route.request().url());

    if (reqUrl.pathname.endsWith('/.well-known/openid-configuration')) {
      const origin = `https://login.microsoftonline.com/${TENANT_ID}`;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token_endpoint: `${origin}/oauth2/v2.0/token`,
          token_endpoint_auth_methods_supported: ['client_secret_post', 'private_key_jwt', 'client_secret_basic'],
          jwks_uri: `${origin}/discovery/v2.0/keys`,
          response_modes_supported: ['query', 'fragment', 'form_post'],
          subject_types_supported: ['pairwise'],
          id_token_signing_alg_values_supported: ['RS256'],
          response_types_supported: ['code', 'id_token', 'code id_token', 'id_token token'],
          scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
          issuer: `${origin}/v2.0`,
          request_uri_parameter_supported: false,
          userinfo_endpoint: 'https://graph.microsoft.com/oidc/userinfo',
          authorization_endpoint: `${origin}/oauth2/v2.0/authorize`,
          device_authorization_endpoint: `${origin}/oauth2/v2.0/devicecode`,
          http_logout_supported: true,
          frontchannel_logout_supported: true,
          end_session_endpoint: `${origin}/oauth2/v2.0/logout`,
          claims_supported: ['sub', 'iss', 'cloud_instance_name', 'cloud_instance_host_name', 'cloud_graph_host_name', 'msgraph_host', 'aud', 'exp', 'iat', 'auth_time', 'acr', 'nonce', 'preferred_username', 'name', 'tid', 'ver', 'at_hash', 'c_hash', 'email'],
          kerberos_endpoint: `${origin}/kerberos`,
          tenant_region_scope: 'NA',
          cloud_instance_name: 'microsoftonline.com',
          cloud_graph_host_name: 'graph.windows.net',
          msgraph_host: 'graph.microsoft.com',
          rbac_url: 'https://pas.windows.net',
        }),
      });
      return;
    }

    if (reqUrl.pathname.endsWith('/oauth2/v2.0/authorize')) {
      const state = reqUrl.searchParams.get('state') || '';
      capturedNonce = reqUrl.searchParams.get('nonce') || '';
      const redirectUri = reqUrl.searchParams.get('redirect_uri') || 'http://localhost:4200/';
      const targetUrl = `${redirectUri.replace(/\/$/, '')}/#code=playwright-ep3-auth-code&client_info=${encodeURIComponent(clientInfo)}&state=${encodeURIComponent(state)}&session_state=00000000-0000-0000-0000-000000000001`;

      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!DOCTYPE html><html><head><script>window.location.replace(${JSON.stringify(targetUrl)});</script></head><body>Redirecting...</body></html>`,
      });
      return;
    }

    if (reqUrl.pathname.endsWith('/oauth2/v2.0/token')) {
      const tokensWithNonce = await fetchLocalTokens(capturedNonce || undefined);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store, no-cache',
        },
        body: JSON.stringify({
          token_type: 'Bearer',
          scope: `openid profile email ${API_SCOPE}`,
          expires_in: 7200,
          ext_expires_in: 7200,
          access_token: tokensWithNonce.frontendAccessToken,
          refresh_token: 'playwright-ep3-refresh-token',
          id_token: tokensWithNonce.frontendIdToken,
          client_info: clientInfo,
        }),
      });
      return;
    }

    await route.continue();
  });

  // 2. Forward all /api/** calls to the REAL backend (BFF :8080 -> 7 microservices) with the local OIDC RSA-signed JWT
  await page.route('**/api/**', async (route) => {
    const headers = {
      ...route.request().headers(),
      authorization: `Bearer ${initialTokens.backendToken}`,
    };
    await route.continue({ headers });
  });
}

test.describe('Certificación E2E Flujo Real Completo — EventoMax Plataforma Demo (EP3/EP5)', () => {
  test.setTimeout(180_000);

  test('Recorre Login, Dashboard, Catálogo, Producciones (Ciclo Completo + Ticket RabbitMQ + PDF), Reportes (Kafka), Auditoría (Kafka) y Kafka-UI sin errores', async ({ page }) => {
    const tokens = await fetchLocalTokens();
    await wireLiveAuthAndBackend(page, tokens);

    const apiErrors: string[] = [];
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/') && response.status() >= 500) {
        apiErrors.push(`${response.request().method()} ${url} -> HTTP ${response.status()}`);
      }
    });

    // =========================================================================
    // 1. PANTALLA DE LOGIN Y AUTENTICACIÓN OIDC / PKCE
    // =========================================================================
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Acceso a EventoMax' })).toBeVisible();
    const loginBtn = page.getByRole('button', { name: /Iniciar sesión con Microsoft/i });
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toBeEnabled();

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pw-01-login.png'), fullPage: true });

    await loginBtn.click();
    await page.waitForURL('**/dashboard', { timeout: 25_000 });

    // =========================================================================
    // 2. DASHBOARD OPERATIVO Y SHELL DE NAVEGACIÓN
    // =========================================================================
    await expect(page.locator('.breadcrumb')).toContainText('Dashboard');
    await expect(page.locator('.account-trigger')).toContainText(/Ignacio Valeria Nunez/i);

    // Probar menú desplegable de cuenta de usuario
    await page.locator('.account-trigger').click();
    await expect(page.locator('#account-menu')).toBeVisible();
    await expect(page.locator('#account-menu')).toContainText('Administrador');
    await page.locator('.account-trigger').click();

    // Probar botón de colapsar y expandir menú lateral
    const collapseBtn = page.locator('button.collapse-toggle.desktop-toggle');
    await collapseBtn.click();
    await expect(page.locator('.shell-sidebar')).toHaveClass(/is-collapsed/);
    await collapseBtn.click();
    await expect(page.locator('.shell-sidebar')).not.toHaveClass(/is-collapsed/);

    // Verificar carga real de KPIs desde Report y métricas de Producciones/Catálogo en Dashboard
    await expect(page.getByRole('heading', { name: 'Panel de control' })).toBeVisible();
    await expect(page.locator('#dashboard-report-heading')).toHaveText('Análisis de transiciones (últimas 24 horas)');
    await expect(page.locator('.dashboard-report-metrics')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('region', { name: 'Métricas de operación' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /Próximas producciones/i })).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pw-02-dashboard.png'), fullPage: true });

    // =========================================================================
    // 3. CATÁLOGO DE SERVICIOS Y EQUIPOS E INVENTARIO (/catalog)
    // =========================================================================
    await page.locator('a[routerLink="/catalog"]').click();
    await page.waitForURL('**/catalog');
    await expect(page.getByRole('heading', { name: 'Catálogo de servicios' })).toBeVisible();

    // 3.1 Pestaña Servicios: crear y editar un servicio real en PostgreSQL
    await expect(page.getByRole('region', { name: 'Métricas de servicios' })).toBeVisible({ timeout: 15_000 });
    const uniqueSuffix = Date.now().toString().slice(-5);
    const serviceName = `Sonido Line Array Meyer Sound PW-${uniqueSuffix}`;

    await page.getByRole('button', { name: 'Nuevo servicio' }).click();
    const serviceForm = page.getByRole('form', { name: 'Formulario de servicio' });
    await expect(serviceForm).toBeVisible();
    await serviceForm.locator('input[formControlName="name"]').fill(serviceName);
    await serviceForm.locator('input[formControlName="description"]').fill('Sistema Line Array principal certificado con Playwright E2E');
    await serviceForm.locator('input[formControlName="rate"]').fill('650000');
    await serviceForm.getByRole('button', { name: 'Crear servicio' }).click();

    await expect(page.locator('.ep2-catalog-message[role="status"]')).toContainText('guardado correctamente', { timeout: 15_000 });

    // Filtrar el servicio recién creado y editar su tarifa
    await page.locator('#catalog-search').fill(serviceName);
    await expect(page.locator('.catalog-table')).toContainText(serviceName);
    await page.locator('.catalog-table').getByRole('button', { name: 'Editar servicio' }).first().click();
    await serviceForm.locator('input[formControlName="rate"]').fill('690000');
    await serviceForm.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.locator('.ep2-catalog-message[role="status"]')).toContainText('guardado correctamente', { timeout: 15_000 });
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pw-03-catalog-services.png'), fullPage: true });

    // 3.2 Pestaña Equipos e Inventario: crear y ajustar stock de un equipo real
    await page.getByRole('tab', { name: 'Equipos e Inventario' }).click();
    await expect(page.getByRole('region', { name: 'Métricas de inventario' })).toBeVisible({ timeout: 15_000 });

    const equipmentName = `Consola DiGiCo Quantum PW-${uniqueSuffix}`;
    await page.getByRole('button', { name: 'Nuevo equipo' }).click();
    const equipmentForm = page.getByRole('form', { name: 'Formulario de equipo' });
    await expect(equipmentForm).toBeVisible();
    await equipmentForm.locator('input[formControlName="name"]').fill(equipmentName);
    await equipmentForm.locator('input[formControlName="description"]').fill('Consola digital redundante FOH/Monitores');
    await equipmentForm.locator('input[formControlName="initialAvailableQty"]').fill('10');
    await equipmentForm.getByRole('button', { name: 'Registrar equipo' }).click();

    await expect(page.locator('.ep2-catalog-message[role="status"]')).toContainText('creado correctamente con stock inicial 10', { timeout: 15_000 });

    // Filtrar el equipo creado y ajustar su stock disponible a 14
    await page.locator('#equipment-search').fill(equipmentName);
    await expect(page.locator('.catalog-table')).toContainText(equipmentName);
    await page.locator('.catalog-table').getByRole('button', { name: 'Editar equipo' }).first().click();
    await equipmentForm.locator('input[type="radio"][value="adjust"]').check();
    await equipmentForm.locator('input[formControlName="adjustedAvailableQty"]').fill('14');
    await equipmentForm.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.locator('.ep2-catalog-message[role="status"]')).toContainText('actualizado correctamente', { timeout: 15_000 });
    await expect(page.locator('.catalog-table')).toContainText('14 disp.');
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pw-04-catalog-equipment.png'), fullPage: true });

    // =========================================================================
    // 4. PRODUCCIONES: CREACIÓN, RESERVA DE EQUIPOS, CUADRILLA, TICKET Y PDF (/productions)
    // =========================================================================
    await page.locator('a[routerLink="/productions"]').click();
    await page.waitForURL('**/productions');
    await expect(page.getByRole('heading', { name: 'Producciones', exact: true })).toBeVisible();

    // 4.1 Abrir modal Nueva producción y validar campos obligatorios
    await page.locator('button.btn-create-primary').click();
    const createDialog = page.getByRole('dialog', { name: 'Nueva producción' });
    await expect(createDialog).toBeVisible();

    await createDialog.getByRole('button', { name: 'Guardar producción' }).click();
    await expect(createDialog.locator('#err-name')).toContainText('Ingresa el nombre del evento.');

    // Completar y guardar nueva producción
    const prodName = `Cumbre Cloud Native Playwright PW-${uniqueSuffix}`;
    await createDialog.locator('#create-name-input').fill(prodName);
    await createDialog.locator('#create-organizer-input').fill('org-playwright-cert');
    await createDialog.locator('#create-scheduled-input').fill('2027-11-25T20:00');
    await createDialog.locator('#create-location-input').fill('Centro Parque - Gran Salón');
    await createDialog.getByRole('button', { name: 'Guardar producción' }).click();

    await expect(page.locator('.status-banner-success')).toContainText(prodName, { timeout: 15_000 });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pw-05-production-created.png'), fullPage: true });

    // 4.2 Buscar la producción creada y abrir el drawer de Gestión Operativa
    await page.locator('#production-search').fill(prodName);
    const prodRow = page.locator('table tbody tr').filter({ hasText: prodName }).first();
    await expect(prodRow).toBeVisible();
    await prodRow.getByRole('button', { name: /Gestionar/i }).click();

    const detailDrawer = page.locator('aside.detail-drawer');
    await expect(detailDrawer).toBeVisible();
    await expect(detailDrawer.locator('#detail-panel-title')).toHaveText(prodName);

    // 4.3 Transición SOLICITADO -> CONFIRMADO (asignando equipamiento y servicio contratado)
    await expect(detailDrawer.locator('#production-next-status')).toHaveValue('CONFIRMADO');
    const eqSelect = detailDrawer.locator('#equipment-select');
    await expect(eqSelect.locator('option')).not.toHaveCount(1, { timeout: 10_000 });
    const eqOptionValue = await eqSelect.locator('option', { hasText: equipmentName }).first().getAttribute('value');
    expect(eqOptionValue).toBeTruthy();
    await eqSelect.selectOption(eqOptionValue!);
    await detailDrawer.locator('#equipment-qty').fill('2');
    await detailDrawer.getByRole('button', { name: 'Agregar ítem' }).click();
    await expect(detailDrawer.locator('.added-items-list')).toContainText(equipmentName);

    // Seleccionar el servicio creado en los checkboxes de servicios a contratar
    const serviceCard = detailDrawer.locator('.service-checkbox-card').filter({ hasText: serviceName }).first();
    if (await serviceCard.isVisible()) {
      await serviceCard.locator('input[type="checkbox"]').check();
    }

    await detailDrawer.getByRole('button', { name: 'Confirmar y reservar equipos' }).click();
    await expect(page.locator('.status-banner-success')).toContainText('CONFIRMADO', { timeout: 15_000 });
    await expect(detailDrawer.locator('.reservations-card-list')).toContainText(equipmentName, { timeout: 15_000 });

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pw-06-production-confirmed.png'), fullPage: true });

    // 4.4 Transición CONFIRMADO -> EN_MONTAJE con asignación de Cuadrilla Técnica
    await expect(detailDrawer.locator('#production-next-status')).toHaveValue('EN_MONTAJE');
    await expect(detailDrawer.locator('#crew-name-input')).toBeVisible();
    await detailDrawer.locator('#crew-name-input').fill('Cuadrilla Técnica Alfa Playwright EP3');
    await detailDrawer.locator('#crew-id-input').fill('crew-alfa-pw-ep3');
    await detailDrawer.getByRole('button', { name: 'Actualizar estado' }).click();

    await expect(page.locator('.status-banner-success')).toContainText('EN_MONTAJE', { timeout: 15_000 });
    await expect(detailDrawer).toContainText('Cuadrilla Técnica Alfa Playwright EP3');

    // Esperar procesamiento asíncrono en RabbitMQ -> ms-eventomax-notify y abrir Ticket de Cuadrilla
    await page.waitForTimeout(2000);
    const ticketBtn = detailDrawer.locator('button.btn-ticket-view');
    await expect(ticketBtn).toBeVisible();
    await ticketBtn.click();

    const ticketModal = page.locator('.ticket-modal-card');
    await expect(ticketModal).toBeVisible();
    await expect(ticketModal.locator('.ticket-instructions')).toBeVisible({ timeout: 15_000 });
    await expect(ticketModal).toContainText(prodName);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pw-07-crew-ticket-modal.png'), fullPage: true });
    await ticketModal.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(ticketModal).toBeHidden();

    // 4.5 Transición EN_MONTAJE -> EN_EJECUCION
    await expect(detailDrawer.locator('#production-next-status')).toHaveValue('EN_EJECUCION');
    await detailDrawer.getByRole('button', { name: 'Actualizar estado' }).click();
    await expect(page.locator('.status-banner-success')).toContainText('EN_EJECUCION', { timeout: 15_000 });

    // 4.6 Transición EN_EJECUCION -> CERRADO y Descarga de Acta PDF
    await expect(detailDrawer.locator('#production-next-status')).toHaveValue('CERRADO');
    await detailDrawer.getByRole('button', { name: 'Actualizar estado' }).click();
    await expect(page.locator('.status-banner-success')).toContainText('CERRADO', { timeout: 15_000 });
    await expect(detailDrawer.locator('.terminal-notice-title')).toHaveText('Producción cerrada');

    // Esperar generación asíncrona del PDF en ms-eventomax-notify vía RabbitMQ y descargar
    await page.waitForTimeout(2500);
    const downloadBtn = detailDrawer.locator('button.btn-quote-download');
    await expect(downloadBtn).toBeVisible();

    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
    await downloadBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^acta-cierre-produccion-\d+\.pdf$/);
    const pdfPath = await download.path();
    expect(pdfPath).toBeTruthy();
    if (pdfPath) {
      const pdfBytes = fs.readFileSync(pdfPath);
      expect(pdfBytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pw-08-production-closed-pdf.png'), fullPage: true });

    await detailDrawer.locator('#detail-close-btn').click();
    await expect(detailDrawer).toBeHidden();
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();

    // =========================================================================
    // 5. REPORTES Y ANALÍTICA DESDE KAFKA (/reports)
    // =========================================================================
    // Dar 2 segundos para que el Outbox de Productions -> Kafka -> Report consumer procese los eventos
    await page.waitForTimeout(2000);
    await page.locator('a[routerLink="/reports"]').click();
    await page.waitForURL('**/reports');
    await expect(page.getByRole('heading', { name: 'Reportes y analítica' })).toBeVisible();

    await page.getByRole('button', { name: 'Actualizar' }).click();
    await expect(page.locator('.report-metrics')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Distribución de últimos estados observados' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Transiciones registradas' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Eventos por día' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Servicios más contratados' })).toBeVisible();

    // Probar selector de rango last7d y volver a last24h
    await page.locator('#report-range').selectOption('last7d');
    await expect(page.locator('.report-metrics')).toBeVisible({ timeout: 15_000 });
    await page.locator('#report-range').selectOption('last24h');
    await expect(page.locator('.report-metrics')).toBeVisible({ timeout: 15_000 });

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pw-09-reports-kafka.png'), fullPage: true });

    // =========================================================================
    // 6. AUDITORÍA Y TRAZABILIDAD FORENSE DESDE KAFKA (/audit)
    // =========================================================================
    await page.locator('a[routerLink="/audit"]').click();
    await page.waitForURL('**/audit');
    await expect(page.getByRole('heading', { name: 'Auditoría y trazabilidad' })).toBeVisible();

    await expect(page.locator('ol.audit-timeline li.audit-event').first()).toBeVisible({ timeout: 15_000 });

    // Desplegar el detalle JSON del primer evento forense
    const firstEventDetails = page.locator('ol.audit-timeline li.audit-event details').first();
    await firstEventDetails.locator('summary').click();
    await expect(firstEventDetails.locator('pre.audit-json')).toBeVisible();

    // Probar filtro por Tipo de evento = ProductionStatusChanged
    const auditForm = page.getByRole('form', { name: 'Filtros de auditoría' });
    await auditForm.locator('select[formControlName="type"]').selectOption('ProductionStatusChanged');
    await auditForm.getByRole('button', { name: 'Filtrar' }).click();
    await expect(page.locator('ol.audit-timeline li.audit-event').first()).toBeVisible({ timeout: 15_000 });

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pw-10-audit-timeline.png'), fullPage: true });

    await auditForm.getByRole('button', { name: 'Limpiar' }).click();
    await expect(page.locator('ol.audit-timeline li.audit-event').first()).toBeVisible({ timeout: 15_000 });

    // =========================================================================
    // 7. CONSOLA DE ADMINISTRACIÓN KAFKA-UI (http://localhost:8089)
    // =========================================================================
    await page.goto('http://localhost:8089/ui/clusters/eventomax-cluster/all-topics');
    await expect(page.locator('text=productions.events').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=audit.timeline').first()).toBeVisible({ timeout: 15_000 });

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pw-11-kafka-ui-topics.png'), fullPage: true });

    expect(apiErrors).toEqual([]);
  });
});
