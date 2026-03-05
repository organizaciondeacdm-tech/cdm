/**
 * useAcdmData — re-export de useAcdmMongoData para compatibilidad.
 * Todo el acceso a datos pasa por la API REST → MongoDB.
 * El localStorage ya no se usa.
 */
export { useAcdmMongoData as useAcdmData } from '../../hooks/useAcdmMongoData.js';
