import { useAcdmContext } from '../context/AcdmContext.jsx';

export function DocentesSection({ escuelas }) {
  const { search } = useAcdmContext();

  const todosLosDocentes = escuelas.reduce((acc, escuela) => {
    const docentesEscuela = (escuela.docentes || []).map(doc => ({
      ...doc,
      escuelaNombre: escuela.escuela,
      escuelaDe: escuela.de,
      escuelaId: escuela.id
    }));
    return [...acc, ...docentesEscuela];
  }, []);

  const filteredDocentes = todosLosDocentes.filter(doc => {
    if (!search || search.length < 2) return true; // Show all if no search or too short
    const term = search.toLowerCase().trim();
    const words = term.split(/\s+/);
    
    // Check if all words match at least one field
    return words.every(word => {
      const regex = new RegExp(`\\b${word}`, 'i'); // Word boundary
      return (
        (doc.nombre && regex.test(doc.nombre)) ||
        (doc.apellido && regex.test(doc.apellido)) ||
        (doc.dni && doc.dni.includes(word)) ||
        (doc.escuelaNombre && regex.test(doc.escuelaNombre)) ||
        (doc.cargo && regex.test(doc.cargo))
      );
    });
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-16">
        <div>
          <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Docentes Globales</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>{filteredDocentes.length} docente(s) registrado(s)</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredDocentes.length === 0 ? (
          <div className="no-data card">No se encontraron docentes.</div>
        ) : (
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text1)' }}>Apellido, Nombre</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text1)' }}>Cargo</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text1)' }}>DNI / CUIL</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text1)' }}>Escuela</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text1)' }}>Contacto</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text1)' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocentes.map((doc, i) => (
                  <tr key={doc.id || i} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text1)', fontWeight: 500 }}>
                      {doc.apellido}, {doc.nombre}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{doc.cargo || '-'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>
                      <div>{doc.dni}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{doc.cuil}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>
                      <div>{doc.escuelaNombre}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{doc.escuelaDe}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>
                      <div>{doc.email || '-'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {doc.telefonos && doc.telefonos.length > 0 ? doc.telefonos[0].numero : '-'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                        backgroundColor: doc.estado === 'Activo' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                        color: doc.estado === 'Activo' ? '#2ecc71' : '#e74c3c'
                      }}>
                        {doc.estado || 'Desconocido'}
                      </span>
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
