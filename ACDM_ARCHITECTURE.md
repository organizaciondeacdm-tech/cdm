# ACDM - Sistema Refactorizado

## 📋 Descripción

Este es un sistema modular y escalable para la gestión de "Asistentes de Clase" con:

- **Arquitectura Componentes**: Componentes reutilizables y enfocados en responsabilidad única
- **CRUD Completo**: Crear, Leer, Actualizar y Eliminar para todas las entidades
- **Almacenamiento Local**: Datos persistentes con cifrado XOR + Base64
- **Tablas Genéricas**: Componentes de tabla configurables para cualquier dato
- **Análisis y Reportes**: Estadísticas, alertas y exportación de datos

## 🗂️ Estructura de Carpetas

```
client/acdm/
├── hooks/
│   └── useAcdmData.js          # Hook central para gestión de datos
├── components/
│   └── GenericTable.jsx         # Componente tabla reutilizable
├── sections/
│   ├── EscuelasSection.jsx      # Gestión de escuelas
│   ├── VisitasSection.jsx       # Registro de visitas
│   ├── ProyectosSection.jsx     # Gestión de proyectos
│   ├── InformesSection.jsx      # Gestión de informes
│   ├── AlertasSection.jsx       # Sistema de alertas automáticas
│   ├── EstadisticasSection.jsx  # Dashboard de estadísticas
│   └── ExportarSection.jsx      # Exportación de datos
├── styles/
│   └── acdm.css                 # Estilos globales del sistema
└── ACDMRefactored.jsx           # Componente principal
```

## 🎯 Funcionalidades Principales

### 1. Dashboard
- Vista general con tarjetas de resumen
- Estadísticas en tiempo real
- Tabla resumen de escuelas

### 2. Gestión de Escuelas
- CRUD completo de escuelas
- Relación con alumnos y docentes
- Contacto e información de localización

### 3. Visitas
- Registro de visitas por escuela
- Fecha, observaciones y visitante
- Edición y eliminación de registros

### 4. Proyectos
- Gestión de proyectos por escuela
- Estados (Completado, En Progreso, Pendiente)
- Fechas de inicio y cierre

### 5. Informes
- Registro de informes entregados
- Estados y fechas de entrega
- Observaciones y documentación

### 6. Alertas Automáticas
- Genera alertas de:
  - Docentes en licencia
  - Proyectos atrasados
  - Informes pendientes
- Clasificadas por severidad (Alta, Media, Baja)

### 7. Estadísticas
- Métricas generales del sistema
- Desglose por nivel educativo
- Estados de docentes
- Visualización con tarjetas coloridas

### 8. Exportación de Datos
- **JSON**: Backup completo para restauración
- **CSV**: Tabla para hojas de cálculo
- **HTML**: Reporte visual para impresión

## 🔧 Cómo Agregar Nuevas Secciones

### Paso 1: Crear el Hook (opcional, si necesita lógica custom)

```javascript
// En client/acdm/hooks/useNewFeature.js
export const useNewFeature = () => {
  // tu lógica aquí
};
```

### Paso 2: Crear la Sección

```javascript
// En client/acdm/sections/NewSection.jsx
import { GenericTable } from '../components/GenericTable';

export function NewSection({ escuela, onAdd, onUpdate, onDelete }) {
  const columns = [
    { key: 'name', label: 'Nombre' },
    { key: 'date', label: 'Fecha', type: 'date' },
  ];

  return (
    <GenericTable
      title="📌 Nueva Sección"
      columns={columns}
      data={escuela.newFeature || []}
      onAdd={(data) => onAdd(escuela.id, data)}
      onEdit={(id, data) => onUpdate(escuela.id, id, data)}
      onDelete={(id) => onDelete(escuela.id, id)}
    />
  );
}
```

### Paso 3: Agregar al Hook useAcdmData.js

```javascript
const addNewFeature = useCallback((escuelaId, data) => {
  setData(prev => ({
    ...prev,
    escuelas: prev.escuelas.map(e => 
      e.id === escuelaId 
        ? { ...e, newFeature: [...(e.newFeature || []), { ...data, id: `nf${Date.now()}` }] }
        : e
    )
  }));
}, []);

// Exponer en el return del hook
return {
  // ... otros métodos
  addNewFeature,
};
```

### Paso 4: Agregar a ACDMRefactored.jsx

```javascript
// En los menuItems
{ id: 'newfeature', label: 'Nueva', icon: '📌', color: 'var(--accent)' }

// En renderContent
case 'newfeature':
  return selectedEscuela ? (
    <NewSection
      escuela={selectedEscuela}
      onAdd={addNewFeature}
      onUpdate={updateNewFeature}
      onDelete={deleteNewFeature}
    />
  ) : (
    <div className="card">Selecciona una escuela</div>
  );
```

## 💾 Gestión de Datos

### Estructura de Datos

```javascript
{
  escuelas: [
    {
      id: "e1",
      de: "DE 01",
      escuela: "Nombre de la Escuela",
      nivel: "Primario",
      direccion: "Dirección",
      mail: "email@example.com",
      telefonos: ["011-1234-5678"],
      alumnos: [{...}],
      docentes: [{...}],
      visitas: [{...}],
      proyectos: [{...}],
      informes: [{...}]
    }
  ]
}
```

### Almacenamiento
- **Local**: localStorage con cifrado XOR + Base64
- **Persistencia**: Automática en cada cambio
- **Restauración**: Al recargar la página

## 🎨 Personalización de Estilos

### Variables CSS Disponibles

```css
--bg: #0a1218;           /* Fondo principal */
--card: #131d2a;         /* Fondo de tarjetas */
--text: #e8eef5;         /* Texto principal */
--text2: #a8b5c7;        /* Texto secundario */
--accent: #00d4ff;       /* Color de acento */
--green: #00d966;        /* Verde */
--red: #ff4757;          /* Rojo */
--yellow: #ffc100;       /* Amarillo */
```

Modificar en `client/acdm/styles/acdm.css`

## 🚀 Deployment

### Build
```bash
npm run build:frontend
```

### Vercel
El archivo `vercel.json` está configurado para servir el frontend desde `dist/`.

## 📊 Componentes Reutilizables

### GenericTable

```javascript
<GenericTable
  title="Título de la tabla"
  columns={[
    { key: 'name', label: 'Nombre' },
    { key: 'date', label: 'Fecha', type: 'date' },
    { key: 'status', label: 'Estado', render: (value) => <strong>{value}</strong> }
  ]}
  data={arrayData}
  onAdd={(data) => console.log('Agregar:', data)}
  onEdit={(id, data) => console.log('Editar:', id, data)}
  onDelete={(id) => console.log('Eliminar:', id)}
  emptyMessage="Sin registros"
/>
```

## 🔐 Seguridad

- Datos cifrados en localStorage
- No se envían a servidores sin autenticación
- Para producción, usar:
  - Autenticación Bearer Token
  - HTTPS
  - Variables de entorno protegidas

## 📝 Notas

- El sistema usa localStorage, datos se pierden si se limpian cookies
- Para persistencia duradera, implementar Backend API
- Todos los componentes son funcionales y usan Hooks de React
- Compatible con React 18+

## 🛠️ Troubleshooting

### El build falla
```bash
rm -rf node_modules dist
npm install
npm run build:frontend
```

### Datos no persisten
- Verificar que localStorage no esté deshabilitado
- Verificar en DevTools > Application > Local Storage

### La tabla no actualiza
- Asegurar que `key` en columns coincida con propiedades del objeto
- Verificar que onAdd, onEdit, onDelete están conectados correctamente
