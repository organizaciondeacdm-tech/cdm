import { useState } from "react";

// ============================================================
// INFORME FORM MODAL
// ============================================================
export function InformeModal({ informe, isNew, onSave, onClose, escuelas, escuelaId }) {
    const [form, setForm] = useState(informe || { id: `i${Date.now()}`, titulo: "", estado: "Pendiente", fechaEntrega: "", observaciones: "" });
    const [selectedEscuela, setSelectedEscuela] = useState(escuelaId || "");
    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <div className="modal-title">{isNew ? "➕ Nuevo Informe" : "✏️ Editar Informe"}</div>
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
                    <label className="form-label">Título del Informe</label>
                    <input className="form-input" value={form.titulo || ""} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Informe mensual enero" />
                </div>
                <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-select" value={form.estado || "Pendiente"} onChange={e => setForm({ ...form, estado: e.target.value })}>
                        <option>Pendiente</option>
                        <option>En Progreso</option>
                        <option>Entregado</option>
                        <option>Aprobado</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Fecha de Entrega</label>
                    <input type="date" className="form-input" value={form.fechaEntrega || ""} onChange={e => setForm({ ...form, fechaEntrega: e.target.value })} />
                </div>
                <div className="form-group">
                    <label className="form-label">Observaciones</label>
                    <textarea className="form-textarea" rows="5" value={form.observaciones || ""} onChange={e => setForm({ ...form, observaciones: e.target.value })} placeholder="Detalles del informe..." />
                </div>
                <div className="flex gap-8 justify-end mt-16">
                    <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn btn-primary" onClick={() => { onSave(form, selectedEscuela || escuelaId); onClose(); }}>Guardar</button>
                </div>
            </div>
        </div>
    );
}
