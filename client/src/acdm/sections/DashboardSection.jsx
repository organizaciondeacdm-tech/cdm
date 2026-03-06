import { Statistics } from '../components/system/index.js';

export function DashboardSection({ escuelas, onNavigate }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-24">
        <div>
          <h1 style={{ fontFamily: 'Rajdhani', fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>Dashboard</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Vista general del sistema — {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
      <Statistics escuelas={escuelas} onNavigate={onNavigate} />
    </div>
  );
}
