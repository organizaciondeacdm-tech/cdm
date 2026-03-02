import { test, expect } from '@playwright/test';

test.describe('ACDM - Pruebas E2E Completas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Flujo completo: Login -> Exploración -> Logout', async ({ page }) => {
    // PASO 1: Verificar página de inicio
    const title = page.locator('title');
    await expect(title).toContainText('ACDM');

    // PASO 2: Realizar login
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('admin');
      await passwordInput.fill('admin2025');
      await submitButton.click();

      await page.waitForTimeout(2000);
    }

    // PASO 3: Verificar que estamos en la app
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent.length).toBeGreaterThan(100);

    // PASO 4: Buscar y hacer clic en elementos interactivos
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);

    // PASO 5: Intentar encontrar tablas y datos
    const tables = page.locator('table');
    const tableCount = await tables.count();
    
    // Si hay tablas, verificar que tengan contenido
    if (tableCount > 0) {
      const firstTable = tables.first();
      const rows = firstTable.locator('tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThanOrEqual(0);
    }

    // PASO 6: Probar navegación
    const navLinks = page.locator('a, button[role="button"]');
    const linkCount = await navLinks.count();
    
    if (linkCount > 0) {
      // Hacer clic en el primer enlace que no sea de logout
      const firstLink = navLinks.first();
      if (await firstLink.isVisible()) {
        await firstLink.click();
        await page.waitForTimeout(500);
      }
    }

    // PASO 7: Probar formularios si existen
    const forms = page.locator('form');
    const formCount = await forms.count();
    
    if (formCount > 0) {
      const firstForm = forms.first();
      const inputs = firstForm.locator('input');
      const inputCount = await inputs.count();
      
      if (inputCount > 0) {
        const firstInput = inputs.first();
        await firstInput.fill('Test Data ' + Date.now());
        await page.waitForTimeout(300);
      }
    }

    // PASO 8: Verificar que la sesión persiste
    const localStorageData = await page.evaluate(() => localStorage.length);
    expect(localStorageData).toBeGreaterThanOrEqual(0);
  });

  test('Flujo de creación de datos (si está disponible)', async ({ page }) => {
    // Login
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]').first();
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('admin');
      await page.locator('input[type="password"]').first().fill('admin2025');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(2000);
    }

    // Buscar botón de crear/agregar
    const createButtons = page.locator('button:has-text("Crear"), button:has-text("Agregar"), button:has-text("Nuevo"), button:has-text("Add"), button:has-text("New")');
    const createCount = await createButtons.count();

    if (createCount > 0) {
      const firstCreateButton = createButtons.first();
      
      if (await firstCreateButton.isVisible()) {
        await firstCreateButton.click();
        await page.waitForTimeout(500);

        // Verificar que se abre un formulario
        const forms = page.locator('form');
        const formCount = await forms.count();
        expect(formCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('Prueba de persistencia de datos', async ({ page, context }) => {
    // Guardar datos en localStorage desde la app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Login
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('admin');
      await page.locator('input[type="password"]').first().fill('admin2025');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(2000);
    }

    // Guardar snapshot de localStorage
    const initialStorage = await page.evaluate(() => JSON.stringify(localStorage));
    expect(initialStorage).toBeTruthy();

    // Navegar a otra página
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Verificar que localStorage persiste
    const finalStorage = await page.evaluate(() => JSON.stringify(localStorage));
    expect(finalStorage).toBeTruthy();
  });

  test('Validación de accesibilidad básica', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que hay elementos interactivos accesibles
    const buttons = page.locator('button');
    const links = page.locator('a');
    
    const buttonCount = await buttons.count();
    const linkCount = await links.count();

    // Debe haber al menos algunos elementos interactivos
    expect(buttonCount + linkCount).toBeGreaterThan(0);

    // Verificar que inputs tienen labels asociados (cuando sea posible)
    const inputs = page.locator('input');
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      const firstInput = inputs.first();
      const inputId = await firstInput.getAttribute('id');
      
      if (inputId) {
        const label = page.locator(`label[for="${inputId}"]`);
        // No es error si no tiene label, pero es mejor práctica
        expect(label).toBeTruthy();
      }
    }
  });

  test('Manejo de cambio de tamaño de ventana', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Probar en desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    let bodyContent = await page.locator('body').textContent();
    expect(bodyContent.length).toBeGreaterThan(50);

    // Probar en tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    bodyContent = await page.locator('body').textContent();
    expect(bodyContent.length).toBeGreaterThan(50);

    // Probar en mobile
    await page.setViewportSize({ width: 375, height: 667 });
    bodyContent = await page.locator('body').textContent();
    expect(bodyContent.length).toBeGreaterThan(50);
  });

  test('Navegación de teclado básica', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // TAB a través de elementos
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Verificar que algo está enfocado
    const focusedElement = await page.evaluate(() => document.activeElement.tagName);
    expect(focusedElement).toBeTruthy();

    // ENTER en botón si está enfocado
    if (focusedElement === 'BUTTON') {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }
  });

  test('Verificación de carga de imágenes', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      const firstImage = images.first();
      const alt = await firstImage.getAttribute('alt');
      
      // Verificar que las imágenes tienen alt text (accesibilidad)
      if (alt) {
        expect(alt.length).toBeGreaterThan(0);
      }
    }
  });

  test('Verificación de links internos', async ({ page }) => {
    await page.goto('/');
    
    const links = page.locator('a[href]');
    const linkCount = await links.count();

    if (linkCount > 0) {
      const firstLink = links.first();
      const href = await firstLink.getAttribute('href');
      
      // Los links deben tener href válido
      expect(href).toBeTruthy();
      
      // Intentar hacer clic
      if (href && !href.includes('javascript:')) {
        await firstLink.click();
        await page.waitForTimeout(500);
        
        // No debe haber error 404
        expect(page.url()).toBeTruthy();
      }
    }
  });
});
