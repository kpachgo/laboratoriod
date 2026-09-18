const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatFecha(value) {
  if (!value) return '—';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]}`;
}

export function toInputDate(value) {
  if (!value) return '';
  return value.slice(0, 10);
}

export function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const FILES_BASE_URL = API_URL.replace(/\/api\/?$/, '');

