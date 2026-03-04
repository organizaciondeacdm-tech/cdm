// ─────────────────────────────────────────────────────────────────────────────
// forms.spec.js  –  UI CRUD via modal forms (Escuelas, Visitas, Proyectos, Informes)
// ─────────────────────────────────────────────────────────────────────────────
const { test, expect } = require('@playwright/test');
const {
  gotoSection,
  loginAPI,
  authJson,
  findEscuelaByName,
  safeDeleteEscuelaByName,
  uniqueSuffix,
  DEFAULT_FRONTEND_URL
} = require('./helpers/systematic');

test.use({ storageState: 'tests/e2e/.auth/admin.json' });

// ── Helper: open a modal by clicking a "New …" button ────────────────────────
async function openNewModal(page, btnPattern) {
  const btn = page.getByRole('button', { name: btnPattern }).first();
  await btn.waitFor({ state: 'visible', timeout: 10_000 });
  await btn.click();
  // Wait for the modal backdrop or the modal itself
  await page.locator('.modal, [role="dialog"]').first()
    .waitFor({ state: 'visible', timeout: 8_000 });
}

// ── Helper: fill a modal field by its label text ─────────────────────────────
async function fillModalField(page, labelText, value) {
  const group = page
    .locator('.modal .form-group, [role="dialog"] .form-group')
    .filter({ hasText: labelText })
    .first();

  const input = group.locator('input, textarea').first();
  await input.fill(String(value));
}

// ── Helper: save modal ────────────────────────────────────────────────────────
async function saveModal(page) {
  await page
    .locator('.modal, [role="dialog"]')
    .first()
    .getByRole('button', { name: /Guardar|Crear|Aceptar/i })
    .click();
  // Wait for modal to close
  await page.locator('.modal, [role="dialog"]').first()
    .waitFor({ state: 'hidden', timeout: 10_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe('UI – CRUD Escuelas', () => {
  let createdName = null;

  test.beforeEach(async ({ page }) => {
    await page.goto(DEFAULT_FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.sidebar, nav.sidebar').first()).toBeVisible();
  });

  test.afterEach(async ({ request }) => {
    if (!createdName) return;
    const token = await loginAPI(request);
    await safeDeleteEscuelaByName(request, token, createdName);
    createdName = null;
  });

  test('crea una escuela desde el formulario modal', async ({ page, request }) => {
    const suf = uniqueSuffix();
    createdName = `Escuela UI E2E ${suf}`;

    await gotoSection(page, 'Escuelas');

    await openNewModal(page, /Nueva Escuela|Crear primera escuela/i);

    await fillModalField(page, /Nombre de la Escuela/i, createdName);
    await fillModalField(page, /Direcci[oó]n/i, `Calle UI ${suf}, CABA`);

    // Email field
    const emailInput = page
      .locator('.modal input[type="email"], .modal input[name="email"], .modal input[placeholder*="mail"]')
      .first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(`ui.${suf}@acdm.local`);
    }

    // DE field
    const deGroup = page
      .locator('.modal .form-group')
      .filter({ hasText: /Distrito|DE\b/i })
      .first();
    if (await deGroup.isVisible()) {
      const deInput = deGroup.locator('input').first();
      if (await deInput.isVisible()) await deInput.fill('DE 09');
    }

    await saveModal(page);

    // The new escuela name should appear somewhere on the page
    await expect(
      page.locator(`text=${createdName}`).first()
    ).toBeVisible({ timeout: 10_000 });

    // Confirm via API
    const token = await loginAPI(request);
    const esc = await findEscuelaByName(request, token, createdName);
    expect(esc?._id).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('UI – CRUD Visitas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEFAULT_FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.sidebar, nav.sidebar').first()).toBeVisible();
  });

  test('sección Visitas carga y muestra el encabezado', async ({ page }) => {
    await gotoSection(page, 'Visitas');
    await expect(
      page.getByRole('heading', { name: /Visitas/i }).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('abre modal Nueva Visita (si hay escuelas)', async ({ page, request }) => {
    const token = await loginAPI(request);
    const body = await authJson(request, token, 'GET', '/api/escuelas?limit=1');
    const hasEscuelas = (body.data?.escuelas?.length ?? 0) > 0;
    if (!hasEscuelas) test.skip();

    await gotoSection(page, 'Visitas');

    const btn = page.getByRole('button', { name: /Nueva Visita/i }).first();
    if (!await btn.isVisible({ timeout: 5_000 }).catch(() => false)) test.skip();

    await btn.click();
    await expect(
      page.locator('.modal, [role="dialog"]').first()
    ).toBeVisible({ timeout: 8_000 });

    // Close without saving
    const cancelBtn = page
      .locator('.modal, [role="dialog"]')
      .first()
      .getByRole('button', { name: /Cancelar|Cerrar|×/i })
      .first();
    if (await cancelBtn.isVisible()) await cancelBtn.click();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('UI – CRUD Proyectos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEFAULT_FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.sidebar, nav.sidebar').first()).toBeVisible();
  });

  test('sección Proyectos carga y muestra el encabezado', async ({ page }) => {
    await gotoSection(page, 'Proyectos');
    await expect(
      page.getByRole('heading', { name: /Proyectos/i }).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('abre modal Nuevo Proyecto (si hay escuelas)', async ({ page, request }) => {
    const token = await loginAPI(request);
    const body = await authJson(request, token, 'GET', '/api/escuelas?limit=1');
    const hasEscuelas = (body.data?.escuelas?.length ?? 0) > 0;
    if (!hasEscuelas) test.skip();

    await gotoSection(page, 'Proyectos');

    const btn = page.getByRole('button', { name: /Nuevo Proyecto/i }).first();
    if (!await btn.isVisible({ timeout: 5_000 }).catch(() => false)) test.skip();

    await btn.click();
    await expect(
      page.locator('.modal, [role="dialog"]').first()
    ).toBeVisible({ timeout: 8_000 });

    const cancelBtn = page
      .locator('.modal, [role="dialog"]')
      .first()
      .getByRole('button', { name: /Cancelar|Cerrar|×/i })
      .first();
    if (await cancelBtn.isVisible()) await cancelBtn.click();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('UI – CRUD Informes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEFAULT_FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.sidebar, nav.sidebar').first()).toBeVisible();
  });

  test('sección Informes carga y muestra el encabezado', async ({ page }) => {
    await gotoSection(page, 'Informes');
    await expect(
      page.getByRole('heading', { name: /Informes/i }).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('UI – Sección Exportar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEFAULT_FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.sidebar, nav.sidebar').first()).toBeVisible();
  });

  test('muestra botones de exportación', async ({ page }) => {
    await gotoSection(page, 'Exportar');
    // At least one export button should exist
    const exportButtons = page.getByRole('button', { name: /export|csv|json|pdf/i });
    const count = await exportButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('UI – Sección Estadísticas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEFAULT_FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.sidebar, nav.sidebar').first()).toBeVisible();
  });

  test('muestra gráficos o tarjetas de datos', async ({ page }) => {
    await gotoSection(page, 'Estadísticas');
    await expect(
      page.getByRole('heading', { name: /Estad[íi]sticas/i }).first()
    ).toBeVisible({ timeout: 8_000 });

    // At least one card, chart container or numeric value should be present
    const statCard = page.locator('[class*="card"], [class*="stat"], [class*="chart"]').first();
    await expect(statCard).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('UI – Sección Alertas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEFAULT_FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.sidebar, nav.sidebar').first()).toBeVisible();
  });

  test('muestra el centro de alertas', async ({ page }) => {
    await gotoSection(page, 'Alertas');
    await expect(
      page.getByRole('heading', { name: /Alertas/i }).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('UI – Sección Calendario', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEFAULT_FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.sidebar, nav.sidebar').first()).toBeVisible();
  });

  test('muestra la grilla del calendario', async ({ page }) => {
    await gotoSection(page, 'Calendario');
    await expect(
      page.getByRole('heading', { name: /Calendario/i }).first()
    ).toBeVisible({ timeout: 8_000 });

    // Calendar grid: days or month header should appear
    const calGrid = page
      .locator('[class*="calendar"], [class*="cal-"], table')
      .first();
    await expect(calGrid).toBeVisible({ timeout: 5_000 });
  });
});
