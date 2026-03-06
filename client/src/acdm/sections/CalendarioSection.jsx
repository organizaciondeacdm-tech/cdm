import { CalendarioView } from '../components/system/index.js';

export function CalendarioSection({ escuelas, isAdmin }) {
  return <CalendarioView escuelas={escuelas} isAdmin={isAdmin} />;
}
