const ESTADOS = {
  en_proceso: { label: 'En proceso', bg: '#FBEEDD', color: '#9A5C0A', dot: '#C2790A' },
  finalizado: { label: 'Finalizado', bg: '#E7EEF8', color: '#2E5FA3', dot: '#2E5FA3' },
  entregado: { label: 'Entregado', bg: '#E7F5EC', color: '#2F8F5B', dot: '#2F8F5B' },
};

export function estadoInfo(estado) {
  return ESTADOS[estado] || ESTADOS.en_proceso;
}

export default function StatusBadge({ estado }) {
  const info = estadoInfo(estado);
  return (
    <span
      className="inline-block px-2.5 py-1 rounded-full text-[11.5px] font-bold"
      style={{ background: info.bg, color: info.color }}
    >
      {info.label}
    </span>
  );
}
