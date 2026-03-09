// ============================================================
// VISITA FORM MODAL
// ============================================================
import { useState } from "react";

export function VisitaModal({ visitaModal, onClose, onSave, escuelas }) {
  if (!visitaModal) return null;

  const { isNew, data, escuelaId } = visitaModal;
  const [form, setForm] = useState(data || {
    id: Math.random().toString(36).substr(2, 9),
    fecha: new Date().toISOString().split('T')[0],
    observaciones: '',
  });
  const [selectedEscuela, setSelectedEscuela] = useState(escuelaId || "");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSubmitError("");
    try {
      await onSave(form, selectedEscuela || escuelaId);
      onClose();
    } catch (error) {
      setSubmitError(error?.message || "Error al guardar la visita");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isNew ? "➕ Nueva Visita" : "✏️ Editar Visita"}</div>
          <button className="btn-icon" onClick={onClose} disabled={saving}>✕</button>
        </div>

        <div className="form-group">
          <label className="form-label">Escuela</label>
          <select
            className="form-select"
            value={selectedEscuela}
            onChange={(e) => setSelectedEscuela(e.target.value)}
            disabled={saving || (!isNew && !!escuelaId)}
          >
            <option value="">Seleccionar escuela...</option>
            {escuelas.map(esc => (
              <option key={esc.id} value={esc.id}>
                {esc.escuela} ({esc.de})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Fecha de Visita</label>
          <input
            type="date"
            className="form-input"
            value={form.fecha || ""}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            disabled={saving}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Observaciones</label>
          <textarea
            className="form-textarea"
            rows="5"
            value={form.observaciones || ""}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            placeholder="Detalle de la visita..."
            disabled={saving}
          />
        </div>

        {submitError && (
          <div className="alert alert-danger" style={{ marginTop: 8, marginBottom: 8 }}>
            <span>⚠️</span>
            {submitError}
          </div>
        )}

        <div className="flex gap-8 justify-end mt-16">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROYECTO FORM MODAL
// ============================================================
export function ProyectoModal({ proyectoModal, onClose, onSave, escuelas }) {
  if (!proyectoModal) return null;

  const { isNew, data, escuelaId } = proyectoModal;
  const [form, setForm] = useState(data || {
    id: Math.random().toString(36).substr(2, 9),
    nombre: '',
    descripcion: '',
    estado: 'En Progreso',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaBaja: '',
  });
  const [selectedEscuela, setSelectedEscuela] = useState(escuelaId || "");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSubmitError("");
    try {
      await onSave(form, selectedEscuela || escuelaId);
      onClose();
    } catch (error) {
      setSubmitError(error?.message || "Error al guardar el proyecto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isNew ? "➕ Nuevo Proyecto" : "✏️ Editar Proyecto"}</div>
          <button className="btn-icon" onClick={onClose} disabled={saving}>✕</button>
        </div>

        <div className="form-group">
          <label className="form-label">Escuela</label>
          <select
            className="form-select"
            value={selectedEscuela}
            onChange={(e) => setSelectedEscuela(e.target.value)}
            disabled={saving || (!isNew && !!escuelaId)}
          >
            <option value="">Seleccionar escuela...</option>
            {escuelas.map(esc => (
              <option key={esc.id} value={esc.id}>
                {esc.escuela} ({esc.de})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Nombre del Proyecto</label>
          <input
            className="form-input"
            value={form.nombre || ""}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Adaptación de material didáctico"
            disabled={saving}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Descripción</label>
          <textarea
            className="form-textarea"
            rows="4"
            value={form.descripcion || ""}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Detalle del proyecto..."
            disabled={saving}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select
              className="form-select"
              value={form.estado || "En Progreso"}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              disabled={saving}
            >
              <option>En Progreso</option>
              <option>Completado</option>
              <option>Pausado</option>
              <option>Cancelado</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Fecha Inicio</label>
            <input
              type="date"
              className="form-input"
              value={form.fechaInicio || ""}
              onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
              disabled={saving}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Fecha Finalización</label>
            <input
              type="date"
              className="form-input"
              value={form.fechaBaja || ""}
              onChange={(e) => setForm({ ...form, fechaBaja: e.target.value })}
              disabled={saving}
            />
          </div>
        </div>

        {submitError && (
          <div className="alert alert-danger" style={{ marginTop: 8, marginBottom: 8 }}>
            <span>⚠️</span>
            {submitError}
          </div>
        )}

        <div className="flex gap-8 justify-end mt-16">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INFORME FORM MODAL
// ============================================================
export function InformeModal({ informeModal, onClose, onSave, escuelas }) {
  if (!informeModal) return null;

  const { isNew, data, escuelaId } = informeModal;
  const [form, setForm] = useState(data || {
    id: Math.random().toString(36).substr(2, 9),
    titulo: '',
    estado: 'Pendiente',
    fechaEntrega: '',
    observaciones: '',
  });
  const [selectedEscuela, setSelectedEscuela] = useState(escuelaId || "");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSubmitError("");
    try {
      await onSave(form, selectedEscuela || escuelaId);
      onClose();
    } catch (error) {
      setSubmitError(error?.message || "Error al guardar el informe");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isNew ? "➕ Nuevo Informe" : "✏️ Editar Informe"}</div>
          <button className="btn-icon" onClick={onClose} disabled={saving}>✕</button>
        </div>

        <div className="form-group">
          <label className="form-label">Escuela</label>
          <select
            className="form-select"
            value={selectedEscuela}
            onChange={(e) => setSelectedEscuela(e.target.value)}
            disabled={saving || (!isNew && !!escuelaId)}
          >
            <option value="">Seleccionar escuela...</option>
            {escuelas.map(esc => (
              <option key={esc.id} value={esc.id}>
                {esc.escuela} ({esc.de})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Título del Informe</label>
          <input
            className="form-input"
            value={form.titulo || ""}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Ej: Informe mensual enero"
            disabled={saving}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Estado</label>
          <select
            className="form-select"
            value={form.estado || "Pendiente"}
            onChange={(e) => setForm({ ...form, estado: e.target.value })}
            disabled={saving}
          >
            <option>Pendiente</option>
            <option>En Progreso</option>
            <option>Entregado</option>
            <option>Aprobado</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Fecha de Entrega</label>
          <input
            type="date"
            className="form-input"
            value={form.fechaEntrega || ""}
            onChange={(e) => setForm({ ...form, fechaEntrega: e.target.value })}
            disabled={saving}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Observaciones</label>
          <textarea
            className="form-textarea"
            rows="5"
            value={form.observaciones || ""}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            placeholder="Detalles del informe..."
            disabled={saving}
          />
        </div>

        {submitError && (
          <div className="alert alert-danger" style={{ marginTop: 8, marginBottom: 8 }}>
            <span>⚠️</span>
            {submitError}
          </div>
        )}

        <div className="flex gap-8 justify-end mt-16">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CITA FORM MODAL
// ============================================================
export function CitaModal({ citaModal, onClose, onSave, escuelas, visitas }) {
  if (!citaModal) return null;

  const { isNew, data, escuelaId } = citaModal;
  const [form, setForm] = useState(data || {
    id: Math.random().toString(36).substr(2, 9),
    titulo: '',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    hora: '',
    participantes: '',
    visitaId: '',
  });
  const [selectedEscuela, setSelectedEscuela] = useState(escuelaId || "");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSubmitError("");
    try {
      await onSave(form, selectedEscuela || escuelaId);
      onClose();
    } catch (error) {
      setSubmitError(error?.message || "Error al guardar la cita");
    } finally {
      setSaving(false);
    }
  };

  const filteredVisitas = visitas?.filter(v => v.escuelaId === (selectedEscuela || escuelaId)) || [];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{isNew ? "➕ Nueva Cita/Reunión" : "✏️ Editar Cita/Reunión"}</div>
          <button className="btn-icon" onClick={onClose} disabled={saving}>✕</button>
        </div>

        <div className="form-group">
          <label className="form-label">Escuela</label>
          <select
            className="form-select"
            value={selectedEscuela}
            onChange={(e) => setSelectedEscuela(e.target.value)}
            disabled={saving || (!isNew && !!escuelaId)}
          >
            <option value="">Seleccionar escuela...</option>
            {escuelas.map(esc => (
              <option key={esc.id} value={esc.id}>
                {esc.escuela} ({esc.de})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Título de la Cita</label>
          <input
            className="form-input"
            value={form.titulo || ""}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Reunión de seguimiento"
            disabled={saving}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Fecha</label>
            <input
              type="date"
              className="form-input"
              value={form.fecha || ""}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              disabled={saving}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Hora</label>
            <input
              type="time"
              className="form-input"
              value={form.hora || ""}
              onChange={(e) => setForm({ ...form, hora: e.target.value })}
              disabled={saving}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Participantes</label>
          <input
            className="form-input"
            value={form.participantes || ""}
            onChange={(e) => setForm({ ...form, participantes: e.target.value })}
            placeholder="Director, ACDM, Supervisor..."
            disabled={saving}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Vincular con Visita (opcional)</label>
          <select
            className="form-select"
            value={form.visitaId || ""}
            onChange={(e) => setForm({ ...form, visitaId: e.target.value })}
            disabled={saving}
          >
            <option value="">Sin vincular</option>
            {filteredVisitas.map(vis => (
              <option key={vis.id} value={vis.id}>
                {vis.fecha} - {vis.observaciones || 'Visita'}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Descripción</label>
          <textarea
            className="form-textarea"
            rows="3"
            value={form.descripcion || ""}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Detalles de la reunión..."
            disabled={saving}
          />
        </div>

        {submitError && (
          <div className="alert alert-danger" style={{ marginTop: 8, marginBottom: 8 }}>
            <span>⚠️</span>
            {submitError}
          </div>
        )}

        <div className="flex gap-8 justify-end mt-16">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
