import { useEffect, useState } from 'react';
import api from '../api/client';
import Layout from '../components/Layout';
import { LogisticaBadge } from '../components/StatusBadge';
import SeguimientoPedido from '../components/SeguimientoPedido';
import { todayInputDate } from '../utils/format';

const TIPO_STYLE = {
  recoger: { label: 'RECOGER', bg: '#E7EEF8', color: '#2E5FA3', accion: 'Marcar como recogido' },
  entregar: { label: 'ENTREGAR', bg: '#E7F5EC', color: '#2F8F5B', accion: 'Marcar como entregado' },
};

export default function VistaGestor() {
  const [fecha, setFecha] = useState(todayInputDate());
  const [rutas, setRutas] = useState([]);
  const [rutaId, setRutaId] = useState(null);
  const [ruta, setRuta] = useState(null);
  const [tab, setTab] = useState('pendiente');
  const [loading, setLoading] = useState(true);
  const [abierta, setAbierta] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get('/rutas', { params: { fecha } }).then(({ data }) => {
      setRutas(data);
      setRutaId(data[0]?.id ?? null);
      if (!data[0]) setLoading(false);
    });
  }, [fecha]);

  useEffect(() => {
    if (!rutaId) {
      setRuta(null);
      return;
    }
    setLoading(true);
    api
      .get(`/rutas/${rutaId}`)
      .then(({ data }) => setRuta(data))
      .finally(() => setLoading(false));
  }, [rutaId]);

  async function marcarCompletada(paradaId) {
    await api.put(`/ruta-paradas/${paradaId}`, { estado: 'completada' });
    const { data } = await api.get(`/rutas/${rutaId}`);
    setRuta(data);
  }

  async function terminarRuta() {
    if (pendientesCount > 0 && !window.confirm(`Aún tienes ${pendientesCount} parada(s) pendiente(s). ¿Cerrar la ruta de todos modos?`)) {
      return;
    }
    await api.put(`/rutas/${rutaId}`, { estado: 'completada' });
    const { data } = await api.get(`/rutas/${rutaId}`);
    setRuta(data);
  }

  const paradas = (ruta?.paradas || []).filter((p) => p.estado === tab);
  const pendientesCount = (ruta?.paradas || []).filter((p) => p.estado === 'pendiente').length;

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-[22px] font-semibold">Rutas de hoy</div>
          <div className="text-[13px] text-text-faint mt-0.5">{ruta?.nombre || 'Sin ruta asignada'}</div>
        </div>
        <div className="flex items-center gap-3">
          {ruta && ruta.estado !== 'completada' && (
            <button onClick={terminarRuta} className="h-10 px-4 rounded-input bg-primary text-white text-[13px] font-semibold">
              Entregué las piezas en el laboratorio
            </button>
          )}
          {ruta?.estado === 'completada' && (
            <span className="px-3 py-1.5 rounded-full bg-[#E7F5EC] text-[#2F8F5B] text-xs font-bold">Ruta completada</span>
          )}
          <input
            type="date"
            className="field-input w-44"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('pendiente')}
          className={`px-4 py-2 rounded-full text-[12.5px] font-bold ${tab === 'pendiente' ? 'bg-text text-white' : 'bg-surface border border-border text-text-secondary'}`}
        >
          Pendientes ({pendientesCount})
        </button>
        <button
          onClick={() => setTab('completada')}
          className={`px-4 py-2 rounded-full text-[12.5px] font-bold ${tab === 'completada' ? 'bg-text text-white' : 'bg-surface border border-border text-text-secondary'}`}
        >
          Completados
        </button>
      </div>

      <div className="flex-grow overflow-y-auto flex flex-col gap-3">
        {loading && <div className="text-sm text-text-muted">Cargando...</div>}
        {!loading && !ruta && <div className="text-sm text-text-muted">No hay rutas programadas para esta fecha.</div>}
        {!loading && ruta && paradas.length === 0 && (
          <div className="text-sm text-text-muted">No hay paradas {tab === 'pendiente' ? 'pendientes' : 'completadas'}.</div>
        )}

        {paradas.map((p) => {
          const style = TIPO_STYLE[p.tipo];
          return (
            <div
              key={p.id}
              onClick={() => setAbierta(abierta === p.id ? null : p.id)}
              className="card p-4 flex flex-col gap-3 max-w-xl cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold"
                      style={{ background: style.bg, color: style.color }}
                    >
                      {style.label}
                    </span>
                    <span className="text-xs text-text-muted font-semibold">{p.folio || `#${p.pedido_id}`}</span>
                  </div>
                  <div className="text-[15px] font-bold mt-1">{p.clinica_nombre}</div>
                  <div className="text-[12.5px] text-text-muted">{p.paciente_nombre || 'Sin paciente'} · {p.etapa}</div>
                </div>
                {p.hora_estimada && <div className="text-xs font-bold text-text-secondary">{p.hora_estimada}</div>}
              </div>

              <div className="h-px bg-divider" />

              <div className="flex items-center justify-between text-[12.5px] text-text-faint">
                <div className="flex items-center gap-1.5">
                  Recorrido del pedido: <LogisticaBadge etapa={p.etapa_logistica} />
                </div>
                <span className="font-semibold text-primary">{abierta === p.id ? 'Ocultar seguimiento ▴' : 'Ver seguimiento ▾'}</span>
              </div>

              {abierta === p.id && (
                <SeguimientoPedido pedido={{ etapa_logistica: p.etapa_logistica, estado: p.pedido_estado }} />
              )}

              {p.estado === 'pendiente' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    marcarCompletada(p.id);
                  }}
                  className="h-[42px] rounded-input text-white text-sm font-bold"
                  style={{ background: style.color }}
                >
                  {style.accion}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
