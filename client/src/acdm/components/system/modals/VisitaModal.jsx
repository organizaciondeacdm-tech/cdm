import { useState } from "react";
import { DevAutofillButton } from "./DevAutofillButton";
import { useDevAutofill } from "../../../hooks/useDevAutofill";

// ============================================================
// VISITA FORM MODAL
// ============================================================
export function VisitaModal({ visita, isNew, onSave, onClose, escuelas, escuelaId, isDeveloper }) {
    const [form, setForm] = useState(visita || { id: `v${Date.now()}`, fecha: new Date().toISOString().split('T')[0], observaciones: "" });
    const [selectedEscuela, setSelectedEscuela] = useState(escuelaId || "");
    const { getVisita } = useDevAutofill();
    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <div className="modal-title">
                        {isNew ? "➕ Nueva Visita" : "✏️ Editar Visita"}
                        {isDeveloper && <DevAutofillButton onFill={() => setForm(f => ({ ...f, ...getVisita() }))} />}
                    </div>
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
                    <label className="form-label">Fecha de Visita</label>
                    <input type="date" className="form-input" value={form.fecha || ""} onChange={e => setForm({ ...form, fecha: e.target.value })} />
                </div>
                <div className="form-group">
                    <label className="form-label">Observaciones</label>
                    <textarea className="form-textarea" rows="5" value={form.observaciones || ""} onChange={e => setForm({ ...form, observaciones: e.target.value })} placeholder="Detalle de la visita..." />
                </div>
                <div className="flex gap-8 justify-end mt-16">
                    <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn btn-primary" onClick={() => { onSave(form, selectedEscuela || escuelaId); onClose(); }}>Guardar</button>
                </div>
            </div>
        </div>
    );
}
