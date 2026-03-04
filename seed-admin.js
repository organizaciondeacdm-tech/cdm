const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const User = require('./src/models/User');
require('dotenv').config();

async function seedAdmin() {
  try {
    console.log('Conectando a MongoDB...');

    await connectDB();

    console.log('✓ Conectado a MongoDB');
    // Remover todos los usuarios existentes (opcional, descomentar si se desea limpiar la colección)
    await User.deleteMany({});
    // console.log('✓ Usuarios existentes eliminados');

    // Verificar si ya existe 'andres'
    const existingAndres = await User.findOne({ username: 'andres' });
    if (!existingAndres) {
      // Crear usuario andres
      const andresUser = new User({
        username: 'andres',
        email: 'andres@acdm.local',
        nombre: 'Andres',
        apellido: 'Limitado',
        passwordHash: 'admin2025',
        rol: 'supervisor',
        permisos: [
          'crear_escuela',
          'editar_escuela',
          'eliminar_escuela',
          'crear_alumno',
          'editar_alumno',
          'eliminar_alumno',
          'crear_docente',
          'editar_docente',
          'eliminar_docente',
          'exportar_datos',
          'ver_reportes'
        ],
        isActive: true
      });
      await andresUser.save();
      console.log('✓ Usuario andres creado exitosamente');
    } else {
      console.log('✓ Usuario andres ya existe, actualizando permisos...');
      existingAndres.rol = 'supervisor';
      existingAndres.permisos = [
        'crear_escuela',
        'editar_escuela',
        'eliminar_escuela',
        'crear_alumno',
        'editar_alumno',
        'eliminar_alumno',
        'crear_docente',
        'editar_docente',
        'eliminar_docente',
        'exportar_datos',
        'ver_reportes'
      ];
      await existingAndres.save();
    }

    // Verificar si ya existe 'papiweb'
    const existingPapiweb = await User.findOne({ username: 'papiweb' });
    if (!existingPapiweb) {
      // Crear administrador papiweb
      const papiwebUser = new User({
        username: 'papiweb',
        email: 'admin@papiweb.dev',
        nombre: 'PAPIWEB',
        apellido: 'Admin',
        passwordHash: '4501{GC3{j4Quq15K$at{}uFEK8}v-+mA9B,$EC77at4Cu)iw}',
        rol: 'admin',
        permisos: ['*'], // Todos los privilegios
        isActive: true
      });
      await papiwebUser.save();
      console.log('✓ Usuario papiweb creado exitosamente');
    } else {
      console.log('✓ Usuario papiweb ya existe, asegurando permisos...');
      existingPapiweb.rol = 'admin';
      existingPapiweb.permisos = ['*'];
      await existingPapiweb.save();
    }


    console.log('✓ Seed completado');

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

seedAdmin();
