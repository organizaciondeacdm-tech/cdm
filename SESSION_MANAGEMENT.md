# CDM - Sistema de Gestión Académica

## Gestión de Sesiones

El sistema incluye funcionalidades avanzadas de gestión de sesiones para mejorar la seguridad y el control de acceso.

### Endpoints de Gestión de Sesiones

#### Para Usuarios Autenticados

**Obtener sesiones activas del usuario actual:**
```
GET /api/auth/sessions
Authorization: Bearer <access_token>
```

**Revocar una sesión específica:**
```
DELETE /api/auth/sessions/:sessionId
Authorization: Bearer <access_token>
```

**Revocar todas las sesiones (excepto la actual):**
```
DELETE /api/auth/sessions
Authorization: Bearer <access_token>
```

#### Para Administradores

**Obtener todas las sesiones activas del sistema:**
```
GET /api/admin/sessions
Authorization: Bearer <access_token> (requiere rol admin)
```

**Revocar cualquier sesión por ID:**
```
DELETE /api/admin/sessions/:sessionId
Authorization: Bearer <access_token> (requiere rol admin)
```

### Información de Sesión

Cada sesión incluye:
- `userId`: ID del usuario
- `username`: Nombre de usuario
- `deviceInfo`: Información del dispositivo (navegador, OS, IP, etc.)
- `lastActivity`: Última actividad
- `expiresAt`: Fecha de expiración del access token
- `createdAt`: Fecha de creación

### Limpieza Automática de Sesiones

Para limpiar sesiones expiradas automáticamente:

```bash
# Ejecutar manualmente
node scripts/cleanup-sessions.js

# O programar con cron (ejemplo: cada hora)
0 * * * * /usr/bin/node /path/to/project/scripts/cleanup-sessions.js
```

### Seguridad Mejorada

- **Sesiones basadas en base de datos**: Los tokens se validan contra sesiones activas en la base de datos
- **Información de dispositivo**: Se registra información del dispositivo para cada sesión
- **Revocación granular**: Permite revocar sesiones específicas o todas las sesiones de un usuario
- **Control administrativo**: Los administradores pueden ver y revocar sesiones de cualquier usuario
- **Limpieza automática**: Las sesiones expiradas se marcan como inactivas automáticamente

### Uso del Script de Pruebas

El script `test-apis.sh` incluye pruebas para los endpoints de gestión de sesiones:

```bash
# Ejecutar todas las pruebas
./test-apis.sh

# O con credenciales específicas
API_TEST_USERNAME=admin API_TEST_PASSWORD=pass ./test-apis.sh
```

### Consideraciones de Producción

1. **Limpieza programada**: Configure un cron job para ejecutar `cleanup-sessions.js` periódicamente
2. **Monitoreo**: Monitoree el número de sesiones activas para detectar actividad sospechosa
3. **Rate limiting**: Considere implementar rate limiting adicional para endpoints de sesión
4. **Logs de seguridad**: Los eventos de revocación de sesión se registran para auditoría

### Ejemplo de Uso Programático

```javascript
// Obtener sesiones activas
const response = await fetch('/api/auth/sessions', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
const sessions = await response.json();

// Revocar una sesión específica
await fetch(`/api/auth/sessions/${sessionId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```