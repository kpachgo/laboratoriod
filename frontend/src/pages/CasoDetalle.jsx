import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import Layout from '../components/Layout';
import { estadoInfo } from '../components/StatusBadge';
import { BackIcon, PlusIcon } from '../components/icons';
import { formatFecha, FILES_BASE_URL } from '../utils/format';

export default function CasoDetalle() {
  const { id } = useParams();
  const [caso, setCaso] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [imagenesPorPedido, setImagenesPorPedido] = useState({});
  const [loading, setLoading] = useState(true);

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
  }, [id]);

  if (loading) {
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

  return (
    <Layout>
      <div className="h-16 flex-shrink-0 bg-surface border-b border-border -mx-8 -mt-7 px-7 flex items-center justify-between box-border">
        <div className="flex items-center gap-3.5">
          <Link to="/" className="flex w-8 h-8 rounded-lg items-center justify-center border border-border">
            <BackIcon />
          </Link>
          <div>
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
          className="flex items-center gap-1.5 h-[38px] px-4 rounded-input bg-primary text-white text-[13px] font-semibold"
        >
          <PlusIcon />
          Nueva prueba
        </Link>
      </div>

      <div className="flex-grow flex gap-6 overflow-hidden pt-2">
        <div className="w-[340px] flex-shrink-0 flex flex-col gap-4">
          <div className="card p-5 flex flex-col gap-4">
            <div className="text-sm font-bold">Datos del caso</div>
            <Meta label="Clínica" value={caso.clinica_nombre} strong />
            <Meta label="Doctor" value={caso.doctor_nombre} />
            <Meta label="Paciente" value={caso.paciente_nombre || '—'} />
            <div className="h-px bg-divider" />
            {caso.items?.map((item) => (
              <div key={item.id} className="flex flex-col gap-3">
                <Meta label="Trabajo" value={item.tipoTrabajo} strong />
                <Meta label="Material" value={item.material || '—'} />
                {item.piezasDentales && (
                  <div>
                    <span className="meta-label">Piezas dentales</span>
                    <div className="flex gap-1.5 mt-1">
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
          </div>
        </div>

        <div className="flex-grow flex flex-col gap-3.5 overflow-y-auto">
          <div className="text-sm font-bold">Historial de pruebas</div>

          <div className="flex flex-col">
            {pedidos.length === 0 && <div className="text-sm text-text-muted">Aún no hay pruebas registradas.</div>}
            {pedidos.map((p, index) => {
              const info = estadoInfo(p.estado);
              const showLine = index < pedidos.length - 1;
              return (
                <div key={p.id} className="flex gap-4">
                  <div className="flex flex-col items-center w-4 flex-shrink-0">
                    <div className="w-3.5 h-3.5 rounded-full mt-[22px] flex-shrink-0" style={{ background: info.dot }} />
                    {showLine && <div className="w-0.5 flex-grow bg-border" style={{ minHeight: 60 }} />}
                  </div>
                  <div className="flex-grow card p-[18px] mb-4 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="text-[14.5px] font-bold">{p.etapa}</div>
                        <span className="text-[11.5px] font-semibold text-text-muted">{p.folio || `#${p.id}`}</span>
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                        style={{ background: info.bg, color: info.color }}
                      >
                        {info.label}
                      </span>
                    </div>
                    <div className="flex gap-5 text-[12.5px] text-text-faint">
                      <span>{formatFecha(p.fecha_entrada)}</span>
                      <span>Gestor: {p.gestor_nombre || '—'}</span>
                      <span>{p.fotos_count} foto{p.fotos_count === 1 ? '' : 's'}</span>
                    </div>
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
