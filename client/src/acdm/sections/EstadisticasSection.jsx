import { Statistics } from '../components/system/index.js';

export function EstadisticasSection({ escuelas }) {
  return (
    <div>
      <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2, marginBottom: 24 }}>Estadísticas</h1>
      <Statistics escuelas={escuelas} />
    </div>
  );
}
