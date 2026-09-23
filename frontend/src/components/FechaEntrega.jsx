import { formatFecha, todayInputDate } from '../utils/format';

// Fecha de entrega estimada; se resalta si vence hoy o ya pasó y la pieza aún no vuelve a la clínica.
export default function FechaEntrega({ pedido }) {
  const fecha = pedido.fecha_entrega_est;
  if (!fecha) return <span className="text-text-muted text-xs">Por definir</span>;

  const hoy = todayInputDate();
  const pendiente = pedido.etapa_logistica !== 'entregado_en_clinica';
  if (pendiente && fecha < hoy) {
    return (
      <span className="inline-flex flex-col leading-tight">
        <span className="text-xs font-bold text-red-600">{formatFecha(fecha)}</span>
        <span className="text-[10.5px] font-bold text-red-600">Atrasado</span>
      </span>
    );
  }
  if (pendiente && fecha === hoy) {
    return (
      <span className="inline-flex flex-col leading-tight">
        <span className="text-xs font-bold text-[#9A5C0A]">{formatFecha(fecha)}</span>
        <span className="text-[10.5px] font-bold text-[#9A5C0A]">Vence hoy</span>
      </span>
    );
  }
  return <span className="text-xs font-semibold text-text-secondary">{formatFecha(fecha)}</span>;
}
