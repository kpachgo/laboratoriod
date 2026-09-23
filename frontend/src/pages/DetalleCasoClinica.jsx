import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import UserMenu from '../components/UserMenu';
import SeguimientoPedido from '../components/SeguimientoPedido';
import FotosCaso from '../components/FotosCaso';
import ComentariosPedido from '../components/ComentariosPedido';
import { useCelebracion } from '../components/Celebracion';
import { ToothIcon, BackIcon, PlusIcon } from '../components/icons';
import { formatFecha, textoEntrega, FILES_BASE_URL } from '../utils/format';

const GREEN = '#2F8F5B';

export default function DetalleCasoClinica() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { celebrar } = useCelebracion();

  const [caso, setCaso] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [imagenesPorPedido, setImagenesPorPedido] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [casoRes, pedidosRes] = await Promise.all([
        api.get(`/casos/${id}`),
        api.get('/pedidos', { params: { casoId: id, limit: 100 } }),
      ]);
      setCaso(casoRes.data);
      const lista = pedidosRes.data.data.slice().sort((a, b) => b.id - a.id);
      setPedidos(lista);

      const conFotos = lista.filter((p) => p.fotos_count > 0);
      const resultados = await Promise.all(
        conFotos.map((p) =>
          api.get(`/pedidos/${p.id}/imagenes`).then(({ data }) => [p.id, data]).catch(() => [p.id, []])
        )
      );
      setImagenesPorPedido(Object.fromEntries(resultados));
    } catch {
      setCaso(null);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    cargar().finally(() => setLoading(false));
  }, [cargar]);

  async function cambiarEstado(accion) {
    setError('');
    try {
      await api.post(`/casos/${id}/${accion}`);
      if (accion === 'finalizar') {
        celebrar({ emoji: '🎉', tono: 'verde', titulo: '¡Trabajo finalizado!', detalle: 'Lo encontrarás en Finalizados' });
      }
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar el trabajo');
    }
  }

  function finalizar() {
    const paciente = caso.paciente_nombre || 'este paciente';
    if (!window.confirm(`¿Confirmas que el trabajo de ${paciente} ya se entregó al paciente?\n\nPasará a "Finalizados" y ya no se enviará al laboratorio.`)) return;
    cambiarEstado('finalizar');
  }

  const todosEntregados = pedidos.length > 0 && pedidos.every((p) => p.etapa_logistica === 'entregado_en_clinica');

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="sticky top-0 z-30 h-14 sm:h-16 flex-shrink-0 bg-surface border-b border-border flex items-center justify-between gap-3 px-4 sm:px-8 box-border">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="flex w-9 h-9 sm:w-8 sm:h-8 flex-shrink-0 rounded-lg items-center justify-center border border-border"
            aria-label="Volver"
          >
            <BackIcon />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-[30px] h-[30px] rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <ToothIcon size={15} />
            </div>
            <div className="font-display text-[15px] font-semibold truncate">Detalle del pedido</div>
          </div>
        </div>
        <UserMenu nombre={user?.nombre} subtitle="Clínica" onLogout={() => { logout(); navigate('/login'); }} align="right" compact />
      </div>

      <div className="flex-grow box-border p-4 sm:p-8 flex flex-col gap-4 sm:gap-5">
        {loading && <div className="text-sm text-text-muted">Cargando...</div>}
        {!loading && !caso && <div className="text-sm text-red-600">No se encontró el pedido.</div>}

        {caso && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-display text-[22px] font-semibold">{caso.paciente_nombre || 'Sin paciente'}</div>
                <div className="text-[13px] text-text-faint mt-0.5">
                  Caso C-{caso.id}{caso.descripcion ? ` · ${caso.descripcion}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap [&>*]:flex-1 sm:[&>*]:flex-none">
                {caso.finalizado_at ? (
                  <>
                    <span className="px-3 py-2 rounded-full text-xs font-bold text-center whitespace-nowrap" style={{ background: '#E7F5EC', color: GREEN }}>
                      ✅ Finalizado el {formatFecha(caso.finalizado_at)}
                    </span>
                    <button
                      onClick={() => cambiarEstado('reabrir')}
                      title="Vuelve a Mis pedidos para poder enviar otra prueba"
                      className="border border-border text-text-secondary rounded-input px-4 h-10 text-[13px] font-semibold whitespace-nowrap"
                    >
                      Reabrir
                    </button>
                  </>
                ) : (
                  <>
                    {todosEntregados && (
                      <button
                        onClick={finalizar}
                        title="Úsalo cuando el trabajo ya se entregó al paciente"
                        className="border rounded-input px-4 h-10 text-[13px] font-semibold whitespace-nowrap"
                        style={{ borderColor: GREEN, color: GREEN }}
                      >
                        Finalizar trabajo
                      </button>
                    )}
                    <Link
                      to={`/nueva-prueba/${caso.id}`}
                      className="flex items-center justify-center gap-1.5 bg-primary text-white rounded-input px-4 h-10 text-[13px] font-semibold whitespace-nowrap"
                    >
                      <PlusIcon />
                      Nueva prueba
                    </Link>
                  </>
                )}
              </div>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-start">
              <div className="w-full lg:w-[340px] flex-shrink-0 card p-4 sm:p-5 flex flex-col gap-4">
                <div className="text-sm font-bold">Datos del caso</div>
                <Meta label="Doctor" value={caso.doctor_nombre} strong />
                <Meta label="Paciente" value={caso.paciente_nombre || '—'} />
                {/* Las pruebas vienen de la más reciente a la más antigua. */}
                <Meta label="Entrega estimada" value={textoEntrega(pedidos[0])} strong={Boolean(pedidos[0]?.fecha_entrega_est)} />
                {caso.items?.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 pt-4 border-t border-divider">
                    <Meta label="Trabajo" value={item.tipoTrabajo} strong />
                    <Meta label="Material" value={item.material || '—'} />
                    {item.piezasDentales && (
                      <div>
                        <span className="meta-label block text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1">Piezas dentales</span>
                        <div className="flex gap-1.5 flex-wrap">
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
                <div className="pt-4 border-t border-divider">
                  <FotosCaso pedidos={pedidos} imagenesPorPedido={imagenesPorPedido} />
                </div>
              </div>

              <div className="flex-grow min-w-0 flex flex-col gap-3.5">
                <div className="text-sm font-bold">Historial de pruebas</div>
                {pedidos.length === 0 && <div className="text-sm text-text-muted">Aún no hay pruebas registradas.</div>}

                {pedidos.map((p) => (
                  <div key={p.id} className="card p-3.5 sm:p-[18px] flex flex-col gap-2.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="text-[14.5px] font-bold">{p.etapa}</div>
                      <span className="text-[11.5px] font-semibold text-text-muted">{p.folio || `#${p.id}`}</span>
                    </div>
                    <div className="flex gap-x-5 gap-y-1 text-[12.5px] text-text-faint flex-wrap">
                      <span>Enviada: {formatFecha(p.fecha_entrada)}</span>
                      <span>Entrega estimada: {p.fecha_entrega_est ? formatFecha(p.fecha_entrega_est) : 'Por definir'}</span>
                      <span>{p.fotos_count} foto{p.fotos_count === 1 ? '' : 's'}</span>
                    </div>
                    <SeguimientoPedido pedido={p} />
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
                    <ComentariosPedido pedidoId={p.id} total={p.comentarios_count} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
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
