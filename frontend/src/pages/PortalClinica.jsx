import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ToothIcon, PlusIcon } from '../components/icons';
import UserMenu from '../components/UserMenu';
import { formatFecha } from '../utils/format';
import { PASOS_SEGUIMIENTO, pasoActual, gestorDelPaso } from '../components/SeguimientoPedido';
import { useCelebracion, esperar } from '../components/Celebracion';

const GREEN = '#2F8F5B';
const PRIMARY = '#0E7C86';
const PRIMARY_DARK = '#0A5D65';
const PRIMARY_LIGHT = '#E3F1F0';
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
  const [saliendo, setSaliendo] = useState(null);
  const { celebrar } = useCelebracion();
  // Caso recién enviado desde "Nuevo pedido" o "Nueva prueba": su tarjeta entra resaltada.
  const nuevoCasoId = useLocation().state?.nuevoCasoId;

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
      setSaliendo(p.caso_id);
      celebrar({ emoji: '🎉', tono: 'verde', titulo: '¡Trabajo finalizado!', detalle: 'Lo encontrarás en Finalizados' });
      await esperar(350);
      await cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo finalizar el trabajo');
    } finally {
      setSaliendo(null);
    }
  }

  const casos = tab === 'en_curso' ? enCurso : finalizados;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="sticky top-0 z-30 h-14 sm:h-16 flex-shrink-0 bg-surface border-b border-border flex items-center justify-between gap-3 px-4 sm:px-8 box-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-[30px] h-[30px] rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <ToothIcon size={15} />
          </div>
          <div className="font-display text-[15px] font-semibold truncate">
            Lab Dental<span className="hidden sm:inline"> — Portal de clínicas</span>
          </div>
        </div>
        <UserMenu
          nombre={user?.nombre}
          subtitle="Clínica"
          onLogout={() => { logout(); navigate('/login'); }}
          placement="bottom"
          align="right"
          compact
        />
      </div>

      <div className="flex-grow box-border p-4 sm:p-8 flex flex-col gap-4 sm:gap-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-display text-[22px] font-semibold">Mis pedidos</div>
            <div className="text-[13px] text-text-faint mt-0.5">Estado de los trabajos enviados al laboratorio</div>
          </div>
          <Link
            to="/nuevo-pedido"
            className="flex items-center justify-center gap-1.5 bg-primary text-white rounded-input px-4 h-11 sm:h-10 text-[13px] font-semibold whitespace-nowrap"
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
                  className="card px-4 py-4 sm:px-[26px] sm:py-[18px] flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-x-3.5 gap-y-1 flex-wrap">
                    <div className="text-[15px] font-bold text-primary-dark">{p.folio || `#${p.id}`}</div>
                    <div className="w-px h-4 bg-border" />
                    <div className="text-sm font-semibold">{p.paciente_nombre || 'Sin paciente'}</div>
                    <div className="text-[13px] text-text-muted basis-full sm:basis-auto">{p.caso_descripcion || `Caso C-${p.caso_id}`}</div>
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
              emoji: paso.emoji,
              enTransito: paso.enTransito,
              done: stage >= i + 1,
              // Paso en el que va ahora (el último, "Entregado", ya no tiene nada en curso).
              actual: i + 1 === stage && stage < PASOS_SEGUIMIENTO.length,
              gestor: stage >= i + 1 ? gestorDelPaso(paso, p) : null,
            }));
            return (
              <div
                key={p.caso_id}
                role="link"
                tabIndex={0}
                onClick={abrir}
                onKeyDown={abrirConTeclado}
                className={`card px-4 py-4 sm:px-[26px] sm:py-[22px] flex flex-col gap-4 sm:gap-[18px] cursor-pointer hover:border-primary transition-colors ${
                  saliendo === p.caso_id ? 'tarjeta-salida' : p.caso_id === nuevoCasoId ? 'tarjeta-entrada' : ''
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-center gap-x-3.5 gap-y-1 flex-wrap">
                    <div className="text-[15px] font-bold text-primary-dark">{p.folio || `#${p.id}`}</div>
                    <div className="w-px h-4 bg-border" />
                    <div className="text-sm font-semibold">{p.paciente_nombre || 'Sin paciente'}</div>
                    <div className="text-[13px] text-text-muted">{p.caso_descripcion || `Caso C-${p.caso_id}`}</div>
                    <div className="text-[11.5px] font-semibold text-text-muted bg-bg rounded-full px-2.5 py-0.5">{p.etapa}</div>
                    {p.comentarios_count > 0 && (
                      <div className="text-[11.5px] font-bold text-primary-dark bg-primary-light rounded-full px-2.5 py-0.5">
                        💬 {p.comentarios_count === 1 ? 'Comentario' : `${p.comentarios_count} comentarios`} del laboratorio
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-x-4 gap-y-2.5 flex-wrap">
                    <div className="text-[12.5px] text-text-muted basis-full sm:basis-auto">
                      Entrega estimada: {p.fecha_entrega_est ? formatFecha(p.fecha_entrega_est) : 'Por definir'}
                    </div>
                    {entregado && (
                      <button
                        onClick={(e) => { e.stopPropagation(); finalizar(p); }}
                        title="Úsalo cuando el trabajo ya se entregó al paciente"
                        className="flex items-center justify-center flex-1 sm:flex-none border rounded-input px-3 h-10 sm:h-8 text-[12.5px] font-semibold whitespace-nowrap"
                        style={{ borderColor: GREEN, color: GREEN }}
                      >
                        Finalizar trabajo
                      </button>
                    )}
                    <Link
                      to={`/nueva-prueba/${p.caso_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center flex-1 sm:flex-none gap-1.5 border border-primary text-primary rounded-input px-3 h-10 sm:h-8 text-[12.5px] font-semibold whitespace-nowrap"
                    >
                      <PlusIcon stroke="#0E7C86" />
                      Nueva prueba
                    </Link>
                  </div>
                </div>

                <div className="md:hidden flex flex-col gap-2">
                  <div className="flex gap-1">
                    {steps.map((s, i) => (
                      <div key={s.label} className="relative h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: PENDING }}>
                        {s.done && (
                          <div className="seg-fill absolute inset-0" style={{ background: GREEN, animationDelay: `${i * 150}ms` }} />
                        )}
                        {/* El tramo siguiente al paso actual se anima como ruta en curso. */}
                        {i === stage && stage < steps.length && <div className="seg-flow absolute inset-0" />}
                      </div>
                    ))}
                  </div>
                  <div className="text-[12.5px]">
                    <span className="text-text-muted">Paso {stage} de {steps.length}: </span>
                    <span className="font-semibold">{steps[stage - 1].label}</span>
                    {steps[stage - 1].gestor && <span className="text-text-muted"> · {steps[stage - 1].gestor}</span>}
                  </div>
                </div>

                <div className="hidden md:flex items-start">
                  {steps.map((s, i) => (
                    <div key={s.label} className="flex items-start" style={{ flexGrow: i === steps.length - 1 ? 0 : 1, width: i === steps.length - 1 ? 'auto' : undefined }}>
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="relative w-3.5 h-3.5">
                          {s.actual && (
                            <span className="absolute inset-0 rounded-full motion-safe:animate-ping" style={{ background: PRIMARY, opacity: 0.35 }} />
                          )}
                          <div
                            className={`relative w-3.5 h-3.5 rounded-full ${s.done && !s.actual ? 'seg-pop' : ''}`}
                            style={{
                              background: s.actual ? PRIMARY : s.done ? GREEN : PENDING,
                              boxShadow: s.actual ? `0 0 0 3px ${PRIMARY_LIGHT}` : 'none',
                              animationDelay: `${i * 150}ms`,
                            }}
                          />
                        </div>
                        <span
                          className="text-[11.5px] font-semibold"
                          style={{ color: s.actual ? PRIMARY_DARK : s.done ? DONE_TEXT : PENDING_TEXT }}
                        >
                          {s.label}
                        </span>
                        {s.gestor && <span className="text-[10.5px] text-text-muted -mt-1">{s.gestor}</span>}
                      </div>
                      {i < steps.length - 1 && (
                        <div className="relative h-0.5 flex-grow mt-1.5" style={{ background: PENDING }}>
                          {stage > i + 1 && (
                            <div className="seg-fill absolute inset-0" style={{ background: GREEN, animationDelay: `${i * 150}ms` }} />
                          )}
                          {s.actual && <div className="seg-flow absolute inset-0" />}
                          {s.actual && s.enTransito && (
                            <div className="seg-vehicle absolute -top-[19px] text-[16px] leading-none" aria-hidden="true">
                              <span className="seg-bob inline-block">
                                {/* Los emojis de vehículo miran a la izquierda; se voltean para que avancen. */}
                                <span className="inline-block -scale-x-100">{s.emoji}</span>
                              </span>
                            </div>
                          )}
                        </div>
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
