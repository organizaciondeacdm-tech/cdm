// ─────────────────────────────────────────────────────────────────────────────
// api.spec.js  –  Full REST API test suite (covers every module)
// ─────────────────────────────────────────────────────────────────────────────
const { test, expect } = require('@playwright/test');
const {
  DEFAULT_API_URL,
  loginAPI,
  authRequest,
  authJson,
  uniqueSuffix,
  safeDeleteEscuelaByName
} = require('./helpers/systematic');

// ── Public / health ───────────────────────────────────────────────────────────
test.describe('API – Endpoints públicos', () => {
  test('GET /health → 200', async ({ request }) => {
    const res = await request.get(`${DEFAULT_API_URL}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status ?? body.success).toBeTruthy();
  });

  test('GET /api/test → 200', async ({ request }) => {
    const res = await request.get(`${DEFAULT_API_URL}/api/test`);
    expect(res.status()).toBe(200);
  });

  test('GET / → 200', async ({ request }) => {
    const res = await request.get(`${DEFAULT_API_URL}/`);
    expect(res.status()).toBe(200);
  });
});

// ── Auth guard (401 without token) ───────────────────────────────────────────
test.describe('API – Protección sin token', () => {
  const PROTECTED = [
    '/api/escuelas',
    '/api/docentes',
    '/api/alumnos',
    '/api/alertas',
    '/api/estadisticas',
    '/api/calendario',
    '/api/export/json',
    '/api/export/csv',
    '/api/admin/users',
    '/api/informes',
    '/api/reportes/dashboard'
  ];

  for (const path of PROTECTED) {
    test(`GET ${path} sin token → 401`, async ({ request }) => {
      const res = await request.get(`${DEFAULT_API_URL}${path}`);
      expect(res.status()).toBe(401);
    });
  }
});

// ── Escuelas CRUD ─────────────────────────────────────────────────────────────
test.describe('API – Escuelas CRUD', () => {
  let token, escuelaId, escuelaNombre;

  test.beforeAll(async ({ request }) => {
    token = await loginAPI(request);
  });

  test.afterAll(async ({ request }) => {
    if (escuelaNombre) await safeDeleteEscuelaByName(request, token, escuelaNombre);
  });

  test('GET /api/escuelas → 200 con paginación', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/escuelas');
    expect(Array.isArray(body.data?.escuelas)).toBe(true);
    expect(typeof body.data?.pagination).toBe('object');
  });

  test('GET /api/escuelas?page=1&limit=5 → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/escuelas?page=1&limit=5');
    expect(body.data.escuelas.length).toBeLessThanOrEqual(5);
  });

  test('GET /api/escuelas/buscar?q=esc → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/escuelas/buscar?q=esc');
    expect(body.success).toBe(true);
  });

  test('GET /api/escuelas/estadisticas → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/escuelas/estadisticas');
    expect(body.success).toBe(true);
  });

  test('POST /api/escuelas → 201 crea escuela', async ({ request }) => {
    const suf = uniqueSuffix();
    escuelaNombre = `Escuela API E2E ${suf}`;
    const body = await authJson(request, token, 'POST', '/api/escuelas', {
      de: 'DE 10',
      escuela: escuelaNombre,
      nivel: 'Primario',
      direccion: `Calle API ${suf}, CABA`,
      email: `api.${suf}@acdm.local`,
      jornada: 'Simple',
      turno: 'Mañana',
      estado: 'activa'
    }, 201);
    escuelaId = body.data._id;
    expect(escuelaId).toBeTruthy();
  });

  test('GET /api/escuelas/:id → 200', async ({ request }) => {
    if (!escuelaId) test.skip();
    const body = await authJson(request, token, 'GET', `/api/escuelas/${escuelaId}`);
    expect(body.data._id).toBe(escuelaId);
  });

  test('GET /api/escuelas/:id/estadisticas → 200', async ({ request }) => {
    if (!escuelaId) test.skip();
    const body = await authJson(request, token, 'GET', `/api/escuelas/${escuelaId}/estadisticas`);
    expect(body.success).toBe(true);
  });

  test('PUT /api/escuelas/:id → 200 actualiza escuela', async ({ request }) => {
    if (!escuelaId) test.skip();
    const body = await authJson(request, token, 'PUT', `/api/escuelas/${escuelaId}`, { jornada: 'Completa' });
    expect(body.success).toBe(true);
  });

  // Visitas sub-CRUD
  test.describe('Visitas', () => {
    let visitaId;
    test('POST visita → 201', async ({ request }) => {
      if (!escuelaId) test.skip();
      const body = await authJson(request, token, 'POST', `/api/escuelas/${escuelaId}/visitas`, {
        fecha: '2026-03-10',
        visitante: 'Inspector E2E',
        observaciones: 'Visita de prueba E2E'
      }, 201);
      visitaId = body.data._id;
      expect(visitaId).toBeTruthy();
    });
    test('GET visitas → 200', async ({ request }) => {
      if (!escuelaId) test.skip();
      const body = await authJson(request, token, 'GET', `/api/escuelas/${escuelaId}/visitas`);
      expect(body.success).toBe(true);
    });
    test('PUT visita → 200', async ({ request }) => {
      if (!visitaId) test.skip();
      const body = await authJson(request, token, 'PUT', `/api/escuelas/${escuelaId}/visitas/${visitaId}`, {
        observaciones: 'Visita actualizada'
      });
      expect(body.success).toBe(true);
    });
    test('DELETE visita → 200', async ({ request }) => {
      if (!visitaId) test.skip();
      const body = await authJson(request, token, 'DELETE', `/api/escuelas/${escuelaId}/visitas/${visitaId}`);
      expect(body.success).toBe(true);
    });
  });

  // Proyectos sub-CRUD
  test.describe('Proyectos', () => {
    let proyectoId;
    test('POST proyecto → 201', async ({ request }) => {
      if (!escuelaId) test.skip();
      const body = await authJson(request, token, 'POST', `/api/escuelas/${escuelaId}/proyectos`, {
        nombre: 'Proyecto E2E',
        descripcion: 'Desc E2E',
        estado: 'En Progreso',
        fechaInicio: '2026-01-01'
      }, 201);
      proyectoId = body.data._id;
      expect(proyectoId).toBeTruthy();
    });
    test('GET proyectos → 200', async ({ request }) => {
      if (!escuelaId) test.skip();
      const body = await authJson(request, token, 'GET', `/api/escuelas/${escuelaId}/proyectos`);
      expect(body.success).toBe(true);
    });
    test('PUT proyecto → 200', async ({ request }) => {
      if (!proyectoId) test.skip();
      const body = await authJson(request, token, 'PUT', `/api/escuelas/${escuelaId}/proyectos/${proyectoId}`, {
        estado: 'Completado'
      });
      expect(body.success).toBe(true);
    });
    test('DELETE proyecto → 200', async ({ request }) => {
      if (!proyectoId) test.skip();
      const body = await authJson(request, token, 'DELETE', `/api/escuelas/${escuelaId}/proyectos/${proyectoId}`);
      expect(body.success).toBe(true);
    });
  });

  // Informes por escuela sub-CRUD
  test.describe('Informes por escuela', () => {
    let informeId;
    test('POST informe escuela → 201', async ({ request }) => {
      if (!escuelaId) test.skip();
      const body = await authJson(request, token, 'POST', `/api/escuelas/${escuelaId}/informes`, {
        titulo: 'Informe E2E',
        estado: 'Pendiente',
        fechaEntrega: '2026-04-01'
      }, 201);
      informeId = body.data._id;
      expect(informeId).toBeTruthy();
    });
    test('GET informes escuela → 200', async ({ request }) => {
      if (!escuelaId) test.skip();
      const body = await authJson(request, token, 'GET', `/api/escuelas/${escuelaId}/informes`);
      expect(body.success).toBe(true);
    });
    test('PUT informe escuela → 200', async ({ request }) => {
      if (!informeId) test.skip();
      const body = await authJson(request, token, 'PUT', `/api/escuelas/${escuelaId}/informes/${informeId}`, {
        estado: 'Entregado'
      });
      expect(body.success).toBe(true);
    });
    test('DELETE informe escuela → 200', async ({ request }) => {
      if (!informeId) test.skip();
      const body = await authJson(request, token, 'DELETE', `/api/escuelas/${escuelaId}/informes/${informeId}`);
      expect(body.success).toBe(true);
    });
  });

  test('DELETE /api/escuelas/:id → 200 elimina escuela', async ({ request }) => {
    if (!escuelaId) test.skip();
    const body = await authJson(request, token, 'DELETE', `/api/escuelas/${escuelaId}`);
    expect(body.success).toBe(true);
    escuelaId = null;
    escuelaNombre = null;
  });
});

// ── Docentes CRUD ─────────────────────────────────────────────────────────────
test.describe('API – Docentes CRUD', () => {
  let token, docenteId, escuelaId;

  test.beforeAll(async ({ request }) => {
    token = await loginAPI(request);
    // Get a real escuela ID
    const body = await authJson(request, token, 'GET', '/api/escuelas?limit=1');
    escuelaId = body.data?.escuelas?.[0]?._id ?? null;
  });

  test('GET /api/docentes → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/docentes');
    expect(body.success).toBe(true);
  });

  test('GET /api/docentes/licencias-proximas → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/docentes/licencias-proximas');
    expect(body.success).toBe(true);
  });

  test('GET /api/docentes/estadisticas → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/docentes/estadisticas');
    expect(body.success).toBe(true);
    expect(typeof body.data.total).toBe('number');
  });

  test('POST /api/docentes → 201 crea docente', async ({ request }) => {
    if (!escuelaId) test.skip();
    const suf = uniqueSuffix();
    const body = await authJson(request, token, 'POST', '/api/docentes', {
      escuela: escuelaId,
      nombre: 'Juan',
      apellido: `E2E-${suf}`,
      cargo: 'Maestro de Grado',
      estado: 'Activo',
      jornada: 'Simple',
      email: `jdoe.${suf}@acdm.local`
    }, 201);
    docenteId = body.data._id;
    expect(docenteId).toBeTruthy();
  });

  test('GET /api/docentes/:id → 200', async ({ request }) => {
    if (!docenteId) test.skip();
    const body = await authJson(request, token, 'GET', `/api/docentes/${docenteId}`);
    expect(body.data._id).toBe(docenteId);
  });

  test('PUT /api/docentes/:id → 200 actualiza docente', async ({ request }) => {
    if (!docenteId) test.skip();
    const body = await authJson(request, token, 'PUT', `/api/docentes/${docenteId}`, {
      estado: 'Licencia',
      motivo: 'Enfermedad',
      diasAutorizados: 10
    });
    expect(body.success).toBe(true);
  });

  test('DELETE /api/docentes/:id → 200 elimina docente', async ({ request }) => {
    if (!docenteId) test.skip();
    const body = await authJson(request, token, 'DELETE', `/api/docentes/${docenteId}`);
    expect(body.success).toBe(true);
    docenteId = null;
  });
});

// ── Alumnos CRUD ──────────────────────────────────────────────────────────────
test.describe('API – Alumnos CRUD', () => {
  let token, alumnoId, escuelaId;

  test.beforeAll(async ({ request }) => {
    token = await loginAPI(request);
    const body = await authJson(request, token, 'GET', '/api/escuelas?limit=1');
    escuelaId = body.data?.escuelas?.[0]?._id ?? null;
  });

  test('GET /api/alumnos → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/alumnos');
    expect(body.success).toBe(true);
  });

  test('GET /api/alumnos/estadisticas → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/alumnos/estadisticas');
    expect(body.success).toBe(true);
  });

  test('POST /api/alumnos → 201 crea alumno', async ({ request }) => {
    if (!escuelaId) test.skip();
    const body = await authJson(request, token, 'POST', '/api/alumnos', {
      escuela: escuelaId,
      nombre: 'Pedro',
      apellido: `E2EAlumno-${uniqueSuffix()}`,
      gradoSalaAnio: '3ro',
      diagnostico: 'Ninguno'
    }, 201);
    alumnoId = body.data._id;
    expect(alumnoId).toBeTruthy();
  });

  test('GET /api/alumnos/:id → 200', async ({ request }) => {
    if (!alumnoId) test.skip();
    const body = await authJson(request, token, 'GET', `/api/alumnos/${alumnoId}`);
    expect(body.data._id).toBe(alumnoId);
  });

  test('PUT /api/alumnos/:id → 200 actualiza alumno', async ({ request }) => {
    if (!alumnoId) test.skip();
    const body = await authJson(request, token, 'PUT', `/api/alumnos/${alumnoId}`, {
      observaciones: 'Actualizado por E2E'
    });
    expect(body.success).toBe(true);
  });

  test('DELETE /api/alumnos/:id → 200 elimina alumno', async ({ request }) => {
    if (!alumnoId) test.skip();
    const body = await authJson(request, token, 'DELETE', `/api/alumnos/${alumnoId}`);
    expect(body.success).toBe(true);
    alumnoId = null;
  });
});

// ── Informes globales ─────────────────────────────────────────────────────────
test.describe('API – Informes globales', () => {
  let token, informeId;

  test.beforeAll(async ({ request }) => {
    token = await loginAPI(request);
  });

  test('GET /api/informes → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/informes');
    expect(body.success).toBe(true);
  });

  test('POST /api/informes → 201 crea informe global (sin escuelaId)', async ({ request }) => {
    const body = await authJson(request, token, 'POST', '/api/informes', {
      titulo: `Informe Global E2E ${uniqueSuffix()}`,
      estado: 'Pendiente'
    }, 201);
    informeId = body.data._id;
    expect(informeId).toBeTruthy();
  });

  test('GET /api/informes/:id → 200', async ({ request }) => {
    if (!informeId) test.skip();
    const body = await authJson(request, token, 'GET', `/api/informes/${informeId}`);
    expect(body.success).toBe(true);
  });

  test('PUT /api/informes/:id → 200 actualiza informe', async ({ request }) => {
    if (!informeId) test.skip();
    const body = await authJson(request, token, 'PUT', `/api/informes/${informeId}`, {
      estado: 'En Progreso'
    });
    expect(body.success).toBe(true);
  });

  test('DELETE /api/informes/:id → 200 elimina informe', async ({ request }) => {
    if (!informeId) test.skip();
    const body = await authJson(request, token, 'DELETE', `/api/informes/${informeId}`);
    expect(body.success).toBe(true);
    informeId = null;
  });
});

// ── Alertas ───────────────────────────────────────────────────────────────────
test.describe('API – Alertas', () => {
  let token;
  test.beforeAll(async ({ request }) => { token = await loginAPI(request); });

  test('GET /api/alertas → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/alertas');
    expect(body.success).toBe(true);
  });

  test('POST /api/alertas/:id/acknowledge → 200 (ID fake)', async ({ request }) => {
    const body = await authJson(
      request, token, 'POST',
      '/api/alertas/000000000000000000000001/acknowledge'
    );
    expect(body.success).toBe(true);
  });
});

// ── Estadísticas & Reportes ───────────────────────────────────────────────────
test.describe('API – Estadísticas y Reportes', () => {
  let token;
  test.beforeAll(async ({ request }) => { token = await loginAPI(request); });

  test('GET /api/estadisticas → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/estadisticas');
    expect(body.success).toBe(true);
  });

  test('GET /api/reportes/dashboard → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/reportes/dashboard');
    expect(body.success).toBe(true);
  });

  test('GET /api/reportes/escuelas (JSON) → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/reportes/escuelas');
    expect(body.success).toBe(true);
  });

  test('GET /api/reportes/escuelas?formato=csv → 200', async ({ request }) => {
    const res = await authRequest(request, token, 'GET', '/api/reportes/escuelas?formato=csv');
    expect(res.status()).toBe(200);
  });

  test('GET /api/reportes/licencias → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/reportes/licencias');
    expect(body.success).toBe(true);
  });

  test('GET /api/reportes/alumnos → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/reportes/alumnos');
    expect(body.success).toBe(true);
  });
});

// ── Calendario ────────────────────────────────────────────────────────────────
test.describe('API – Calendario', () => {
  let token;
  test.beforeAll(async ({ request }) => { token = await loginAPI(request); });

  test('GET /api/calendario?year=2026&month=3 → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/calendario?year=2026&month=3');
    expect(body.success).toBe(true);
  });

  test('GET /api/calendario?year=2026 (año completo) → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/calendario?year=2026');
    expect(body.success).toBe(true);
  });
});

// ── Exportar ──────────────────────────────────────────────────────────────────
test.describe('API – Exportar', () => {
  let token;
  test.beforeAll(async ({ request }) => { token = await loginAPI(request); });

  test('GET /api/export/json → 200', async ({ request }) => {
    const res = await authRequest(request, token, 'GET', '/api/export/json');
    expect(res.status()).toBe(200);
  });

  test('GET /api/export/csv → 200', async ({ request }) => {
    const res = await authRequest(request, token, 'GET', '/api/export/csv');
    expect(res.status()).toBe(200);
  });
});

// ── Forms Engine ──────────────────────────────────────────────────────────────
test.describe('API – Forms Engine', () => {
  let token, templateId;

  test.beforeAll(async ({ request }) => { token = await loginAPI(request); });

  test('GET /api/forms/templates → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/forms/templates');
    expect(body.success).toBe(true);
  });

  test('GET /api/forms/submissions → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/forms/submissions');
    expect(body.success).toBe(true);
  });

  test('GET /api/forms/suggestions → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/forms/suggestions');
    expect(body.success).toBe(true);
  });

  test('POST /api/forms/templates → 201 crea template', async ({ request }) => {
    const body = await authJson(request, token, 'POST', '/api/forms/templates', {
      name: `Template E2E ${uniqueSuffix()}`,
      fields: [{ name: 'campo1', type: 'text', label: 'Campo 1' }]
    }, 201);
    templateId = body.data._id;
    expect(templateId).toBeTruthy();
  });

  test('PUT /api/forms/templates/:id → 200 actualiza template', async ({ request }) => {
    if (!templateId) test.skip();
    const body = await authJson(
      request, token, 'PUT', `/api/forms/templates/${templateId}`,
      { name: `Template E2E Actualizado ${uniqueSuffix()}` }
    );
    expect(body.success).toBe(true);
  });

  test('DELETE /api/forms/templates/:id → 200 elimina template', async ({ request }) => {
    if (!templateId) test.skip();
    const body = await authJson(request, token, 'DELETE', `/api/forms/templates/${templateId}`);
    expect(body.success).toBe(true);
    templateId = null;
  });
});

// ── Admin – Usuarios ──────────────────────────────────────────────────────────
test.describe('API – Admin Usuarios', () => {
  let token, userId;

  test.beforeAll(async ({ request }) => { token = await loginAPI(request); });

  test('GET /api/admin/users → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/admin/users');
    expect(body.success).toBe(true);
  });

  test('GET /api/auth/admin/sessions → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/auth/admin/sessions');
    expect(body.success).toBe(true);
  });

  test('POST /api/admin/users → 201 crea usuario', async ({ request }) => {
    const ts = uniqueSuffix();
    const body = await authJson(request, token, 'POST', '/api/admin/users', {
      username: `testuser${ts}`,
      password: 'TestPass2026!',
      email: `testuser${ts}@test.com`,
      nombre: 'Test',
      apellido: 'E2E',
      rol: 'viewer'
    }, 201);
    userId = body.data._id;
    expect(userId).toBeTruthy();
  });

  test('GET /api/admin/users/:id → 200', async ({ request }) => {
    if (!userId) test.skip();
    const body = await authJson(request, token, 'GET', `/api/admin/users/${userId}`);
    expect(body.data._id).toBe(userId);
  });

  test('PUT /api/admin/users/:id → 200 actualiza usuario', async ({ request }) => {
    if (!userId) test.skip();
    const body = await authJson(request, token, 'PUT', `/api/admin/users/${userId}`, {
      nombre: 'TestActualizado'
    });
    expect(body.success).toBe(true);
  });

  test('DELETE /api/admin/users/:id → 200 elimina usuario', async ({ request }) => {
    if (!userId) test.skip();
    const body = await authJson(request, token, 'DELETE', `/api/admin/users/${userId}`);
    expect(body.success).toBe(true);
    userId = null;
  });
});

// ── Email de alerta ───────────────────────────────────────────────────────────
test.describe('API – Email de alerta', () => {
  let token;
  test.beforeAll(async ({ request }) => { token = await loginAPI(request); });

  test('POST /api/send-alert-email → 200 (simulado si no hay SMTP)', async ({ request }) => {
    const res = await authRequest(request, token, 'POST', '/api/send-alert-email', {
      to: 'test@example.com',
      subject: 'Test Alerta E2E',
      alerts: ['Alerta de prueba 1'],
      message: 'Mensaje de prueba E2E'
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ── Búsqueda global ───────────────────────────────────────────────────────────
test.describe('API – Búsqueda global', () => {
  let token;
  test.beforeAll(async ({ request }) => { token = await loginAPI(request); });

  test('GET /api/buscar?q=escuela → 200', async ({ request }) => {
    const body = await authJson(request, token, 'GET', '/api/buscar?q=escuela');
    expect(body.success).toBe(true);
  });
});
