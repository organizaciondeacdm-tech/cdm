# GenericTable - Documentación Actualizada

## 🎯 Características Principales

El componente `GenericTable` es un componente React reutilizable y altamente configurable que proporciona:

### 1. **Búsqueda Global**
- Búsqueda en tiempo real a través de todas las columnas visibles
- Campo de búsqueda en la barra de herramientas
- Filtrado automático de resultados

### 2. **Ordenamiento por Columna**
- Click en el encabezado para ordenar
- Indicador visual del estado de ordenamiento (↑ ascendente, ↓ descendente)
- Soporte para tipos de datos: texto, números, fechas

### 3. **Filtros Avanzados por Columna**
- Panel desplegable con filtros individuales por columna
- Generación automática de valores únicos
- Soporte para select dropdowns (predefinidos o dinámicos)
- Botón para limpiar todos los filtros

### 4. **Mostrar/Ocultar Columnas**
- Selector de columnas con checkboxes
- Persistencia de preferencias en el componente
- Menú desplegable fácil de usar

### 5. **Paginación**
- Navegación entre páginas configurable
- Items por página personalizable
- Indicadores de página actual y total
- Botones de primera, anterior, siguiente y última página

### 6. **CRUD Completo**
- Crear nuevos registros
- Editar registros existentes
- Eliminar registros con confirmación
- Modal de edición/creación

### 7. **Conectividad a API**
- Sincronización bidireccional con servidor
- Estados de carga y sincronización
- Manejo automático de errores
- Retry automático (configurable)

### 8. **Gestión de Estados**
- Estados de carga (loading)
- Estados de sincronización (syncing)
- Mensajes de error elegantes
- Estados deshabilitados durante operaciones

## 📋 Props del Componente

```jsx
<GenericTable
  // Requeridos
  title={string}                    // Título de la tabla
  columns={Array}                   // Configuración de columnas
  data={Array}                      // Datos a mostrar
  onAdd={Function}                  // Callback para agregar
  onEdit={Function}                 // Callback para editar
  onDelete={Function}               // Callback para eliminar

  // Opcionales
  onFetch={Function}                // Callback para cargar datos (API)
  enableRemoteSync={boolean}        // Habilitar sincronización (default: false)
  emptyMessage={string}             // Mensaje cuando no hay datos
  itemsPerPage={number}             // Items por página (default: 10)
/>
```

## 🔧 Configuración de Columnas

Cada columna es un objeto con la siguiente estructura:

```javascript
{
  key: 'nombreField',              // Clave del campo en los datos
  label: 'Nombre Columna',         // Etiqueta visible
  type: 'text',                    // Tipo: text, email, date, textarea, select
  options: [...],                  // Para type: select, opciones disponibles
  render: (value, row) => {...}    // Función personalizada de renderización
}
```

### Tipos de Campo Soportados

- **text**: Input de texto normal
- **email**: Input de email
- **date**: Date picker
- **textarea**: Área de texto multi-línea
- **select**: Dropdown con opciones (predefinidas en `options`)

## 🎨 Ejemplo de Uso Básico

```jsx
import { GenericTable } from '../components/GenericTable';

export function MiTabla() {
  const [datos, setDatos] = useState([
    { id: '1', nombre: 'Juan', estado: 'Activo' },
    { id: '2', nombre: 'María', estado: 'Activo' },
  ]);

  const columns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'estado', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo'] },
  ];

  return (
    <GenericTable
      title="Gestión de Usuarios"
      columns={columns}
      data={datos}
      onAdd={(data) => {
        const newData = { ...data, id: Date.now() };
        setDatos([...datos, newData]);
      }}
      onEdit={(id, data) => {
        setDatos(datos.map(item => item.id === id ? data : item));
      }}
      onDelete={(id) => {
        setDatos(datos.filter(item => item.id !== id));
      }}
      itemsPerPage={20}
    />
  );
}
```

## 🔗 Ejemplo con API (Sincronización con Servidor)

```jsx
import { GenericTable } from '../components/GenericTable';
import { acdmApi } from '../services/acdmApi';

export function EscuelasConAPI() {
  const [escuelas, setEscuelas] = useState([]);

  const columns = [
    { key: 'de', label: 'D.E.' },
    { key: 'escuela', label: 'Escuela' },
    { key: 'nivel', label: 'Nivel', type: 'select', options: ['Inicial', 'Primario', 'Secundario'] },
    { key: 'mail', label: 'Email', type: 'email' },
  ];

  return (
    <GenericTable
      title="🏫 Escuelas"
      columns={columns}
      data={escuelas}
      onAdd={async (data) => {
        const result = await acdmApi.createEscuela(data);
        setEscuelas([...escuelas, result]);
      }}
      onEdit={async (id, data) => {
        await acdmApi.updateEscuela(id, data);
        setEscuelas(escuelas.map(e => e.id === id ? data : e));
      }}
      onDelete={async (id) => {
        await acdmApi.deleteEscuela(id);
        setEscuelas(escuelas.filter(e => e.id !== id));
      }}
      onFetch={async () => {
        const result = await acdmApi.getEscuelas();
        return result.data || result;
      }}
      enableRemoteSync={true}
      itemsPerPage={15}
    />
  );
}
```

## 🔄 API Service (acdmApi)

El servicio `acdmApi` proporciona métodos para comunicarse con el backend:

```javascript
// Escuelas
await acdmApi.getEscuelas(params)
await acdmApi.getEscuela(id)
await acdmApi.createEscuela(data)
await acdmApi.updateEscuela(id, data)
await acdmApi.deleteEscuela(id)

// Visitas
await acdmApi.getVisitas(escuelaId, params)
await acdmApi.createVisita(escuelaId, data)
await acdmApi.updateVisita(escuelaId, visitaId, data)
await acdmApi.deleteVisita(escuelaId, visitaId)

// Proyectos
await acdmApi.getProyectos(escuelaId, params)
await acdmApi.createProyecto(escuelaId, data)
await acdmApi.updateProyecto(escuelaId, proyectoId, data)
await acdmApi.deleteProyecto(escuelaId, proyectoId)

// Informes
await acdmApi.getInformes(escuelaId, params)
await acdmApi.createInforme(escuelaId, data)
await acdmApi.updateInforme(escuelaId, informeId, data)
await acdmApi.deleteInforme(escuelaId, informeId)

// Estadísticas
await acdmApi.getEstadisticas()
await acdmApi.getEstadisticasPorEscuela(escuelaId)

// Alertas
await acdmApi.getAlertas(params)
await acdmApi.acknowledgeAlerta(alertaId)

// Búsqueda
await acdmApi.buscar(query, tipo)

// Exportación
await acdmApi.exportarJSON()
await acdmApi.exportarCSV()
```

## 🎯 Callbacks CRUD

### onAdd
```javascript
onAdd={async (formData) => {
  // formData contiene los valores del formulario
  // Debe guardar los datos (localmente o en API)
  // Si falla, lanzar un error: throw new Error('mensaje')
}}
```

### onEdit
```javascript
onEdit={async (id, formData) => {
  // id: identificador del registro
  // formData: nuevos valores
  // Actualizar los datos existentes
}}
```

### onDelete
```javascript
onDelete={async (id) => {
  // id: identificador del registro a eliminar
  // Eliminar el registro
}}
```

### onFetch (opcional)
```javascript
onFetch={async () => {
  // Llamar a la API para obtener datos frescos
  // Retornar array de datos
  // Si falla, lanzar un error
  return await acdmApi.getEscuelas();
}}
```

## ⚠️ Manejo de Errores

El componente maneja automáticamente:
- Errores de validación
- Errores de conexión a API
- Errores de timeout
- Confirmación antes de eliminar

Los errores se muestran en un banner elegante en la parte superior de la tabla.

## 🚀 Características Avanzadas

### Renderización Personalizada
```javascript
const columns = [
  {
    key: 'nombre',
    label: 'Nombre',
    render: (value, row) => (
      <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>
        {value}
      </span>
    )
  }
];
```

### Estados Condicionales
```javascript
const columns = [
  {
    key: 'estado',
    label: 'Estado',
    type: 'select',
    options: ['Activo', 'Inactivo', 'Bloqueado'],
    render: (value) => {
      const colors = {
        'Activo': 'green',
        'Inactivo': 'gray',
        'Bloqueado': 'red'
      };
      return <span style={{ color: colors[value] }}>{value}</span>;
    }
  }
];
```

## 📊 Performance

- Paginación automática para grandes conjuntos de datos
- Ordenamiento eficiente con memoización
- Filtrado optimizado
- Sincronización no bloqueante

## 🔐 Seguridad

- CORS habilitado
- Bearer token en headers
- Sanitización de datos
- Validación de entrada

## 📝 Variables de Entorno

```bash
# .env.local
VITE_API_URL=http://localhost:5000/api
VITE_ENABLE_REMOTE_SYNC=true
```

## 🛠️ Troubleshooting

### La tabla no muestra datos
- Verificar que `data` está siendo pasado correctamente
- Revisar la consola para errores

### Los filtros no funcionan
- Asegurar que `key` en columns coincide con propiedades del objeto
- Verificar que los valores existen en los datos

### API no conecta
- Verificar `VITE_API_URL` en `.env.local`
- Verificar que el backend está corriendo
- Revisar CORS en el servidor

### Cambios no persisten
- Asegurar que `onFetch` está siendo llamado después de operaciones CRUD
- Verificar que la respuesta de la API tiene la estructura esperada
