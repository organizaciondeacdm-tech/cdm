import { useState } from "react";

// ============================================================
// SCHOOL FORM MODAL
// ============================================================
export function EscuelaModal({ escuela, isNew, onSave, onClose }) {
    const [form, setForm] = useState(escuela || {
        id: `e${Date.now()}`, de: "", escuela: "", nivel: "Primario",
        direccion: "", lat: null, lng: null, telefonos: [""], mail: "",
        jornada: "Completa", turno: "Mañana", alumnos: [], docentes: []
    });
    const [saving, setSaving] = useState(false);
    const [submitError, setSubmitError] = useState("");

    function setPhone(i, val) {
        const t = [...form.telefonos]; t[i] = val; setForm({ ...form, telefonos: t });
    }

    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        setSubmitError("");
        try {
            await onSave(form);
            onClose();
        } catch (error) {
            setSubmitError(error?.message || "No se pudo guardar la escuela");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <div className="modal-title">{isNew ? "➕ Nueva Escuela" : "✏️ Editar Escuela"}</div>
                    <button className="btn-icon" onClick={onClose}>✕</button>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Distrito Escolar (DE)</label>
                        <input className="form-input" value={form.de} onChange={e => setForm({ ...form, de: e.target.value })} placeholder="Ej: DE 01" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Nivel</label>
                        <select className="form-select" value={form.nivel} onChange={e => setForm({ ...form, nivel: e.target.value })}>
                            <option>Inicial</option><option>Primario</option><option>Secundario</option><option>Especial</option>
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Nombre de la Escuela</label>
                    <input className="form-input" value={form.escuela} onChange={e => setForm({ ...form, escuela: e.target.value })} placeholder="Ej: Escuela N°1 ..." />
                </div>
                <div className="form-group">
                    <label className="form-label">Dirección</label>
                    <input className="form-input" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Calle, número, localidad" />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Latitud (opcional)</label>
                        <input type="number" className="form-input" value={form.lat || ""} onChange={e => setForm({ ...form, lat: parseFloat(e.target.value) })} placeholder="-34.603" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Longitud (opcional)</label>
                        <input type="number" className="form-input" value={form.lng || ""} onChange={e => setForm({ ...form, lng: parseFloat(e.target.value) })} placeholder="-58.381" />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Mail Institucional</label>
                    <input type="email" className="form-input" value={form.mail} onChange={e => setForm({ ...form, mail: e.target.value })} placeholder="escuela@bue.edu.ar" />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Jornada</label>
                        <select className="form-select" value={form.jornada} onChange={e => setForm({ ...form, jornada: e.target.value })}>
                            <option>Simple</option><option>Completa</option><option>Extendida</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Turno</label>
                        <select className="form-select" value={form.turno} onChange={e => setForm({ ...form, turno: e.target.value })}>
                            <option>Mañana</option><option>Tarde</option><option>Vespertino</option><option>Completa</option><option>Noche</option>
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Teléfonos</label>
                    {form.telefonos.map((t, i) => (
                        <div key={i} className="flex gap-8 mb-8">
                            <input className="form-input" value={t} onChange={e => setPhone(i, e.target.value)} placeholder="011-XXXX-XXXX" />
                            {form.telefonos.length > 1 && <button className="btn btn-danger btn-sm" onClick={() => setForm({ ...form, telefonos: form.telefonos.filter((_, j) => j !== i) })}>✕</button>}
                        </div>
                    ))}
                    <button className="btn btn-secondary btn-sm" onClick={() => setForm({ ...form, telefonos: [...form.telefonos, ""] })}>+ Agregar teléfono</button>
                </div>
                {submitError && (
                    <div className="alert alert-danger" style={{ marginTop: 8, marginBottom: 8 }}>
                        <span>⚠️</span>
                        {submitError}
                    </div>
                )}
                <div className="flex gap-8 justify-end mt-16">
                    <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? "Guardando..." : "Guardar"}
                    </button>
                </div>
            </div>
        </div>
    );
}
