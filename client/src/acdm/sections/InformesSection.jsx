import { GenericTable } from '../components/GenericTable';

export function InformesSection({ escuela, onAddInforme, onUpdateInforme, onDeleteInforme }) {
  const columns = [
    {
      key: 'titulo',
      label: 'Título'
    },
    {
      key: 'estado',
      label: 'Estado',
      type: 'select',
      options: ['Pendiente', 'En Revisión', 'Entregado', 'Rechazado']
    },
    {
      key: 'fechaEntrega',
      label: 'Fecha Entrega',
      type: 'date'
    },
    {
      key: 'observaciones',
      label: 'Observaciones',
      type: 'textarea'
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
        📋 Informes - {escuela.escuela}
      </h1>

      <GenericTable
        title="Gestión de Informes"
        columns={columns}
        data={escuela.informes || []}
        onAdd={(data) => onAddInforme(escuela.id, data)}
        onEdit={(id, data) => onUpdateInforme(escuela.id, id, data)}
        onDelete={(id) => onDeleteInforme(escuela.id, id)}
        emptyMessage="Sin informes registrados"
        itemsPerPage={20}
      />
    </div>
  );
}
