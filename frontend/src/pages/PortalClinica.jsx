import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ToothIcon, PlusIcon } from '../components/icons';
import UserMenu from '../components/UserMenu';
import { formatFecha } from '../utils/format';
import { PASOS_SEGUIMIENTO, pasoActual, gestorDelPaso } from '../components/SeguimientoPedido';

const GREEN = '#2F8F5B';
const PENDING = '#DCE2DF';
const PENDING_TEXT = '#9AA6A3';
const DONE_TEXT = '#1C2624';

export default function PortalClinica() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('en_curso');
  const [error, setError] = useState('');

  const cargar = useCallback(
    () => api.get('/pedidos', { params: { limit: 100 } }).then(({ data }) => setPedidos(data.data)),
    []
  );

  useEffect(() => {
    cargar().finally(() => setLoading(false));
  }, [cargar]);

  // Un caso agrupa todas sus pruebas: se muestra la más reciente y se sabe si todas ya volvieron a la clínica.
  const { enCurso, finalizados } = useMemo(() => {
    const byCaso = new Map();
    for (const p of pedidos) {
      const item = byCaso.get(p.caso_id) || { ultimo: p, entregado: true };
      if (p.id > item.ultimo.id) item.ultimo = p;
      if (p.etapa_logistica !== 'entregado_en_clinica') item.entregado = false;
      byCaso.set(p.caso_id, item);
    }
    const casos = Array.from(byCaso.values()).sort((a, b) => b.ultimo.id - a.ultimo.id);
    return {
      enCurso: casos.filter((c) => !c.ultimo.caso_finalizado_at),
      finalizados: casos.filter((c) => c.ultimo.caso_finalizado_at),
    };
  }, [pedidos]);

  async function finalizar(p) {
    const paciente = p.paciente_nombre || 'este paciente';
    if (!window.confirm(`¿Confirmas que el trabajo de ${paciente} ya se entregó al paciente?\n\nPasará a "Finalizados" y ya no se enviará al laboratorio.`)) return;
    setError('');
    try {
      await api.post(`/casos/${p.caso_id}/finalizar`);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo finalizar el trabajo');
    }
  }

  const casos = tab === 'en_curso' ? enCurso : finalizados;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="h-16 flex-shrink-0 bg-surface border-b border-border flex items-center justify-between px-8 box-border">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-lg bg-primary flex items-center justify-center">
            <ToothIcon size={15} />
          </div>
          <div className="font-display text-[15px] font-semibold">Lab Dental — Portal de clínicas</div>
        </div>
        <UserMenu
          nombre={user?.nombre}
          subtitle="Clínica"
          onLogout={() => { logout(); navigate('/login'); }}
          placement="bottom"
          align="right"
        />
      </div>

      <div className="flex-grow box-border p-8 flex flex-col gap-5 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-[22px] font-semibold">Mis pedidos</div>
            <div className="text-[13px] text-text-faint mt-0.5">Estado de los trabajos enviados al laboratorio</div>
          </div>
          <Link
            to="/nuevo-pedido"
            className="flex items-center gap-1.5 bg-primary text-white rounded-input px-4 h-10 text-[13px] font-semibold whitespace-nowrap"
          >
            <PlusIcon />
            Nuevo pedido
          </Link>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTab('en_curso')}
            className={`px-4 py-2 rounded-full text-[12.5px] font-bold ${tab === 'en_curso' ? 'bg-text text-white' : 'bg-surface border border-border text-text-secondary'}`}
          >
            En curso ({enCurso.length})
          </button>
          <button
            onClick={() => setTab('finalizados')}
            className={`px-4 py-2 rounded-full text-[12.5px] font-bold ${tab === 'finalizados' ? 'bg-text text-white' : 'bg-surface border border-border text-text-secondary'}`}
          >
            Finalizados ({finalizados.length})
          </button>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex flex-col gap-3.5 overflow-y-auto">
          {loading && <div className="text-sm text-text-muted">Cargando...</div>}
          {!loading && casos.length === 0 && (
            <div className="text-sm text-text-muted">
              {tab === 'finalizados'
                ? 'Aún no tienes trabajos finalizados.'
                : finalizados.length > 0
                  ? 'No tienes pedidos en curso.'
                  : 'Aún no tienes pedidos registrados.'}
            </div>
          )}

          {casos.map(({ ultimo: p, entregado }) => {
            const abrir = () => navigate(`/casos/${p.caso_id}`);
            const abrirConTeclado = (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) abrir(); };

            if (tab === 'finalizados') {
              return (
                <div
                  key={p.caso_id}
                  role="link"
                  tabIndex={0}
                  onClick={abrir}
                  onKeyDown={abrirConTeclado}
                  className="card px-[26px] py-[18px] flex items-center justify-between cursor-pointer hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="text-[15px] font-bold text-primary-dark">{p.folio || `#${p.id}`}</div>
                    <div className="w-px h-4 bg-border" />
                    <div className="text-sm font-semibold">{p.paciente_nombre || 'Sin paciente'}</div>
                    <div className="text-[13px] text-text-muted">{p.caso_descripcion || `Caso C-${p.caso_id}`}</div>
                  </div>
                  <div className="text-[12.5px] font-semibold" style={{ color: GREEN }}>
                    ✅ Finalizado el {formatFecha(p.caso_finalizado_at)}
                  </div>
                </div>
              );
            }

            const stage = pasoActual(p);
            const steps = PASOS_SEGUIMIENTO.map((paso, i) => ({
              label: `${paso.emoji} ${paso.label}`,
              done: stage >= i + 1,
              gestor: stage >= i + 1 ? gestorDelPaso(paso, p) : null,
            }));
            return (
              <div
                key={p.caso_id}
                role="link"
                tabIndex={0}
                onClick={abrir}
                onKeyDown={abrirConTeclado}
                className="card px-[26px] py-[22px] flex flex-col gap-[18px] cursor-pointer hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="text-[15px] font-bold text-primary-dark">{p.folio || `#${p.id}`}</div>
                    <div className="w-px h-4 bg-border" />
                    <div className="text-sm font-semibold">{p.paciente_nombre || 'Sin paciente'}</div>
                    <div className="text-[13px] text-text-muted">{p.caso_descripcion || `Caso C-${p.caso_id}`}</div>
                    <div className="text-[11.5px] font-semibold text-text-muted bg-bg rounded-full px-2.5 py-0.5">{p.etapa}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-[12.5px] text-text-muted">
                      Entrega estimada: {p.fecha_entrega_est ? formatFecha(p.fecha_entrega_est) : 'Por definir'}
                    </div>
                    {entregado && (
                      <button
                        onClick={(e) => { e.stopPropagation(); finalizar(p); }}
                        title="Úsalo cuando el trabajo ya se entregó al paciente"
                        className="flex items-center border rounded-input px-3 h-8 text-[12.5px] font-semibold whitespace-nowrap"
                        style={{ borderColor: GREEN, color: GREEN }}
                      >
                        Finalizar trabajo
                      </button>
                    )}
                    <Link
                      to={`/nueva-prueba/${p.caso_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 border border-primary text-primary rounded-input px-3 h-8 text-[12.5px] font-semibold whitespace-nowrap"
                    >
                      <PlusIcon stroke="#0E7C86" />
                      Nueva prueba
                    </Link>
                  </div>
                </div>

                <div className="flex items-start">
                  {steps.map((s, i) => (
                    <div key={s.label} className="flex items-start" style={{ flexGrow: i === steps.length - 1 ? 0 : 1, width: i === steps.length - 1 ? 'auto' : undefined }}>
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-3.5 h-3.5 rounded-full" style={{ background: s.done ? GREEN : PENDING }} />
                        <span className="text-[11.5px] font-semibold" style={{ color: s.done ? DONE_TEXT : PENDING_TEXT }}>
                          {s.label}
                        </span>
                        {s.gestor && <span className="text-[10.5px] text-text-muted -mt-1">{s.gestor}</span>}
                      </div>
                      {i < steps.length - 1 && (
                        <div className="h-0.5 flex-grow mt-1.5" style={{ background: stage > i + 1 ? GREEN : PENDING }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
