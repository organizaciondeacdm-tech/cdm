import { useState } from "react";

// ============================================================
// PROYECTO FORM MODAL
// ============================================================
export function ProyectoModal({ proyecto, isNew, onSave, onClose, escuelas, escuelaId }) {
    const [form, setForm] = useState(proyecto || { id: `p${Date.now()}`, nombre: "", descripcion: "", estado: "En Progreso", fechaInicio: new Date().toISOString().split('T')[0], fechaBaja: "" });
    const [selectedEscuela, setSelectedEscuela] = useState(escuelaId || "");
    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <div className="modal-title">{isNew ? "➕ Nuevo Proyecto" : "✏️ Editar Proyecto"}</div>
                    <button className="btn-icon" onClick={onClose}>✕</button>
                </div>
                <div className="form-group">
                    <label className="form-label">Escuela</label>
                    <select className="form-select" value={selectedEscuela} onChange={e => setSelectedEscuela(e.target.value)}>
                        <option value="">Seleccionar escuela...</option>
                        {escuelas.map(esc => (
                            <option key={esc.id} value={esc.id}>{esc.escuela} ({esc.de})</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Nombre del Proyecto</label>
                    <input className="form-input" value={form.nombre || ""} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Adaptación de material didáctico" />
                </div>
                <div className="form-group">
                    <label className="form-label">Descripción</label>
                    <textarea className="form-textarea" rows="4" value={form.descripcion || ""} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Detalle del proyecto..." />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Estado</label>
                        <select className="form-select" value={form.estado || "En Progreso"} onChange={e => setForm({ ...form, estado: e.target.value })}>
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
                        <input type="date" className="form-input" value={form.fechaInicio || ""} onChange={e => setForm({ ...form, fechaInicio: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Fecha Finalización</label>
                        <input type="date" className="form-input" value={form.fechaBaja || ""} onChange={e => setForm({ ...form, fechaBaja: e.target.value })} />
                    </div>
                </div>
                <div className="flex gap-8 justify-end mt-16">
                    <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn btn-primary" onClick={() => { onSave(form, selectedEscuela || escuelaId); onClose(); }}>Guardar</button>
                </div>
            </div>
        </div>
    );
}
