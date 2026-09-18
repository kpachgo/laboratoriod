import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import StatusBadge, { LogisticaBadge } from '../components/StatusBadge';
import { SearchIcon, PlusIcon } from '../components/icons';
import { formatFecha } from '../utils/format';

const FILTROS_LOGISTICA = [
  { value: '', label: 'Toda la logística' },
  { value: 'pendiente_entrega', label: 'Pendiente de entregar' },
  { value: 'recibido', label: 'Recibido' },
  { value: 'en_laboratorio', label: 'En laboratorio' },
  { value: 'entregado_en_clinica', label: 'Entregado en clínica' },
];

const FILTROS = [
  { value: '', label: 'Todos' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'entregado', label: 'Entregado' },
];

const GRID = 'grid-cols-[80px_80px_1fr_1.1fr_1fr_180px_120px_90px]';

export default function Dashboard() {
  const [pedidos, setPedidos] = useState([]);
  const [total, setTotal] = useState(0);
  const [estado, setEstado] = useState('');
  const [etapaLogistica, setEtapaLogistica] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [enCamino, setEnCamino] = useState([]);
  const [recibiendo, setRecibiendo] = useState(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const { user } = useAuth();
  const puedeRecibir = user?.rol === 'admin' || user?.rol === 'tecnico';

  useEffect(() => {
    if (!puedeRecibir) return;
    api
      .get('/pedidos', { params: { etapaLogistica: 'recibido', limit: 100 } })
      .then(({ data }) =>
        setEnCamino(data.data.slice().sort((a, b) => Number(b.gestor_llego_laboratorio) - Number(a.gestor_llego_laboratorio)))
      );
  }, [puedeRecibir, version]);

  async function recibir(pedidoId) {
    setError('');
    setRecibiendo(pedidoId);
    try {
      await api.post(`/pedidos/${pedidoId}/recibir-laboratorio`);
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo registrar la recepción');
    } finally {
      setRecibiendo(null);
    }
  }

  useEffect(() => {
    setLoading(true);
    const params = { limit: 50 };
    if (estado) params.estado = estado;
    if (etapaLogistica) params.etapaLogistica = etapaLogistica;

    api
      .get('/pedidos', { params })
      .then(({ data }) => {
        setPedidos(data.data);
        setTotal(data.pagination.total);
      })
      .finally(() => setLoading(false));
  }, [estado, etapaLogistica, version]);

  const filtrados = pedidos.filter((p) => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      p.folio?.toLowerCase().includes(q) ||
      p.paciente_nombre?.toLowerCase().includes(q) ||
      String(p.caso_id).includes(q)
    );
  });

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-[22px] font-semibold">Pedidos</div>
          <div className="text-[13px] text-text-faint mt-0.5">{total} pruebas registradas</div>
        </div>
        <div className="flex gap-2.5">
          <div className="flex items-center gap-2 bg-surface border border-border rounded-input px-3 h-10 w-60">
            <SearchIcon />
            <input
              type="text"
              placeholder="Buscar folio, caso, paciente..."
              className="border-none outline-none text-[13px] w-full bg-transparent"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <Link
            to="/casos/nuevo"
            className="flex items-center gap-1.5 bg-primary text-white rounded-input px-4 h-10 text-[13px] font-semibold whitespace-nowrap"
          >
            <PlusIcon />
            Nuevo caso
          </Link>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {puedeRecibir && enCamino.length > 0 && (
        <div className="card p-4 flex flex-col gap-3" style={{ borderLeft: '4px solid #6B3FA0' }}>
          <div>
            <div className="text-sm font-bold">🚚 Piezas en camino al laboratorio ({enCamino.length})</div>
            <div className="text-xs text-text-faint mt-0.5">Cuando la pieza llegue físicamente, confirma su recepción.</div>
          </div>
          {enCamino.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[13px] flex items-center gap-2 flex-wrap">
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
                disabled={recibiendo === p.id}
                onClick={() => recibir(p.id)}
                className="h-9 px-4 rounded-input bg-primary text-white text-[12.5px] font-semibold disabled:opacity-50"
              >
                {recibiendo === p.id ? 'Registrando...' : 'Recibir en laboratorio'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setEstado(f.value)}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold ${
              estado === f.value ? 'bg-text text-white' : 'bg-surface border border-border text-text-secondary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTROS_LOGISTICA.map((f) => (
          <button
            key={f.value}
            onClick={() => setEtapaLogistica(f.value)}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold ${
              etapaLogistica === f.value ? 'bg-text text-white' : 'bg-surface border border-border text-text-secondary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden flex-grow overflow-y-auto">
        <div className={`grid ${GRID} px-5 py-3 border-b border-divider text-[11.5px] font-bold text-text-muted uppercase tracking-wide`}>
          <div>Folio</div>
          <div>Caso</div>
          <div>Etapa</div>
          <div>Clínica</div>
          <div>Paciente</div>
          <div>Logística</div>
          <div>Estado</div>
          <div>Fecha</div>
        </div>

        {loading && <div className="p-6 text-sm text-text-muted">Cargando...</div>}
        {!loading && filtrados.length === 0 && (
          <div className="p-6 text-sm text-text-muted">No hay pedidos que coincidan.</div>
        )}

        {filtrados.map((p) => (
          <Link
            key={p.id}
            to={`/casos/${p.caso_id}`}
            className={`grid ${GRID} px-5 py-3.5 border-b border-[#F0F2F1] items-center text-[13.5px] no-underline`}
          >
            <div className="font-semibold text-text-muted">{p.folio || '—'}</div>
            <div className="font-bold text-primary-dark">C-{p.caso_id}</div>
            <div>{p.etapa}</div>
            <div className="text-text-secondary">{p.clinica_nombre}</div>
            <div>{p.paciente_nombre || '—'}</div>
            <div><LogisticaBadge etapa={p.etapa_logistica} /></div>
            <div><StatusBadge estado={p.estado} /></div>
            <div className="text-text-muted text-xs">{formatFecha(p.fecha_entrada)}</div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
