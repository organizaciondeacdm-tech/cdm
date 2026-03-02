#!/usr/bin/env node

/**
 * Script de diagnóstico: Verifica la conexión MongoDB
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

console.log('╔═════════════════════════════════════════════════════════╗');
console.log('║  DIAGNÓSTICO DE CONEXIÓN MONGODB                       ║');
console.log('╚═════════════════════════════════════════════════════════╝\n');

// Mostrar configuración
console.log('📋 CONFIGURACIÓN:');
console.log('  MONGODB_URI:', process.env.MONGODB_URI);
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('');

// Verificar puerto
console.log('🔍 VERIFICANDO PUERTO MONGODB:');
const net = require('net');
const socket = new net.Socket();

socket.setTimeout(3000);
socket.on('connect', () => {
  console.log('  ✓ Puerto 27018 está abierto');
  socket.destroy();
  testConnection();
});

socket.on('timeout', () => {
  console.log('  ✗ Timeout conectando a puerto 27018');
  socket.destroy();
  process.exit(1);
});

socket.on('error', (err) => {
  console.log('  ✗ Error: ' + err.message);
  socket.destroy();
  process.exit(1);
});

socket.connect(27018, 'localhost');

// Probar conexión Mongoose
async function testConnection() {
  console.log('');
  console.log('🔗 PROBANDO CONEXIÓN MONGOOSE:');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000
    });
    
    console.log('  ✓ Conectado a MongoDB');
    console.log('  Base de datos:', mongoose.connection.name);
    console.log('  Host:', mongoose.connection.host);
    console.log('  Puerto:', mongoose.connection.port);
    
    // Listar colecciones
    console.log('');
    console.log('📊 COLECCIONES:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    if (collections.length === 0) {
      console.log('  ⚠️  No hay colecciones');
    } else {
      collections.forEach(col => {
        console.log('  •', col.name);
      });
    }
    
    // Verificar usuario admin
    console.log('');
    console.log('👤 VERIFICANDO USUARIO ADMIN:');
    const User = require('./src/models/User');
    const admin = await User.findOne({ username: 'admin' });
    
    if (admin) {
      console.log('  ✓ Usuario admin encontrado');
      console.log('    Email:', admin.email);
      console.log('    Rol:', admin.rol);
      console.log('    Activo:', admin.isActive);
    } else {
      console.log('  ✗ Usuario admin NO encontrado');
      console.log('    Ejecutar: node fix-admin.js');
    }
    
    console.log('');
    console.log('✅ DIAGNÓSTICO COMPLETADO\n');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.log('  ✗ Error de conexión:', error.message);
    console.log('');
    console.log('💡 POSIBLES SOLUCIONES:');
    console.log('  1. Reiniciar MongoDB: sudo systemctl restart mongod');
    console.log('  2. Verificar credenciales en .env.local');
    console.log('  3. Verificar puerto 27018: nc -zv localhost 27018');
    console.log('  4. Ver logs: sudo journalctl -u mongod -n 50');
    process.exit(1);
  }
}
