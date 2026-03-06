import { useState } from "react";
import { diasRestantes, formatDate } from "../../../utils/dateUtils.js";
import { encryptJsonBodyIfNeeded, readJsonPayload, securePublicFetch, withPayloadIntercept } from "../../../../utils/payloadCrypto.js";

// ============================================================
// ALERT PANEL
// ============================================================
export function AlertPanel({ escuelas }) {
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
            const headers = withPayloadIntercept({ "Content-Type": "application/json" });
            const body = JSON.stringify({
                to: emailData.to,
                subject: emailData.subject || "Alertas del Sistema ACDM",
                alerts: selectedAlerts.map(a => ({ title: a.title, desc: a.desc, severity: a.type })),
                message: emailData.message,
                timestamp: new Date().toLocaleString('es-AR')
            });
            const response = await securePublicFetch("/api/send-alert-email", {
                method: "POST",
                headers,
                body: await encryptJsonBodyIfNeeded(body, headers)
            });
            const result = await readJsonPayload(response, {});
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
