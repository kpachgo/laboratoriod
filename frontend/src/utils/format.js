const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatFecha(value) {
  if (!value) return '—';
  // Las columnas TIMESTAMP llegan como "YYYY-MM-DD HH:MM:SS"; con "T" todos los navegadores las entienden.
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return value;
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]}`;
}

// "23 sep, 14:05" para registros con hora (comentarios, etc.).
export function formatFechaHora(value) {
  if (!value) return '—';
  const d = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return value;
  return `${formatFecha(value)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Fecha de entrega estimada de una prueba, con el nombre de la prueba (cada prueba tiene la suya).
export function textoEntrega(prueba) {
  if (!prueba?.fecha_entrega_est) return 'Por definir';
  return `${formatFecha(prueba.fecha_entrega_est)} · ${prueba.etapa}`;
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

