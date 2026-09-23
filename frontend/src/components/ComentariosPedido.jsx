import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCelebracion } from './Celebracion';
import { formatFechaHora } from '../utils/format';

/**
 * Comentarios del laboratorio sobre una prueba.
 * - puedeEscribir (técnico/admin): la lista y un formulario siempre visibles; la clínica los verá.
 * - Solo lectura (clínica, gestor): se muestran directamente, o nada si no hay comentarios.
 * total: cantidad conocida de antemano (pedido.comentarios_count), para no pedirlos si no hay.
 */
export default function ComentariosPedido({ pedidoId, total = 0, puedeEscribir = false }) {
  const { user } = useAuth();
  const { aviso } = useCelebracion();
  const abierto = puedeEscribir || total > 0;
  const [comentarios, setComentarios] = useState(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!abierto || comentarios) return;
    api
      .get(`/pedidos/${pedidoId}/comentarios`)
      .then(({ data }) => setComentarios(data))
      .catch(() => setComentarios([]));
  }, [abierto, comentarios, pedidoId]);

  if (!puedeEscribir && total === 0) return null;

  const cantidad = comentarios ? comentarios.length : total;

  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setError('');
    setEnviando(true);
    try {
      const { data } = await api.post(`/pedidos/${pedidoId}/comentarios`, { texto: texto.trim() });
      setComentarios((prev) => [...(prev || []), data]);
      setTexto('');
      aviso({ emoji: '💬', texto: 'Comentario enviado: la clínica ya puede verlo' });
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo enviar el comentario');
    } finally {
      setEnviando(false);
    }
  }

  async function borrar(comentario) {
    if (!window.confirm('¿Borrar este comentario? La clínica ya no lo verá.')) return;
    try {
      await api.delete(`/pedidos/${pedidoId}/comentarios/${comentario.id}`);
      setComentarios((prev) => prev.filter((c) => c.id !== comentario.id));
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo borrar el comentario');
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${puedeEscribir ? 'border-t border-divider pt-3 mt-1' : ''}`}>
      <div className="text-[12.5px] font-bold">
        💬 {puedeEscribir ? 'Comentarios para la clínica' : 'Comentarios del laboratorio'}
        {cantidad > 0 && <span className="font-semibold text-text-muted"> ({cantidad})</span>}
      </div>

      {abierto && (
        <div className="flex flex-col gap-2">
          {comentarios === null && <div className="text-xs text-text-muted">Cargando...</div>}

          {comentarios?.map((c) => (
            <div key={c.id} className="rounded-lg px-3 py-2 text-[12.5px]" style={{ background: '#E3F1F0' }}>
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-bold text-primary-dark">
                  {c.usuario_nombre}
                  <span className="font-normal text-text-muted"> · {formatFechaHora(c.created_at)}</span>
                </span>
                {puedeEscribir && (user?.rol === 'admin' || user?.id === c.usuario_id) && (
                  <button onClick={() => borrar(c)} className="text-[11px] font-semibold text-red-600 flex-shrink-0">
                    Borrar
                  </button>
                )}
              </div>
              <div className="text-text whitespace-pre-wrap break-words">{c.texto}</div>
            </div>
          ))}

          {puedeEscribir && (
            <form onSubmit={enviar} className="flex flex-col gap-2">
              <textarea
                placeholder="Escribe un comentario para la clínica (ej. el color no coincide con la guía, favor confirmar con el doctor)..."
                className="w-full h-20 border border-border rounded-input p-2.5 text-[13px] font-sans box-border resize-none outline-none focus:border-primary"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                maxLength={2000}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-text-muted">La clínica podrá leer este comentario.</span>
                <button
                  type="submit"
                  disabled={enviando || !texto.trim()}
                  className="h-9 px-4 rounded-input bg-primary text-white text-[12.5px] font-semibold disabled:opacity-50 flex-shrink-0"
                >
                  {enviando ? 'Enviando...' : 'Enviar comentario'}
                </button>
              </div>
            </form>
          )}

          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>
      )}
    </div>
  );
}
