import { useState } from "react";
import { diasRestantes, formatDate } from "../utils/dateUtils.js";

// ============================================================
// PDF EXPORT
// ============================================================
export function ExportPDF({ escuelas, onClose }) {
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
