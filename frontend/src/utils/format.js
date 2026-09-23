const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatFecha(value) {
  if (!value) return '—';
  // Las columnas TIMESTAMP llegan como "YYYY-MM-DD HH:MM:SS"; con "T" todos los navegadores las entienden.
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return value;
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]}`;
}

export function toInputDate(value) {
  if (!value) return '';
  return value.slice(0, 10);
}

// Fecha de hoy en la zona horaria del usuario (toISOString daría la de UTC, que de noche ya es mañana).
export function todayInputDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const FILES_BASE_URL = API_URL.replace(/\/api\/?$/, '');

