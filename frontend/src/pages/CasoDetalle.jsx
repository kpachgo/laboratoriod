import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { estadoInfo, LogisticaBadge } from '../components/StatusBadge';
import SeguimientoPedido from '../components/SeguimientoPedido';
import FotosCaso from '../components/FotosCaso';
import ControlTrabajo from '../components/ControlTrabajo';
import ComentariosPedido from '../components/ComentariosPedido';
import { useCelebracion } from '../components/Celebracion';
import { BackIcon, PlusIcon } from '../components/icons';
import { formatFecha, textoEntrega, FILES_BASE_URL } from '../utils/format';

export default function CasoDetalle() {
  const { id } = useParams();
  const [caso, setCaso] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [imagenesPorPedido, setImagenesPorPedido] = useState({});
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const puedeRecibir = user?.rol === 'admin' || user?.rol === 'tecnico';
  const { celebrar } = useCelebracion();

  async function recibir(pedido) {
    setError('');
    try {
      await api.post(`/pedidos/${pedido.id}/recibir-laboratorio`);
      celebrar({ emoji: '🔬', tono: 'morado', titulo: 'Recibido en laboratorio', detalle: `${pedido.etapa} · Caso C-${pedido.caso_id}` });
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo registrar la recepción');
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/casos/${id}`),
      api.get('/pedidos', { params: { casoId: id, limit: 100 } }),
    ])
      .then(async ([casoRes, pedidosRes]) => {
        setCaso(casoRes.data);
        const lista = pedidosRes.data.data.slice().sort((a, b) => a.id - b.id);
        setPedidos(lista);

        const conFotos = lista.filter((p) => p.fotos_count > 0);
        const resultados = await Promise.all(
          conFotos.map((p) => api.get(`/pedidos/${p.id}/imagenes`).then(({ data }) => [p.id, data]))
        );
        setImagenesPorPedido(Object.fromEntries(resultados));
      })
      .finally(() => setLoading(false));
  }, [id, version]);

  // Al recargar el mismo caso (tras recibir, terminar, etc.) se mantiene lo que ya se ve.
  if (loading && String(caso?.id) !== String(id)) {
    return (
      <Layout>
        <div className="text-sm text-text-muted">Cargando...</div>
      </Layout>
    );
  }

  if (!caso) {
    return (
      <Layout>
        <div className="text-sm text-red-600">No se encontró el caso.</div>
      </Layout>
    );
  }

  const primerItem = caso.items?.[0];
  const ultimaPrueba = pedidos[pedidos.length - 1];

  return (
    <Layout>
      <div className="min-h-[64px] py-3 md:py-0 flex-shrink-0 bg-surface border-b border-border -mx-4 -mt-4 md:-mx-8 md:-mt-7 px-4 md:px-7 flex flex-wrap items-center justify-between gap-3 box-border">
        <div className="flex items-center gap-3.5 min-w-0">
          <Link to="/" className="flex w-9 h-9 md:w-8 md:h-8 flex-shrink-0 rounded-lg items-center justify-center border border-border" aria-label="Volver">
            <BackIcon />
          </Link>
          <div className="min-w-0">
            <div className="font-display text-[17px] font-semibold">
              Caso C-{caso.id} · {caso.paciente_nombre || 'Sin paciente'}
            </div>
            <div className="text-xs text-text-muted">
              {primerItem?.tipoTrabajo || 'Trabajo'}
              {primerItem?.piezasDentales ? ` — Pieza ${primerItem.piezasDentales}` : ''} · {caso.clinica_nombre}
            </div>
          </div>
        </div>
        <Link
          to={`/casos/${id}/nueva-prueba`}
          className="flex items-center justify-center gap-1.5 h-10 md:h-[38px] px-4 w-full sm:w-auto rounded-input bg-primary text-white text-[13px] font-semibold"
        >
          <PlusIcon />
          Nueva prueba
        </Link>
      </div>

      <div className="flex-grow flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-hidden pt-2">
        <div className="w-full lg:w-[340px] flex-shrink-0 flex flex-col gap-4">
          <div className="card p-4 sm:p-5 flex flex-col gap-4">
            <div className="text-sm font-bold">Datos del caso</div>
            <Meta label="Clínica" value={caso.clinica_nombre} strong />
            <Meta label="Doctor" value={caso.doctor_nombre} />
            <Meta label="Paciente" value={caso.paciente_nombre || '—'} />
            <Meta label="Entrega estimada" value={textoEntrega(ultimaPrueba)} strong={Boolean(ultimaPrueba?.fecha_entrega_est)} />
            <div className="h-px bg-divider" />
            {caso.items?.map((item) => (
              <div key={item.id} className="flex flex-col gap-3">
                <Meta label="Trabajo" value={item.tipoTrabajo} strong />
                <Meta label="Material" value={item.material || '—'} />
                {item.piezasDentales && (
                  <div>
                    <span className="meta-label block text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1">Piezas dentales</span>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {item.piezasDentales.split(',').map((pz) => (
                        <div key={pz} className="w-7 h-7 rounded-md bg-primary-light text-primary-dark text-[11.5px] font-bold flex items-center justify-center">
                          {pz.trim()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Meta label="Color" value={item.color || '—'} />
              </div>
            ))}
            <div className="h-px bg-divider" />
            <FotosCaso pedidos={pedidos} imagenesPorPedido={imagenesPorPedido} />
          </div>
        </div>

        <div className="flex-grow min-w-0 flex flex-col gap-3.5 overflow-y-auto">
          <div className="text-sm font-bold">Historial de pruebas</div>
          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex flex-col">
            {pedidos.length === 0 && <div className="text-sm text-text-muted">Aún no hay pruebas registradas.</div>}
            {pedidos.map((p, index) => {
              const info = estadoInfo(p.estado);
              const showLine = index < pedidos.length - 1;
              return (
                <div key={p.id} className="flex gap-4">
                  <div className="hidden sm:flex flex-col items-center w-4 flex-shrink-0">
                    <div className="w-3.5 h-3.5 rounded-full mt-[22px] flex-shrink-0" style={{ background: info.dot }} />
                    {showLine && <div className="w-0.5 flex-grow bg-border" style={{ minHeight: 60 }} />}
                  </div>
                  <div className="flex-grow min-w-0 card p-3.5 sm:p-[18px] mb-3 sm:mb-4 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="text-[14.5px] font-bold">{p.etapa}</div>
                        <span className="text-[11.5px] font-semibold text-text-muted">{p.folio || `#${p.id}`}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <LogisticaBadge etapa={p.etapa_logistica} />
                        <span
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                          style={{ background: info.bg, color: info.color }}
                        >
                          {info.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-x-5 gap-y-1 flex-wrap text-[12.5px] text-text-faint">
                      <span>{formatFecha(p.fecha_entrada)}</span>
                      <span>Gestor: {p.gestor_nombre || '—'}</span>
                      <span>{p.fotos_count} foto{p.fotos_count === 1 ? '' : 's'}</span>
                    </div>
                    <SeguimientoPedido pedido={p} />
                    {puedeRecibir && p.etapa_logistica === 'recibido' && (
                      <button
                        onClick={() => recibir(p)}
                        className="h-10 rounded-input bg-primary text-white text-[13px] font-semibold"
                      >
                        Recibir en laboratorio
                      </button>
                    )}
                    {imagenesPorPedido[p.id]?.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {imagenesPorPedido[p.id].map((img) => (
                          <a key={img.id} href={`${FILES_BASE_URL}${img.ruta}`} target="_blank" rel="noreferrer">
                            <img
                              src={`${FILES_BASE_URL}${img.ruta}`}
                              alt={img.descripcion || ''}
                              className="w-16 h-16 rounded-lg object-cover border border-border"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    {p.observaciones && (
                      <div className="text-[12.5px] text-text-secondary bg-bg rounded-lg px-3 py-2">
                        {p.observaciones}
                      </div>
                    )}
                    {puedeRecibir && <ControlTrabajo pedido={p} onCambio={() => setVersion((v) => v + 1)} />}
                    <ComentariosPedido pedidoId={p.id} total={p.comentarios_count} puedeEscribir={puedeRecibir} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Meta({ label, value, strong }) {
  return (
    <div>
      <span className="meta-label block text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1">{label}</span>
      <div className={`text-[13.5px] ${strong ? 'font-semibold' : ''}`}>{value}</div>
    </div>
  );
}
