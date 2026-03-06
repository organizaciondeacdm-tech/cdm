import { useEffect, useState } from "react";
import { MiniCalendar } from "../calendar/MiniCalendar.jsx";
import { DevAutofillButton } from "./DevAutofillButton";
import { useDevAutofill } from "../../../hooks/useDevAutofill";

// ============================================================
// DOCENTE FORM MODAL
// ============================================================
export function DocenteModal({ docente, titularId, isNew, onSave, onClose, isDeveloper }) {
    const { getDocente } = useDevAutofill();
    const buildDefaultDocente = () => ({
        cargo: titularId ? "Suplente" : "Titular",
        nombreApellido: "",
        estado: "Activo",
        motivo: "-",
        motivoPersonalizado: "",
        diasAutorizados: 0,
        fechaInicioLicencia: null,
        fechaFinLicencia: null,
        suplentes: [],
        jornada: "Completa"
    });
    const [form, setForm] = useState(() => isNew
        ? buildDefaultDocente()
        : {
            ...docente,
            suplentes: docente?.suplentes || []
        });

    const MOTIVOS = ["-", "Art. 101 - Enfermedad", "Art. 102 - Familiar enfermo", "Art. 103 - Maternidad", "Art. 104 - Accidente de trabajo", "Art. 108 - Gremial", "Art. 115 - Estudio", "Art. 140 - Concurso", "Otro"];

    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [calMonth, setCalMonth] = useState(new Date().getMonth());

    function navCal(d) {
        let m = calMonth + d; let y = calYear;
        if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
        setCalMonth(m); setCalYear(y);
    }

    const [saving, setSaving] = useState(false);
    const [submitError, setSubmitError] = useState("");

    useEffect(() => {
        setForm(isNew
            ? buildDefaultDocente()
            : {
                ...docente,
                suplentes: docente?.suplentes || []
            });
    }, [docente, isNew, titularId]);

    const handleSave = async () => {
        if (saving) return;
        const nombreApellido = String(form?.nombreApellido || "").trim();
        if (!nombreApellido) {
            setSubmitError("El nombre y apellido del docente es obligatorio.");
            return;
        }
        if (form.estado === "Licencia") {
            if (!form.fechaInicioLicencia || !form.fechaFinLicencia) {
                setSubmitError("Debe completar fecha de inicio y fin de licencia.");
                return;
            }
            const inicio = new Date(form.fechaInicioLicencia);
            const fin = new Date(form.fechaFinLicencia);
            if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin < inicio) {
                setSubmitError("El rango de licencia no es válido.");
                return;
            }
        }

        setSaving(true);
        setSubmitError("");
        try {
            const normalized = form.estado === "Licencia"
                ? form
                : {
                    ...form,
                    motivo: "-",
                    motivoPersonalizado: "",
                    diasAutorizados: 0,
                    fechaInicioLicencia: null,
                    fechaFinLicencia: null
                };
            await onSave(normalized);
            onClose();
        } catch (error) {
            setSubmitError(error?.message || "Error al guardar el docente");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <div className="modal-title">
                        {isNew ? "➕ Nuevo ACDM" : "✏️ Editar ACDM"}
                        {isDeveloper && <DevAutofillButton onFill={() => setForm(f => ({ ...f, ...getDocente() }))} />}
                    </div>
                    <button className="btn-icon" onClick={onClose} disabled={saving}>✕</button>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Rol ACDM</label>
                        <select className="form-select" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} disabled={saving}>
                            <option>Titular</option><option>Suplente</option><option>Interino</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Jornada</label>
                        <select className="form-select" value={form.jornada} onChange={e => setForm({ ...form, jornada: e.target.value })} disabled={saving}>
                            <option>Simple</option><option>Completa</option><option>Extendida</option>
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Nombre y Apellido</label>
                    <input className="form-input" value={form.nombreApellido} onChange={e => setForm({ ...form, nombreApellido: e.target.value })} placeholder="Apellido, Nombre" disabled={saving} />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Estado</label>
                        <select className="form-select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} disabled={saving}>
                            <option>Activo</option><option>Licencia</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Motivo (Art.)</label>
                        <select className="form-select" value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} disabled={saving}>
                            {MOTIVOS.map(m => <option key={m}>{m}</option>)}
                        </select>
                        {form.motivo === "Otro" && (
                            <input type="text" className="form-input" style={{ marginTop: 8 }} value={form.motivoPersonalizado} onChange={e => setForm({ ...form, motivoPersonalizado: e.target.value })} placeholder="Especificar artículo (ej: Art. 150 - Nombre del motivo)" disabled={saving} />
                        )}
                    </div>
                </div>
                {form.estado === "Licencia" && (
                    <>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Días Autorizados</label>
                                <input type="number" className="form-input" value={form.diasAutorizados} onChange={e => setForm({ ...form, diasAutorizados: Number(e.target.value) })} disabled={saving} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Fecha Inicio Licencia</label>
                                <input type="date" className="form-input" value={form.fechaInicioLicencia || ""} onChange={e => setForm({ ...form, fechaInicioLicencia: e.target.value })} disabled={saving} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Fecha Fin Licencia</label>
                                <input type="date" className="form-input" value={form.fechaFinLicencia || ""} onChange={e => setForm({ ...form, fechaFinLicencia: e.target.value })} disabled={saving} />
                            </div>
                        </div>
                        {(form.fechaInicioLicencia || form.fechaFinLicencia) && (
                            <div className="mb-16">
                                <MiniCalendar year={calYear} month={calMonth} rangeStart={form.fechaInicioLicencia} rangeEnd={form.fechaFinLicencia} onNavigate={navCal} />
                            </div>
                        )}
                    </>
                )}
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
