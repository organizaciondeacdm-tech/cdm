import { useState } from "react";

// ============================================================
// MAILS EXTRACTOR
// ============================================================
export function MailsExtractor({ escuelas, onClose }) {
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
