const mongoose = require('mongoose');
const User = require('./src/models/User');
const Escuela = require('./src/models/Escuela');
const Docente = require('./src/models/Docente');
const Alumno = require('./src/models/Alumno');
require('dotenv').config();

async function seedData() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/acdm_db';
    console.log('Conectando a MongoDB...');
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000
    });
    
    console.log('✓ Conectado a MongoDB');
    
    // Obtener usuario admin
    const admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      throw new Error('Usuario admin no encontrado. Ejecuta node seed-admin.js primero');
    }
    
    // Verificar si ya existen datos
    const existingEscuelas = await Escuela.countDocuments();
    if (existingEscuelas > 0) {
      console.log('✓ Datos ya existen en la BD');
      await mongoose.disconnect();
      return;
    }
    
    // Crear escuelas
    const escuelas = await Escuela.create([
      {
        de: 'DE 01',
        escuela: 'Escuela Primaria 1º de Mayo',
        nivel: 'Primario',
        jornada: 'Simple',
        turno: 'Mañana',
        direccion: 'Avenida Siempre Viva 123, Buenos Aires',
        localidad: 'Buenos Aires',
        codigoPostal: '1425',
        ubicacion: {
          type: 'Point',
          coordinates: [-58.4534, -34.6037]
        },
        telefonos: [{ numero: '1123456789', tipo: 'fijo', principal: true }],
        email: 'primaria.mayo@edu.ar',
        director: { nombre: 'Carlos García López' },
        estado: 'activa',
        createdBy: admin._id
      },
      {
        de: 'DE 02',
        escuela: 'Escuela Secundaria Tecnológica',
        nivel: 'Secundario',
        jornada: 'Completa',
        turno: 'Tarde',
        direccion: 'Calle Principal 456, Buenos Aires',
        localidad: 'Buenos Aires',
        codigoPostal: '1426',
        ubicacion: {
          type: 'Point',
          coordinates: [-58.4635, -34.6137]
        },
        telefonos: [{ numero: '1123456790', tipo: 'fijo', principal: true }],
        email: 'sec.tecnologica@edu.ar',
        director: { nombre: 'María Rodríguez' },
        estado: 'activa',
        createdBy: admin._id
      },
      {
        de: 'DE 03',
        escuela: 'Instituto Normal de Magisterio',
        nivel: 'Especial',
        jornada: 'Extendida',
        turno: 'Mañana',
        direccion: 'Paseo de la República 789, Buenos Aires',
        localidad: 'Buenos Aires',
        codigoPostal: '1427',
        ubicacion: {
          type: 'Point',
          coordinates: [-58.4736, -34.6237]
        },
        telefonos: [{ numero: '1123456791', tipo: 'fijo', principal: true }],
        email: 'instituto.magisterio@edu.ar',
        director: { nombre: 'Juan Martínez' },
        estado: 'activa',
        createdBy: admin._id
      }
    ]);
    
    console.log(`✓ ${escuelas.length} escuelas creadas`);
    
    // Crear docentes
    const docentes = await Docente.create([
      {
        nombre: 'Ana',
        apellido: 'García',
        email: 'ana.garcia@edu.ar',
        dni: '12345678',
        fechaNacimiento: new Date('1985-05-10'),
        cargo: 'Titular',
        telefonos: [{ numero: '1145678901', tipo: 'celular', principal: true }],
        especialidad: 'Matemática',
        escuela: escuelas[0]._id,
        activo: true,
        createdBy: admin._id
      },
      {
        nombre: 'Roberto',
        apellido: 'López',
        email: 'roberto.lopez@edu.ar',
        dni: '23456789',
        fechaNacimiento: new Date('1988-08-15'),
        cargo: 'Titular',
        telefonos: [{ numero: '1156789012', tipo: 'celular', principal: true }],
        especialidad: 'Lengua',
        escuela: escuelas[0]._id,
        activo: true,
        createdBy: admin._id
      },
      {
        nombre: 'Gabriela',
        apellido: 'Sánchez',
        email: 'gabriela.sanchez@edu.ar',
        dni: '34567890',
        fechaNacimiento: new Date('1990-03-20'),
        cargo: 'Titular',
        telefonos: [{ numero: '1167890123', tipo: 'celular', principal: true }],
        especialidad: 'Ciencias',
        escuela: escuelas[1]._id,
        activo: true,
        createdBy: admin._id
      },
      {
        nombre: 'Pedro',
        apellido: 'Díaz',
        email: 'pedro.diaz@edu.ar',
        dni: '45678901',
        fechaNacimiento: new Date('1992-11-25'),
        cargo: 'Titular',
        telefonos: [{ numero: '1178901234', tipo: 'celular', principal: true }],
        especialidad: 'Educación Física',
        escuela: escuelas[1]._id,
        activo: true,
        createdBy: admin._id
      }
    ]);
    
    console.log(`✓ ${docentes.length} docentes creados`);
    
    // Crear alumnos
    const alumnos = await Alumno.create([
      {
        nombre: 'Lucas',
        apellido: 'Fernández',
        email: 'lucas.fernandez@student.ar',
        dni: '55123456',
        fechaNacimiento: new Date('2010-07-14'),
        gradoSalaAnio: '6to',
        division: 'A',
        escuela: escuelas[0]._id,
        contactos: [{ nombre: 'Marta Fernández', parentesco: 'Madre', principal: true }],
        diagnostico: 'Normal',
        activo: true,
        createdBy: admin._id
      },
      {
        nombre: 'Sofía',
        apellido: 'Martínez',
        email: 'sofia.martinez@student.ar',
        dni: '56234567',
        fechaNacimiento: new Date('2010-09-22'),
        gradoSalaAnio: '6to',
        division: 'A',
        escuela: escuelas[0]._id,
        contactos: [{ nombre: 'Jorge Martínez', parentesco: 'Padre', principal: true }],
        diagnostico: 'Normal',
        activo: true,
        createdBy: admin._id
      },
      {
        nombre: 'Tomás',
        apellido: 'González',
        email: 'tomas.gonzalez@student.ar',
        dni: '57345678',
        fechaNacimiento: new Date('2010-11-05'),
        gradoSalaAnio: '6to',
        division: 'B',
        escuela: escuelas[0]._id,
        contactos: [{ nombre: 'Patricia González', parentesco: 'Madre', principal: true }],
        diagnostico: 'Normal',
        activo: true,
        createdBy: admin._id
      },
      {
        nombre: 'Martina',
        apellido: 'Rodríguez',
        email: 'martina.rodriguez@student.ar',
        dni: '58456789',
        fechaNacimiento: new Date('2008-02-18'),
        gradoSalaAnio: '1ro',
        division: 'A',
        turno: 'Tarde',
        escuela: escuelas[1]._id,
        contactos: [{ nombre: 'Carlos Rodríguez', parentesco: 'Padre', principal: true }],
        diagnostico: 'Normal',
        activo: true,
        createdBy: admin._id
      },
      {
        nombre: 'Julián',
        apellido: 'López',
        email: 'julian.lopez@student.ar',
        dni: '59567890',
        fechaNacimiento: new Date('2007-06-30'),
        gradoSalaAnio: '2do',
        division: 'B',
        turno: 'Tarde',
        escuela: escuelas[1]._id,
        contactos: [{ nombre: 'Daniela López', parentesco: 'Madre', principal: true }],
        diagnostico: 'Normal',
        activo: true,
        createdBy: admin._id
      }
    ]);
    
    console.log(`✓ ${alumnos.length} alumnos creados`);
    
    await mongoose.disconnect();
    console.log('✓ Seed de datos completado');
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

seedData();
