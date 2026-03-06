const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const Escuela = require('../../models/Escuela');
const Docente = require('../../models/Docente');
const Alumno = require('../../models/Alumno');

class ReporteService {
  async buildEscuelasReport(rawFilters) {
    const query = {};
    if (rawFilters) {
      const filters = JSON.parse(rawFilters);
      if (filters.de) query.de = filters.de;
      if (filters.nivel) query.nivel = filters.nivel;
      if (filters.estado) query.estado = filters.estado;
    }

    const escuelas = await Escuela.find(query)
      .populate({ path: 'docentes', match: { activo: true }, select: 'nombre apellido cargo estado fechaFinLicencia' })
      .populate({ path: 'alumnos', match: { activo: true }, select: 'nombre apellido gradoSalaAnio diagnostico' })
      .lean();

    return escuelas.map((escuela) => ({
      de: escuela.de,
      escuela: escuela.escuela,
      nivel: escuela.nivel,
      direccion: escuela.direccion,
      localidad: escuela.localidad,
      telefono: (escuela.telefonos || []).find((telefono) => telefono.principal)?.numero || (escuela.telefonos || [])[0]?.numero,
      email: escuela.email,
      totalDocentes: escuela.docentes.length,
      totalAlumnos: escuela.alumnos.length,
      docentesActivos: escuela.docentes.filter((docente) => docente.estado === 'Activo').length,
      docentesLicencia: escuela.docentes.filter((docente) => docente.estado === 'Licencia').length,
      alumnosPorGrado: escuela.alumnos.reduce((acc, alumno) => {
        acc[alumno.gradoSalaAnio] = (acc[alumno.gradoSalaAnio] || 0) + 1;
        return acc;
      }, {})
    }));
  }

  toCsv(reporte) {
    const fields = ['de', 'escuela', 'nivel', 'totalDocentes', 'totalAlumnos', 'docentesActivos', 'docentesLicencia'];
    const parser = new Parser({ fields });
    return parser.parse(reporte);
  }

  writePdf(res, reporte) {
    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(20).text('Reporte de Escuelas - Sistema ACDM', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generado: ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`, { align: 'right' });
    doc.moveDown();

    reporte.forEach((esc, index) => {
      if (index > 0) doc.moveDown();
      doc.fontSize(14).text(`${esc.de} - ${esc.escuela}`);
      doc.fontSize(10).text(`Nivel: ${esc.nivel}`);
      doc.fontSize(10).text(`Dirección: ${esc.direccion}, ${esc.localidad}`);
      doc.fontSize(10).text(`Contacto: ${esc.telefono || 'N/A'} - ${esc.email}`);
      doc.fontSize(10).text(`Docentes: ${esc.totalDocentes} (Activos: ${esc.docentesActivos}, Licencia: ${esc.docentesLicencia})`);
      doc.fontSize(10).text(`Alumnos: ${esc.totalAlumnos}`);

      if (Object.keys(esc.alumnosPorGrado).length > 0) {
        doc.fontSize(9).text('Alumnos por grado:');
        Object.entries(esc.alumnosPorGrado).forEach(([grado, count]) => {
          doc.fontSize(8).text(`  ${grado}: ${count}`, { indent: 10 });
        });
      }

      doc.moveDown();
    });

    doc.end();
  }

  async buildLicenciasReport() {
    const docentes = await Docente.find({ estado: 'Licencia', activo: true })
      .populate('escuela', 'escuela de')
      .sort({ fechaFinLicencia: 1 })
      .lean();

    const licencias = docentes.map((docente) => ({
      docente: `${docente.apellido}, ${docente.nombre}`,
      dni: docente.dni,
      escuela: docente.escuela?.escuela || 'Sin escuela',
      de: docente.escuela?.de || 'Sin DE',
      motivo: docente.motivo,
      fechaInicio: docente.fechaInicioLicencia,
      fechaFin: docente.fechaFinLicencia,
      diasRestantes: docente.diasRestantesLicencia,
      alerta: docente.alertaLicencia,
      suplentes: docente.suplentes.length
    }));

    return {
      licencias,
      estadisticas: {
        totalLicencias: licencias.length,
        criticas: licencias.filter((row) => row.alerta === 'critica').length,
        proximas: licencias.filter((row) => row.alerta === 'proxima').length,
        porMotivo: licencias.reduce((acc, row) => {
          acc[row.motivo] = (acc[row.motivo] || 0) + 1;
          return acc;
        }, {})
      }
    };
  }

  async buildAlumnosReport(query = {}) {
    const filter = { activo: true };
    if (query.diagnostico) filter['diagnosticoDetallado.tipo'] = query.diagnostico;
    if (query.escuela) filter.escuela = query.escuela;

    const alumnos = await Alumno.find(filter)
      .populate('escuela', 'escuela de')
      .sort({ apellido: 1 })
      .lean();

    return alumnos.map((alumno) => ({
      alumno: `${alumno.apellido}, ${alumno.nombre}`,
      dni: alumno.dni,
      edad: alumno.edad,
      escuela: alumno.escuela?.escuela || 'Sin escuela',
      de: alumno.escuela?.de || 'Sin DE',
      grado: alumno.gradoSalaAnio,
      diagnostico: alumno.diagnostico,
      tipoDiagnostico: alumno.diagnosticoDetallado?.tipo,
      necesitaAcompañante: (alumno.necesidades || []).some((n) => n?.requiereAsistente),
      obraSocial: alumno.obraSocial?.nombre || 'Sin obra social',
      certificadoDiscapacidad: alumno.certificadoDiscapacidad?.tiene ? 'Sí' : 'No'
    }));
  }

  async buildDashboard() {
    const [
      totalEscuelas,
      totalDocentes,
      totalAlumnos,
      licenciasActivas,
      escuelasSinDocentes,
      alumnosPorDiagnostico,
      docentesPorEstado
    ] = await Promise.all([
      Escuela.countDocuments({ estado: 'activa' }),
      Docente.countDocuments({ activo: true }),
      Alumno.countDocuments({ activo: true }),
      Docente.countDocuments({ estado: 'Licencia', activo: true }),
      Escuela.countDocuments({ estado: 'activa', 'estadisticas.totalDocentes': 0 }),
      Alumno.aggregate([{ $match: { activo: true } }, { $group: { _id: '$diagnosticoDetallado.tipo', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Docente.aggregate([{ $match: { activo: true } }, { $group: { _id: '$estado', count: { $sum: 1 } } }])
    ]);

    return {
      totales: {
        escuelas: totalEscuelas,
        docentes: totalDocentes,
        alumnos: totalAlumnos,
        licenciasActivas,
        escuelasSinDocentes
      },
      distribuciones: {
        alumnosPorDiagnostico,
        docentesPorEstado
      },
      alertas: {
        licenciasProximas: await Docente.findLicenciasProximas(10).countDocuments(),
        escuelasSinDocentes
      }
    };
  }
}

module.exports = new ReporteService();
