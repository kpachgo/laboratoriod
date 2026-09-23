import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import Layout from '../components/Layout';
import { LogisticaBadge } from '../components/StatusBadge';
import SeguimientoPedido from '../components/SeguimientoPedido';
import { formatFecha, todayInputDate } from '../utils/format';

const TIPO_STYLE = {
  recoger: { label: 'RECOGER', bg: '#E7EEF8', color: '#2E5FA3', accion: 'Marcar como recogido' },
  entregar: { label: 'ENTREGAR', bg: '#E7F5EC', color: '#2F8F5B', accion: 'Marcar como entregado' },
};

export default function VistaGestor() {
  const [fecha, setFecha] = useState(todayInputDate());
  const [rutas, setRutas] = useState([]);
  const [rutaId, setRutaId] = useState(null);
  const [ruta, setRuta] = useState(null);
  // Todas las paradas sin completar del gestor, sin importar la fecha de su ruta (null = cargando).
  const [pendientes, setPendientes] = useState(null);
  const [tab, setTab] = useState('pendiente');
  const [loading, setLoading] = useState(true);
  const [abierta, setAbierta] = useState(null);

  const cargarPendientes = useCallback(
    () => api.get('/ruta-paradas', { params: { estado: 'pendiente' } }).then(({ data }) => setPendientes(data)),
    []
  );

  useEffect(() => {
    cargarPendientes();
  }, [cargarPendientes]);

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
    await Promise.all([
      cargarPendientes(),
      rutaId ? api.get(`/rutas/${rutaId}`).then(({ data }) => setRuta(data)) : null,
    ]);
  }

  async function terminarRuta() {
    if (pendientesRuta > 0 && !window.confirm(`Aún tienes ${pendientesRuta} parada(s) pendiente(s) en esta ruta. ¿Cerrar la ruta de todos modos?`)) {
      return;
    }
    await api.put(`/rutas/${rutaId}`, { estado: 'completada' });
    const { data } = await api.get(`/rutas/${rutaId}`);
    setRuta(data);
  }

  const hoy = todayInputDate();
  const listaPendientes = pendientes || [];
  const paradas = tab === 'pendiente' ? listaPendientes : (ruta?.paradas || []).filter((p) => p.estado === 'completada');
  const pendientesRuta = (ruta?.paradas || []).filter((p) => p.estado === 'pendiente').length;
  const cargando = tab === 'pendiente' ? pendientes === null : loading;

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
          Pendientes ({listaPendientes.length})
        </button>
        <button
          onClick={() => setTab('completada')}
          className={`px-4 py-2 rounded-full text-[12.5px] font-bold ${tab === 'completada' ? 'bg-text text-white' : 'bg-surface border border-border text-text-secondary'}`}
        >
          Completados
        </button>
      </div>

      <div className="flex-grow overflow-y-auto flex flex-col gap-3">
        {cargando && <div className="text-sm text-text-muted">Cargando...</div>}
        {!cargando && paradas.length === 0 && (
          <div className="text-sm text-text-muted">
            {tab === 'pendiente'
              ? 'No tienes paradas pendientes.'
              : ruta
                ? 'No hay paradas completadas.'
                : 'No hay rutas programadas para esta fecha.'}
          </div>
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
                    {p.ruta_fecha && p.ruta_fecha !== hoy && (
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold"
                        style={p.ruta_fecha < hoy ? { background: '#F3E8E8', color: '#9A3B3B' } : { background: '#E7EEF8', color: '#2E5FA3' }}
                      >
                        {p.ruta_fecha < hoy ? 'Atrasada' : 'Programada'} · {formatFecha(p.ruta_fecha)}
                      </span>
                    )}
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

              {abierta === p.id && <SeguimientoPedido pedido={p} />}

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
