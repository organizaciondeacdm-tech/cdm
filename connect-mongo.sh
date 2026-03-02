#!/bin/bash
# Script para conectarse a MongoDB con mongosh
# Uso: ./connect-mongo.sh

echo "═══════════════════════════════════════════════════════"
echo "  CONEXIÓN A MONGODB ACDM"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Conectándose a mongodb://localhost:27018/acdm_db"
echo ""

sudo mongosh --port 27018 --authenticationDatabase admin -u admin -p secretpassword acdm_db
