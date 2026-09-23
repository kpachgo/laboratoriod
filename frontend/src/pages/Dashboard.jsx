import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import StatusBadge, { LogisticaBadge } from '../components/StatusBadge';
import { SearchIcon, PlusIcon } from '../components/icons';
import PiezasEnCamino from '../components/PiezasEnCamino';
import { formatFecha } from '../utils/format';
import FechaEntrega from '../components/FechaEntrega';

const FILTROS_LOGISTICA = [
  { value: '', label: 'Toda la logística' },
  { value: 'pendiente_entrega', label: 'Pendiente de recoger' },
  { value: 'recibido', label: 'Recibido' },
  { value: 'en_laboratorio', label: 'En laboratorio' },
  { value: 'entregado_en_clinica', label: 'Entregado en clínica' },
];

const GRID = 'grid-cols-[70px_70px_1fr_1.1fr_1fr_100px_180px_120px_80px]';

export default function Dashboard() {
  const { user } = useAuth();
  // Personal del laboratorio (admin y técnico): recibe las piezas y trabaja lo que está en el laboratorio.
  const puedeRecibir = user?.rol === 'admin' || user?.rol === 'tecnico';
  const [pedidos, setPedidos] = useState([]);
  const [total, setTotal] = useState(0);
  const [etapaLogistica, setEtapaLogistica] = useState(puedeRecibir ? 'en_laboratorio' : '');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 50 };
    if (etapaLogistica) params.etapaLogistica = etapaLogistica;

    api
      .get('/pedidos', { params })
      .then(({ data }) => {
        setPedidos(data.data);
        setTotal(data.pagination.total);
      })
      .finally(() => setLoading(false));
  }, [etapaLogistica, version]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="font-display text-[22px] font-semibold">Pedidos</div>
          <div className="text-[13px] text-text-faint mt-0.5">{total} pruebas registradas</div>
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-2.5">
          <div className="flex items-center gap-2 bg-surface border border-border rounded-input px-3 h-10 w-full md:w-60">
            <SearchIcon />
            <input
              type="text"
              placeholder="Buscar folio, caso, paciente..."
              className="border-none outline-none text-[13px] w-full bg-transparent"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <select
            className="field-input !h-10 flex-1 min-w-0 md:flex-none md:w-52"
            value={etapaLogistica}
            onChange={(e) => setEtapaLogistica(e.target.value)}
            aria-label="Filtrar por logística"
          >
            {FILTROS_LOGISTICA.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <Link
            to="/casos/nuevo"
            className="flex items-center gap-1.5 bg-primary text-white rounded-input px-4 h-10 text-[13px] font-semibold whitespace-nowrap"
          >
            <PlusIcon />
            Nuevo caso
          </Link>
        </div>
      </div>

      {puedeRecibir && <PiezasEnCamino onRecibido={() => setVersion((v) => v + 1)} />}

      <div className="card overflow-hidden flex-grow overflow-y-auto">
        <div className={`hidden lg:grid ${GRID} px-5 py-3 border-b border-divider text-[11.5px] font-bold text-text-muted uppercase tracking-wide`}>
          <div>Folio</div>
          <div>Caso</div>
          <div>Etapa</div>
          <div>Clínica</div>
          <div>Paciente</div>
          <div>Entrega</div>
          <div>Logística</div>
          <div>Estado</div>
          <div>Ingreso</div>
        </div>

        {loading && <div className="p-6 text-sm text-text-muted">Cargando...</div>}
        {!loading && filtrados.length === 0 && (
          <div className="p-6 text-sm text-text-muted">No hay pedidos que coincidan.</div>
        )}

        {filtrados.map((p) => (
          <Link
            key={p.id}
            to={`/casos/${p.caso_id}`}
            className={`block lg:grid ${GRID} px-4 lg:px-5 py-3.5 border-b border-[#F0F2F1] items-center text-[13.5px] no-underline`}
          >
            <div className="lg:hidden flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-primary-dark">C-{p.caso_id}</span>
                  <span className="text-xs font-semibold text-text-muted truncate">{p.folio || '—'}</span>
                </div>
                <span className="text-text-muted text-xs flex-shrink-0">{formatFecha(p.fecha_entrada)}</span>
              </div>
              <div className="font-semibold">{p.paciente_nombre || 'Sin paciente'} · {p.etapa}</div>
              <div className="text-[12.5px] text-text-secondary">{p.clinica_nombre}</div>
              <div className="text-[12.5px] text-text-muted flex items-center gap-1.5">
                Entrega: <FechaEntrega pedido={p} />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                <LogisticaBadge etapa={p.etapa_logistica} />
                <StatusBadge estado={p.estado} />
              </div>
            </div>

            <div className="hidden lg:contents">
              <div className="font-semibold text-text-muted">{p.folio || '—'}</div>
              <div className="font-bold text-primary-dark">C-{p.caso_id}</div>
              <div>{p.etapa}</div>
              <div className="text-text-secondary">{p.clinica_nombre}</div>
              <div>{p.paciente_nombre || '—'}</div>
              <div><FechaEntrega pedido={p} /></div>
              <div><LogisticaBadge etapa={p.etapa_logistica} /></div>
              <div><StatusBadge estado={p.estado} /></div>
              <div className="text-text-muted text-xs">{formatFecha(p.fecha_entrada)}</div>
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}

