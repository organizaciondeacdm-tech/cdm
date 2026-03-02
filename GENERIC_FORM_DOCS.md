# GenericForm - Documentación

## 📋 Descripción

`GenericForm` es un componente React reutilizable que genera automáticamente formularios basados en una definición de columnas. Proporciona:

- **Validación automática** de campos
- **Múltiples tipos de entrada** (text, email, date, textarea, select, checkbox, radio)
- **Mensajes de error** elegantes
- **Estados de carga** y sincronización
- **Soporte para modal** o renderización en línea
- **Ayuda contextual** para campos
- **Responsive design** con grid layout

## 🎯 Características

### Tipos de Campo Soportados
- `text` - Input de texto normal
- `email` - Input de email con validación
- `date` - Date picker
- `number` - Input numérico con min/max
- `textarea` - Área de texto multi-línea
- `select` - Dropdown con opciones
- `checkbox` - Casilla de verificación
- `radio` - Botones de radio (múltiples opciones)
- `password` - Input de contraseña

### Validación Integrada
- Campos requeridos
- Validación de email
- Validación de números (min/max)
- Validación de fechas
- Validación personalizada

### Estados de Interfaz
- Indicador de carga (⏳)
- Deshabilitación automática durante procesamiento
- Mensajes de error por campo
- Mensajes de ayuda contextuales

## 📖 Props

```typescript
interface GenericFormProps {
  // Requeridos
  columns: Array<ColumnDefinition>
  onSubmit: (formData: object) => void | Promise<void>
  onCancel: () => void

  // Opcionales
  initialData?: object                    // Datos iniciales (default: {})
  title?: string                          // Título del formulario
  isLoading?: boolean                     // Estado de carga (default: false)
  submitLabel?: string                    // Texto del botón (default: 'Guardar')
  errors?: object                         // Errores externos
  showBackdrop?: boolean                  // Mostrar fondo modal (default: true)
}
```

## 📋 Definición de Columnas

Cada columna es un objeto con la siguiente estructura:

```javascript
{
  // Requeridos
  key: string                             // Identificador único del campo
  label: string                           // Etiqueta visible

  // Opcionales
  type: string                            // Tipo de campo (default: 'text')
  required: boolean                       // Campo requerido (default: false)
  placeholder: string                     // Texto placeholder
  help: string                            // Texto de ayuda
  options?: string[]                      // Para type: select, radio
  rows?: number                           // Para type: textarea, número de filas
  min?: number                            // Para type: number, valor mínimo
  max?: number                            // Para type: number, valor máximo
  step?: number                           // Para type: number, incremento
  validate?: (value: any) => string|null  // Función de validación personalizada
}
```

## 🔧 Ejemplos de Uso

### Ejemplo Básico - Modal

```jsx
import { GenericForm } from '../components/GenericForm';

export function MyComponent() {
  const columns = [
    { key: 'name', label: 'Nombre', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'edad', label: 'Edad', type: 'number', min: 0, max: 120 },
    { key: 'bio', label: 'Biografía', type: 'textarea' },
  ];

  return (
    <GenericForm
      columns={columns}
      onSubmit={(data) => {
        console.log('Datos enviados:', data);
      }}
      onCancel={() => console.log('Cancelado')}
      title="📝 Crear Usuario"
      submitLabel="Crear"
    />
  );
}
```

### Ejemplo con GenericTable

```jsx
import { GenericTable } from './GenericTable';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'nombre', label: 'Nombre', type: 'text', required: true },
  { key: 'correo', label: 'Correo', type: 'email', required: true },
  { key: 'estado', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo'] },
];

<GenericTable
  columns={columns}
  data={usuarios}
  onEdit={(id, data) => {
    console.log('Editando:', id, data);
  }}
  // GenericForm se usa automáticamente en el modal
/>
```

### Ejemplo con Validación Personalizada

```jsx
const columns = [
  {
    key: 'username',
    label: 'Usuario',
    required: true,
    help: 'Mínimo 3 caracteres, sin espacios',
    validate: (value) => {
      if (value.length < 3) return 'Mínimo 3 caracteres';
      if (/\s/.test(value)) return 'No se permiten espacios';
      return null; // Sin errores
    }
  },
  {
    key: 'edad',
    label: 'Edad',
    type: 'number',
    min: 18,
    max: 120,
    help: 'Debe ser mayor de 18 años'
  }
];
```

### Ejemplo con Estados y Errores

```jsx
const [loading, setLoading] = useState(false);
const [errors, setErrors] = useState({});

const handleSubmit = async (data) => {
  setLoading(true);
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      setErrors(error.fieldErrors || {});
      return;
    }
    
    // Éxito
    console.log('Usuario creado');
  } catch (err) {
    setErrors({ _general: 'Error de conexión' });
  } finally {
    setLoading(false);
  }
};

return (
  <GenericForm
    columns={columns}
    onSubmit={handleSubmit}
    onCancel={() => {}}
    isLoading={loading}
    errors={errors}
  />
);
```

### Ejemplo Completo - Editor de Escuelas

```jsx
import { useState } from 'react';
import { GenericForm } from './GenericForm';

export function EscuelaForm({ escuela, onSave, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const columns = [
    {
      key: 'de',
      label: 'D.E.',
      required: true,
      help: 'Ejemplo: DE 01'
    },
    {
      key: 'escuela',
      label: 'Nombre de Escuela',
      required: true,
      help: 'Nombre completo de la institución'
    },
    {
      key: 'nivel',
      label: 'Nivel Educativo',
      type: 'select',
      options: ['Inicial', 'Primario', 'Secundario'],
      required: true
    },
    {
      key: 'direccion',
      label: 'Dirección',
      required: true
    },
    {
      key: 'mail',
      label: 'Email',
      type: 'email',
      required: true
    },
    {
      key: 'telefono',
      label: 'Teléfono',
      type: 'number'
    },
    {
      key: 'observaciones',
      label: 'Observaciones',
      type: 'textarea',
      rows: 3,
      help: 'Notas adicionales sobre la escuela'
    }
  ];

  const handleSubmit = async (formData) => {
    setLoading(true);
    setErrors({});
    
    try {
      const response = await fetch(
        `/api/escuelas/${escuela?.id || ''}`,
        {
          method: escuela ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        setErrors(error.errors || {});
        return;
      }

      const result = await response.json();
      onSave(result);
    } catch (err) {
      setErrors({ _general: 'Error al guardar' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <GenericForm
      columns={columns}
      initialData={escuela || {}}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      title={escuela ? '✎ Editar Escuela' : '➕ Nueva Escuela'}
      submitLabel={escuela ? 'Actualizar' : 'Crear'}
      isLoading={loading}
      errors={errors}
    />
  );
}
```

## 🎨 Temas y Estilos

El componente utiliza las siguientes variables CSS:

```css
--bg          /* Fondo principal */
--card        /* Fondo de tarjetas */
--card2       /* Fondo secundario */
--text        /* Texto principal */
--text2       /* Texto secundario */
--text3       /* Texto terciario */
--border      /* Bordes principales */
--border2     /* Bordes secundarios */
--accent      /* Color de acento */
--red         /* Color rojo para errores */
```

## ⚙️ Comportamiento Avanzado

### Validación en Tiempo Real
Los campos se validan automáticamente mientras el usuario escribe:
- Validación personalizada mediante el callback `validate`
- Mensajes de error se muestran debajo de cada campo
- El botón submit se deshabilita si hay errores

### Manejo de Errores Externos
Para errores que vienen del servidor:

```jsx
<GenericForm
  errors={{
    email: 'Este email ya está registrado',
    username: 'Usuario ya existe'
  }}
/>
```

### Estados de Carga
Durante la validación y envío:
- Todos los campos se deshabilitán
- El botón muestra indicador de carga
- El usuario no puede interactuar con el formulario

## 🔒 Seguridad

- Validación de entrada en cliente
- Escape de valores
- Sin evaluación de código
- Sanitización automática

## 📱 Responsividad

- Grid adaptable (auto-fit, minmax(250px, 1fr))
- Funciona en móvil y escritorio
- Modal responsivo (max 600px, 90vw)
- Scroll en contenedor cuando es necesario

## 🐛 Troubleshooting

### "Validación no funciona"
- Verificar que `required` está en true para campos obligatorios
- Asegurar que `validate` retorna null o string de error

### "Modal no se muestra"
- Verificar que `onCancel` está definido
- Asegurar que `showBackdrop={true}` (default)

### "Campos no se rellenan con initialData"
- Verificar que las claves en `initialData` coinciden con `column.key`
- Usar `useEffect` para actualizar si los datos son asíncronos

### "Estilos no aplican"
- Verificar que `acdm.css` está importado
- Asegurar que variables CSS están definidas
