import { useEffect, useState } from "react";
import { DevAutofillButton } from "./DevAutofillButton";
import { useDevAutofill } from "../../../hooks/useDevAutofill";

const buildDefaultProyecto = () => ({
    nombre: "",
    descripcion: "",
    estado: "Completado",
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaBaja: ""
});

// ============================================================
// PROYECTO FORM MODAL
// ============================================================
export function ProyectoModal({ proyecto, isNew, onSave, onClose, escuelas, escuelaId, isDeveloper }) {
    const [form, setForm] = useState(proyecto || buildDefaultProyecto());
    const [selectedEscuela, setSelectedEscuela] = useState(escuelaId || "");
    const [saving, setSaving] = useState(false);
    const { getProyecto } = useDevAutofill();
    const lockEscuelaSelection = !isNew && Boolean(escuelaId);

    useEffect(() => {
        setForm(proyecto || buildDefaultProyecto());
        setSelectedEscuela(escuelaId || "");
    }, [proyecto, escuelaId]);

    const handleSubmit = async () => {
        const escId = selectedEscuela || escuelaId;
        if (!escId) {
            alert("Debe seleccionar una escuela");
            return;
        }
        if (!String(form?.nombre || "").trim()) {
            alert("El nombre del proyecto es obligatorio");
            return;
        }

        setSaving(true);
        try {
            await onSave(form, escId);
            onClose();
        } catch (error) {
            alert(error?.message || "No se pudo guardar el proyecto");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <div className="modal-title">
                        {isNew ? "➕ Nuevo Proyecto" : "✏️ Editar Proyecto"}
                        {isDeveloper && <DevAutofillButton onFill={() => setForm(f => ({ ...f, ...getProyecto() }))} />}
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
                        <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 6 }}>Para cambiar de escuela, elimine y vuelva a crear el proyecto.</p>
                    )}
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
                    <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
                </div>
            </div>
        </div>
    );
}
