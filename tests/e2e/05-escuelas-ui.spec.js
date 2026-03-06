const { test, expect } = require('@playwright/test');
const {
  uniqueSuffix,
  API_URL,
  createApiContext,
  getResolvedCredentials
} = require('./helpers/api');
const { request } = require('@playwright/test');

async function loginFromUi(page, credentials) {
  await page.goto('/');
  await expect(page.locator('.login-box')).toBeVisible();

  await page.getByPlaceholder('admin').fill(credentials.username);
  await page.getByPlaceholder('••••••••').fill(credentials.password);
  await page.getByRole('button', { name: /INGRESAR/i }).click();

  await expect(page.getByText('Dashboard')).toBeVisible();
}

async function goToEscuelas(page) {
  await page.locator('.sidebar .nav-item', { hasText: 'Escuelas' }).first().click();
  await expect(page.getByRole('heading', { name: 'Escuelas' })).toBeVisible();
}

test.describe('Escuelas UI', () => {
  let credentials;

  test.beforeAll(async () => {
    const api = await createApiContext(request);
    try {
      credentials = await getResolvedCredentials(api);
    } finally {
      await api.dispose();
    }
  });

  test('alta de escuela muestra alerta de exito y refleja datos en la vista', async ({ page }) => {
    await loginFromUi(page, credentials);
    await goToEscuelas(page);

    const suffix = uniqueSuffix();
    const escuelaNombre = `Escuela UI E2E ${suffix}`;

    await page.getByRole('button', { name: /Nueva Escuela|Crear primera escuela/i }).first().click();
    await expect(page.getByText('Nueva Escuela')).toBeVisible();

    await page.getByPlaceholder('Ej: DE 01').fill('DE 01');
    await page.getByPlaceholder('Ej: Escuela N°1 ...').fill(escuelaNombre);
    await page.getByPlaceholder('Calle, número, localidad').fill('Calle UI 123, CABA');
    await page.getByPlaceholder('escuela@bue.edu.ar').fill(`escuela.ui.${suffix}@acdm.local`);

    await page.getByRole('button', { name: /^Guardar$/i }).click();

    await expect(page.locator('.app-alert-success')).toContainText('Escuela guardada correctamente');
    await expect(page.getByText(escuelaNombre)).toBeVisible();
  });

  test('formulario invalido de escuela muestra alertas de error y mantiene modal abierto', async ({ page }) => {
    await loginFromUi(page, credentials);
    await goToEscuelas(page);

    await page.getByRole('button', { name: /Nueva Escuela|Crear primera escuela/i }).first().click();
    await expect(page.getByText('Nueva Escuela')).toBeVisible();

    await page.getByPlaceholder('Ej: DE 01').fill('DE 01');
    await page.getByPlaceholder('escuela@bue.edu.ar').fill('correo-invalido');

    await page.getByRole('button', { name: /^Guardar$/i }).click();

    await expect(page.getByText('Nueva Escuela')).toBeVisible();
    await expect(
      page.locator('.alert-danger, .app-alert-error')
    ).toContainText(/Nombre de escuela es requerido|Dirección es requerida|Email inválido/i);
  });
});
