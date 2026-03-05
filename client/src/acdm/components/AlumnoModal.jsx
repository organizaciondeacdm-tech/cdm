import { useState } from "react";

// ============================================================
// ALUMNO FORM MODAL
// ============================================================
export function AlumnoModal({ alumno, isNew, onSave, onClose }) {
    const [form, setForm] = useState(alumno || { id: `a${Date.now()}`, gradoSalaAnio: "", nombre: "", diagnostico: "", observaciones: "" });
    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <div className="modal-title">{isNew ? "➕ Nuevo Alumno" : "✏️ Editar Alumno"}</div>
                    <button className="btn-icon" onClick={onClose}>✕</button>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Grado / Sala / Año</label>
                        <input className="form-input" value={form.gradoSalaAnio} onChange={e => setForm({ ...form, gradoSalaAnio: e.target.value })} placeholder="Ej: 3° Grado" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Alumno (Apellido, Nombre)</label>
                        <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Apellido, Nombre" />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Diagnóstico</label>
                    <input className="form-input" value={form.diagnostico} onChange={e => setForm({ ...form, diagnostico: e.target.value })} placeholder="Ej: TEA Nivel 1, TDAH..." />
                </div>
                <div className="form-group">
                    <label className="form-label">Observaciones</label>
                    <textarea className="form-textarea" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} placeholder="Observaciones adicionales..." />
                </div>
                <div className="flex gap-8 justify-end mt-16">
                    <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn btn-primary" onClick={() => { onSave(form); onClose(); }}>Guardar</button>
                </div>
            </div>
        </div>
    );
}
