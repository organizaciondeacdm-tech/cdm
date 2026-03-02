#!/bin/bash

# Script para iniciar el servidor con verificación de MongoDB

echo "═══════════════════════════════════════════════════════"
echo "  INICIANDO SERVIDOR ACDM"
echo "═══════════════════════════════════════════════════════"
echo ""

# Verificar si .env.local existe
if [ ! -f .env.local ]; then
    echo "✗ Falta archivo .env.local"
    echo "Creando .env.local..."
    cp .env.local .env.local.backup 2>/dev/null || true
fi

# Verificar MongoDB
echo "Verificando MongoDB en puerto 27018..."
if nc -z localhost 27018 2>/dev/null; then
    echo "✓ MongoDB está disponible"
else
    echo "✗ MongoDB no está disponible en puerto 27018"
    echo ""
    echo "Para iniciar MongoDB:"
    echo "  sudo systemctl start mongod"
    exit 1
fi

echo ""
echo "Iniciando servidor Node.js..."
echo ""

# Ejecutar el servidor
npm run dev
