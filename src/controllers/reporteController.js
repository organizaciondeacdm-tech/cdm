const BaseController = require('./BaseController');
const reporteService = require('../services/acdm/reporteService');

const generarReporteEscuelas = BaseController.handle(async (req, res) => {
  const formato = req.query.formato || 'json';
  const reporte = await reporteService.buildEscuelasReport(req.query.filtros);

  if (formato === 'csv') {
    const csv = reporteService.toCsv(reporte);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_escuelas.csv');
    return res.send(csv);
  }

  if (formato === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_escuelas.pdf');
    reporteService.writePdf(res, reporte);
    return undefined;
  }

  return res.json({
    success: true,
    data: reporte,
    metadata: {
      total: reporte.length,
      generado: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
      usuario: req.user?.username
    }
  });
}, { defaultMessage: 'Error al generar reporte' });

const generarReporteLicencias = BaseController.handle(async (_req, res) => {
  const data = await reporteService.buildLicenciasReport();
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error al generar reporte de licencias' });

const generarReporteAlumnos = BaseController.handle(async (req, res) => {
  const data = await reporteService.buildAlumnosReport(req.query);
  return res.json({
    success: true,
    data,
    metadata: {
      total: data.length,
      filtros: { diagnostico: req.query.diagnostico, escuela: req.query.escuela }
    }
  });
}, { defaultMessage: 'Error al generar reporte de alumnos' });

const generarDashboard = BaseController.handle(async (_req, res) => {
  const data = await reporteService.buildDashboard();
  return BaseController.ok(res, data);
}, { defaultMessage: 'Error al generar dashboard' });

module.exports = {
  generarReporteEscuelas,
  generarReporteLicencias,
  generarReporteAlumnos,
  generarDashboard
};
