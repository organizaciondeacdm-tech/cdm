import { useEffect, useState } from "react";
import { DevAutofillButton } from "./DevAutofillButton";
import { useDevAutofill } from "../../../hooks/useDevAutofill";

// ============================================================
// VISITA FORM MODAL
// ============================================================
export function VisitaModal({ visita, isNew, onSave, onClose, escuelas, escuelaId, isDeveloper }) {
    const [form, setForm] = useState(visita || { fecha: new Date().toISOString().split('T')[0], observaciones: "" });
    const [selectedEscuela, setSelectedEscuela] = useState(escuelaId || "");
    const [saving, setSaving] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const { getVisita } = useDevAutofill();
    const lockEscuelaSelection = !isNew && Boolean(escuelaId);

    useEffect(() => {
        setForm(visita || { fecha: new Date().toISOString().split('T')[0], observaciones: "" });
        setSelectedEscuela(escuelaId || "");
        setSubmitError("");
    }, [visita, escuelaId]);

    const handleSubmit = async () => {
        const escId = selectedEscuela || escuelaId;
        if (!escId) {
            setSubmitError("Debe seleccionar una escuela.");
            return;
        }
        if (!String(form?.fecha || "").trim()) {
            setSubmitError("La fecha de visita es obligatoria.");
            return;
        }

        setSaving(true);
        setSubmitError("");
        try {
            await onSave(form, escId);
            onClose();
        } catch (error) {
            setSubmitError(error?.message || "No se pudo guardar la visita");
        } finally {
            setSaving(false);
        }
    };

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
                    <select
                        className="form-select"
                        value={selectedEscuela}
                        onChange={e => setSelectedEscuela(e.target.value)}
                        disabled={lockEscuelaSelection}
                    >
                        <option value="">Seleccionar escuela...</option>
                        {escuelas.map(esc => (
                            <option key={esc.id} value={esc.id}>{esc.escuela} ({esc.de})</option>
                        ))}
                    </select>
                    {lockEscuelaSelection && (
                        <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 6 }}>Para cambiar de escuela, elimine y vuelva a crear la visita.</p>
                    )}
                </div>
                <div className="form-group">
                    <label className="form-label">Fecha de Visita</label>
                    <input type="date" className="form-input" value={form.fecha || ""} onChange={e => setForm({ ...form, fecha: e.target.value })} disabled={saving} />
                </div>
                <div className="form-group">
                    <label className="form-label">Observaciones</label>
                    <textarea className="form-textarea" rows="5" value={form.observaciones || ""} onChange={e => setForm({ ...form, observaciones: e.target.value })} placeholder="Detalle de la visita..." disabled={saving} />
                </div>
                {submitError && (
                    <div className="alert alert-danger" style={{ marginTop: 8, marginBottom: 8 }}>
                        <span>⚠️</span>
                        {submitError}
                    </div>
                )}
                <div className="flex gap-8 justify-end mt-16">
                    <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
                </div>
            </div>
        </div>
    );
}
