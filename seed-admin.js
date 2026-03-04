const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const User = require('./src/models/User');
require('dotenv').config();

async function seedAdmin() {
  try {
    console.log('Conectando a MongoDB...');
    
    await connectDB();
    
    console.log('✓ Conectado a MongoDB');
    
    // Verificar si ya existe
    const existingUser = await User.findOne({ username: 'admin' });
    if (existingUser) {
      console.log('✓ Usuario admin ya existe');
      return;
    }
    
    // Crear usuario admin
    const adminUser = new User({
      username: 'admin',
      email: 'admin@acdm.local',
      nombre: 'Administrador',
      apellido: 'Sistema',
      passwordHash: 'admin2025',
      rol: 'admin',
      permisos: [
        'crear_escuela',
        'editar_escuela',
        'eliminar_escuela',
        'crear_alumno',
        'editar_alumno',
        'eliminar_alumno',
        'crear_docente',
        'editar_docente',
        'eliminar_docente'
      ],
      isActive: true
    });
    
    await adminUser.save();
    console.log('✓ Usuario admin creado exitosamente');
    
    // Crear usuario docente de prueba
    const docenteUser = new User({
      username: 'docente1',
      email: 'docente1@acdm.local',
      nombre: 'Juan',
      apellido: 'Docente',
      passwordHash: 'docente2025',
      rol: 'supervisor',
      permisos: [
        'crear_alumno',
        'editar_alumno',
        'ver_reportes'
      ],
      isActive: true
    });
    
    await docenteUser.save();
    console.log('✓ Usuario docente creado exitosamente');
    
    console.log('✓ Seed completado');
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

seedAdmin();
