import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import Layout from '../components/Layout';
import StatusBadge, { LogisticaBadge } from '../components/StatusBadge';
import { formatFecha, todayInputDate } from '../utils/format';

const TIPO_STYLE = {
  recoger: { label: 'RECOGER', bg: '#E7EEF8', color: '#2E5FA3' },
  entregar: { label: 'ENTREGAR', bg: '#E7F5EC', color: '#2F8F5B' },
};

export default function AsignarRutas() {
  const [fecha, setFecha] = useState(todayInputDate());
  const [gestores, setGestores] = useState([]);
  const [gestorId, setGestorId] = useState('');
  const [ruta, setRuta] = useState(null);
  const [porRecoger, setPorRecoger] = useState([]);
  const [porEntregar, setPorEntregar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/usuarios').then(({ data }) => {
      const lista = data.filter((u) => u.rol === 'gestor' && u.activo);
      setGestores(lista);
      if (lista[0]) setGestorId(String(lista[0].id));
    });
  }, []);

  const cargarPedidos = useCallback(async () => {
    const [recoger, entregar] = await Promise.all([
      api.get('/pedidos', { params: { etapaLogistica: 'pendiente_entrega', limit: 100 } }),
      api.get('/pedidos', { params: { etapaLogistica: 'en_laboratorio', limit: 100 } }),
    ]);
    setPorRecoger(recoger.data.data.filter((p) => p.paradas_pendientes === 0));
    const ORDEN = { finalizado: 0, en_proceso: 1, entregado: 2 };
    setPorEntregar(
      entregar.data.data
        .filter((p) => p.paradas_pendientes === 0)
        .sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado])
    );
  }, []);

  const cargarRuta = useCallback(async () => {
    if (!gestorId) {
      setRuta(null);
      return;
    }
    const { data: rutas } = await api.get('/rutas', { params: { gestorId, fecha } });
    if (!rutas[0]) {
      setRuta(null);
      return;
    }
    const { data } = await api.get(`/rutas/${rutas[0].id}`);
    setRuta(data);
  }, [gestorId, fecha]);

  useEffect(() => {
    setLoading(true);
    Promise.all([cargarPedidos(), cargarRuta()]).finally(() => setLoading(false));
  }, [cargarPedidos, cargarRuta]);

  async function run(action) {
    setError('');
    setBusy(true);
    try {
      await action();
      await Promise.all([cargarPedidos(), cargarRuta()]);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo completar la acción');
    } finally {
      setBusy(false);
    }
  }

  function asignar(pedido, tipo) {
    return run(async () => {
      let rutaId = ruta?.id;
      if (!rutaId) {
        const gestor = gestores.find((g) => String(g.id) === gestorId);
        const { data } = await api.post('/rutas', {
          gestorId: Number(gestorId),
          fecha,
          nombre: `Ruta de ${gestor?.nombre ?? 'gestor'}`,
        });
        rutaId = data.id;
      }
      await api.post(`/rutas/${rutaId}/paradas`, {
        pedidoId: pedido.id,
        tipo,
        orden: ruta?.paradas?.length ?? 0,
      });
    });
  }

  function quitar(parada) {
    return run(() => api.delete(`/ruta-paradas/${parada.id}`));
  }

  const gestorNombre = gestores.find((g) => String(g.id) === gestorId)?.nombre ?? 'gestor';
  const rutaCerrada = ruta?.estado === 'completada';
  const puedeAsignar = Boolean(gestorId) && !rutaCerrada && !busy;

  return (
    <Layout>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="font-display text-[22px] font-semibold">Asignar recogidas y entregas</div>
          <div className="text-[13px] text-text-faint mt-0.5">Elige un gestor y una fecha, y asígnale los pedidos de su ruta</div>
        </div>
        <div className="flex gap-2.5">
          <div>
            <label className="field-label">Gestor</label>
            <select className="field-input w-56" value={gestorId} onChange={(e) => setGestorId(e.target.value)}>
              {gestores.length === 0 && <option value="">Sin gestores activos</option>}
              {gestores.map((g) => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Fecha de la ruta</label>
            <input type="date" className="field-input w-44" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {rutaCerrada && (
        <div className="text-sm text-text-muted">Esta ruta ya está completada; elige otra fecha para asignar más pedidos.</div>
      )}

      <div className="flex-grow overflow-y-auto grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <Columna
          titulo="Por recoger en clínica"
          ayuda="Pedidos que la clínica envió y el gestor aún no retira."
          vacio="No hay pedidos pendientes de recoger."
        >
          {porRecoger.map((p) => (
            <PedidoCard key={p.id} pedido={p} accion={`Asignar recogida a ${gestorNombre}`} disabled={!puedeAsignar} onClick={() => asignar(p, 'recoger')} />
          ))}
        </Columna>

        <Columna
          titulo="Por entregar a clínica"
          ayuda="Pedidos que están en el laboratorio y deben volver a su clínica. Los terminados aparecen primero."
          vacio="No hay pedidos en laboratorio por entregar."
        >
          {porEntregar.map((p) => (
            <PedidoCard
              key={p.id}
              pedido={p}
              mostrarListo
              accion={`Asignar entrega a ${gestorNombre}`}
              disabled={!puedeAsignar}
              onClick={() => asignar(p, 'entregar')}
            />
          ))}
        </Columna>

        <Columna
          titulo={ruta?.nombre || 'Ruta del día'}
          vacio={loading ? 'Cargando...' : 'Aún no hay paradas para este gestor en esta fecha.'}
          vacioActivo={!ruta || ruta.paradas.length === 0}
        >
          {ruta?.paradas.map((p) => {
            const style = TIPO_STYLE[p.tipo];
            return (
              <div key={p.id} className="card p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold" style={{ background: style.bg, color: style.color }}>
                    {style.label}
                  </span>
                  <span className="text-[11.5px] font-bold text-text-muted">
                    {p.estado === 'completada' ? 'Completada' : 'Pendiente'}
                  </span>
                </div>
                <div className="text-[13.5px] font-bold">{p.clinica_nombre}</div>
                <div className="text-xs text-text-muted">
                  Caso C-{p.caso_id} · Prueba #{p.pedido_id} · {p.paciente_nombre || 'Sin paciente'}
                </div>
                <div className="flex items-center justify-between">
                  <LogisticaBadge etapa={p.etapa_logistica} />
                  {p.estado === 'pendiente' && (
                    <button disabled={busy} onClick={() => quitar(p)} className="text-xs font-semibold text-red-600 disabled:opacity-50">
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </Columna>
      </div>
    </Layout>
  );
}

function Columna({ titulo, ayuda, vacio, vacioActivo, children }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  const sinItems = vacioActivo ?? items.length === 0;
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-sm font-bold">{titulo}</div>
        {ayuda && <div className="text-xs text-text-faint mt-0.5">{ayuda}</div>}
      </div>
      {sinItems && <div className="text-[13px] text-text-muted">{vacio}</div>}
      {children}
    </div>
  );
}

function PedidoCard({ pedido, accion, disabled, onClick, mostrarListo }) {
  const listo = pedido.estado === 'finalizado';
  return (
    <div className="card p-3.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13.5px] font-bold text-primary-dark">Caso C-{pedido.caso_id}</span>
        <span className="text-xs text-text-muted font-semibold">Prueba #{pedido.id}</span>
      </div>
      <div className="text-[13.5px] font-semibold">{pedido.clinica_nombre}</div>
      <div className="text-xs text-text-muted">{pedido.paciente_nombre || 'Sin paciente'} · {pedido.etapa}</div>
      {pedido.fecha_entrega_est && (
        <div className="text-xs text-text-muted">Entrega estimada: {formatFecha(pedido.fecha_entrega_est)}</div>
      )}
      {mostrarListo && (
        <div className="flex items-center gap-2 text-xs text-text-faint">
          Trabajo en laboratorio: <StatusBadge estado={pedido.estado} />
          {listo && <span className="font-bold text-[#2F8F5B]">Listo para entregar</span>}
        </div>
      )}
      <button
        disabled={disabled}
        onClick={onClick}
        className="h-9 rounded-input bg-primary text-white text-[12.5px] font-semibold disabled:opacity-50"
      >
        {accion}
      </button>
    </div>
  );
}
