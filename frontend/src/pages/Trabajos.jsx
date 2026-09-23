import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Layout from '../components/Layout';
import FechaEntrega from '../components/FechaEntrega';
import ControlTrabajo from '../components/ControlTrabajo';
import PiezasEnCamino from '../components/PiezasEnCamino';
import { LogisticaBadge } from '../components/StatusBadge';
import { todayInputDate } from '../utils/format';

// Primero lo más urgente: por fecha de entrega estimada, y al final lo que no tiene fecha.
function porUrgencia(a, b) {
  if (a.fecha_entrega_est && b.fecha_entrega_est) {
    return a.fecha_entrega_est.localeCompare(b.fecha_entrega_est) || a.id - b.id;
  }
  if (a.fecha_entrega_est) return -1;
  if (b.fecha_entrega_est) return 1;
  return a.id - b.id;
}

const porTerminadoReciente = (a, b) => (b.terminado_at || '').localeCompare(a.terminado_at || '') || b.id - a.id;

/**
 * Trabajos del laboratorio para el técnico: lo que está en el laboratorio sin terminar
 * (ordenado por urgencia) y lo que ya terminó. Es un control interno; la clínica no lo ve.
 */
export default function Trabajos() {
  const [tab, setTab] = useState('pendientes');
  const [pendientes, setPendientes] = useState(null);
  const [terminados, setTerminados] = useState(null);

  const cargar = useCallback(async () => {
    const [pend, term] = await Promise.all([
      api.get('/pedidos', { params: { estado: 'en_proceso', etapaLogistica: 'en_laboratorio', limit: 100 } }),
      api.get('/pedidos', { params: { estado: 'finalizado', limit: 50 } }),
    ]);
    setPendientes(pend.data.data.slice().sort(porUrgencia));
    setTerminados(term.data.data.slice().sort(porTerminadoReciente));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const hoy = todayInputDate();
  const atrasados = (pendientes || []).filter((p) => p.fecha_entrega_est && p.fecha_entrega_est < hoy).length;
  const paraHoy = (pendientes || []).filter((p) => p.fecha_entrega_est === hoy).length;
  const lista = tab === 'pendientes' ? pendientes : terminados;

  return (
    <Layout>
      <div>
        <div className="font-display text-[22px] font-semibold">Trabajos del laboratorio</div>
        <div className="text-[13px] text-text-faint mt-0.5">
          Pruebas en el laboratorio por trabajar. Ábrelas y márcalas como terminadas desde el caso cuando estén listas para entregar.
        </div>
      </div>

      <PiezasEnCamino onRecibido={cargar} />

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setTab('pendientes')}
          className={`px-4 py-2 rounded-full text-[12.5px] font-bold ${tab === 'pendientes' ? 'bg-text text-white' : 'bg-surface border border-border text-text-secondary'}`}
        >
          Pendientes ({pendientes?.length ?? '…'})
        </button>
        <button
          onClick={() => setTab('terminados')}
          className={`px-4 py-2 rounded-full text-[12.5px] font-bold ${tab === 'terminados' ? 'bg-text text-white' : 'bg-surface border border-border text-text-secondary'}`}
        >
          Terminados
        </button>
        {tab === 'pendientes' && atrasados > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-[#F3E8E8] text-red-600 text-[11.5px] font-bold">
            {atrasados} atrasado{atrasados === 1 ? '' : 's'}
          </span>
        )}
        {tab === 'pendientes' && paraHoy > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-[#FBEEDD] text-[#9A5C0A] text-[11.5px] font-bold">
            {paraHoy} vence{paraHoy === 1 ? '' : 'n'} hoy
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {lista === null && <div className="text-sm text-text-muted">Cargando...</div>}
        {lista?.length === 0 && (
          <div className="text-sm text-text-muted">
            {tab === 'pendientes' ? '🎉 No hay trabajos pendientes en el laboratorio.' : 'Aún no hay trabajos terminados.'}
          </div>
        )}

        {lista?.map((p) => (
          <div
            key={p.id}
            className="card p-4 flex flex-col gap-3 w-full max-w-3xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-primary-dark">C-{p.caso_id}</span>
                  <span className="text-[14.5px] font-bold">{p.etapa}</span>
                  <span className="text-[11.5px] font-semibold text-text-muted">{p.folio || `#${p.id}`}</span>
                </div>
                <div className="text-[13px] font-semibold">
                  {p.paciente_nombre || 'Sin paciente'}
                  <span className="font-normal text-text-secondary"> · {p.clinica_nombre}</span>
                </div>
                {p.caso_descripcion && <div className="text-xs text-text-muted">{p.caso_descripcion}</div>}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
                <span className="text-[10.5px] font-bold text-text-muted uppercase tracking-wide">Entrega</span>
                <FechaEntrega pedido={p} />
              </div>
            </div>

            {p.observaciones && (
              <div className="text-[12.5px] text-text-secondary bg-bg rounded-lg px-3 py-2">
                <span className="font-bold text-text">📝 Indicaciones: </span>
                {p.observaciones}
              </div>
            )}

            {tab === 'terminados' && p.etapa_logistica !== 'en_laboratorio' && (
              <div className="flex items-center gap-1.5 text-[12.5px] text-text-faint">
                Recorrido: <LogisticaBadge etapa={p.etapa_logistica} />
              </div>
            )}

            {tab === 'terminados' && <ControlTrabajo pedido={p} soloInfo />}

            <Link
              to={`/casos/${p.caso_id}`}
              className="self-stretch sm:self-start h-10 md:h-9 px-4 rounded-input border border-primary text-primary flex items-center justify-center text-[12.5px] font-semibold whitespace-nowrap"
            >
              Ver caso{p.fotos_count > 0 ? ` · ${p.fotos_count} foto${p.fotos_count === 1 ? '' : 's'}` : ''}
            </Link>
          </div>
        ))}
      </div>
    </Layout>
  );
}
