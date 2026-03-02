import { GenericTable } from '../components/GenericTable';

export function ProyectosSection({ escuela, onAddProyecto, onUpdateProyecto, onDeleteProyecto }) {
  const columns = [
    {
      key: 'nombre',
      label: 'Nombre del Proyecto'
    },
    {
      key: 'estado',
      label: 'Estado',
      type: 'select',
      options: ['Completado', 'En Progreso', 'Pendiente', 'Cancelado']
    },
    {
      key: 'descripcion',
      label: 'Descripción',
      type: 'textarea'
    },
    {
      key: 'fechaInicio',
      label: 'Inicio',
      type: 'date'
    },
    {
      key: 'fechaBaja',
      label: 'Cierre',
      type: 'date'
    },
  ];

  return (
    <div>
      <h1 style={{
        fontFamily: 'Rajdhani',
        fontSize: 28,
        fontWeight: 700,
        color: 'var(--accent)',
        letterSpacing: 2,
        marginBottom: 24
      }}>
        📦 Proyectos - {escuela.escuela}
      </h1>

      <GenericTable
        title="Gestión de Proyectos"
        columns={columns}
        data={escuela.proyectos || []}
        onAdd={(data) => onAddProyecto(escuela.id, data)}
        onEdit={(id, data) => onUpdateProyecto(escuela.id, id, data)}
        onDelete={(id) => onDeleteProyecto(escuela.id, id)}
        emptyMessage="Sin proyectos registrados"
        itemsPerPage={20}
      />
    </div>
  );
}
