import { useState } from 'react';

export function TemplateManager({ templates, activeTemplateId, setActiveTemplateId, dataSource, notify }) {
  const [bulkText, setBulkText] = useState('');

  const uploadBulk = async () => {
    try {
      const parsed = JSON.parse(bulkText || '[]');
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Pegá un arreglo JSON de submissions');
      }
      const response = await dataSource.bulkCreateSubmissions(parsed);
      notify(`Carga masiva completada: ${response.inserted || 0} registros`);
      setBulkText('');
    } catch (error) {
      notify(error.message);
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    
    try {
      await dataSource.deleteTemplate(templateId);
      notify('Plantilla eliminada exitosamente');
      // Refresh is handled by dataSource.deleteTemplate
      if (activeTemplateId === templateId) {
        setActiveTemplateId(null);
      }
    } catch (error) {
      notify('Error al eliminar plantilla: ' + error.message);
    }
  };

  return (
    <section className="card">
      <h2>Plantillas</h2>
      <div style={{ marginBottom: '16px' }}>
        <select 
          value={activeTemplateId || ''} 
          onChange={(event) => setActiveTemplateId(event.target.value)}
          style={{ marginRight: '8px' }}
        >
          <option value="">Seleccionar plantilla...</option>
          {templates.map((template) => (
            <option key={template._id} value={template._id}>{template.name}</option>
          ))}
        </select>
        {activeTemplateId && (
          <button 
            type="button" 
            onClick={() => deleteTemplate(activeTemplateId)}
            style={{ background: 'var(--red)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
          >
            🗑️ Eliminar
          </button>
        )}
      </div>

      <h3>Carga masiva JSON</h3>
      <textarea
        rows={6}
        value={bulkText}
        placeholder='[{"templateId":"...","templateName":"...","payload":{"escuela":"..."}}]'
        onChange={(event) => setBulkText(event.target.value)}
      />
      <button type="button" onClick={uploadBulk}>Procesar lote</button>
    </section>
  );
}
