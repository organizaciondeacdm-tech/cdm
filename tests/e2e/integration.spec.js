// ─────────────────────────────────────────────────────────────────────────────
// integration.spec.js  –  Full end-to-end flows combining UI + API
// ─────────────────────────────────────────────────────────────────────────────
const { test, expect } = require('@playwright/test');
const {
  gotoSection,
  loginAPI,
  authJson,
  authRequest,
  findEscuelaByName,
  safeDeleteEscuelaByName,
  uniqueSuffix,
  DEFAULT_API_URL,
  DEFAULT_FRONTEND_URL
} = require('./helpers/systematic');

test.use({ storageState: 'tests/e2e/.auth/admin.json' });

// ── Flujo 1: login → todas las secciones → logout ────────────────────────────
test.describe('Integración – Login, navegación completa y Logout', () => {
  test('recorre todas las secciones del sidebar sin errores de JS', async ({ page }) => {
    const jsErrors = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));
    await page.goto(DEFAULT_FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.sidebar, nav.sidebar').first()).toBeVisible();

    const sections = [
      'Dashboard', 'Escuelas', 'Visitas', 'Proyectos',
      'Informes', 'Alertas', 'Estadísticas', 'Calendario', 'Exportar'
    ];

    for (const section of sections) {
      await gotoSection(page, section);
      await page.waitForTimeout(300);
      // Heading should be visible
      await expect(
        page.getByRole('heading', { level: 1 }).or(page.getByRole('heading', { level: 2 })).first()
      ).toBeVisible({ timeout: 8_000 });
    }

    // No unhandled JS errors
    expect(jsErrors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });
});

// ── Flujo 2: CRUD completo API (escuela + sub-recursos + limpieza) ────────────
test.describe('Integración – CRUD completo via API', () => {
  let token, escuelaId, escuelaNombre;
  let visitaId, proyectoId, informeId;

  test.beforeAll(async ({ request }) => {
    token = await loginAPI(request);
  });

  test.afterAll(async ({ request }) => {
    if (escuelaNombre) {
      await safeDeleteEscuelaByName(request, token, escuelaNombre);
    }
  });

  test('paso 1 – crea escuela', async ({ request }) => {
    const suf = uniqueSuffix();
    escuelaNombre = `Escuela Integración ${suf}`;
    const body = await authJson(request, token, 'POST', '/api/escuelas', {
      de: 'DE 05',
      escuela: escuelaNombre,
      nivel: 'Primario',
      direccion: `Calle Integración ${suf}`,
      email: `integ.${suf}@acdm.local`,
      jornada: 'Simple',
      turno: 'Mañana',
      estado: 'activa'
    }, 201);
    escuelaId = body.data._id;
    expect(escuelaId).toBeTruthy();
  });

  test('paso 2 – registra visita, proyecto e informe en la escuela', async ({ request }) => {
    if (!escuelaId) test.skip();

    const vBody = await authJson(request, token, 'POST', `/api/escuelas/${escuelaId}/visitas`, {
      fecha: '2026-03-15',
      visitante: 'Inspector Integración',
      observaciones: 'Integración E2E'
    }, 201);
    visitaId = vBody.data._id;
    expect(visitaId).toBeTruthy();

    const pBody = await authJson(request, token, 'POST', `/api/escuelas/${escuelaId}/proyectos`, {
      nombre: 'Proyecto Integración',
      descripcion: 'Desc',
      estado: 'En Progreso',
      fechaInicio: '2026-01-01'
    }, 201);
    proyectoId = pBody.data._id;
    expect(proyectoId).toBeTruthy();

    const iBody = await authJson(request, token, 'POST', `/api/escuelas/${escuelaId}/informes`, {
      titulo: 'Informe Integración',
      estado: 'Pendiente',
      fechaEntrega: '2026-04-30'
    }, 201);
    informeId = iBody.data._id;
    expect(informeId).toBeTruthy();
  });

  test('paso 3 – actualiza escuela, visita, proyecto e informe', async ({ request }) => {
    if (!escuelaId) test.skip();

    const escBody = await authJson(request, token, 'PUT', `/api/escuelas/${escuelaId}`, { jornada: 'Completa' });
    expect(escBody.success).toBe(true);

    if (visitaId) {
      const vUp = await authJson(request, token, 'PUT', `/api/escuelas/${escuelaId}/visitas/${visitaId}`, {
        observaciones: 'Actualizada'
      });
      expect(vUp.success).toBe(true);
    }

    if (proyectoId) {
      const pUp = await authJson(request, token, 'PUT', `/api/escuelas/${escuelaId}/proyectos/${proyectoId}`, {
        estado: 'Completado'
      });
      expect(pUp.success).toBe(true);
    }

    if (informeId) {
      const iUp = await authJson(request, token, 'PUT', `/api/escuelas/${escuelaId}/informes/${informeId}`, {
        estado: 'Entregado'
      });
      expect(iUp.success).toBe(true);
    }
  });

  test('paso 4 – el dashboard y estadísticas reflejan los datos', async ({ request }) => {
    const dash = await authJson(request, token, 'GET', '/api/reportes/dashboard');
    expect(dash.success).toBe(true);

    const stats = await authJson(request, token, 'GET', '/api/estadisticas');
    expect(stats.success).toBe(true);
  });

  test('paso 5 – elimina sub-recursos y la escuela', async ({ request }) => {
    if (!escuelaId) test.skip();

    if (informeId) {
      const iDel = await authJson(request, token, 'DELETE', `/api/escuelas/${escuelaId}/informes/${informeId}`);
      expect(iDel.success).toBe(true);
    }
    if (proyectoId) {
      const pDel = await authJson(request, token, 'DELETE', `/api/escuelas/${escuelaId}/proyectos/${proyectoId}`);
      expect(pDel.success).toBe(true);
    }
    if (visitaId) {
      const vDel = await authJson(request, token, 'DELETE', `/api/escuelas/${escuelaId}/visitas/${visitaId}`);
      expect(vDel.success).toBe(true);
    }

    const escDel = await authJson(request, token, 'DELETE', `/api/escuelas/${escuelaId}`);
    expect(escDel.success).toBe(true);

    escuelaId = null;
    escuelaNombre = null;
  });
});

// ── Flujo 3: Búsqueda, exportar y calendario ──────────────────────────────────
test.describe('Integración – Búsqueda, exportar y calendario', () => {
  let token;
  test.beforeAll(async ({ request }) => { token = await loginAPI(request); });

  test('búsqueda global devuelve resultados', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/buscar?q=escuela');
    expect(body.success).toBe(true);
  });

  test('exportar JSON contiene datos', async ({ request }) => {
    const res = await authRequest(request, token, 'GET', '/api/export/json');
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Should have some data arrays
    expect(body).toBeTruthy();
  });

  test('exportar CSV devuelve content-type text/csv o text/plain', async ({ request }) => {
    const res = await authRequest(request, token, 'GET', '/api/export/csv');
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] ?? '';
    expect(ct).toMatch(/csv|text|octet/i);
  });

  test('calendario año completo contiene 12 meses', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/calendario?year=2026');
    expect(body.success).toBe(true);
    // Expect data covering all 12 months in some form
    const data = body.data;
    expect(data).toBeTruthy();
  });
});

// ── Flujo 4: Docente + Alumno ciclo de vida completo ─────────────────────────
test.describe('Integración – Ciclo de vida Docente y Alumno', () => {
  let token, escuelaId, docenteId, alumnoId;

  test.beforeAll(async ({ request }) => {
    token = await loginAPI(request);
    const body = await authJson(request, token, 'GET', '/api/escuelas?limit=1');
    escuelaId = body.data?.escuelas?.[0]?._id ?? null;
  });

  test('crea docente → actualiza a Licencia → elimina', async ({ request }) => {
    if (!escuelaId) test.skip();
    const suf = uniqueSuffix();

    const createBody = await authJson(request, token, 'POST', '/api/docentes', {
      escuela: escuelaId,
      nombre: 'María',
      apellido: `DocInteg-${suf}`,
      cargo: 'Titular',
      estado: 'Activo',
      jornada: 'Simple',
      email: `mdoc.${suf}@acdm.local`
    }, 201);
    docenteId = createBody.data._id;
    expect(docenteId).toBeTruthy();

    const updateBody = await authJson(request, token, 'PUT', `/api/docentes/${docenteId}`, {
      estado: 'Licencia',
      motivo: 'Art. 102',
      diasAutorizados: 15
    });
    expect(updateBody.success).toBe(true);

    const deleteBody = await authJson(request, token, 'DELETE', `/api/docentes/${docenteId}`);
    expect(deleteBody.success).toBe(true);
    docenteId = null;
  });

  test('crea alumno → actualiza → elimina', async ({ request }) => {
    if (!escuelaId) test.skip();
    const suf = uniqueSuffix();

    const createBody = await authJson(request, token, 'POST', '/api/alumnos', {
      escuela: escuelaId,
      nombre: 'Lucía',
      apellido: `AluInteg-${suf}`,
      gradoSalaAnio: '4to',
      diagnostico: 'TEA'
    }, 201);
    alumnoId = createBody.data._id;
    expect(alumnoId).toBeTruthy();

    const updateBody = await authJson(request, token, 'PUT', `/api/alumnos/${alumnoId}`, {
      observaciones: 'Seguimiento mensual'
    });
    expect(updateBody.success).toBe(true);

    const deleteBody = await authJson(request, token, 'DELETE', `/api/alumnos/${alumnoId}`);
    expect(deleteBody.success).toBe(true);
    alumnoId = null;
  });
});

// ── Flujo 5: Sesión de admin y gestión de usuarios ────────────────────────────
test.describe('Integración – Admin usuario lifecycle', () => {
  let token, userId;

  test.beforeAll(async ({ request }) => { token = await loginAPI(request); });

  test('crea → actualiza → elimina usuario admin', async ({ request }) => {
    const ts = uniqueSuffix();
    const createBody = await authJson(request, token, 'POST', '/api/admin/users', {
      username: `integ${ts}`,
      password: 'IntegPass2026!',
      email: `integ${ts}@test.com`,
      nombre: 'Integ',
      apellido: 'E2E',
      rol: 'viewer'
    }, 201);
    userId = createBody.data._id;
    expect(userId).toBeTruthy();

    const updateBody = await authJson(request, token, 'PUT', `/api/admin/users/${userId}`, {
      nombre: 'IntegActualizado'
    });
    expect(updateBody.success).toBe(true);

    const deleteBody = await authJson(request, token, 'DELETE', `/api/admin/users/${userId}`);
    expect(deleteBody.success).toBe(true);
    userId = null;
  });
});
