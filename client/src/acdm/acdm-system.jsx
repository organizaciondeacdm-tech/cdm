import { useState, useEffect } from "react";
import apiService from "./services/acdmApi.js";
import { Sidebar } from "./acdm-system-sidebar.jsx";
import { UserMenu } from "./components/UserMenu.jsx";
import STYLES from "./styles/styles.jsx";
import { diasRestantes, formatDate, getDaysInMonth, getFirstDayOfMonth } from "./utils/dateUtils.js";
import { MiniCalendar } from "./components/MiniCalendar.jsx";
import { DaysRemaining } from "./components/DaysRemaining.jsx";
import { AlumnoModal } from "./components/AlumnoModal.jsx";
import { DocenteModal } from "./components/DocenteModal.jsx";
import { EscuelaModal } from "./components/EscuelaModal.jsx";
import { VisitaModal } from "./components/VisitaModal.jsx";
import { ProyectoModal } from "./components/ProyectoModal.jsx";
import { InformeModal } from "./components/InformeModal.jsx";
import { useAcdmData as useAcdmMongoData } from "./hooks/useAcdmData.js";

// ============================================================
// ALERT PANEL
// ============================================================
function AlertPanel({ escuelas }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [selectedForEmail, setSelectedForEmail] = useState(new Set());
  const [emailData, setEmailData] = useState({ to: "", subject: "", message: "" });
  const [sendingEmail, setSendingEmail] = useState(false);

  // Función para reproducir sonido de alerta
  const playAlertSound = () => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(500, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.log("Audio no disponible");
    }
  };

  // Función para enviar email
  const sendAlertEmail = async () => {
    if (!emailData.to) {
      alert("Por favor ingresa un email");
      return;
    }
    setSendingEmail(true);
    const selectedAlerts = alerts.filter(a => selectedForEmail.has(alerts.indexOf(a)));
    try {
      const response = await fetch("/api/send-alert-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailData.to,
          subject: emailData.subject || "Alertas del Sistema ACDM",
          alerts: selectedAlerts.map(a => ({ title: a.title, desc: a.desc, severity: a.type })),
          message: emailData.message,
          timestamp: new Date().toLocaleString('es-AR')
        })
      });
      const result = await response.json();
      if (result.success) {
        alert("✅ Alertas enviadas por email");
        setSelectedForEmail(new Set());
        setEmailData({ to: "", subject: "", message: "" });
        setShowEmailForm(false);
      }
    } catch (error) {
      alert("❌ Error: " + error.message);
    }
    setSendingEmail(false);
  };

  const alerts = [];

  escuelas.forEach(esc => {
    // Schools without ACDM
    if (esc.docentes.length === 0) {
      alerts.push({ type: "danger", icon: "🏫", title: `Sin ACDM asignado`, desc: `${esc.escuela} (${esc.de}) no tiene docente asignado.`, school: esc.escuela });
    }
    esc.docentes.forEach(doc => {
      if (doc.estado === "Licencia" && doc.fechaFinLicencia) {
        const dias = diasRestantes(doc.fechaFinLicencia);
        if (dias <= 0) {
          alerts.push({ type: "danger", icon: "⛔", title: "Licencia VENCIDA", desc: `${doc.nombreApellido} — ${esc.escuela}. ${doc.motivo}. Vencida el ${formatDate(doc.fechaFinLicencia)}`, school: esc.escuela });
          playAlertSound();
        } else if (dias <= 5) {
          alerts.push({ type: "danger", icon: "🔴", title: `Licencia por vencer (${dias} días)`, desc: `${doc.nombreApellido} — ${esc.escuela}. ${doc.motivo}. Vence ${formatDate(doc.fechaFinLicencia)}`, school: esc.escuela });
        } else if (dias <= 10) {
          alerts.push({ type: "warning", icon: "⚠️", title: `Licencia próxima a vencer (${dias} días)`, desc: `${doc.nombreApellido} — ${esc.escuela}. Vence ${formatDate(doc.fechaFinLicencia)}`, school: esc.escuela });
        }
      }
    });
    // Schools without students
    if (esc.alumnos.length === 0 && esc.docentes.length > 0) {
      alerts.push({ type: "info", icon: "👤", title: "Sin alumnos registrados", desc: `${esc.escuela} no tiene alumnos cargados en el sistema.`, school: esc.escuela });
    }
  });

  if (alerts.length === 0) return (
    <div className="alert alert-success"><span className="alert-icon">✅</span><div><strong>Sin alertas activas</strong><br /><span style={{ fontSize: 12 }}>Todas las licencias y asignaciones están en orden.</span></div></div>
  );

  return (
    <div>
      {/* Controles */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          style={{ padding: '6px 12px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border)', background: soundEnabled ? 'var(--accent)' : 'transparent', color: soundEnabled ? '#000' : 'var(--text2)', cursor: 'pointer', fontWeight: 500 }}
        >
          {soundEnabled ? '🔊' : '🔇'} Sonido
        </button>
        <button
          onClick={() => setShowEmailForm(!showEmailForm)}
          style={{ padding: '6px 12px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border)', background: showEmailForm ? 'var(--accent)' : 'transparent', color: showEmailForm ? '#000' : 'var(--text2)', cursor: 'pointer', fontWeight: 500 }}
        >
          📧 Enviar Email
        </button>
      </div>

      {/* Formulario de Email */}
      {showEmailForm && (
        <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 6, marginBottom: 16 }}>
          <input
            type="email"
            placeholder="correo@ejemplo.com"
            value={emailData.to}
            onChange={e => setEmailData({ ...emailData, to: e.target.value })}
            style={{ width: '100%', padding: '6px 12px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg1)', marginBottom: 8 }}
          />
          <textarea
            placeholder="Mensaje (opcional)"
            value={emailData.message}
            onChange={e => setEmailData({ ...emailData, message: e.target.value })}
            style={{ width: '100%', height: 60, padding: '6px 12px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg1)', marginBottom: 8, resize: 'vertical' }}
          />
          <button
            onClick={sendAlertEmail}
            disabled={sendingEmail}
            style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: '#0088ff', color: '#fff', cursor: 'pointer', fontWeight: 500, opacity: sendingEmail ? 0.6 : 1 }}
          >
            {sendingEmail ? '⏳ Enviando...' : '✓ Enviar'}
          </button>
          <button
            onClick={() => setShowEmailForm(false)}
            style={{ marginLeft: 8, padding: '6px 12px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Alertas */}
      {alerts.map((a, i) => (
        <div key={i} className={`alert alert-${a.type}`} style={{ marginBottom: 12 }}>
          <span className="alert-icon">{a.icon}</span>
          <div><strong>{a.title}</strong><br /><span style={{ fontSize: 12, opacity: 0.9 }}>{a.desc}</span></div>
          {showEmailForm && (
            <input
              type="checkbox"
              checked={selectedForEmail.has(i)}
              onChange={e => {
                if (e.target.checked) {
                  setSelectedForEmail(new Set([...selectedForEmail, i]));
                } else {
                  setSelectedForEmail(new Set([...selectedForEmail].filter(x => x !== i)));
                }
              }}
              style={{ marginLeft: 'auto', cursor: 'pointer' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// STATISTICS
// ============================================================
function Statistics({ escuelas, onNavigate }) {
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

// ============================================================


// ============================================================
// SCHOOL DETAIL VIEW
// ============================================================
function EscuelaDetail({ esc, onEdit, onDelete, onAddDocente, onEditDocente, onDeleteDocente, onAddAlumno, onEditAlumno, onDeleteAlumno, viewMode, isAdmin }) {
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

// ============================================================
// PDF EXPORT
// ============================================================
function ExportPDF({ escuelas, onClose }) {
  const [filter, setFilter] = useState("all");
  const [tipo, setTipo] = useState("completo");
  const [formato, setFormato] = useState("txt");

  // Generar CSV
  function generateCSV() {
    const data = filter === "all" ? escuelas : escuelas.filter(e => e.de === filter);
    const rows = [];

    // Encabezados generales
    rows.push(["SISTEMA ACDM - REPORTE EXPORTADO"]);
    rows.push([`Generado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}`]);
    rows.push([`Tipo: ${tipo}`]);
    rows.push([]);

    if (tipo === "completo" || tipo === "docentes") {
      rows.push(["DE", "Escuela", "Nivel", "Jornada", "Turno", "Dirección", "Mail", "Teléfonos"]);
      data.forEach(esc => {
        rows.push([esc.de, esc.escuela, esc.nivel, esc.jornada, esc.turno, esc.direccion, esc.mail, esc.telefonos.join("; ")]);

        if (tipo !== "mini") {
          rows.push([]);
          rows.push(["DOCENTES:", esc.escuela]);
          rows.push(["Cargo", "Nombre", "Estado", "Motivo", "Jornada", "Días Autorizados", "Fecha Inicio", "Fecha Fin"]);
          esc.docentes.forEach(d => {
            rows.push([d.cargo, d.nombreApellido, d.estado, d.motivo, d.jornada || "N/D", d.diasAutorizados, formatDate(d.fechaInicioLicencia), formatDate(d.fechaFinLicencia)]);
            if (d.suplentes.length > 0) {
              rows.push(["-- SUPLENTES", d.nombreApellido]);
              d.suplentes.forEach(s => rows.push([s.cargo, s.nombreApellido, s.estado, s.motivo, s.jornada || "N/D"]));
            }
          });

          rows.push([]);
          rows.push(["ALUMNOS:", esc.escuela]);
          rows.push(["Grado/Sala", "Nombre", "Diagnóstico", "Observaciones"]);
          esc.alumnos.forEach(a => {
            rows.push([a.gradoSalaAnio, a.nombre, a.diagnostico, a.observaciones]);
          });
          rows.push([]);
        }
      });
    }

    // Convertir a CSV
    const csvContent = rows.map(row => row.map(cell => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ACDM_Reporte_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Generar Excel usando SheetJS CDN
  function generateExcel() {
    const data = filter === "all" ? escuelas : escuelas.filter(e => e.de === filter);

    // Cargar SheetJS desde CDN
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js";
    script.onload = () => {
      const XLSX = window.XLSX;
      const workbook = XLSX.utils.book_new();

      // Hoja 1: Resumen de Escuelas
      const escuelasData = [];
      escuelasData.push(["DE", "Escuela", "Nivel", "Jornada", "Turno", "Dirección", "Mail", "Teléfonos", "Docentes", "Alumnos"]);
      data.forEach(esc => {
        escuelasData.push([
          esc.de, esc.escuela, esc.nivel, esc.jornada, esc.turno, esc.direccion, esc.mail,
          esc.telefonos.join("; "), esc.docentes.length, esc.alumnos.length
        ]);
      });
      const wsEscuelas = XLSX.utils.aoa_to_sheet(escuelasData);
      XLSX.utils.book_append_sheet(workbook, wsEscuelas, "Escuelas");

      // Hoja 2: Docentes
      if (tipo !== "mini") {
        const docentesData = [];
        docentesData.push(["Escuela", "DE", "Cargo", "Nombre", "Estado", "Motivo", "Jornada", "Días Auth.", "Inicio", "Fin", "Suplente"]);
        data.forEach(esc => {
          esc.docentes.forEach(d => {
            docentesData.push([
              esc.escuela, esc.de, d.cargo, d.nombreApellido, d.estado, d.motivo, d.jornada || "N/D",
              d.diasAutorizados, formatDate(d.fechaInicioLicencia), formatDate(d.fechaFinLicencia), ""
            ]);
            d.suplentes.forEach(s => {
              docentesData.push([
                esc.escuela, esc.de, s.cargo, s.nombreApellido, s.estado, s.motivo, s.jornada || "N/D", "", "", "", "Suplente"
              ]);
            });
          });
        });
        const wsDocentes = XLSX.utils.aoa_to_sheet(docentesData);
        XLSX.utils.book_append_sheet(workbook, wsDocentes, "Docentes");

        // Hoja 3: Alumnos
        const alumnosData = [];
        alumnosData.push(["Escuela", "DE", "Grado/Sala", "Nombre", "Diagnóstico", "Observaciones"]);
        data.forEach(esc => {
          esc.alumnos.forEach(a => {
            alumnosData.push([esc.escuela, esc.de, a.gradoSalaAnio, a.nombre, a.diagnostico, a.observaciones]);
          });
        });
        const wsAlumnos = XLSX.utils.aoa_to_sheet(alumnosData);
        XLSX.utils.book_append_sheet(workbook, wsAlumnos, "Alumnos");
      }

      // Generar archivo
      XLSX.writeFile(workbook, `ACDM_Reporte_${new Date().toISOString().split("T")[0]}.xlsx`);
    };
    document.head.appendChild(script);
  }

  function doExport() {
    if (formato === "csv") {
      generateCSV();
    } else if (formato === "excel") {
      generateExcel();
    } else {
      // TXT (original)
      const data = filter === "all" ? escuelas : escuelas.filter(e => e.de === filter);
      const lines = [];
      lines.push(`SISTEMA ACDM - REPORTE ${tipo.toUpperCase()}`);
      lines.push(`Generado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}`);
      lines.push(`Desarrollado por: PAPIWEB Desarrollos Informáticos`);
      lines.push("─".repeat(60));
      data.forEach(esc => {
        lines.push(`\n${esc.de} | ${esc.escuela}`);
        lines.push(`Nivel: ${esc.nivel} | Jornada: ${esc.jornada} | Turno: ${esc.turno}`);
        lines.push(`Dirección: ${esc.direccion}`);
        lines.push(`Mail: ${esc.mail} | Tel: ${esc.telefonos.join(", ")}`);
        if (tipo !== "mini") {
          lines.push(`\n  DOCENTES (${esc.docentes.length}):`);
          esc.docentes.forEach(d => {
            lines.push(`  - [${d.cargo}] ${d.nombreApellido} (${d.jornada || "N/D"}) — ${d.estado}${d.estado === "Licencia" ? ` (${d.motivo}, hasta ${formatDate(d.fechaFinLicencia)})` : ""}`);
            d.suplentes.forEach(s => lines.push(`      ↳ [${s.cargo}] ${s.nombreApellido} (${s.jornada || "N/D"}) — ${s.estado}`));
          });
          lines.push(`\n  ALUMNOS (${esc.alumnos.length}):`);
          esc.alumnos.forEach(a => lines.push(`  - ${a.gradoSalaAnio}: ${a.nombre} — ${a.diagnostico}`));
        }
        lines.push("─".repeat(60));
      });
      const content = lines.join("\n");
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `ACDM_Reporte_${new Date().toISOString().split("T")[0]}.txt`;
      a.click(); URL.revokeObjectURL(url);
    }
    onClose();
  }

  const des = [...new Set(escuelas.map(e => e.de))];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">📄 Exportar Reporte</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Filtrar por DE</label>
            <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">Todos los distritos</option>
              {des.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tipo de Reporte</label>
            <select className="form-select" value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="completo">Completo (escuelas + docentes + alumnos)</option>
              <option value="docentes">Solo Docentes y Licencias</option>
              <option value="mini">Resumen ejecutivo</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Formato de Exportación</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <button
              className={`btn ${formato === 'txt' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textAlign: 'center' }}
              onClick={() => setFormato('txt')}>
              📄 TXT
            </button>
            <button
              className={`btn ${formato === 'csv' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textAlign: 'center' }}
              onClick={() => setFormato('csv')}>
              📊 CSV (Excel)
            </button>
            <button
              className={`btn ${formato === 'excel' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textAlign: 'center' }}
              onClick={() => setFormato('excel')}>
              📈 Excel
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="pdf-preview" style={{ fontSize: 12, maxHeight: '300px', overflowY: 'auto' }}>
          <div className="pdf-header">
            <div className="pdf-title">Sistema ACDM — Reporte {tipo}</div>
            <div className="pdf-sub">Formato: {formato.toUpperCase()} · {new Date().toLocaleDateString('es-AR')}</div>
          </div>
          {(filter === "all" ? escuelas : escuelas.filter(e => e.de === filter)).slice(0, 3).map(esc => (
            <div key={esc.id} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #ddd' }}>
              <div style={{ fontWeight: 700, color: '#0066aa' }}>{esc.de} — {esc.escuela}</div>
              <div style={{ fontSize: 11, color: '#444' }}>{esc.nivel} | {esc.jornada} | {esc.turno} | {esc.mail}</div>
              {tipo !== "mini" && esc.docentes.slice(0, 2).map(d => (
                <div key={d.id} style={{ marginLeft: 12, marginTop: 4, fontSize: 11 }}>
                  <span style={{ fontWeight: 700 }}>[{d.cargo}]</span> {d.nombreApellido} · <span style={{ color: '#0066aa' }}>📅 {d.jornada || 'N/D'}</span> — <span style={{ color: d.estado === "Activo" ? "green" : "red" }}>{d.estado}</span>
                  {d.estado === "Licencia" && <span style={{ color: '#888' }}> · {d.motivo} hasta {formatDate(d.fechaFinLicencia)}</span>}
                </div>
              ))}
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>*Mostrando vista previa de los primeros registros</div>
        </div>

        <div className="flex gap-8 justify-end mt-16">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={doExport}>⬇️ Exportar {formato.toUpperCase()}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LOGIN SCREEN
// ============================================================
function Login({ onLogin }) {
  const MAX_LOCAL_LOGIN_ATTEMPTS = 3;
  const BASE_LOCAL_COOLDOWN_MS = 15 * 1000;
  const MAX_LOCAL_COOLDOWN_MS = 5 * 60 * 1000;

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientFailedAttempts, setClientFailedAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownSeconds(0);
      return;
    }

    const tick = () => {
      const remainingMs = Math.max(0, cooldownUntil - Date.now());
      setCooldownSeconds(Math.ceil(remainingMs / 1000));
      if (remainingMs <= 0) {
        setCooldownUntil(0);
      }
    };

    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  async function doLogin() {
    setErr("");
    if (isSubmitting) return;

    if (!user.trim() || !pass) {
      setErr("Usuario y contraseña son requeridos");
      return;
    }

    if (cooldownUntil && Date.now() < cooldownUntil) {
      setErr(`Demasiados intentos. Espere ${cooldownSeconds}s para reintentar.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiService.login(user.trim(), pass);
      const responseUser = response?.data?.user || response?.user;
      const accessToken = response?.data?.tokens?.access || response?.token;

      if (!responseUser || !accessToken) {
        throw new Error("Respuesta inválida del servidor de autenticación");
      }

      apiService.setToken(accessToken);
      setClientFailedAttempts(0);
      setCooldownUntil(0);
      onLogin(responseUser);
    } catch (backendError) {
      const status = backendError?.status;
      const backendMessage = backendError?.message || "No se pudo iniciar sesión. Intente nuevamente.";

      if (status === 423) {
        const retryAfterSeconds = Number(backendError?.payload?.retryAfterSeconds) || 60;
        setCooldownUntil(Date.now() + retryAfterSeconds * 1000);
        setClientFailedAttempts(MAX_LOCAL_LOGIN_ATTEMPTS);
        setErr(backendMessage);
      } else {
        const nextFailedAttempts = clientFailedAttempts + 1;
        setClientFailedAttempts(nextFailedAttempts);

        if (nextFailedAttempts >= MAX_LOCAL_LOGIN_ATTEMPTS) {
          const escalation = nextFailedAttempts - MAX_LOCAL_LOGIN_ATTEMPTS;
          const cooldownMs = Math.min(
            MAX_LOCAL_COOLDOWN_MS,
            BASE_LOCAL_COOLDOWN_MS * Math.pow(2, escalation)
          );
          setCooldownUntil(Date.now() + cooldownMs);
          setErr(`Demasiados intentos fallidos. Espere ${Math.ceil(cooldownMs / 1000)}s para reintentar.`);
        } else if (status === 401) {
          setErr("Credenciales inválidas");
        } else {
          setErr(backendMessage);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <div className="papiweb-logo" style={{ padding: '8px 20px' }}>
              <div className="papiweb-text" style={{ fontSize: 22, letterSpacing: 3 }}>PAPIWEB</div>
              <div className="papiweb-sub">Desarrollos Informáticos</div>
            </div>
          </div>
          <div className="login-title">Sistema ACDM</div>
          <div className="login-sub">Gestión de Asistentes de Clase</div>
        </div>
        <div className="form-group">
          <label className="form-label">Usuario</label>
          <input className="form-input" value={user} onChange={e => setUser(e.target.value)} onKeyDown={e => e.key === "Enter" && doLogin()} placeholder="Usuario" autoFocus disabled={isSubmitting || cooldownSeconds > 0} />
        </div>
        <div className="form-group">
          <label className="form-label">Contraseña</label>
          <input type="password" className="form-input" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && doLogin()} placeholder="••••••••" disabled={isSubmitting || cooldownSeconds > 0} />
        </div>
        {err && <div className="alert alert-danger" style={{ marginBottom: 12 }}><span>⚠️</span>{err}</div>}
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          onClick={doLogin}
          disabled={isSubmitting || cooldownSeconds > 0}
        >
          {isSubmitting ? "Ingresando..." : cooldownSeconds > 0 ? `Reintentar en ${cooldownSeconds}s` : "Ingresar →"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App({ currentUser: propCurrentUser, onLogout: propOnLogout } = {}) {
  const [currentUser, setCurrentUser] = useState(propCurrentUser || null);

  // Usar MongoDB en lugar de localStorage
  const {
    db,
    loading,
    saveEscuela: mongoSaveEscuela,
    deleteEscuela: mongoDeleteEscuela,
    addDocente: mongoAddDocente,
    updateDocente: mongoUpdateDocente,
    deleteDocente: mongoDeleteDocente,
    addAlumno: mongoAddAlumno,
    updateAlumno: mongoUpdateAlumno,
    deleteAlumno: mongoDeleteAlumno,
    addVisita: mongoAddVisita,
    updateVisita: mongoUpdateVisita,
    deleteVisita: mongoDeleteVisita,
    addProyecto: mongoAddProyecto,
    updateProyecto: mongoUpdateProyecto,
    deleteProyecto: mongoDeleteProyecto,
    addInforme: mongoAddInforme,
    updateInforme: mongoUpdateInforme,
    deleteInforme: mongoDeleteInforme
  } = useAcdmMongoData(currentUser);

  const activeDb = db || { escuelas: [], alumnos: [], docentes: [], usuarios: [], visitas: [], proyectos: [], informes: [] };

  const [activeSection, setActiveSection] = useState("dashboard");
  const [viewMode, setViewMode] = useState("full"); // full | compact | table
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [showMailsExtractor, setShowMailsExtractor] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("acdm_darkMode");
    return saved !== null ? saved === "true" : true;
  });

  // Modals
  const [escuelaModal, setEscuelaModal] = useState(null);
  const [docenteModal, setDocenteModal] = useState(null);
  const [alumnoModal, setAlumnoModal] = useState(null);
  const [addDocenteTarget, setAddDocenteTarget] = useState(null); // {escuelaId, titularId?}
  const [addAlumnoTarget, setAddAlumnoTarget] = useState(null); // escuelaId
  const [visitaModal, setVisitaModal] = useState(null);
  const [proyectoModal, setProyectoModal] = useState(null);
  const [informeModal, setInformeModal] = useState(null);

  const isAdmin = currentUser?.rol === "admin";

  // Persist dark mode preference
  useEffect(() => {
    localStorage.setItem("acdm_darkMode", darkMode);
  }, [darkMode]);

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e) {
      if (e.ctrlKey && e.key === "f") { e.preventDefault(); document.querySelector(".search-main")?.focus(); }
      if (e.ctrlKey && e.key === "e" && isAdmin) setShowExport(true);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isAdmin]);

  // ── CRUD directo a MongoDB ──
  const saveEscuela = mongoSaveEscuela;
  const deleteEscuela = mongoDeleteEscuela;
  const addDocente = mongoAddDocente;
  const updateDocente = mongoUpdateDocente;
  const deleteDocente = mongoDeleteDocente;
  const addAlumno = mongoAddAlumno;
  const updateAlumno = mongoUpdateAlumno;
  const deleteAlumno = mongoDeleteAlumno;
  const addVisita = mongoAddVisita;
  const updateVisita = mongoUpdateVisita;
  const deleteVisita = mongoDeleteVisita;
  const addProyecto = mongoAddProyecto;
  const updateProyecto = mongoUpdateProyecto;
  const deleteProyecto = mongoDeleteProyecto;
  const addInforme = mongoAddInforme;
  const updateInforme = mongoUpdateInforme;
  const deleteInforme = mongoDeleteInforme;

  const alertCount = activeDb.escuelas.reduce((a, esc) => {
    if (esc.docentes.length === 0) a++;
    esc.docentes.forEach(d => { if (d.estado === "Licencia" && d.fechaFinLicencia && diasRestantes(d.fechaFinLicencia) <= 10) a++; });
    return a;
  }, 0);

  const filteredEscuelas = activeDb.escuelas.filter(e =>
    !search || e.escuela.toLowerCase().includes(search.toLowerCase()) ||
    e.de.toLowerCase().includes(search.toLowerCase()) ||
    e.nivel.toLowerCase().includes(search.toLowerCase()) ||
    e.docentes.some(d => d.nombreApellido.toLowerCase().includes(search.toLowerCase())) ||
    e.alumnos.some(a => a.nombre.toLowerCase().includes(search.toLowerCase()))
  );

  // Filtrar visitas globalmente
  const filteredVisitas = activeDb.escuelas.map(esc => ({
    ...esc,
    visitas: (!esc.visitas || !search) ? (esc.visitas || []) : esc.visitas.filter(v =>
      v.observaciones.toLowerCase().includes(search.toLowerCase()) ||
      esc.escuela.toLowerCase().includes(search.toLowerCase()) ||
      esc.de.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(esc => !search || esc.visitas.length > 0);

  // Filtrar proyectos globalmente
  const filteredProyectos = activeDb.escuelas.map(esc => ({
    ...esc,
    proyectos: (!esc.proyectos || !search) ? (esc.proyectos || []) : esc.proyectos.filter(p =>
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      esc.escuela.toLowerCase().includes(search.toLowerCase()) ||
      esc.de.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(esc => !search || esc.proyectos.length > 0);

  // Filtrar informes globalmente
  const filteredInformes = activeDb.escuelas.map(esc => ({
    ...esc,
    informes: (!esc.informes || !search) ? (esc.informes || []) : esc.informes.filter(i =>
      i.titulo.toLowerCase().includes(search.toLowerCase()) ||
      i.observaciones.toLowerCase().includes(search.toLowerCase()) ||
      esc.escuela.toLowerCase().includes(search.toLowerCase()) ||
      esc.de.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(esc => !search || esc.informes.length > 0);

  if (!currentUser) return <><style>{STYLES}</style><Login onLogin={setCurrentUser} /></>;

  return (
    <>
      <style>{STYLES}</style>
      <div className={`app ${darkMode ? "" : "light-mode"}`}>
        {/* HEADER */}
        <header className="header">
          <div className="flex items-center gap-16">
            <button className="btn-icon" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ fontSize: 18 }}>☰</button>
            <div>
              <div className="header-title">🏫 Sistema ACDM</div>
              <div className="header-sub">Gestión de Asistentes Celadores/as para estudiantes con Discapacidad Motora</div>
            </div>
          </div>
          <div className="flex items-center gap-16">
            <div className="search-input-wrap" style={{ width: 220 }}>
              <span className="search-icon">🔍</span>
              <input className="form-input search-main" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ paddingLeft: 32 }} />
            </div>
            <div className="papiweb-brand">
              <div className="led-dot" />
              <div className="papiweb-logo">
                <div className="papiweb-text">PAPIWEB</div>
                <div className="papiweb-sub">Desarrollos Informáticos</div>
              </div>
            </div>
            <UserMenu
              currentUser={currentUser}
              isAdmin={isAdmin}
              onLogout={() => {
                setCurrentUser(null);
                if (propOnLogout) propOnLogout();
              }}
              onToggleDarkMode={() => setDarkMode(!darkMode)}
              darkMode={darkMode}
            />
          </div>
        </header>

        <div className="main">
          {/* SIDEBAR COMPONENT */}
          <Sidebar
            isCollapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            isAdmin={isAdmin}
            alertCount={alertCount}
            onNewEscuela={() => setEscuelaModal({ isNew: true, data: null })}
          />

          {/* CONTENT */}
          <main className="content">
            {/* DASHBOARD */}
            {activeSection === "dashboard" && (
              <div>
                <div className="flex items-center justify-between mb-24">
                  <div>
                    <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Dashboard</h1>
                    <p style={{ color: 'var(--text2)', fontSize: 13 }}>Vista general del sistema — {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                <Statistics escuelas={activeDb.escuelas} onNavigate={setActiveSection} />
              </div>
            )}

            {/* ESCUELAS */}
            {activeSection === "escuelas" && (
              <div>
                <div className="flex items-center justify-between mb-16">
                  <div>
                    <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Escuelas</h1>
                    <p style={{ color: 'var(--text2)', fontSize: 13 }}>{filteredEscuelas.length} escuela(s) encontrada(s)</p>
                  </div>
                  <div className="flex gap-8 items-center flex-wrap">
                    <div className="view-toggle">
                      <button className={`view-btn ${viewMode === "full" ? "active" : ""}`} onClick={() => setViewMode("full")}>Completo</button>
                      <button className={`view-btn ${viewMode === "compact" ? "active" : ""}`} onClick={() => setViewMode("compact")}>Compacto</button>
                    </div>
                    {isAdmin && <button className="btn btn-primary" onClick={() => setEscuelaModal({ isNew: true, data: null })}>➕ Nueva Escuela</button>}
                  </div>
                </div>

                {filteredEscuelas.length === 0 && <div className="no-data card">No se encontraron escuelas. {isAdmin && <button className="btn btn-primary btn-sm" style={{ marginLeft: 8 }} onClick={() => setEscuelaModal({ isNew: true, data: null })}>Crear primera escuela</button>}</div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredEscuelas.map(esc => (
                    <EscuelaDetail key={esc.id} esc={esc} viewMode={viewMode} isAdmin={isAdmin}
                      onEdit={() => setEscuelaModal({ isNew: false, data: esc })}
                      onDelete={() => deleteEscuela(esc.id)}
                      onAddDocente={(escId, titularId) => setDocenteModal({ isNew: true, escuelaId: escId, titularId: titularId || null, data: null })}
                      onEditDocente={(escId, doc, titularId) => setDocenteModal({ isNew: false, escuelaId: escId, titularId: titularId || null, data: doc })}
                      onDeleteDocente={deleteDocente}
                      onAddAlumno={(escId) => setAlumnoModal({ isNew: true, escuelaId: escId, data: null })}
                      onEditAlumno={(escId, alumno) => setAlumnoModal({ isNew: false, escuelaId: escId, data: alumno })}
                      onDeleteAlumno={deleteAlumno}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ALERTAS */}
            {activeSection === "alertas" && (
              <div>
                <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2, marginBottom: 8 }}>Centro de Alertas</h1>
                <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 24 }}>{alertCount} alerta(s) activa(s)</p>
                <AlertPanel escuelas={activeDb.escuelas} />

                <div className="card mt-16">
                  <div className="card-header"><span className="card-title">📋 Resumen de Licencias Activas</span></div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Escuela</th><th>Docente</th><th>Motivo</th><th>Inicio</th><th>Fin</th><th>Días Rest.</th><th>Suplente</th></tr></thead>
                      <tbody>
                        {activeDb.escuelas.flatMap(esc => esc.docentes.filter(d => d.estado === "Licencia").map(d => (
                          <tr key={`${esc.id}-${d.id}`}>
                            <td style={{ maxWidth: 180, fontSize: 12 }}>{esc.escuela}</td>
                            <td style={{ fontFamily: 'Rajdhani', fontWeight: 700 }}>{d.nombreApellido}</td>
                            <td style={{ fontSize: 12 }}>{d.motivo}</td>
                            <td style={{ fontSize: 12 }}>{formatDate(d.fechaInicioLicencia)}</td>
                            <td style={{ fontSize: 12 }}>{formatDate(d.fechaFinLicencia)}</td>
                            <td><DaysRemaining fechaFin={d.fechaFinLicencia} /></td>
                            <td style={{ fontSize: 12 }}>{d.suplentes.length > 0 ? d.suplentes.map(s => s.nombreApellido).join(", ") : <span className="badge badge-danger">SIN SUPLENTE</span>}</td>
                          </tr>
                        )))}
                      </tbody>
                    </table>
                    {activeDb.escuelas.flatMap(e => e.docentes.filter(d => d.estado === "Licencia")).length === 0 && <div className="no-data">No hay licencias activas</div>}
                  </div>
                </div>
              </div>
            )}

            {/* ESTADISTICAS */}
            {activeSection === "estadisticas" && (
              <div>
                <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2, marginBottom: 24 }}>Estadísticas</h1>
                <Statistics escuelas={activeDb.escuelas} />
              </div>
            )}

            {/* CALENDARIO */}
            {activeSection === "calendario" && <CalendarioView escuelas={activeDb.escuelas} isAdmin={isAdmin} />}

            {/* VISITAS */}
            {activeSection === "visitas" && (
              <div>
                <div className="flex items-center justify-between mb-16">
                  <div>
                    <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Visitas a Escuelas</h1>
                    <p style={{ color: 'var(--text2)', fontSize: 13 }}>Registro de visitas y observaciones a las escuelas</p>
                  </div>
                  {isAdmin && <button className="btn btn-primary" onClick={() => setVisitaModal({ isNew: true, data: null, escuelaId: null })}>➕ Nueva Visita</button>}
                </div>
                {filteredVisitas.length === 0 && search && <div className="no-data card">No se encontraron visitas para "{search}"</div>}
                <div className="card-grid">
                  {filteredVisitas.map(esc => (
                    <div key={esc.id} className="card">
                      <div className="card-header">
                        <span className="card-title">{esc.escuela}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{esc.de}</span>
                      </div>
                      {(!esc.visitas || esc.visitas.length === 0) ? (
                        <div className="no-data">Sin visitas registradas</div>
                      ) : (
                        esc.visitas.map(v => (
                          <div key={v.id} style={{ padding: '12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <div>
                                <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--accent)' }}>📅 {formatDate(v.fecha)}</div>
                                <div style={{ color: 'var(--text2)', marginTop: 6, fontSize: 12 }}>{v.observaciones}</div>
                              </div>
                              {isAdmin && (
                                <div className="flex gap-4">
                                  <button className="btn btn-secondary btn-sm" onClick={() => setVisitaModal({ isNew: false, data: v, escuelaId: esc.id })}>✏️</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => deleteVisita(esc.id, v.id)}>🗑️</button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {isAdmin && (
                        <button className="btn btn-secondary btn-sm" style={{ marginTop: 12, width: '100%' }} onClick={() => setVisitaModal({ isNew: true, data: null, escuelaId: esc.id })}>+ Agregar visita</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PROYECTOS */}
            {activeSection === "proyectos" && (
              <div>
                <div className="flex items-center justify-between mb-16">
                  <div>
                    <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Proyectos Entregados</h1>
                    <p style={{ color: 'var(--text2)', fontSize: 13 }}>Proyectos desarrollados e implementados por los ACDM</p>
                  </div>
                  {isAdmin && <button className="btn btn-primary" onClick={() => setProyectoModal({ isNew: true, data: null, escuelaId: null })}>➕ Nuevo Proyecto</button>}
                </div>
                {filteredProyectos.length === 0 && search && <div className="no-data card">No se encontraron proyectos para "{search}"</div>}
                <div className="card-grid">
                  {filteredProyectos.map(esc => (
                    <div key={esc.id} className="card">
                      <div className="card-header">
                        <span className="card-title">{esc.escuela}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{esc.de}</span>
                      </div>
                      {(!esc.proyectos || esc.proyectos.length === 0) ? (
                        <div className="no-data">Sin proyectos registrados</div>
                      ) : (
                        esc.proyectos.map(p => (
                          <div key={p.id} style={{ padding: '12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--accent)' }}>{p.nombre}</div>
                                <div style={{ color: 'var(--text2)', marginTop: 4, fontSize: 11 }}>{p.descripcion}</div>
                                <div style={{ marginTop: 6, display: 'flex', gap: 12, fontSize: 11 }}>
                                  <span className={`badge badge-${p.estado === 'Completado' ? 'active' : 'warning'}`}>{p.estado}</span>
                                  <span style={{ color: 'var(--text3)' }}>📅 {formatDate(p.fechaInicio)} → {formatDate(p.fechaBaja)}</span>
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="flex gap-4" style={{ marginLeft: 8 }}>
                                  <button className="btn btn-secondary btn-sm" onClick={() => setProyectoModal({ isNew: false, data: p, escuelaId: esc.id })}>✏️</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => deleteProyecto(esc.id, p.id)}>🗑️</button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {isAdmin && (
                        <button className="btn btn-secondary btn-sm" style={{ marginTop: 12, width: '100%' }} onClick={() => setProyectoModal({ isNew: true, data: null, escuelaId: esc.id })}>+ Agregar proyecto</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* INFORMES */}
            {activeSection === "informes" && (
              <div>
                <div className="flex items-center justify-between mb-16">
                  <div>
                    <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Informes Entregados</h1>
                    <p style={{ color: 'var(--text2)', fontSize: 13 }}>Informes periódicos entregados por los ACDM</p>
                  </div>
                  {isAdmin && <button className="btn btn-primary" onClick={() => setInformeModal({ isNew: true, data: null, escuelaId: null })}>➕ Nuevo Informe</button>}
                </div>
                {filteredInformes.length === 0 && search && <div className="no-data card">No se encontraron informes para "{search}"</div>}
                <div className="card-grid">
                  {filteredInformes.map(esc => (
                    <div key={esc.id} className="card">
                      <div className="card-header">
                        <span className="card-title">{esc.escuela}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{esc.de}</span>
                      </div>
                      {(!esc.informes || esc.informes.length === 0) ? (
                        <div className="no-data">Sin informes registrados</div>
                      ) : (
                        esc.informes.map(i => (
                          <div key={i.id} style={{ padding: '12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: 'var(--accent)' }}>{i.titulo}</div>
                                <div style={{ color: 'var(--text2)', marginTop: 4, fontSize: 11 }}>{i.observaciones}</div>
                                <div style={{ marginTop: 6, display: 'flex', gap: 12, fontSize: 11 }}>
                                  <span className={`badge badge-${i.estado === 'Entregado' ? 'active' : 'warning'}`}>{i.estado}</span>
                                  <span style={{ color: 'var(--text3)' }}>📅 {formatDate(i.fechaEntrega)}</span>
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="flex gap-4" style={{ marginLeft: 8 }}>
                                  <button className="btn btn-secondary btn-sm" onClick={() => setInformeModal({ isNew: false, data: i, escuelaId: esc.id })}>✏️</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => deleteInforme(esc.id, i.id)}>🗑️</button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {isAdmin && (
                        <button className="btn btn-secondary btn-sm" style={{ marginTop: 12, width: '100%' }} onClick={() => setInformeModal({ isNew: true, data: null, escuelaId: esc.id })}>+ Agregar informe</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EXPORTAR */}
            {activeSection === "exportar" && (
              <div>
                <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2, marginBottom: 24 }}>Exportar</h1>
                <div className="card-grid">
                  <div className="card">
                    <div className="card-header"><span className="card-title">Reporte de Datos</span></div>
                    <p style={{ color: 'var(--text2)', marginBottom: 16, fontSize: 13 }}>Genera reportes en formato texto, CSV o Excel con los datos del sistema.</p>
                    <button className="btn btn-primary" onClick={() => setShowExport(true)}>📄 Generar Reporte</button>
                  </div>

                  <div className="card">
                    <div className="card-header"><span className="card-title">Extraer Mails</span></div>
                    <p style={{ color: 'var(--text2)', marginBottom: 16, fontSize: 13 }}>Extrae todos los emails de las escuelas. Puedes copiarlos o descargarlos como archivo.</p>
                    <button className="btn btn-primary" onClick={() => setShowMailsExtractor(true)}>✉️ Extraer Emails</button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* MODALS */}
      {escuelaModal && (
        <EscuelaModal isNew={escuelaModal.isNew} escuela={escuelaModal.data}
          onSave={saveEscuela} onClose={() => setEscuelaModal(null)} />
      )}
      {docenteModal && (
        <DocenteModal isNew={docenteModal.isNew} docente={docenteModal.data} titularId={docenteModal.titularId}
          onSave={(form) => docenteModal.isNew ? addDocente(docenteModal.escuelaId, form, docenteModal.titularId) : updateDocente(docenteModal.escuelaId, form, docenteModal.titularId)}
          onClose={() => setDocenteModal(null)} />
      )}
      {alumnoModal && (
        <AlumnoModal isNew={alumnoModal.isNew} alumno={alumnoModal.data}
          onSave={(form) => alumnoModal.isNew ? addAlumno(alumnoModal.escuelaId, form) : updateAlumno(alumnoModal.escuelaId, form)}
          onClose={() => setAlumnoModal(null)} />
      )}
      {visitaModal && (
        <VisitaModal isNew={visitaModal.isNew} visita={visitaModal.data} escuelaId={visitaModal.escuelaId}
          onSave={(form, escId) => visitaModal.isNew ? addVisita(escId, form) : updateVisita(escId, form)}
          onClose={() => setVisitaModal(null)} escuelas={activeDb.escuelas} />
      )}
      {proyectoModal && (
        <ProyectoModal isNew={proyectoModal.isNew} proyecto={proyectoModal.data} escuelaId={proyectoModal.escuelaId}
          onSave={(form, escId) => proyectoModal.isNew ? addProyecto(escId, form) : updateProyecto(escId, form)}
          onClose={() => setProyectoModal(null)} escuelas={activeDb.escuelas} />
      )}
      {informeModal && (
        <InformeModal isNew={informeModal.isNew} informe={informeModal.data} escuelaId={informeModal.escuelaId}
          onSave={(form, escId) => informeModal.isNew ? addInforme(escId, form) : updateInforme(escId, form)}
          onClose={() => setInformeModal(null)} escuelas={activeDb.escuelas} />
      )}
      {showExport && <ExportPDF escuelas={activeDb.escuelas} onClose={() => setShowExport(false)} />}
      {showMailsExtractor && <MailsExtractor escuelas={activeDb.escuelas} onClose={() => setShowMailsExtractor(false)} />}
    </>
  );
}

// ============================================================
// MAILS EXTRACTOR
// ============================================================
function MailsExtractor({ escuelas, onClose }) {
  const [formato, setFormato] = useState("lista");
  const [copiadoMsg, setCopiadoMsg] = useState("");

  // Extraer todos los mails
  const mails = escuelas
    .filter(esc => esc.mail && esc.mail.trim())
    .map(esc => ({ mail: esc.mail, escuela: esc.escuela, de: esc.de }));

  const mailsUnicos = [...new Set(mails.map(m => m.mail))];

  // Copiar al portapapeles
  function copiarAlPortapapeles() {
    const texto = formato === "lista"
      ? mailsUnicos.join("\n")
      : mailsUnicos.join(", ");

    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoMsg("✓ Copiado al portapapeles");
      setTimeout(() => setCopiadoMsg(""), 2000);
    }).catch(() => {
      alert("Error al copiar. Por favor intenta de nuevo.");
    });
  }

  // Descargar archivo
  function descargarArchivo() {
    const contenido = mails.map(m => `${m.mail},${m.escuela},${m.de}`).join("\n");
    const encabezado = "Email,Escuela,Distrito Escolar\n";
    const blob = new Blob([encabezado + contenido], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emails_acdm_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div className="modal-title">✉️ Extractor de Emails</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: 16, padding: '12px', background: 'rgba(0,212,255,0.1)', borderRadius: 8, fontSize: 13 }}>
          <strong>Total de emails únicos:</strong> {mailsUnicos.length}
        </div>

        <div className="form-group">
          <label className="form-label">Formato</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              className={`btn ${formato === 'lista' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFormato('lista')}>
              📋 Listado (línea x línea)
            </button>
            <button
              className={`btn ${formato === 'comas' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFormato('comas')}>
              🔗 Separado por comas
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Vista Previa</label>
          <textarea
            className="form-textarea"
            value={formato === 'lista' ? mailsUnicos.join("\n") : mailsUnicos.join(", ")}
            readOnly
            rows="6"
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <button
            className="btn btn-primary"
            onClick={copiarAlPortapapeles}
            style={{ justifyContent: 'center' }}>
            {copiadoMsg ? copiadoMsg : "📋 Copiar"}
          </button>
          <button
            className="btn btn-primary"
            onClick={descargarArchivo}
            style={{ justifyContent: 'center' }}>
            💾 Descargar CSV
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text2)', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
          <strong>Detalles:</strong><br />
          {mails.map((m, i) => (
            <div key={i} style={{ marginTop: 4 }}>
              <span style={{ color: 'var(--accent)' }}>{m.mail}</span> <span style={{ fontSize: 11, color: 'var(--text3)' }}>— {m.escuela} ({m.de})</span>
            </div>
          ))}
        </div>

        <div className="flex gap-8 justify-end mt-16">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CALENDARIO VIEW - Conectado a API
// ============================================================
function CalendarioView({ escuelas, isAdmin }) {
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
