/**
 * Componente UserMenu - Muestra información del usuario loguado
 * Reutilizable en múltiples componentes para evitar duplicación
 */

export function UserMenu({ currentUser, isAdmin, onLogout, onToggleDarkMode, darkMode }) {
  return (
    <div className="flex items-center gap-8">
      {onToggleDarkMode && (
        <button 
          className="btn-icon" 
          onClick={onToggleDarkMode} 
          title={darkMode ? "Modo claro" : "Modo oscuro"} 
          style={{fontSize:18}}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      )}
      <span style={{fontSize:11, color:'var(--text2)'}}>{currentUser.username}</span>
      <span className={`badge ${isAdmin ? "badge-titular" : "badge-active"}`}>
        {currentUser.rol}
      </span>
      <button className="btn btn-secondary btn-sm" onClick={onLogout}>
        Salir
      </button>
    </div>
  );
}
