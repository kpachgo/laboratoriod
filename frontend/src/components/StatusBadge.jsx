const ESTADOS = {
  en_proceso: { label: 'En proceso', bg: '#FBEEDD', color: '#9A5C0A', dot: '#C2790A' },
  finalizado: { label: 'Finalizado', bg: '#E7EEF8', color: '#2E5FA3', dot: '#2E5FA3' },
  entregado: { label: 'Entregado', bg: '#E7F5EC', color: '#2F8F5B', dot: '#2F8F5B' },
};

export const ETAPAS_LOGISTICA = {
  pendiente_entrega: { label: 'Pendiente de entregar', bg: '#F3E8E8', color: '#9A3B3B', dot: '#B94A4A' },
  recibido: { label: 'Recibido', bg: '#EFE7F6', color: '#6B3FA0', dot: '#6B3FA0' },
  en_laboratorio: { label: 'En laboratorio', bg: '#E7EEF8', color: '#3A6EA5', dot: '#3A6EA5' },
  entregado_en_clinica: { label: 'Entregado en clínica', bg: '#E7F5EC', color: '#2F8F5B', dot: '#2F8F5B' },
};

export function estadoInfo(estado) {
  return ESTADOS[estado] || ESTADOS.en_proceso;
}

export function logisticaInfo(etapa) {
  return ETAPAS_LOGISTICA[etapa] || ETAPAS_LOGISTICA.en_laboratorio;
}

function Badge({ info }) {
  return (
    <span
      className="inline-block px-2.5 py-1 rounded-full text-[11.5px] font-bold"
      style={{ background: info.bg, color: info.color }}
    >
      {info.label}
    </span>
  );
}

export default function StatusBadge({ estado }) {
  return <Badge info={estadoInfo(estado)} />;
}

export function LogisticaBadge({ etapa }) {
  return <Badge info={logisticaInfo(etapa)} />;
}
