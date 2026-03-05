const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');
const Escuela = require('../models/Escuela');
const Docente = require('../models/Docente');
const Alumno = require('../models/Alumno');
const connectDB = require('./database');

dotenv.config();

const seedDatabase = async () => {
  try {
    await connectDB();

    // Limpiar base de datos
    await User.deleteMany({});
    await Escuela.deleteMany({});
    await Docente.deleteMany({});
    await Alumno.deleteMany({});

    // Crear usuario admin
    const admin = await User.create({
      username: 'admin',
      passwordHash: 'Admin2025!',
      email: 'admin@acdm.gov.ar',
      nombre: 'Administrador',
      apellido: 'Sistema',
      rol: 'admin',
      permisos: ['crear_escuela', 'editar_escuela', 'eliminar_escuela',
                 'crear_docente', 'editar_docente', 'eliminar_docente',
                 'crear_alumno', 'editar_alumno', 'eliminar_alumno',
                 'exportar_datos', 'ver_reportes', 'gestionar_usuarios']
    });

    // Crear usuario viewer
    const viewer = await User.create({
      username: 'viewer',
      passwordHash: 'Viewer2025!',
      email: 'viewer@acdm.gov.ar',
      nombre: 'Visualizador',
      apellido: 'Sistema',
      rol: 'viewer',
      permisos: ['ver_reportes']
    });

    // Crear escuela 1
    const escuela1 = await Escuela.create({
      de: 'DE 01',
      escuela: 'Escuela N°1 Julio Argentino Roca',
      cue: '1234567',
      nivel: 'Primario',
      direccion: 'Av. Corrientes 1234',
      localidad: 'CABA',
      ubicacion: {
        type: 'Point',
        coordinates: [-58.3816, -34.6037]
      },
      telefonos: [{
        numero: '011-4321-1234',
        tipo: 'fijo',
        principal: true
      }],
      email: 'escuela1@bue.edu.ar',
      jornada: 'Completa',
      turno: 'Mañana',
      director: {
        nombre: 'María González',
        email: 'director1@bue.edu.ar',
        telefono: '011-4321-1235'
      },
      createdBy: admin._id
    });

    // Crear escuela 2
    const escuela2 = await Escuela.create({
      de: 'DE 02',
      escuela: 'Jardín de Infantes N°5 María Montessori',
      cue: '7654321',
      nivel: 'Inicial',
      direccion: 'Av. Santa Fe 567',
      localidad: 'CABA',
      ubicacion: {
        type: 'Point',
        coordinates: [-58.3975, -34.5958]
      },
      telefonos: [{
        numero: '011-4765-5678',
        tipo: 'fijo',
        principal: true
      }],
      email: 'jardin5@bue.edu.ar',
      jornada: 'Simple',
      turno: 'Tarde',
      director: {
        nombre: 'Carlos Rodríguez',
        email: 'director2@bue.edu.ar'
      },
      createdBy: admin._id
    });

    // Crear docente 1 (Titular con licencia)
    const docente1 = await Docente.create({
      escuela: escuela1._id,
      cargo: 'Titular',
      nombre: 'María Elena',
      apellido: 'López',
      dni: '12345678',
      cuil: '20123456789',
      fechaNacimiento: new Date('1980-05-15'),
      domicilio: {
        calle: 'Av. Rivadavia',
        numero: '5678',
        localidad: 'CABA'
      },
      telefonos: [{
        numero: '011-4321-5678',
        tipo: 'celular',
        principal: true
      }],
      email: 'mlopez@bue.edu.ar',
      estado: 'Licencia',
      motivo: 'Art. 102 - Enfermedad',
      diasAutorizados: 30,
      fechaInicioLicencia: new Date('2025-01-15'),
      fechaFinLicencia: new Date('2025-02-14'),
      createdBy: admin._id
    });

    // Crear docente 2 (Titular activo)
    const docente2 = await Docente.create({
      escuela: escuela1._id,
      cargo: 'Titular',
      nombre: 'Carlos',
      apellido: 'Rodríguez',
      dni: '87654321',
      cuil: '20876543210',
      fechaNacimiento: new Date('1985-08-20'),
      domicilio: {
        calle: 'Av. Cabildo',
        numero: '1234',
        localidad: 'CABA'
      },
      telefonos: [{
        numero: '011-4321-8765',
        tipo: 'celular',
        principal: true
      }],
      email: 'crodriguez@bue.edu.ar',
      estado: 'Activo',
      createdBy: admin._id
    });

    // Crear suplente
    const suplente1 = await Docente.create({
      escuela: escuela1._id,
      titularId: docente1._id,
      cargo: 'Suplente',
      nombre: 'Ana Clara',
      apellido: 'Fernández',
      dni: '11223344',
      cuil: '20112233445',
      fechaNacimiento: new Date('1990-03-10'),
      domicilio: {
        calle: 'Av. San Martín',
        numero: '890',
        localidad: 'CABA'
      },
      telefonos: [{
        numero: '011-4321-1122',
        tipo: 'celular',
        principal: true
      }],
      email: 'afernandez@bue.edu.ar',
      estado: 'Activo',
      fechaIngreso: new Date('2025-01-15'),
      createdBy: admin._id
    });

    // Actualizar docente1 con suplente
    docente1.suplentes.push(suplente1._id);
    await docente1.save();

    // Crear docente 3 (Jardín)
    const docente3 = await Docente.create({
      escuela: escuela2._id,
      cargo: 'Titular',
      nombre: 'Patricia',
      apellido: 'Gómez',
      dni: '99887766',
      cuil: '20998877661',
      fechaNacimiento: new Date('1975-12-05'),
      domicilio: {
        calle: 'Av. Córdoba',
        numero: '4567',
        localidad: 'CABA'
      },
      telefonos: [{
        numero: '011-4765-8765',
        tipo: 'celular',
        principal: true
      }],
      email: 'pgomez@bue.edu.ar',
      estado: 'Activo',
      createdBy: admin._id
    });

    // Crear alumno 1
    const alumno1 = await Alumno.create({
      escuela: escuela1._id,
      gradoSalaAnio: '3° Grado',
      nombre: 'Lucía',
      apellido: 'Martínez',
      dni: '55667788',
      fechaNacimiento: new Date('2015-04-12'),
      domicilio: {
        calle: 'Av. Corrientes',
        numero: '1234',
        localidad: 'CABA'
      },
      contactos: [{
        nombre: 'Laura Martínez',
        parentesco: 'Madre',
        telefono: '011-4321-5566',
        principal: true,
        autorizadoRetirar: true
      }],
      obraSocial: {
        nombre: 'OSDE',
        numeroAfiliado: '123456789'
      },
      certificadoDiscapacidad: {
        tiene: true,
        numero: 'CD123456',
        fechaEmision: new Date('2024-01-01'),
        fechaVencimiento: new Date('2026-01-01'),
        diagnosticoCie: 'F84.0'
      },
      diagnostico: 'TEA Nivel 1',
      diagnosticoDetallado: {
        tipo: 'TEA',
        nivel: 'Nivel 1',
        cie10: 'F84.0',
        observaciones: 'Requiere acompañante en recreos'
      },
      necesidades: [{
        tipo: 'asistencia_motriz',
        descripcion: 'Asistencia en recreos',
        requiereAsistente: true,
        frecuencia: 'diaria'
      }],
      observaciones: 'Buena integración con pares',
      createdBy: admin._id
    });

    // Crear alumno 2
    const alumno2 = await Alumno.create({
      escuela: escuela1._id,
      gradoSalaAnio: '3° Grado',
      nombre: 'Tomás',
      apellido: 'García',
      dni: '66778899',
      fechaNacimiento: new Date('2015-08-20'),
      domicilio: {
        calle: 'Av. Córdoba',
        numero: '5678',
        localidad: 'CABA'
      },
      contactos: [{
        nombre: 'Juan García',
        parentesco: 'Padre',
        telefono: '011-4321-6677',
        principal: true,
        autorizadoRetirar: true
      }],
      obraSocial: {
        nombre: 'Swiss Medical',
        numeroAfiliado: '987654321'
      },
      diagnostico: 'TDAH',
      diagnosticoDetallado: {
        tipo: 'TDAH',
        observaciones: 'Medicación en horario escolar'
      },
      necesidades: [{
        tipo: 'medicacion',
        descripcion: 'Requiere medicación diaria',
        requiereAsistente: true,
        frecuencia: 'diaria'
      }],
      medicacion: {
        requiere: true,
        medicamentos: [{
          nombre: 'Metilfenidato',
          dosis: '10mg',
          horario: '08:00',
          observaciones: 'Tomar después del desayuno'
        }],
        autorizacionFirmada: true
      },
      createdBy: admin._id
    });

    // Crear alumno 3 (Jardín)
    const alumno3 = await Alumno.create({
      escuela: escuela2._id,
      gradoSalaAnio: 'Sala Roja',
      nombre: 'Santiago',
      apellido: 'Pérez',
      dni: '77889900',
      fechaNacimiento: new Date('2019-03-15'),
      domicilio: {
        calle: 'Av. Santa Fe',
        numero: '567',
        localidad: 'CABA'
      },
      contactos: [{
        nombre: 'Ana Pérez',
        parentesco: 'Madre',
        telefono: '011-4765-7788',
        principal: true,
        autorizadoRetirar: true
      }],
      certificadoDiscapacidad: {
        tiene: true,
        numero: 'CD789012',
        fechaEmision: new Date('2024-02-01'),
        fechaVencimiento: new Date('2026-02-01'),
        diagnosticoCie: 'Q90.0'
      },
      diagnostico: 'Síndrome de Down',
      diagnosticoDetallado: {
        tipo: 'Síndrome Down',
        observaciones: 'Integración escolar plena'
      },
      necesidades: [{
        tipo: 'comunicacion',
        descripcion: 'Apoyo en comunicación',
        requiereAsistente: true,
        frecuencia: 'diaria'
      }],
      integracion: {
        tipo: 'plena',
        profesionales: [{
          nombre: 'Lic. Marina López',
          rol: 'Psicopedagoga',
          telefono: '011-4765-1122',
          frecuencia: 'semanal'
        }]
      },
      createdBy: admin._id
    });

    // Actualizar estadísticas de escuelas
    await escuela1.actualizarEstadisticas();
    await escuela2.actualizarEstadisticas();

    console.log('✅ Base de datos inicializada correctamente');
    console.log('👤 Usuarios creados:');
    console.log('   - admin / Admin2025!');
    console.log('   - viewer / Viewer2025!');
    console.log('📊 Datos de prueba cargados');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    process.exit(1);
  }
};

seedDatabase();
