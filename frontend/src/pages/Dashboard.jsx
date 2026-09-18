import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { SearchIcon, PlusIcon } from '../components/icons';
import { formatFecha } from '../utils/format';

const FILTROS = [
  { value: '', label: 'Todos' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'entregado', label: 'Entregado' },
];

export default function Dashboard() {
  const [pedidos, setPedidos] = useState([]);
  const [total, setTotal] = useState(0);
  const [estado, setEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 50 };
    if (estado) params.estado = estado;

    api
      .get('/pedidos', { params })
      .then(({ data }) => {
        setPedidos(data.data);
        setTotal(data.pagination.total);
      })
      .finally(() => setLoading(false));
  }, [estado]);

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

      <div className="card overflow-hidden flex-grow overflow-y-auto">
        <div className="grid grid-cols-[90px_100px_1fr_1.2fr_1fr_130px_100px] px-5 py-3 border-b border-divider text-[11.5px] font-bold text-text-muted uppercase tracking-wide">
          <div>Folio</div>
          <div>Caso</div>
          <div>Etapa</div>
          <div>Clínica</div>
          <div>Paciente</div>
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
            className="grid grid-cols-[90px_100px_1fr_1.2fr_1fr_130px_100px] px-5 py-3.5 border-b border-[#F0F2F1] items-center text-[13.5px] no-underline"
          >
            <div className="font-semibold text-text-muted">{p.folio || '—'}</div>
            <div className="font-bold text-primary-dark">C-{p.caso_id}</div>
            <div>{p.etapa}</div>
            <div className="text-text-secondary">{p.clinica_nombre}</div>
            <div>{p.paciente_nombre || '—'}</div>
            <div><StatusBadge estado={p.estado} /></div>
            <div className="text-text-muted text-xs">{formatFecha(p.fecha_entrada)}</div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
