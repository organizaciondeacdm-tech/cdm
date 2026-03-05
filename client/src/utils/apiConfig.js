/**
 * Detecta automáticamente la URL base de la API según el entorno
 * IMPORTANTE: Esta detección se hace en RUNTIME, no en build time
 * para que funcione correctamente en Vercel
 */
export function getApiUrl() {
  // SOLO en desarrollo local (cuando viene del servidor de desarrollo de Vite)
  // Usa el localhost hardcodeado
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    const url = 'http://localhost:5000';
    console.log('[API Config] Localhost detectado:', url);
    return url;
  }

  // RUNTIME Detection - Ejecuta en el navegador, no en build
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const origin = window.location.origin;
    
    // Log para debug
    console.log('[API Config] Detectando entorno:', {
      hostname,
      origin,
      isVercel: hostname.includes('vercel.app'),
    });
    
    // Si es Vercel (*.vercel.app), usar la misma URL base
    if (hostname.includes('vercel.app')) {
      console.log('[API Config] ✓ Vercel detectado, usando origen:', origin);
      return origin;
    }
    
    // Para otros dominios (producción), usar el mismo origen
    console.log('[API Config] Usando origin:', origin);
    return origin;
  }

  // Fallback (SSR o entorno de servidor)
  console.log('[API Config] Fallback: localhost:5000');
  return 'http://localhost:5000';
}
