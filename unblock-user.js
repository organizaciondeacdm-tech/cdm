const mongoose = require('mongoose');
const connectDB = require('./src/config/database');
const User = require('./src/models/User');
require('dotenv').config();

async function unblockUser() {
    try {
        const username = process.argv[2];

        if (!username) {
            console.error('Error: Debe proporcionar un nombre de usuario como argumento.');
            console.log('Uso: node unblock-user.js <nombre_de_usuario>');
            process.exit(1);
        }

        console.log('Conectando a MongoDB...');
        await connectDB();
        console.log('✓ Conectado a MongoDB');

        const usernameLower = username.toLowerCase();

        // Buscar directamente saltando algunos hooks si fuera necesario, pero findOne está bien
        const user = await User.findOne({ username: usernameLower });

        if (!user) {
            console.log(`✗ No se encontró ningún usuario con el nombre "${username}"`);
            process.exit(0);
        }

        const isLocked = user.lockUntil && new Date(user.lockUntil) > new Date();

        if (!isLocked && (!user.loginAttempts || user.loginAttempts === 0)) {
            console.log(`✓ El usuario "${username}" no se encuentra bloqueado por intentos fallidos.`);
            process.exit(0);
        }

        // Desbloquear usuario a través de updateOne para mayor limpieza
        await User.updateOne(
            { _id: user._id },
            {
                $set: { loginAttempts: 0 },
                $unset: { lockUntil: 1 }
            }
        );

        console.log(`✓ Usuario "${username}" ha sido debloqueado exitosamente.`);
        process.exit(0);

    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

unblockUser();
