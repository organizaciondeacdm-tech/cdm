import { useEffect, useState } from "react";
import { DevAutofillButton } from "./DevAutofillButton";
import { useDevAutofill } from "../../../hooks/useDevAutofill";

// ============================================================
// ALUMNO FORM MODAL
// ============================================================
export function AlumnoModal({ alumno, isNew, onSave, onClose, isDeveloper }) {
    const { getAlumno } = useDevAutofill();
    const buildDefaultAlumno = () => ({ gradoSalaAnio: "", nombre: "", diagnostico: "", observaciones: "" });
    const [form, setForm] = useState(alumno || buildDefaultAlumno());
    const [saving, setSaving] = useState(false);
    const [submitError, setSubmitError] = useState("");

    useEffect(() => {
        setForm(alumno || buildDefaultAlumno());
    }, [alumno, isNew]);

    const handleSave = async () => {
        if (saving) return;
        if (!String(form?.nombre || "").trim()) {
            setSubmitError("El nombre del alumno es obligatorio.");
            return;
        }
        setSaving(true);
        setSubmitError("");
        try {
            await onSave(form);
            onClose();
        } catch (error) {
            setSubmitError(error?.message || "Error al guardar el alumno");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <div className="modal-title">
                        {isNew ? "➕ Nuevo Alumno" : "✏️ Editar Alumno"}
                        {isDeveloper && <DevAutofillButton onFill={() => setForm(f => ({ ...f, ...getAlumno() }))} />}
                    </div>
                    <button className="btn-icon" onClick={onClose} disabled={saving}>✕</button>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Grado / Sala / Año</label>
                        <input className="form-input" value={form.gradoSalaAnio} onChange={e => setForm({ ...form, gradoSalaAnio: e.target.value })} placeholder="Ej: 3° Grado" disabled={saving} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Alumno (Apellido, Nombre)</label>
                        <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Apellido, Nombre" disabled={saving} />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Diagnóstico</label>
                    <input className="form-input" value={form.diagnostico} onChange={e => setForm({ ...form, diagnostico: e.target.value })} placeholder="Ej: TEA Nivel 1, TDAH..." disabled={saving} />
                </div>
                <div className="form-group">
                    <label className="form-label">Observaciones</label>
                    <textarea className="form-textarea" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} placeholder="Observaciones adicionales..." disabled={saving} />
                </div>
                {submitError && (
                    <div className="alert alert-danger" style={{ marginTop: 8, marginBottom: 8 }}>
                        <span>⚠️</span>
                        {submitError}
                    </div>
                )}
                <div className="flex gap-8 justify-end mt-16">
                    <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
                </div>
            </div>
        </div>
    );
}
