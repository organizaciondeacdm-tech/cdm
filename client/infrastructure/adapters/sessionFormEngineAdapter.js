const TEMPLATE_KEY = 'fe_templates';
const SUBMISSION_KEY = 'fe_submissions';

const seedTemplates = [
  {
    _id: 'tmp-escuela',
    name: 'Alta de Escuela Simplificada',
    description: 'Registro rápido para soporte familiar',
    entityType: 'escuela',
    fields: [
      { name: 'escuela', label: 'Escuela', type: 'text', required: true, suggestionSource: 'escuelas' },
      { name: 'de', label: 'Distrito Escolar', type: 'text', required: true },
      { name: 'nivel', label: 'Nivel', type: 'select', options: ['Inicial', 'Primario', 'Secundario'], required: true },
      { name: 'contacto', label: 'Email de Contacto', type: 'email', required: false },
      { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false }
    ]
  }
];

function read(key, fallback) {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

export class SessionFormEngineAdapter {
  async listTemplates() {
    const templates = read(TEMPLATE_KEY, seedTemplates);
    write(TEMPLATE_KEY, templates);
    return templates;
  }

  async listSubmissions({ search = '', columnFilters = '{}' } = {}) {
    const submissions = read(SUBMISSION_KEY, []);
    const filters = JSON.parse(columnFilters || '{}');

    const rows = submissions.filter((row) => {
      const payload = row.payload || {};
      const matchesSearch = !search || Object.values(payload).some((value) =>
        String(value || '').toLowerCase().includes(search.toLowerCase())
      );

      const matchesColumns = Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        return String(payload[key] || '').toLowerCase().includes(String(value).toLowerCase());
      });

      return matchesSearch && matchesColumns;
    });

    return {
      items: rows,
      total: rows.length,
      page: 1,
      limit: rows.length || 1,
      pages: 1
    };
  }

  async createSubmission(payload) {
    const submissions = read(SUBMISSION_KEY, []);
    const row = {
      _id: `session-${Date.now()}`,
      ...payload,
      createdAt: new Date().toISOString(),
      status: 'synced'
    };
    submissions.unshift(row);
    write(SUBMISSION_KEY, submissions);
    return row;
  }

  async updateSubmission(id, payload) {
    const submissions = read(SUBMISSION_KEY, []);
    const next = submissions.map((item) => (item._id === id ? { ...item, ...payload } : item));
    write(SUBMISSION_KEY, next);
    return next.find((item) => item._id === id);
  }

  async deleteSubmission(id) {
    const submissions = read(SUBMISSION_KEY, []);
    write(SUBMISSION_KEY, submissions.filter((item) => item._id !== id));
    return { success: true };
  }

  async bulkCreateSubmissions(rows) {
    const submissions = read(SUBMISSION_KEY, []);
    const created = rows.map((payload) => ({
      _id: `session-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      ...payload,
      createdAt: new Date().toISOString(),
      status: 'synced'
    }));
    write(SUBMISSION_KEY, [...created, ...submissions]);
    return { inserted: created.length };
  }

  async getSuggestions(_source, q) {
    const submissions = read(SUBMISSION_KEY, []);
    const values = submissions
      .flatMap((item) => Object.values(item.payload || {}))
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .filter((value) => value.toLowerCase().includes(q.toLowerCase()));

    return [...new Set(values)].slice(0, 6).map((value) => ({ id: value, value, subtitle: 'Historial local' }));
  }
}
