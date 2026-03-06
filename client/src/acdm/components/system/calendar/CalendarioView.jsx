import { useMemo, useState } from "react";
import { diasRestantes, getDaysInMonth, getFirstDayOfMonth, formatDate } from "../../../utils/dateUtils.js";

// ============================================================
// CALENDARIO VIEW - Conectado a API
// ============================================================
export function CalendarioView({ escuelas }) {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth());
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedEscuela, setSelectedEscuela] = useState("");
    const [selectedDocente, setSelectedDocente] = useState("");
    const [periodoInicio, setPeriodoInicio] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [periodoFin, setPeriodoFin] = useState(new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]);

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const normalizeDateKey = (value) => {
        if (!value) return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return date.toISOString().split("T")[0];
    };
    const firstDate = periodoInicio && periodoFin && periodoInicio > periodoFin ? periodoFin : periodoInicio;
    const lastDate = periodoInicio && periodoFin && periodoInicio > periodoFin ? periodoInicio : periodoFin;
    const startBound = firstDate || "0000-01-01";
    const endBound = lastDate || "9999-12-31";
    const hasInvalidRange = Boolean(periodoInicio && periodoFin && periodoInicio > periodoFin);

    function navCal(d) {
        let m = month + d; let y = year;
        if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
        setMonth(m); setYear(y);
    }

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const escuelasFiltradas = useMemo(() => (
        selectedEscuela
            ? escuelas.filter((escuela) => escuela.id === selectedEscuela)
            : escuelas
    ), [escuelas, selectedEscuela]);

    const docenteOptions = useMemo(() => {
        const map = new Map();
        escuelasFiltradas.forEach((escuela) => {
            (escuela.docentes || []).forEach((docente) => {
                if (!docente?.id) return;
                map.set(docente.id, {
                    id: docente.id,
                    nombreApellido: docente.nombreApellido || "Sin nombre",
                    escuela: escuela.escuela,
                    de: escuela.de
                });
            });
        });
        return Array.from(map.values()).sort((a, b) => a.nombreApellido.localeCompare(b.nombreApellido, "es"));
    }, [escuelasFiltradas]);

    const licencias = useMemo(() => {
        const items = [];
        escuelasFiltradas.forEach((escuela) => {
            (escuela.docentes || []).forEach((docente) => {
                const inicio = normalizeDateKey(docente.fechaInicioLicencia);
                const fin = normalizeDateKey(docente.fechaFinLicencia || docente.fechaInicioLicencia);
                if (!inicio || !fin) return;
                if (selectedDocente && docente.id !== selectedDocente) return;
                if (fin < startBound || inicio > endBound) return;
                items.push({
                    type: "licencia",
                    id: `${escuela.id}-${docente.id}-${inicio}-${fin}`,
                    docenteId: docente.id,
                    docente: docente.nombreApellido || "Sin nombre",
                    escuelaId: escuela.id,
                    escuela: escuela.escuela,
                    de: escuela.de,
                    motivo: docente.motivo || "-",
                    inicio,
                    fin,
                    diasRestantes: diasRestantes(fin)
                });
            });
        });
        return items.sort((a, b) => `${a.inicio}-${a.docente}`.localeCompare(`${b.inicio}-${b.docente}`, "es"));
    }, [escuelasFiltradas, selectedDocente, startBound, endBound]);

    const getEventsForDay = (day) => {
        const dateKey = normalizeDateKey(new Date(year, month, day));
        if (!dateKey) return [];
        if (dateKey < startBound || dateKey > endBound) return [];
        return licencias.filter((licencia) => licencia.inicio <= dateKey && licencia.fin >= dateKey);
    };

    const dayEvents = selectedDay ? getEventsForDay(selectedDay) : [];
    const today = new Date();

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const monthStart = normalizeDateKey(new Date(year, month, 1));
    const monthEnd = normalizeDateKey(new Date(year, month, daysInMonth));
    const monthLicencias = licencias.filter((licencia) => licencia.fin >= monthStart && licencia.inicio <= monthEnd);

    return (
        <div>
            <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2, marginBottom: 24 }}>Calendario de Licencias</h1>

            <div className="flex gap-16 mb-24" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                    <label className="form-label">Filtrar por Escuela</label>
                    <select
                        className="form-select"
                        value={selectedEscuela}
                        onChange={e => setSelectedEscuela(e.target.value)}
                        style={{ minWidth: 300 }}
                    >
                        <option value="">Todas las escuelas</option>
                        {escuelas.map(esc => (
                            <option key={esc.id} value={esc.id}>
                                {esc.escuela} ({esc.de})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="form-label">Filtrar por Docente</label>
                    <select
                        className="form-select"
                        value={selectedDocente}
                        onChange={e => setSelectedDocente(e.target.value)}
                        style={{ minWidth: 320 }}
                    >
                        <option value="">Todos los docentes</option>
                        {docenteOptions.map((docente) => (
                            <option key={docente.id} value={docente.id}>
                                {docente.nombreApellido} - {docente.escuela} ({docente.de})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="form-label">Desde</label>
                    <input
                        type="date"
                        className="form-input"
                        value={periodoInicio}
                        onChange={e => setPeriodoInicio(e.target.value)}
                        style={{ minWidth: 200 }}
                    />
                </div>

                <div>
                    <label className="form-label">Hasta</label>
                    <input
                        type="date"
                        className="form-input"
                        value={periodoFin}
                        onChange={e => setPeriodoFin(e.target.value)}
                        style={{ minWidth: 200 }}
                    />
                </div>

                <button
                    className="btn btn-secondary"
                    onClick={() => {
                        const ahora = new Date();
                        setPeriodoInicio(new Date(ahora.getFullYear(), 0, 1).toISOString().split('T')[0]);
                        setPeriodoFin(new Date(ahora.getFullYear(), 11, 31).toISOString().split('T')[0]);
                    }}
                    style={{ padding: '10px 16px' }}
                >
                    🔄 Este Año
                </button>
            </div>

            {hasInvalidRange && (
                <div className="alert alert-warning" style={{ marginBottom: 24 }}>
                    <span>⚠️</span>
                    El rango se normalizó automáticamente (Desde mayor que Hasta).
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
                <div className="card">
                    <div className="flex items-center justify-between mb-16">
                        <button className="btn btn-secondary" onClick={() => navCal(-1)}>◀ Anterior</button>
                        <div style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>{monthNames[month]} {year}</div>
                        <button className="btn btn-secondary" onClick={() => navCal(1)}>Siguiente ▶</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                        {dayNames.map(n => (
                            <div key={n} style={{ textAlign: 'center', padding: '8px 4px', fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{n}</div>
                        ))}
                        {cells.map((d, i) => {
                            const events = d ? getEventsForDay(d) : [];
                            const isToday = d && today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
                            const isSelected = d === selectedDay;
                            return (
                                <div key={i} onClick={() => d && setSelectedDay(d)} style={{
                                    minHeight: 60, padding: '6px 8px', borderRadius: 8, cursor: d ? 'pointer' : 'default',
                                    background: isSelected ? 'rgba(0,212,255,0.15)' : isToday ? 'rgba(0,212,255,0.08)' : events.length > 0 ? 'rgba(255,71,87,0.08)' : 'var(--card2)',
                                    border: isSelected ? '1px solid var(--accent)' : isToday ? '1px solid rgba(0,212,255,0.4)' : '1px solid transparent',
                                    transition: 'all 0.15s',
                                }}>
                                    {d && <>
                                        <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--accent)' : 'var(--text)' }}>{d}</div>
                                        {events.slice(0, 2).map((ev, j) => (
                                            <div key={j} style={{ fontSize: 9, background: 'rgba(255,71,87,0.3)', color: 'var(--red)', borderRadius: 3, padding: '1px 4px', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🔴</div>
                                        ))}
                                        {events.length > 2 && <div style={{ fontSize: 9, color: 'var(--text3)' }}>+{events.length - 2}</div>}
                                    </>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div>
                    {selectedDay ? (
                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">{selectedDay} de {monthNames[month]}</span>
                                <button className="btn-icon" onClick={() => setSelectedDay(null)}>✕</button>
                            </div>
                            {dayEvents.length === 0 ? (
                                <div style={{ color: 'var(--text3)', fontSize: 13, padding: '20px 0' }}>Sin eventos para este día</div>
                            ) : (
                                dayEvents.map((ev, i) => (
                                    <div key={i} className="alert alert-danger" style={{ marginBottom: 8 }}>
                                        <span>🔴</span>
                                        <div style={{ flex: 1 }}>
                                            <strong>{ev.docente}</strong><br />
                                            <span style={{ fontSize: 12 }}>{ev.escuela} ({ev.de})</span><br />
                                            <span style={{ fontSize: 11, opacity: 0.8 }}>{ev.motivo}</span>
                                            <span style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginTop: 4 }}>
                                                {formatDate(ev.inicio)} → {formatDate(ev.fin)}
                                            </span>
                                            <span style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginTop: 2 }}>
                                                ⏱ {ev.diasRestantes} día(s) restante(s)
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="card">
                            <div className="card-header"><span className="card-title">📋 Licencias del Mes</span></div>
                            {monthLicencias.length === 0 ? (
                                <div className="no-data">Sin licencias registradas</div>
                            ) : (
                                monthLicencias.map((d, i) => (
                                    <div key={i} className="docente-row" style={{ marginBottom: 8, cursor: 'pointer', padding: 8, borderRadius: 4, transition: 'all 0.2s', ':hover': { background: 'var(--border)' } }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700 }}>{d.docente}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{d.escuela} ({d.de})</div>
                                        <div style={{ fontSize: 11, color: 'var(--yellow)', marginTop: 2 }}>{d.motivo}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                                            {formatDate(d.inicio)} → {formatDate(d.fin)}
                                        </div>
                                        <div style={{ fontSize: 10, color: 'var(--accent3)', marginTop: 4, fontWeight: 700 }}>
                                            ⏱ {d.diasRestantes} día(s)
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
