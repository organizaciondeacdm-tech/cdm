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

  return (
    <section className="card">
      <h2>Plantillas</h2>
      <select value={activeTemplateId || ''} onChange={(event) => setActiveTemplateId(event.target.value)}>
        {templates.map((template) => (
          <option key={template._id} value={template._id}>{template.name}</option>
        ))}
      </select>

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
