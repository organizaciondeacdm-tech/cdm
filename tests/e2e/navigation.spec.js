// ─────────────────────────────────────────────────────────────────────────────
// navigation.spec.js  –  Sidebar navigation after login
// ─────────────────────────────────────────────────────────────────────────────
const { test, expect } = require('@playwright/test');
const { loginUI, gotoSection } = require('./helpers/systematic');

// All nav items defined in acdm-system-sidebar.jsx
const NAV_SECTIONS = [
  { label: 'Dashboard',      heading: /Dashboard/i },
  { label: 'Escuelas',       heading: /Escuelas/i },
  { label: 'Visitas',        heading: /Visitas/i },
  { label: 'Proyectos',      heading: /Proyectos/i },
  { label: 'Informes',       heading: /Informes/i },
  { label: 'Alertas',        heading: /Alertas/i },
  { label: 'Estadísticas',   heading: /Estad[íi]sticas/i },
  { label: 'Calendario',     heading: /Calendario/i },
  { label: 'Exportar',       heading: /Exportar/i }
];

test.describe('Navegación – Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await loginUI(page);
  });

  // ── Sidebar is visible ──────────────────────────────────────────────────
  test('el sidebar es visible después del login', async ({ page }) => {
    await expect(page.locator('.sidebar, nav.sidebar').first()).toBeVisible();
  });

  test('el sidebar contiene todos los ítems de navegación', async ({ page }) => {
    for (const { label } of NAV_SECTIONS) {
      await expect(
        page.locator('.nav-item').filter({ hasText: label }).first()
      ).toBeVisible();
    }
  });

  // ── Each section renders its heading ────────────────────────────────────
  for (const { label, heading } of NAV_SECTIONS) {
    test(`navega a "${label}" y muestra el encabezado correcto`, async ({ page }) => {
      await gotoSection(page, label);
      await expect(
        page.getByRole('heading', { name: heading }).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  }

  // ── Active state ─────────────────────────────────────────────────────────
  test('el nav-item activo tiene la clase "active"', async ({ page }) => {
    await gotoSection(page, 'Escuelas');
    const activeItem = page.locator('.nav-item.active');
    await expect(activeItem).toBeVisible();
    await expect(activeItem).toContainText('Escuelas');
  });

  // ── Keyboard shortcuts hint ──────────────────────────────────────────────
  test('el sidebar muestra los atajos de teclado', async ({ page }) => {
    const sidebar = page.locator('.sidebar, nav.sidebar').first();
    await expect(sidebar).toContainText(/Ctrl\+F/i);
  });

  // ── Collapse / expand ────────────────────────────────────────────────────
  test('el sidebar se puede colapsar y expandir', async ({ page }) => {
    // Click the collapse toggle button (if it exists)
    const toggleBtn = page
      .locator('button[class*="collapse"], button[title*="collapse"], button[aria-label*="collapse"], .sidebar-toggle')
      .first();

    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await expect(page.locator('.sidebar.collapsed')).toBeVisible({ timeout: 5_000 });

      await toggleBtn.click();
      await expect(page.locator('.sidebar:not(.collapsed)')).toBeVisible({ timeout: 5_000 });
    } else {
      // Skip gracefully if no toggle button found
      test.skip();
    }
  });
});
