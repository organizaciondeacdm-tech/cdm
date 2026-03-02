import { GenericTable } from '../components/GenericTable';

export function VisitasSection({ escuela, onAddVisita, onUpdateVisita, onDeleteVisita }) {
  const columns = [
    {
      key: 'fecha',
      label: 'Fecha',
      type: 'date'
    },
    {
      key: 'visitante',
      label: 'Visitante'
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
        👁️ Visitas - {escuela.escuela}
      </h1>

      <GenericTable
        title="Registro de Visitas"
        columns={columns}
        data={escuela.visitas || []}
        onAdd={(data) => onAddVisita(escuela.id, data)}
        onEdit={(id, data) => onUpdateVisita(escuela.id, id, data)}
        onDelete={(id) => onDeleteVisita(escuela.id, id)}
        emptyMessage="Sin visitas registradas"
        itemsPerPage={20}
      />
    </div>
  );
}
