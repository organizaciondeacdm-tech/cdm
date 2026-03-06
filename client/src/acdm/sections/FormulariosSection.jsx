import { useState, useEffect, useCallback } from 'react';
import { SubmissionsTable, TemplateManager, GenericTable, GenericForm } from "../components/system/forms/index.js";
import { acdmApi } from '../services/acdmApi';
import { emitNotification } from '../../hooks/useNotifications.js';
import { emitAcdmEvent, ACDM_EVENTS, useAcdmEvent } from '../../hooks/useAcdmEvents.js';

// ── Columnas para la tabla de plantillas ────────────────────────────────────
const TEMPLATE_COLUMNS = [
  { key: 'nombre',      label: 'Nombre',       type: 'text',   sortable: true  },
  { key: 'descripcion', label: 'Descripción',  type: 'text',   sortable: false },
  { key: 'campos',      label: 'Campos',       type: 'number', sortable: true,
    render: (val) => Array.isArray(val) ? val.length : (val ?? '-') },
  { key: 'createdAt',   label: 'Creado',       type: 'date',   sortable: true,
    render: (val) => val ? new Date(val).toLocaleDateString('es-AR') : '-' },
];

// ── Columnas para el formulario de edición de plantillas ────────────────────
const TEMPLATE_FORM_COLUMNS = [
  { key: 'nombre',      label: 'Nombre',      type: 'text',     required: true,  placeholder: 'Nombre de la plantilla' },
  { key: 'descripcion', label: 'Descripción', type: 'textarea', required: false, placeholder: 'Descripción opcional', rows: 3 },
];

// ── Columnas para la tabla de registros (submissions) ──────────────────────
const SUBMISSION_COLUMNS = [
  { key: 'templateName', label: 'Plantilla',  type: 'text', sortable: true },
  { key: 'createdAt',    label: 'Fecha',      type: 'date', sortable: true,
    render: (val) => val ? new Date(val).toLocaleDateString('es-AR') : '-' },
  { key: 'submittedBy',  label: 'Enviado por', type: 'text', sortable: true,
    render: (val) => val || '-' },
];

export function FormulariosSection() {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});

  // ── Estado para GenericForm de nueva/editar plantilla ───────────────────
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // ── Carga de plantillas ─────────────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    try {
      const response = await acdmApi.getFormTemplates();
      setTemplates(response.data || []);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Error al cargar plantillas');
      emitNotification({ type: 'error', message: 'Error al cargar plantillas' });
    }
  }, []);

  // ── Carga de registros ──────────────────────────────────────────────────
  const loadSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await acdmApi.getFormSubmissions({
        ...(activeTemplateId ? { templateId: activeTemplateId } : {}),
        page: 1,
        limit: 50
      });
      setSubmissions(response.data?.items || []);
    } catch (err) {
      console.error('Error loading submissions:', err);
      setError('Error al cargar registros');
      emitNotification({ type: 'error', message: 'Error al cargar registros' });
    } finally {
      setLoading(false);
    }
  }, [activeTemplateId]);

  useEffect(() => { loadTemplates(); loadSubmissions(); }, [loadTemplates, loadSubmissions]);
  useEffect(() => { if (activeTemplateId) loadSubmissions(); }, [activeTemplateId, loadSubmissions]);

  // ── Recargar cuando llega evento global ────────────────────────────────
  useAcdmEvent(ACDM_EVENTS.RELOAD_REQUEST, () => {
    loadTemplates();
    loadSubmissions();
  });

  // ── CRUD Submissions ────────────────────────────────────────────────────
  const handleDeleteSubmission = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await acdmApi.deleteFormSubmission(id);
      await loadSubmissions();
      emitNotification({ type: 'success', message: 'Registro eliminado exitosamente' });
      emitAcdmEvent(ACDM_EVENTS.MUTATION, { action: 'delete', entity: 'submission', id });
    } catch (err) {
      console.error('Error deleting submission:', err);
      emitNotification({ type: 'error', message: `Error al eliminar registro: ${err.message}` });
    }
  };

  // ── CRUD Templates (vía GenericForm) ────────────────────────────────────
  const handleSaveTemplate = async (formData) => {
    setSavingTemplate(true);
    try {
      const isNew = !editingTemplate?._id && !editingTemplate?.id;
      if (isNew) {
        await acdmApi.createFormTemplate(formData);
        emitNotification({ type: 'success', message: `Plantilla "${formData.nombre}" creada` });
      } else {
        const id = editingTemplate._id || editingTemplate.id;
        await acdmApi.updateFormTemplate(id, formData);
        emitNotification({ type: 'success', message: `Plantilla "${formData.nombre}" actualizada` });
      }
      emitAcdmEvent(ACDM_EVENTS.MUTATION, { action: isNew ? 'create' : 'update', entity: 'template' });
      await loadTemplates();
      setShowTemplateForm(false);
      setEditingTemplate(null);
    } catch (err) {
      console.error('Error saving template:', err);
      emitNotification({ type: 'error', message: `Error al guardar plantilla: ${err.message}` });
      throw err; // GenericForm mostrará el error inline
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('¿Eliminar esta plantilla? Se perderán todos sus registros.')) return;
    try {
      await acdmApi.deleteFormTemplate(id);
      await loadTemplates();
      emitNotification({ type: 'success', message: 'Plantilla eliminada' });
      emitAcdmEvent(ACDM_EVENTS.MUTATION, { action: 'delete', entity: 'template', id });
    } catch (err) {
      emitNotification({ type: 'error', message: `Error al eliminar plantilla: ${err.message}` });
    }
  };

  // ── dataSource para TemplateManager heredado ────────────────────────────
  const dataSource = {
    getSuggestions: async (source, query) => {
      try { return await acdmApi.getFormSuggestions(source, query); }
      catch (err) { console.error('Error getting suggestions:', err); return []; }
    },
    bulkCreateSubmissions: async (data) => acdmApi.bulkCreateFormSubmissions(data),
    deleteTemplate: async (id) => {
      const result = await acdmApi.deleteFormTemplate(id);
      await loadTemplates();
      return result;
    }
  };

  const notify = (message, type = 'info') => {
    emitNotification({ type, message });
  };

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-16">
        <div>
          <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>
            Formularios
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Gestión de plantillas y registros de formularios</p>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>
          Plantillas
        </button>
        <button className={`tab ${activeTab === 'submissions' ? 'active' : ''}`} onClick={() => setActiveTab('submissions')}>
          Registros ({submissions.length})
        </button>
        <button className={`tab ${activeTab === 'generic-table' ? 'active' : ''}`} onClick={() => setActiveTab('generic-table')}>
          Vista Tabla
        </button>
      </div>

      <div className="tab-content">

        {/* ── Tab: Plantillas (TemplateManager + GenericForm) ─────────────── */}
        {activeTab === 'templates' && (
          <>
            {/* Botón nueva plantilla */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button
                className="btn-primary"
                style={{ width: 'auto', padding: '8px 18px', fontSize: 13 }}
                onClick={() => { setEditingTemplate({}); setShowTemplateForm(true); }}
              >
                + Nueva Plantilla
              </button>
            </div>

            {/* GenericForm modal para crear/editar */}
            {showTemplateForm && (
              <GenericForm
                title={editingTemplate?.nombre ? `Editar: ${editingTemplate.nombre}` : '➕ Nueva Plantilla'}
                columns={TEMPLATE_FORM_COLUMNS}
                initialData={editingTemplate || {}}
                onSubmit={handleSaveTemplate}
                onCancel={() => { setShowTemplateForm(false); setEditingTemplate(null); }}
                isLoading={savingTemplate}
                submitLabel={editingTemplate?.nombre ? 'Actualizar' : 'Crear'}
                showBackdrop={true}
              />
            )}

            <TemplateManager
              templates={templates}
              activeTemplateId={activeTemplateId}
              setActiveTemplateId={setActiveTemplateId}
              dataSource={dataSource}
              notify={notify}
              onEditTemplate={(tpl) => { setEditingTemplate(tpl); setShowTemplateForm(true); }}
            />
          </>
        )}

        {/* ── Tab: Registros (SubmissionsTable) ───────────────────────────── */}
        {activeTab === 'submissions' && (
          <div>
            {loading ? (
              <div className="loading">Cargando registros...</div>
            ) : error ? (
              <div className="error">{error}</div>
            ) : (
              <SubmissionsTable
                rows={submissions}
                columnFilters={columnFilters}
                setColumnFilters={setColumnFilters}
                onDelete={handleDeleteSubmission}
              />
            )}
          </div>
        )}

        {/* ── Tab: Vista Tabla genérica (GenericTable) ────────────────────── */}
        {activeTab === 'generic-table' && (
          <GenericTable
            title="Plantillas de Formularios"
            columns={TEMPLATE_COLUMNS}
            data={templates}
            enableRemoteSync={true}
            onFetch={async () => {
              const response = await acdmApi.getFormTemplates();
              return response.data || [];
            }}
            onAdd={() => { setEditingTemplate({}); setShowTemplateForm(true); setActiveTab('templates'); }}
            onEdit={(row) => { setEditingTemplate(row); setShowTemplateForm(true); setActiveTab('templates'); }}
            onDelete={async (row) => handleDeleteTemplate(row._id || row.id)}
            formLayout={{ columns: 1, maxWidth: 520 }}
          />
        )}

      </div>
    </div>
  );
}
