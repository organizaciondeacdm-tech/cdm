import { GenericTable } from '../components/GenericTable';

export function EscuelasSection({ 
  escuelas, 
  onAddEscuela, 
  onUpdateEscuela, 
  onDeleteEscuela,
  onSelectEscuela 
}) {
  const columns = [
    {
      key: 'de',
      label: 'D.E.',
      placeholder: 'Ej: DE 01'
    },
    {
      key: 'nivel',
      label: 'Nivel',
      type: 'select',
      options: ['Inicial', 'Primario', 'Secundario']
    },
    {
      key: 'escuela',
      label: 'Nombre de la escuela',
      fullWidth: true
    },
    {
      key: 'direccion',
      label: 'Dirección',
      fullWidth: true
    },
    {
      key: 'mail',
      label: 'Email',
      type: 'email',
      fullWidth: true
    },
    {
      key: 'alumnos',
      label: 'Alumnos',
      render: (alumnos) => (alumnos?.length || 0),
      form: false
    },
    {
      key: 'docentes',
      label: 'Docentes',
      render: (docentes) => (docentes?.length || 0),
      form: false
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
        🏫 Gestión de Escuelas
      </h1>
      
      <GenericTable
        title="Escuelas Registradas"
        columns={columns}
        data={escuelas}
        onAdd={(data) => onAddEscuela(data)}
        onEdit={(id, data) => onUpdateEscuela(id, data)}
        onDelete={(id) => onDeleteEscuela(id)}
        emptyMessage="Sin escuelas registradas"
        itemsPerPage={15}
        formLayout={{
          columns: 2,
          gap: 14,
          maxWidth: 760,
          actionsAlign: 'flex-end'
        }}
      />
    </div>
  );
}
