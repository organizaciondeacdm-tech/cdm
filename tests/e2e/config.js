/**
 * Configuración global para tests de Playwright
 * 
 * Este archivo contiene utilidades compartidas entre todos los tests
 */

export const TEST_CONFIG = {
  // URLs
  APP_URL: 'http://localhost:5173',
  API_URL: 'http://localhost:5000',
  
  // Credenciales de prueba
  TEST_USER: {
    email: 'admin',
    password: 'admin2025'
  },
  
  // Timeouts
  TIMEOUT_SHORT: 1000,
  TIMEOUT_MEDIUM: 2000,
  TIMEOUT_LONG: 5000,
  
  // Selectores comunes
  SELECTORS: {
    // Inputs
    EMAIL_INPUT: 'input[type="email"], input[name="email"], input[placeholder*="mail"]',
    PASSWORD_INPUT: 'input[type="password"]',
    TEXT_INPUT: 'input[type="text"]',
    NUMBER_INPUT: 'input[type="number"]',
    DATE_INPUT: 'input[type="date"]',
    TEXTAREA: 'textarea',
    
    // Botones
    SUBMIT_BUTTON: 'button[type="submit"]',
    CREATE_BUTTON: 'button:has-text("Crear"), button:has-text("Agregar"), button:has-text("Nuevo")',
    
    // Elementos
    FORM: 'form',
    TABLE: 'table',
    NAV: 'nav',
    SIDEBAR: 'aside, [class*="sidebar"]'
  }
};

/**
 * Función helper para login automático
 */
export async function loginUser(page, email = TEST_CONFIG.TEST_USER.email, password = TEST_CONFIG.TEST_USER.password) {
  const emailInput = page.locator(TEST_CONFIG.SELECTORS.EMAIL_INPUT).first();
  
  if (await emailInput.isVisible()) {
    await emailInput.fill(email);
    await page.locator(TEST_CONFIG.SELECTORS.PASSWORD_INPUT).first().fill(password);
    await page.locator(TEST_CONFIG.SELECTORS.SUBMIT_BUTTON).first().click();
    await page.waitForTimeout(TEST_CONFIG.TIMEOUT_MEDIUM);
  }
}

/**
 * Función helper para esperar y hacer clic
 */
export async function clickElement(page, selector, timeout = TEST_CONFIG.TIMEOUT_MEDIUM) {
  const element = page.locator(selector).first();
  await element.waitFor({ timeout });
  await element.click();
  await page.waitForTimeout(300);
}

/**
 * Función helper para llenar formulario
 */
export async function fillForm(page, data = {}) {
  const inputs = page.locator('input[type="text"], input[type="email"], input[type="number"], textarea');
  const count = await inputs.count();
  
  for (let i = 0; i < Math.min(count, Object.keys(data).length); i++) {
    const input = inputs.nth(i);
    const key = Object.keys(data)[i];
    await input.fill(String(data[key]));
  }
}

/**
 * Función helper para verificar tabla tiene datos
 */
export async function verifyTableHasData(page) {
  const table = page.locator('table').first();
  
  if (await table.isVisible()) {
    const rows = table.locator('tr');
    const rowCount = await rows.count();
    return rowCount > 1; // Más de 1 porque la primera es header
  }
  
  return false;
}

/**
 * Función helper para obtener datos de tabla
 */
export async function getTableData(page) {
  const table = page.locator('table').first();
  
  if (!await table.isVisible()) {
    return [];
  }
  
  const rows = await table.locator('tr').all();
  const data = [];
  
  for (const row of rows) {
    const cells = await row.locator('td, th').all();
    const rowData = [];
    
    for (const cell of cells) {
      const text = await cell.textContent();
      rowData.push(text?.trim());
    }
    
    if (rowData.length > 0) {
      data.push(rowData);
    }
  }
  
  return data;
}
