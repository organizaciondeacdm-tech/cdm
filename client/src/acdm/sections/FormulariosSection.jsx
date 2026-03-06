import { useState, useEffect } from 'react';
import { SubmissionsTable, TemplateManager } from "../components/system/forms/index.js";
import { acdmApi } from '../services/acdmApi';

export function FormulariosSection() {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTemplateId, setActiveTemplateId] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});

  useEffect(() => {
    loadTemplates();
    loadSubmissions();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await acdmApi.getFormTemplates();
      setTemplates(response.data || []);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Error al cargar plantillas');
    }
  };

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const response = await acdmApi.getFormSubmissions({
        templateId: activeTemplateId,
        page: 1,
        limit: 50
      });
      setSubmissions(response.data?.items || []);
    } catch (err) {
      console.error('Error loading submissions:', err);
      setError('Error al cargar registros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTemplateId) {
      loadSubmissions();
    }
  }, [activeTemplateId]);

  const handleDeleteSubmission = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;

    try {
      await acdmApi.deleteFormSubmission(id);
      await loadSubmissions();
      alert('Registro eliminado exitosamente');
    } catch (err) {
      console.error('Error deleting submission:', err);
      alert('Error al eliminar registro');
    }
  };

  const dataSource = {
    getSuggestions: async (source, query) => {
      try {
        return await acdmApi.getFormSuggestions(source, query);
      } catch (err) {
        console.error('Error getting suggestions:', err);
        return [];
      }
    },
    bulkCreateSubmissions: async (data) => {
      return await acdmApi.bulkCreateFormSubmissions(data);
    },
    deleteTemplate: async (id) => {
      const result = await acdmApi.deleteFormTemplate(id);
      await loadTemplates(); // Refresh templates after deletion
      return result;
    }
  };

  const notify = (message) => {
    alert(message);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-16">
        <div>
          <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Formularios</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Gestión de plantillas y registros de formularios</p>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Plantillas
        </button>
        <button
          className={`tab ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
        >
          Registros ({submissions.length})
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'templates' && (
          <TemplateManager
            templates={templates}
            activeTemplateId={activeTemplateId}
            setActiveTemplateId={setActiveTemplateId}
            dataSource={dataSource}
            notify={notify}
          />
        )}

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
      </div>
    </div>
  );
}
