import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { useCelebracion, esperar } from './Celebracion';

/**
 * Piezas que el gestor ya retiró de la clínica y vienen al laboratorio. El laboratorio
 * confirma su recepción cuando llegan físicamente. No se muestra si no hay ninguna.
 * onRecibido() se llama después de recibir una, para que la página recargue sus listas.
 */
export default function PiezasEnCamino({ onRecibido }) {
  const { celebrar } = useCelebracion();
  const [enCamino, setEnCamino] = useState([]);
  const [recibiendo, setRecibiendo] = useState(null);
  const [saliendo, setSaliendo] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const { data } = await api.get('/pedidos', { params: { etapaLogistica: 'recibido', limit: 100 } });
    // Primero las que el gestor ya dejó en el laboratorio.
    setEnCamino(data.data.slice().sort((a, b) => Number(b.gestor_llego_laboratorio) - Number(a.gestor_llego_laboratorio)));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function recibir(p) {
    setError('');
    setRecibiendo(p.id);
    try {
      await api.post(`/pedidos/${p.id}/recibir-laboratorio`);
      setSaliendo(p.id);
      celebrar({
        emoji: '🔬',
        tono: 'morado',
        titulo: 'Recibido en laboratorio',
        detalle: `Caso C-${p.caso_id} · ${p.paciente_nombre || 'Sin paciente'}`,
      });
      await esperar(350);
      await Promise.all([cargar(), onRecibido?.()]);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo registrar la recepción');
    } finally {
      setSaliendo(null);
      setRecibiendo(null);
    }
  }

  if (enCamino.length === 0 && !error) return null;

  return (
    <div className="card p-4 flex flex-col gap-3" style={{ borderLeft: '4px solid #6B3FA0' }}>
      <div>
        <div className="text-sm font-bold">🚚 Piezas en camino al laboratorio ({enCamino.length})</div>
        <div className="text-xs text-text-faint mt-0.5">Cuando la pieza llegue físicamente, confirma su recepción.</div>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {enCamino.map((p) => (
        <div
          key={p.id}
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 pt-3 border-t border-divider sm:pt-0 sm:border-0 ${saliendo === p.id ? 'tarjeta-salida' : ''}`}
        >
          <div className="text-[13px] flex items-center gap-x-2 gap-y-0.5 flex-wrap">
            <span className="font-bold text-primary-dark">Caso C-{p.caso_id}</span>
            <span>{p.clinica_nombre}</span>
            <span className="text-text-muted">{p.paciente_nombre || 'Sin paciente'} · {p.etapa}</span>
            {p.gestor_llego_laboratorio ? (
              <span className="text-[11.5px] font-bold text-[#2F8F5B]">El gestor ya llegó al laboratorio</span>
            ) : (
              <span className="text-[11.5px] text-text-faint">En camino</span>
            )}
          </div>
          <button
            disabled={recibiendo !== null}
            onClick={() => recibir(p)}
            className="h-10 sm:h-9 px-4 rounded-input bg-primary text-white text-[12.5px] font-semibold disabled:opacity-50 whitespace-nowrap"
          >
            {recibiendo === p.id ? 'Registrando...' : 'Recibir en laboratorio'}
          </button>
        </div>
      ))}
    </div>
  );
}
