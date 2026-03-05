import { useState } from "react";
import { diasRestantes, formatDate } from "../utils/dateUtils.js";
import { MiniCalendar } from "./MiniCalendar.jsx";
import { DaysRemaining } from "./DaysRemaining.jsx";

// ============================================================
// SCHOOL DETAIL VIEW
// ============================================================
export function EscuelaDetail({ esc, onEdit, onDelete, onAddDocente, onEditDocente, onDeleteDocente, onAddAlumno, onEditAlumno, onDeleteAlumno, viewMode, isAdmin }) {
    const [expanded, setExpanded] = useState(false);
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [calMonth, setCalMonth] = useState(new Date().getMonth());
    const [activeTab, setActiveTab] = useState("docentes");

    function navCal(d) {
        let m = calMonth + d; let y = calYear;
        if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
        setCalMonth(m); setCalYear(y);
    }

    const hasAlerts = esc.docentes.length === 0 || esc.docentes.some(d => d.estado === "Licencia" && d.fechaFinLicencia && diasRestantes(d.fechaFinLicencia) <= 10);

    const openMaps = (e) => {
        e.stopPropagation();
        const q = esc.lat && esc.lng ? `${esc.lat},${esc.lng}` : encodeURIComponent(esc.direccion);
        window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
    };

    const openMail = (mailAddr, e) => {
        e.stopPropagation();
        const subject = encodeURIComponent(`Sistema ACDM - ${esc.escuela}`);
        window.open(`mailto:${mailAddr}?subject=${subject}`, "_blank");
    };

    if (viewMode === "compact") {
        return (
            <div className="school-card">
                <div className="school-card-header" onClick={() => setExpanded(!expanded)}>
                    <div className="flex items-center justify-between flex-wrap gap-8">
                        <div>
                            <div className="school-de">{esc.de}</div>
                            <div className="school-name">{esc.escuela}</div>
                            <div className="school-meta">
                                <span className="school-meta-item">📍 {esc.direccion}</span>
                                <span className="school-meta-item">📚 {esc.nivel}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            {hasAlerts && <span style={{ animation: 'pulse 1s infinite', fontSize: 18 }}>⚠️</span>}
                            <span style={{ color: 'var(--text3)', fontSize: 20 }}>{expanded ? "▲" : "▼"}</span>
                        </div>
                    </div>

                    {/* Compact view: show titular, suplente, motivo */}
                    <div style={{ marginTop: 12 }}>
                        {esc.docentes.length === 0 ? (
                            <span className="badge badge-danger">SIN ACDM ASIGNADO</span>
                        ) : esc.docentes.map(doc => (
                            <div key={doc.id} style={{ marginBottom: 8 }}>
                                <div className="flex items-center gap-8 flex-wrap">
                                    <span className={`badge badge-${doc.cargo.toLowerCase()}`}>{doc.cargo}</span>
                                    <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 15 }}>{doc.nombreApellido}</span>
                                    <span className={`badge badge-${doc.estado === "Activo" ? "active" : "licencia"}`}>{doc.estado}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text3)', background: 'rgba(0,100,200,0.1)', padding: '2px 8px', borderRadius: '4px' }}>📅 {doc.jornada || "N/D"}</span>
                                    {doc.estado === "Licencia" && <span style={{ fontSize: 12, color: 'var(--text2)' }}>{doc.motivo}</span>}
                                    {doc.estado === "Licencia" && <DaysRemaining fechaFin={doc.fechaFinLicencia} />}
                                </div>
                                {doc.suplentes.map(s => (
                                    <div key={s.id} className="flex items-center gap-8 flex-wrap" style={{ marginLeft: 20, marginTop: 4 }}>
                                        <span style={{ color: 'var(--yellow)', fontSize: 12 }}>↳</span>
                                        <span className="badge badge-suplente">{s.cargo}</span>
                                        <span style={{ fontSize: 13, color: 'var(--text2)' }}>{s.nombreApellido}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text3)', background: 'rgba(0,100,200,0.1)', padding: '2px 8px', borderRadius: '4px' }}>📅 {s.jornada || "N/D"}</span>
                                        {doc.estado === "Licencia" && doc.fechaInicioLicencia && (
                                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>desde {formatDate(doc.fechaInicioLicencia)}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {expanded && <EscuelaExpandida esc={esc} onEdit={onEdit} onDelete={onDelete} onAddDocente={onAddDocente} onEditDocente={onEditDocente} onDeleteDocente={onDeleteDocente} onAddAlumno={onAddAlumno} onEditAlumno={onEditAlumno} onDeleteAlumno={onDeleteAlumno} calYear={calYear} calMonth={calMonth} navCal={navCal} activeTab={activeTab} setActiveTab={setActiveTab} openMaps={openMaps} openMail={openMail} isAdmin={isAdmin} />}
            </div>
        );
    }

    return (
        <div className="school-card">
            <div className="school-card-header" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-center justify-between flex-wrap gap-8">
                    <div>
                        <div className="school-de">{esc.de}</div>
                        <div className="school-name">{esc.escuela}</div>
                    </div>
                    <div className="flex items-center gap-8">
                        {hasAlerts && <span style={{ animation: 'pulse 1s infinite', fontSize: 18 }}>⚠️</span>}
                        <span style={{ color: 'var(--text3)', fontSize: 20 }}>{expanded ? "▲" : "▼"}</span>
                    </div>
                </div>
                <div className="school-meta">
                    <span className="school-meta-item">📚 {esc.nivel}</span>
                    <span className="school-meta-item">⏱ {esc.jornada}</span>
                    <span className="school-meta-item">🌅 {esc.turno}</span>
                    <span className="school-meta-item clickable" onClick={openMaps}>📍 {esc.direccion}</span>
                    {esc.telefonos.map((t, i) => <span key={i} className="school-meta-item">📞 {t}</span>)}
                    <span className="school-meta-item link" onClick={(e) => openMail(esc.mail, e)}>✉️ {esc.mail}</span>
                </div>
            </div>
            {expanded && <EscuelaExpandida esc={esc} onEdit={onEdit} onDelete={onDelete} onAddDocente={onAddDocente} onEditDocente={onEditDocente} onDeleteDocente={onDeleteDocente} onAddAlumno={onAddAlumno} onEditAlumno={onEditAlumno} onDeleteAlumno={onDeleteAlumno} calYear={calYear} calMonth={calMonth} navCal={navCal} activeTab={activeTab} setActiveTab={setActiveTab} openMaps={openMaps} openMail={openMail} isAdmin={isAdmin} />}
        </div>
    );
}

function EscuelaExpandida({ esc, onEdit, onDelete, onAddDocente, onEditDocente, onDeleteDocente, onAddAlumno, onEditAlumno, onDeleteAlumno, calYear, calMonth, navCal, activeTab, setActiveTab, openMaps, openMail, isAdmin }) {
    return (
        <div className="school-card-body" style={{ animation: 'slideIn 0.2s ease' }}>
            <div className="flex items-center justify-between mb-16">
                <div className="view-toggle">
                    <button className={`view-btn ${activeTab === "docentes" ? "active" : ""}`} onClick={() => setActiveTab("docentes")}>👨‍🏫 Docentes</button>
                    <button className={`view-btn ${activeTab === "alumnos" ? "active" : ""}`} onClick={() => setActiveTab("alumnos")}>👨‍🎓 Alumnos</button>
                    <button className={`view-btn ${activeTab === "info" ? "active" : ""}`} onClick={() => setActiveTab("info")}>ℹ️ Info</button>
                </div>
                <div className="flex gap-8">
                    {isAdmin && <button className="btn btn-secondary btn-sm" onClick={onEdit}>✏️ Editar</button>}
                    {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => { if (confirm("¿Está seguro de eliminar esta escuela?")) onDelete(); }}>🗑️ Eliminar</button>}
                    {isAdmin && activeTab === "docentes" && <button className="btn btn-primary btn-sm" onClick={() => onAddDocente(esc.id)}>+ ACDM</button>}
                    {isAdmin && activeTab === "alumnos" && <button className="btn btn-primary btn-sm" onClick={() => onAddAlumno(esc.id)}>+ Alumno</button>}
                </div>
            </div>

            {activeTab === "docentes" && (
                <div>
                    {esc.docentes.length === 0 && <div className="no-data">⚠️ Sin docentes asignados</div>}
                    {esc.docentes.map(doc => (
                        <div key={doc.id}>
                            <div className="docente-row">
                                <div className="docente-header">
                                    <span className={`badge badge-${doc.cargo.toLowerCase()}`}>{doc.cargo}</span>
                                    <span className="docente-name">{doc.nombreApellido}</span>
                                    <span className={`badge badge-${doc.estado === "Activo" ? "active" : "licencia"}`}>{doc.estado}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text3)', background: 'rgba(0,100,200,0.1)', padding: '2px 8px', borderRadius: '4px' }}>📅 {doc.jornada || "N/D"}</span>
                                    {doc.estado === "Licencia" && <DaysRemaining fechaFin={doc.fechaFinLicencia} />}
                                    {isAdmin && (
                                        <div className="flex gap-4" style={{ marginLeft: 'auto' }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => onEditDocente(esc.id, doc)}>✏️</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => onDeleteDocente(esc.id, doc.id)}>🗑️</button>
                                            {doc.cargo === "Titular" && <button className="btn btn-secondary btn-sm" onClick={() => onAddDocente(esc.id, doc.id)}>+ Suplente</button>}
                                        </div>
                                    )}
                                </div>
                                {doc.estado === "Licencia" && (
                                    <div className="docente-details mt-8">
                                        <div className="detail-item"><div className="detail-label">Motivo</div><div className="detail-val">{doc.motivo}</div></div>
                                        <div className="detail-item"><div className="detail-label">Días Autorizados</div><div className="detail-val">{doc.diasAutorizados} días</div></div>
                                        <div className="detail-item"><div className="detail-label">Inicio</div><div className="detail-val">{formatDate(doc.fechaInicioLicencia)}</div></div>
                                        <div className="detail-item"><div className="detail-label">Fin</div><div className="detail-val">{formatDate(doc.fechaFinLicencia)}</div></div>
                                    </div>
                                )}
                                {doc.estado === "Licencia" && (doc.fechaInicioLicencia || doc.fechaFinLicencia) && (
                                    <div className="mt-8">
                                        <MiniCalendar year={calYear} month={calMonth} rangeStart={doc.fechaInicioLicencia} rangeEnd={doc.fechaFinLicencia} onNavigate={navCal} />
                                    </div>
                                )}
                            </div>
                            {doc.suplentes && doc.suplentes.map(s => (
                                <div key={s.id} className="docente-row suplente-row">
                                    <div className="docente-header">
                                        <span style={{ fontSize: 12, color: 'var(--yellow)' }}>↳ Cubre a: <strong>{doc.nombreApellido}</strong></span>
                                        <span className={`badge badge-${s.cargo.toLowerCase()}`}>{s.cargo}</span>
                                        <span className="docente-name">{s.nombreApellido}</span>
                                        <span className={`badge badge-${s.estado === "Activo" ? "active" : "licencia"}`}>{s.estado}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text3)', background: 'rgba(0,100,200,0.1)', padding: '2px 8px', borderRadius: '4px' }}>📅 {s.jornada || "N/D"}</span>
                                        {s.fechaIngreso && <span style={{ fontSize: 11, color: 'var(--text3)' }}>desde {formatDate(s.fechaIngreso)}</span>}
                                        {isAdmin && (
                                            <div className="flex gap-4" style={{ marginLeft: 'auto' }}>
                                                <button className="btn btn-secondary btn-sm" onClick={() => onEditDocente(esc.id, s, doc.id)}>✏️</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => onDeleteDocente(esc.id, s.id, doc.id)}>🗑️</button>
                                            </div>
                                        )}
                                    </div>
                                    {s.motivo && s.motivo !== "-" && (
                                        <div className="detail-item mt-8"><div className="detail-label">Motivo</div><div className="detail-val">{s.motivo}</div></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {activeTab === "alumnos" && (
                <div className="table-wrap">
                    {esc.alumnos.length === 0 ? <div className="no-data">Sin alumnos registrados</div> : (
                        <table>
                            <thead><tr><th>Grado/Sala</th><th>Alumno</th><th>Diagnóstico</th><th>Observaciones</th>{isAdmin && <th>Acciones</th>}</tr></thead>
                            <tbody>
                                {esc.alumnos.map(a => (
                                    <tr key={a.id}>
                                        <td><span className="badge badge-info" style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent)', border: '1px solid rgba(0,212,255,0.2)' }}>{a.gradoSalaAnio}</span></td>
                                        <td style={{ fontWeight: 600 }}>{a.nombre}</td>
                                        <td><span style={{ color: 'var(--yellow)', fontSize: 12 }}>{a.diagnostico}</span></td>
                                        <td style={{ color: 'var(--text2)', fontSize: 12, maxWidth: 200 }}>{a.observaciones}</td>
                                        {isAdmin && <td><div className="flex gap-4">
                                            <button className="btn btn-secondary btn-sm" onClick={() => onEditAlumno(esc.id, a)}>✏️</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => onDeleteAlumno(esc.id, a.id)}>🗑️</button>
                                        </div></td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === "info" && (
                <div className="school-info-grid">
                    <div>
                        <div className="school-info-label">Dirección</div>
                        <div className="school-info-val link" onClick={openMaps}>📍 {esc.direccion}</div>
                    </div>
                    <div>
                        <div className="school-info-label">Mail</div>
                        <div className="school-info-val link" onClick={(e) => openMail(esc.mail, e)}>✉️ {esc.mail}</div>
                    </div>
                    <div>
                        <div className="school-info-label">Teléfonos</div>
                        <div className="school-info-val">{esc.telefonos.join(" | ")}</div>
                    </div>
                    <div>
                        <div className="school-info-label">Jornada / Turno</div>
                        <div className="school-info-val">{esc.jornada} — {esc.turno}</div>
                    </div>
                    <div>
                        <div className="school-info-label">Nivel</div>
                        <div className="school-info-val">{esc.nivel}</div>
                    </div>
                    <div>
                        <div className="school-info-label">Distrito Escolar</div>
                        <div className="school-info-val">{esc.de}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
