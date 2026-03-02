# 📋 Reorganización de Estructura para Vercel

## ✅ Cambios Realizados

### 1. **Estructura de Directorios**
La estructura del proyecto ha sido reorganizada para ser compatible con Vercel:

```
/root
├── /api              → Backend (Funciones Serverless de Vercel)
│   └── index.js      → Punto de entrada de la API (copia de src/app.js)
├── /client           → Frontend (React + Vite)
│   ├── index.html    → Punto de entrada HTML
│   └── /src
│       ├── index.jsx → Punto de entrada React
│       ├── /acdm     → Código principal de la aplicación
│       ├── /application → Factories y estrategias
│       └── /infrastructure → Adaptadores HTTP
├── /src              → Código backend (Express, modelos, rutas)
├── /public           → Archivos estáticos (Sin usar en Vercel)
├── /tests            → Tests del proyecto
└── /scripts          → Scripts de utilidad
```

### 2. **Archivos Reorganizados**

#### Frontend (ahora en `/client/src/`)
- ✅ `index.html` → `client/index.html`
- ✅ `index.jsx` → `client/src/index.jsx`
- ✅ `acdm-system.jsx` → `client/src/acdm/acdm-system.jsx`
- ✅ `acdm-system-forms.jsx` → `client/src/acdm/acdm-system-forms.jsx`
- ✅ `acdm-system-sidebar.jsx` → `client/src/acdm/acdm-system-sidebar.jsx`
- ✅ `/client/acdm/*` → `/client/src/acdm/*` (todo consolidado)
- ✅ `/client/application/*` → `/client/src/application/*`
- ✅ `/client/infrastructure/*` → `/client/src/infrastructure/*`

#### Backend API
- ✅ `api/index.js` → Ahora apunta a `src/app.js` (configurado para Vercel)
- ✅ `src/` → Mantiene toda la lógica backend

### 3. **Configuraciones Actualizadas**

#### `vite.config.js`
```javascript
// ✅ root: './client' - Vite ahora construye desde client/
// ✅ outDir: '../dist' - Output va a dist/ en la raíz
```

#### `vercel.json`
```json
{
  "builds": [
    {
      "src": "client/index.html",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist",
        "buildCommand": "npm install && npm run build:frontend"
      }
    },
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "api/index.js" },
    { "src": "/(.*?)\\.(js|css|svg|png|jpg|jpeg|gif|ico|woff|woff2)$", "dest": "dist/$1.$2" },
    { "src": "^/(.*)$", "dest": "dist/index.html" }
  ]
}
```

#### `.vercelignore`
- Optimizado para no enviar archivos innecesarios a Vercel

#### `.gitignore`
- Actualizado para incluir archivos de build y .vercel/

### 4. **Imports Actualizados**

#### `client/src/index.jsx`
```javascript
// Antes: import App from './acdm-system.jsx'
// Ahora: import App from './acdm/acdm-system.jsx'
```

#### `client/src/acdm/acdm-system.jsx`
```javascript
// Antes: import apiService from "./acdm-api.js"
// Ahora: import apiService from "./services/acdmApi.js"
```

### 5. **Archivos Eliminados**
- ✅ Archivos duplicados de la raíz removidos
- ✅ Carpetas duplicadas en `/client` consolidadas en `/client/src/`

## 🚀 Próximos Pasos para Deploy en Vercel

### 1. Commit los cambios
```bash
git add .
git commit -m "feat: Reorganizar estructura de directorios para Vercel"
git push origin feature/login
```

### 2. Conectar repositorio a Vercel
- Ve a https://vercel.com/import
- Selecciona tu repositorio
- Vercel detectará automáticamente `vercel.json`

### 3. Configurar variables de entorno en Vercel
En el dashboard de Vercel, añade:
```
MONGODB_URI=<tu_uri_mongodb>
JWT_SECRET=<tu_secreto_jwt>
CORS_ORIGIN=<tu_dominio>
NODE_ENV=production
```

### 4. Deploy automático
- Cada push a `main` se desplegará automáticamente
- Los PRs tendrán previsualizaciones automáticas

## ✨ Verificación

### Build compilado correctamente
```
✓ 32 modules transformed.
✓ built in 2.06s

../dist/index.html                  0.51 kB │ gzip:  0.32 kB
../dist/assets/index-BLUqXBwd.js  255.48 kB │ gzip: 69.32 kB
```

### Estructura final validada
```
client/
├── index.html
└── src/
    ├── index.jsx
    ├── acdm/
    │   ├── acdm-system.jsx
    │   ├── acdm-system-forms.jsx
    │   ├── acdm-system-sidebar.jsx
    │   ├── components/
    │   ├── hooks/
    │   ├── sections/
    │   ├── services/
    │   └── styles/
    ├── application/
    │   └── factories/
    └── infrastructure/
        └── adapters/

api/
└── index.js (Express app para Vercel)

dist/
└── [Compilado por Vite]
```

## 📝 Notas Importantes

1. **Desarrollo local**: Usa `npm run dev:frontend` para Vite y `npm run dev` para el backend
2. **Build para Vercel**: `npm run build:frontend` crea los archivos en `dist/`
3. **API**: Sigue siendo servida por Node.js/Express en Vercel como Serverless Function
4. **CORS**: La API en `/api/*` y frontend en root están correctamente configuradas

