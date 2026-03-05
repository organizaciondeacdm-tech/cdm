import { useState } from "react";
import { diasRestantes, getDaysInMonth, getFirstDayOfMonth, formatDate } from "../utils/dateUtils.js";

// ============================================================
// CALENDARIO VIEW - Conectado a API
// ============================================================
export function CalendarioView({ escuelas }) {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth());
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedEscuela, setSelectedEscuela] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [periodoInicio, setPeriodoInicio] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [periodoFin, setPeriodoFin] = useState(new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]);

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    function navCal(d) {
        let m = month + d; let y = year;
        if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
        setMonth(m); setYear(y);
    }

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    // Obtener datos filtrados según la escuela seleccionada
    const dataToUse = selectedEscuela
        ? escuelas.filter(e => e.id === selectedEscuela)
        : escuelas;

    // Filtrar licencias por período
    function isLicenciaInPeriodo(licencia) {
        if (!licencia.fechaInicioLicencia || !licencia.fechaFinLicencia) return false;
        const inicio = new Date(licencia.fechaInicioLicencia);
        const fin = new Date(licencia.fechaFinLicencia);
        const periodoStart = new Date(periodoInicio);
        const periodoEnd = new Date(periodoFin);
        // La licencia se superpone con el período si: inicio <= fin del período Y fin >= inicio del período
        return inicio <= periodoEnd && fin >= periodoStart;
    }

    // Get events per day
    function getEventsForDay(d) {
        const date = new Date(year, month, d);
        const events = [];
        dataToUse.forEach(esc => {
            (esc.docentes || []).forEach(doc => {
                if (doc.fechaInicioLicencia && doc.fechaFinLicencia && isLicenciaInPeriodo(doc)) {
                    const s = new Date(doc.fechaInicioLicencia);
                    const e = new Date(doc.fechaFinLicencia);
                    if (date >= s && date <= e) {
                        events.push({
                            type: "licencia",
                            id: doc.id,
                            name: doc.nombreApellido,
                            esc: esc.escuela,
                            escId: esc.id,
                            docId: doc.id,
                            motivo: doc.motivo,
                            estado: doc.estado,
                            diasRestantes: diasRestantes(doc.fechaFinLicencia)
                        });
                    }
                }
            });
        });
        return events;
    }

    const dayEvents = selectedDay ? getEventsForDay(selectedDay) : [];
    const today = new Date();

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    // Obtener licencias del mes actual filtrando por período
    const monthLicencias = dataToUse.flatMap(esc =>
        (esc.docentes || [])
            .filter(d => {
                if (!d.fechaInicioLicencia) return false;
                const s = new Date(d.fechaInicioLicencia);
                const e = d.fechaFinLicencia ? new Date(d.fechaFinLicencia) : s;
                const monthMatch = s.getMonth() <= month && e.getMonth() >= month &&
                    s.getFullYear() <= year && e.getFullYear() >= year;
                return monthMatch && isLicenciaInPeriodo(d);
            })
            .map(d => ({
                ...d,
                esc: esc.escuela,
                escId: esc.id
            }))
    );

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
                    <label className="form-label">Período Inicio</label>
                    <input
                        type="date"
                        className="form-input"
                        value={periodoInicio}
                        onChange={e => setPeriodoInicio(e.target.value)}
                        style={{ minWidth: 200 }}
                    />
                </div>

                <div>
                    <label className="form-label">Período Fin</label>
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

            {error && <div className="alert alert-danger" style={{ marginBottom: 24 }}>{error}</div>}

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
                            {loading ? (
                                <div style={{ color: 'var(--text2)', padding: '20px', textAlign: 'center' }}>Cargando...</div>
                            ) : dayEvents.length === 0 ? (
                                <div style={{ color: 'var(--text3)', fontSize: 13, padding: '20px 0' }}>Sin eventos para este día</div>
                            ) : (
                                dayEvents.map((ev, i) => (
                                    <div key={i} className="alert alert-danger" style={{ marginBottom: 8 }}>
                                        <span>🔴</span>
                                        <div style={{ flex: 1 }}>
                                            <strong>{ev.name}</strong><br />
                                            <span style={{ fontSize: 12 }}>{ev.esc}</span><br />
                                            <span style={{ fontSize: 11, opacity: 0.8 }}>{ev.motivo}</span>
                                            <span style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginTop: 4 }}>
                                                📅 {ev.diasRestantes} día(s) restante(s)
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="card">
                            <div className="card-header"><span className="card-title">📋 Licencias del Mes</span></div>
                            {loading ? (
                                <div style={{ color: 'var(--text2)', padding: '20px', textAlign: 'center' }}>Cargando...</div>
                            ) : monthLicencias.length === 0 ? (
                                <div className="no-data">Sin licencias registradas</div>
                            ) : (
                                monthLicencias.map((d, i) => (
                                    <div key={i} className="docente-row" style={{ marginBottom: 8, cursor: 'pointer', padding: 8, borderRadius: 4, transition: 'all 0.2s', ':hover': { background: 'var(--border)' } }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700 }}>{d.nombreApellido}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{d.esc}</div>
                                        <div style={{ fontSize: 11, color: 'var(--yellow)', marginTop: 2 }}>{d.motivo}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                                            {formatDate(d.fechaInicioLicencia)} → {formatDate(d.fechaFinLicencia)}
                                        </div>
                                        <div style={{ fontSize: 10, color: 'var(--accent3)', marginTop: 4, fontWeight: 700 }}>
                                            ⏱ {diasRestantes(d.fechaFinLicencia)} día(s)
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
