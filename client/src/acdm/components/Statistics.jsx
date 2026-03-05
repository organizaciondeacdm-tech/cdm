import { AlertPanel } from "./AlertPanel.jsx";

// ============================================================
// STATISTICS
// ============================================================
export function Statistics({ escuelas, onNavigate }) {
    // Validar que escuelas exista y sea un array
    if (!escuelas || !Array.isArray(escuelas)) {
        return (
            <div className="statistics-container">
                <p className="error-message">No hay datos disponibles</p>
            </div>
        );
    }

    const totalEsc = escuelas.length;
    const totalAlumnos = escuelas.reduce((a, e) => a + (e.alumnos?.length || 0), 0);
    const totalDocentes = escuelas.reduce((a, e) => a + (e.docentes?.length || 0), 0);
    const docentesLicencia = escuelas.reduce((a, e) => a + (e.docentes?.filter(d => d.estado === "Licencia")?.length || 0), 0);
    const docentesActivos = totalDocentes - docentesLicencia;
    const sinAcdm = escuelas.filter(e => (e.docentes?.length || 0) === 0).length;
    const totalSuplentes = escuelas.reduce((a, e) => a + (e.docentes?.reduce((b, d) => b + (d.suplentes?.length || 0), 0) || 0), 0);

    const byNivel = {};
    escuelas.forEach(e => { byNivel[e.nivel] = (byNivel[e.nivel] || 0) + 1; });
    const byDE = {};
    escuelas.forEach(e => { byDE[e.de] = (byDE[e.de] || 0) + 1; });

    const maxByNivel = Math.max(...Object.values(byNivel), 0);
    const colors = ["#00d4ff", "#00ff88", "#ffd700", "#ff6b35", "#ff4757"];

    // Mapeo de tarjetas a navegación
    const statCardActions = {
        "Escuelas": () => onNavigate && onNavigate("escuelas"),
        "Alumnos": () => onNavigate && onNavigate("escuelas"),
        "ACDM Activos": () => onNavigate && onNavigate("alertas"),
        "En Licencia": () => onNavigate && onNavigate("alertas"),
        "Suplentes": () => onNavigate && onNavigate("escuelas"),
        "Sin ACDM": () => onNavigate && onNavigate("alertas"),
    };

    return (
        <div>
            <div className="stats-grid mb-24">
                {[
                    { val: totalEsc, label: "Escuelas", icon: "🏫", color: "linear-gradient(90deg, #00d4ff, #0099cc)" },
                    { val: totalAlumnos, label: "Alumnos", icon: "👨‍🎓", color: "linear-gradient(90deg, #00ff88, #00cc66)" },
                    { val: docentesActivos, label: "ACDM Activos", icon: "✅", color: "linear-gradient(90deg, #00ff88, #00cc66)" },
                    { val: docentesLicencia, label: "En Licencia", icon: "🔴", color: "linear-gradient(90deg, #ff4757, #cc2233)" },
                    { val: totalSuplentes, label: "Suplentes", icon: "↔", color: "linear-gradient(90deg, #ffa502, #cc8800)" },
                    { val: sinAcdm, label: "Sin ACDM", icon: "⚠️", color: "linear-gradient(90deg, #ff6b35, #cc4400)" },
                ].map((s, i) => (
                    <div
                        key={i}
                        className="stat-card"
                        style={{ "--gradient": s.color, cursor: "pointer" }}
                        onClick={statCardActions[s.label]}
                        title={`Ir a ${s.label}`}
                    >
                        <div className="stat-icon">{s.icon}</div>
                        <div className="stat-value">{s.val}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            <div className="card-grid">
                <div className="card" style={{ cursor: "pointer" }} onClick={() => onNavigate && onNavigate("escuelas")}>
                    <div className="card-header"><span className="card-title">Distribución por Nivel</span></div>
                    <div className="chart-bar-wrap">
                        {Object.entries(byNivel).map(([nivel, count], i) => (
                            <div key={nivel} className="chart-bar-row" style={{ opacity: 0.9 }}>
                                <div className="chart-bar-label">{nivel}</div>
                                <div className="chart-bar-bg">
                                    <div className="chart-bar-fill" style={{ width: `${(count / maxByNivel) * 100}%`, background: colors[i % colors.length] }}>{count}</div>
                                </div>
                                <div className="chart-val">{count}</div>
                            </div>
                        ))}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12, textAlign: 'center', fontStyle: 'italic' }}>Click para ver escuelas por nivel</p>
                </div>

                <div className="card" style={{ cursor: "pointer" }} onClick={() => onNavigate && onNavigate("alertas")}>
                    <div className="card-header"><span className="card-title">Estado ACDM</span></div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40, padding: '20px 0' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 48, fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--accent3)' }}>{docentesActivos}</div>
                            <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1 }}>Activos</div>
                        </div>
                        <div style={{ fontSize: 32, color: 'var(--border2)' }}>VS</div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 48, fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--red)' }}>{docentesLicencia}</div>
                            <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 1 }}>En Licencia</div>
                        </div>
                    </div>
                    {totalDocentes > 0 && (
                        <div style={{ background: 'var(--bg2)', borderRadius: 10, height: 16, overflow: 'hidden', marginTop: 8 }}>
                            <div style={{ height: '100%', width: `${(docentesActivos / totalDocentes) * 100}%`, background: 'linear-gradient(90deg, var(--accent3), var(--accent))', borderRadius: 10, transition: 'width 1s ease' }}></div>
                        </div>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12, textAlign: 'center', fontStyle: 'italic' }}>Click para ver detalle de licencias</p>
                </div>

                <div className="card" style={{ cursor: "pointer" }} onClick={() => onNavigate && onNavigate("escuelas")}>
                    <div className="card-header"><span className="card-title">Por Distrito Escolar</span></div>
                    <div className="chart-bar-wrap">
                        {Object.entries(byDE).map(([de, count], i) => (
                            <div key={de} className="chart-bar-row" style={{ opacity: 0.9 }}>
                                <div className="chart-bar-label">{de}</div>
                                <div className="chart-bar-bg">
                                    <div className="chart-bar-fill" style={{ width: `${(count / Math.max(...Object.values(byDE))) * 100}%`, background: colors[i % colors.length] }}>{count}</div>
                                </div>
                                <div className="chart-val">{count}</div>
                            </div>
                        ))}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12, textAlign: 'center', fontStyle: 'italic' }}>Click para ver escuelas por distrito</p>
                </div>

                <div className="card">
                    <div className="card-header"><span className="card-title">Alertas de Licencias</span></div>
                    <AlertPanel escuelas={escuelas} />
                </div>
            </div>
        </div>
    );
}
