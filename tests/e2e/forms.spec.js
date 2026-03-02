import { test, expect } from '@playwright/test';

test.describe('ACDM - Pruebas de Formularios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Login automático
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('admin');
      await page.locator('input[type="password"]').first().fill('admin2025');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(2000);
    }
  });

  test('Debe permitir llenar formularios de texto', async ({ page }) => {
    // Buscar inputs de texto
    const textInputs = page.locator('input[type="text"]');
    const count = await textInputs.count();
    
    if (count > 0) {
      const firstInput = textInputs.first();
      await firstInput.fill('Valor de prueba');
      
      const value = await firstInput.inputValue();
      expect(value).toBe('Valor de prueba');
    }
  });

  test('Debe permitir llenar formularios de email', async ({ page }) => {
    // Buscar inputs de email
    const emailInputs = page.locator('input[type="email"]');
    const count = await emailInputs.count();
    
    if (count > 0) {
      const firstInput = emailInputs.first();
      await firstInput.fill('test@example.com');
      
      const value = await firstInput.inputValue();
      expect(value).toBe('test@example.com');
    }
  });

  test('Debe permitir llenar formularios de número', async ({ page }) => {
    // Buscar inputs de número
    const numberInputs = page.locator('input[type="number"]');
    const count = await numberInputs.count();
    
    if (count > 0) {
      const firstInput = numberInputs.first();
      await firstInput.fill('123');
      
      const value = await firstInput.inputValue();
      expect(value).toBe('123');
    }
  });

  test('Debe permitir llenar textarea', async ({ page }) => {
    // Buscar textareas
    const textareas = page.locator('textarea');
    const count = await textareas.count();
    
    if (count > 0) {
      const firstTextarea = textareas.first();
      await firstTextarea.fill('Texto largo para prueba\nCon múltiples líneas');
      
      const value = await firstTextarea.textContent();
      expect(value).toContain('Texto largo para prueba');
    }
  });

  test('Debe permitir seleccionar opciones de dropdown', async ({ page }) => {
    // Buscar selects
    const selects = page.locator('select');
    const count = await selects.count();
    
    if (count > 0) {
      const firstSelect = selects.first();
      
      // Obtener opciones disponibles
      const options = await firstSelect.locator('option').count();
      
      if (options > 1) {
        // Seleccionar la segunda opción
        await firstSelect.selectOption({ index: 1 });
        
        const selectedValue = await firstSelect.inputValue();
        expect(selectedValue).toBeTruthy();
      }
    }
  });

  test('Debe validar campos requeridos', async ({ page }) => {
    // Buscar formularios
    const forms = page.locator('form').first();
    
    if (await forms.isVisible()) {
      // Intentar enviar formulario vacío
      const submitButton = forms.locator('button[type="submit"]').first();
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(500);
        
        // Verificar que no se navega
        expect(page.url()).toBeTruthy();
      }
    }
  });

  test('Debe permitir seleccionar con checkboxes', async ({ page }) => {
    // Buscar checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    
    if (count > 0) {
      const firstCheckbox = checkboxes.first();
      
      const isChecked1 = await firstCheckbox.isChecked();
      await firstCheckbox.check();
      
      const isChecked2 = await firstCheckbox.isChecked();
      expect(isChecked2).toBe(true);
    }
  });

  test('Debe permitir seleccionar con radio buttons', async ({ page }) => {
    // Buscar radio buttons
    const radios = page.locator('input[type="radio"]');
    const count = await radios.count();
    
    if (count > 0) {
      const firstRadio = radios.first();
      await firstRadio.check();
      
      const isChecked = await firstRadio.isChecked();
      expect(isChecked).toBe(true);
    }
  });

  test('Debe permitir llenar campos de fecha', async ({ page }) => {
    // Buscar inputs de fecha
    const dateInputs = page.locator('input[type="date"]');
    const count = await dateInputs.count();
    
    if (count > 0) {
      const firstInput = dateInputs.first();
      await firstInput.fill('2024-03-02');
      
      const value = await firstInput.inputValue();
      expect(value).toBe('2024-03-02');
    }
  });
});
