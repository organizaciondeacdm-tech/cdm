import { useAcdmContext } from '../context/AcdmContext.jsx';

export function AlumnosSection({ escuelas }) {
  const { search } = useAcdmContext();

  const todosLosAlumnos = escuelas.reduce((acc, escuela) => {
    const alumnosEscuela = (escuela.alumnos || []).map(al => ({
      ...al,
      escuelaNombre: escuela.escuela,
      escuelaDe: escuela.de,
      escuelaId: escuela.id
    }));
    return [...acc, ...alumnosEscuela];
  }, []);

  const filteredAlumnos = todosLosAlumnos.filter(al => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (al.nombre && al.nombre.toLowerCase().includes(term)) ||
      (al.apellido && al.apellido.toLowerCase().includes(term)) ||
      (al.dni && al.dni.includes(term)) ||
      (al.escuelaNombre && al.escuelaNombre.toLowerCase().includes(term)) ||
      (al.gradoSalaAnio && al.gradoSalaAnio.toLowerCase().includes(term)) ||
      (al.diagnostico && al.diagnostico.toLowerCase().includes(term))
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-16">
        <div>
          <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Alumnos Globales</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>{filteredAlumnos.length} alumno(s) registrado(s)</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredAlumnos.length === 0 ? (
          <div className="no-data card">No se encontraron alumnos.</div>
        ) : (
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text1)' }}>Nombre</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text1)' }}>Grado / Sala</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text1)' }}>DNI</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text1)' }}>Escuela</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text1)' }}>Diagnóstico</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text1)' }}>Obra Social</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlumnos.map((al, i) => (
                  <tr key={al.id || i} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text1)', fontWeight: 500 }}>
                      {al.nombre} {al.apellido}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{al.gradoSalaAnio || '-'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{al.dni || '-'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>
                      <div>{al.escuelaNombre}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{al.escuelaDe}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>
                      {al.diagnostico ? (
                        <span style={{
                          padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                          backgroundColor: 'rgba(52, 152, 219, 0.15)',
                          color: '#3498db'
                        }}>
                          {al.diagnostico}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>
                      {al.obraSocial?.nombre || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
