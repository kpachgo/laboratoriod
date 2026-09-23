import { useState } from 'react';
import api from '../api/client';
import { useCelebracion } from './Celebracion';
import { formatFecha } from '../utils/format';

const GREEN = '#2F8F5B';

/**
 * Control interno del técnico sobre el trabajo de una prueba:
 * - En el laboratorio y en proceso: botón "Marcar como terminado".
 * - Terminado: quién y cuándo, con opción de reabrir mientras la pieza siga en el laboratorio.
 * onCambio(accion) se llama después de guardar ('terminar' | 'reabrir') para que la página recargue.
 * soloInfo: muestra quién y cuándo lo terminó, sin botones (las acciones se hacen desde el caso).
 */
export default function ControlTrabajo({ pedido, onCambio, soloInfo = false }) {
  const { celebrar, aviso } = useCelebracion();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const enLaboratorio = pedido.etapa_logistica === 'en_laboratorio';

  async function cambiar(accion) {
    if (accion === 'reabrir' && !window.confirm('¿Reabrir este trabajo? Volverá a la lista de pendientes.')) return;
    setError('');
    setGuardando(true);
    try {
      await api.post(`/pedidos/${pedido.id}/${accion === 'terminar' ? 'terminar' : 'reabrir-trabajo'}`);
      if (accion === 'terminar') {
        celebrar({
          emoji: '🛠️',
          tono: 'verde',
          titulo: '¡Trabajo terminado!',
          detalle: `${pedido.etapa} de ${pedido.paciente_nombre || `Caso C-${pedido.caso_id}`} queda listo para entregar`,
        });
      } else {
        aviso({ emoji: '↩️', texto: 'Trabajo reabierto: vuelve a pendientes' });
      }
      await onCambio?.(accion);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar el trabajo');
    } finally {
      setGuardando(false);
    }
  }

  if (pedido.estado === 'finalizado') {
    return (
      <div className="flex items-center justify-between flex-wrap gap-2 rounded-lg px-3 py-2 text-[12.5px]" style={{ background: '#E7F5EC' }}>
        <span className="font-semibold" style={{ color: GREEN }}>
          ✅ Terminado{pedido.terminado_at ? ` el ${formatFecha(pedido.terminado_at)}` : ''}
          {pedido.terminado_por_nombre ? ` por ${pedido.terminado_por_nombre}` : ''}
        </span>
        {enLaboratorio && !soloInfo && (
          <button
            disabled={guardando}
            onClick={() => cambiar('reabrir')}
            className="text-xs font-semibold text-text-secondary underline underline-offset-2 disabled:opacity-50"
          >
            Reabrir
          </button>
        )}
        {error && <span className="basis-full text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  if (soloInfo || !enLaboratorio || pedido.estado !== 'en_proceso') return null;

  return (
    <div className="flex flex-col gap-1">
      <button
        disabled={guardando}
        onClick={() => cambiar('terminar')}
        className={`h-11 md:h-10 w-full rounded-input text-white text-[13px] font-bold disabled:opacity-60`}
        style={{ background: GREEN }}
      >
        {guardando ? 'Guardando...' : '✓ Marcar como terminado'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
