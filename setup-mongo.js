#!/usr/bin/env node

/**
 * Script de Configuración de MongoDB para ACDM
 * Inicializa la base de datos con usuarios, índices y datos de prueba
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGODB_URI;
const ADMIN_USER = 'admin';
const ADMIN_PASSWORD = process.env.JWT_SECRET || 'admin2025';

// Modelos
const User = require('./src/models/User');
const Escuela = require('./src/models/Escuela');
const Docente = require('./src/models/Docente');
const Alumno = require('./src/models/Alumno');
const FormTemplate = require('./src/models/FormTemplate');
const FormSubmission = require('./src/models/FormSubmission');

const color = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${color.cyan}ℹ ${msg}${color.reset}`),
  success: (msg) => console.log(`${color.green}✓ ${msg}${color.reset}`),
  warn: (msg) => console.log(`${color.yellow}⚠ ${msg}${color.reset}`),
  error: (msg) => console.log(`${color.red}✗ ${msg}${color.reset}`),
  section: (msg) => console.log(`\n${color.blue}${msg}${color.reset}\n`)
};

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000
    });
    log.success('Conectado a MongoDB');
    return true;
  } catch (error) {
    log.error(`Error conectando a MongoDB: ${error.message}`);
    return false;
  }
}

async function createAdminUser() {
  log.section('👤 CREANDO USUARIO ADMIN');

  try {
    let admin = await User.findOne({ username: ADMIN_USER });

    if (admin) {
      log.warn(`Usuario admin ya existe`);
      return admin;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

    admin = await User.create({
      username: ADMIN_USER,
      email: 'admin@acdm.test',
      passwordHash,
      nombre: 'Administrador',
      apellido: 'ACDM',
      rol: 'admin',
      permisos: [
        'crear_escuela', 'editar_escuela', 'eliminar_escuela',
        'crear_docente', 'editar_docente', 'eliminar_docente',
        'crear_alumno', 'editar_alumno', 'eliminar_alumno',
        'exportar_datos', 'ver_reportes', 'gestionar_usuarios'
      ],
      isActive: true
    });

    log.success(`Usuario admin creado: ${ADMIN_USER} / ${ADMIN_PASSWORD}`);
    return admin;
  } catch (error) {
    log.error(`Error creando usuario admin: ${error.message}`);
    throw error;
  }
}

async function createTestData(admin) {
  log.section('📚 CREANDO DATOS DE PRUEBA');

  try {
    // Crear escuelas
    let escuelas = await Escuela.find();
    if (escuelas.length === 0) {
      escuelas = await Escuela.create([
        {
          escuela: 'Escuela Primaria "25 de Mayo"',
          de: 'La Plata',
          direccion: 'Calle 1, No. 100',
          nivel: 'Primaria',
          estado: 'Activa',
          createdBy: admin._id
        },
        {
          escuela: 'Colegio Secundario "San Martín"',
          de: 'La Plata',
          direccion: 'Calle 50, No. 500',
          nivel: 'Secundaria',
          estado: 'Activa',
          createdBy: admin._id
        }
      ]);
      log.success(`${escuelas.length} escuelas creadas`);
    } else {
      log.warn(`${escuelas.length} escuelas ya existen`);
    }

    // Crear docentes
    let docentes = await Docente.find();
    if (docentes.length === 0) {
      docentes = await Docente.create([
        {
          nombre: 'Juan',
          apellido: 'García',
          dni: '12345678',
          email: 'juan@acdm.test',
          telefono: '1234567890',
          escuela: escuelas[0]._id,
          cargo: 'Maestro de Grado',
          estado: 'Activo',
          activo: true,
          createdBy: admin._id
        },
        {
          nombre: 'María',
          apellido: 'López',
          dni: '87654321',
          email: 'maria@acdm.test',
          telefono: '0987654321',
          escuela: escuelas[1]._id,
          cargo: 'Profesor',
          estado: 'Activo',
          activo: true,
          createdBy: admin._id
        }
      ]);
      log.success(`${docentes.length} docentes creados`);
    } else {
      log.warn(`${docentes.length} docentes ya existen`);
    }

    // Crear alumnos
    let alumnos = await Alumno.find();
    if (alumnos.length === 0) {
      alumnos = await Alumno.create([
        {
          nombre: 'Carlos',
          apellido: 'Pérez',
          dni: '11111111',
          escuela: escuelas[0]._id,
          gradoSalaAnio: '3° A',
          activo: true,
          createdBy: admin._id
        },
        {
          nombre: 'Ana',
          apellido: 'Martínez',
          dni: '22222222',
          escuela: escuelas[0]._id,
          gradoSalaAnio: '3° A',
          activo: true,
          createdBy: admin._id
        }
      ]);
      log.success(`${alumnos.length} alumnos creados`);
    } else {
      log.warn(`${alumnos.length} alumnos ya existen`);
    }

  } catch (error) {
    log.error(`Error creando datos de prueba: ${error.message}`);
    throw error;
  }
}

async function createIndexes() {
  log.section('📇 CREANDO ÍNDICES');

  try {
    // Índices de User
    await User.collection.createIndex({ username: 1 }, { unique: true });
    await User.collection.createIndex({ email: 1 }, { unique: true });
    log.success('Índices User creados');

    // Índices de Escuela
    await Escuela.collection.createIndex({ escuela: 1 });
    await Escuela.collection.createIndex({ de: 1 });
    log.success('Índices Escuela creados');

    // Índices de Docente
    await Docente.collection.createIndex({ escuela: 1 });
    await Docente.collection.createIndex({ email: 1 }, { unique: true });
    log.success('Índices Docente creados');

    // Índices de Alumno
    await Alumno.collection.createIndex({ escuela: 1 });
    await Alumno.collection.createIndex({ dni: 1 }, { unique: true });
    log.success('Índices Alumno creados');

    // Índices de FormSubmission
    await FormSubmission.collection.createIndex({ userId: 1 });
    await FormSubmission.collection.createIndex({ templateId: 1 });
    log.success('Índices FormSubmission creados');

  } catch (error) {
    log.warn(`Algunos índices ya existen: ${error.message}`);
  }
}

async function main() {
  console.log(`
${color.cyan}╔═══════════════════════════════════════════════════════╗
║     CONFIGURACIÓN DE MONGODB PARA ACDM                 ║
╚═══════════════════════════════════════════════════════╝${color.reset}
  `);

  try {
    // Conectar a MongoDB
    const connected = await connectDB();
    if (!connected) {
      process.exit(1);
    }

    // Crear usuario admin
    const admin = await createAdminUser();

    // Crear datos de prueba
    await createTestData(admin);

    // Crear índices
    await createIndexes();

    log.section('🎉 CONFIGURACIÓN COMPLETADA');
    console.log(`
${color.green}Base de datos: ${MONGO_URI}
Usuario: admin
Contraseña: ${ADMIN_PASSWORD}

Para conectarse a MongoDB:
  ${color.cyan}./connect-mongo.sh${color.reset}

Para iniciar el servidor:
  ${color.cyan}npm run dev${color.reset}
    `);

  } catch (error) {
    log.error(`Error fatal: ${error.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.success('Desconectado de MongoDB');
  }
}

main();
