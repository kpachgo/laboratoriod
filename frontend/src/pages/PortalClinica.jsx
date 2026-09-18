import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ToothIcon, PlusIcon } from '../components/icons';
import UserMenu from '../components/UserMenu';
import { formatFecha } from '../utils/format';
import { PASOS_SEGUIMIENTO, pasoActual } from '../components/SeguimientoPedido';

const GREEN = '#2F8F5B';
const PENDING = '#DCE2DF';
const PENDING_TEXT = '#9AA6A3';
const DONE_TEXT = '#1C2624';

export default function PortalClinica() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/pedidos', { params: { limit: 100 } })
      .then(({ data }) => setPedidos(data.data))
      .finally(() => setLoading(false));
  }, []);

  const casos = useMemo(() => {
    const byCaso = new Map();
    for (const p of pedidos) {
      const prev = byCaso.get(p.caso_id);
      if (!prev || p.id > prev.id) byCaso.set(p.caso_id, p);
    }
    return Array.from(byCaso.values()).sort((a, b) => b.id - a.id);
  }, [pedidos]);

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

        <div className="flex flex-col gap-3.5 overflow-y-auto">
          {loading && <div className="text-sm text-text-muted">Cargando...</div>}
          {!loading && casos.length === 0 && (
            <div className="text-sm text-text-muted">Aún no tienes pedidos registrados.</div>
          )}

          {casos.map((p) => {
            const stage = pasoActual(p);
            const steps = PASOS_SEGUIMIENTO.map((paso, i) => ({ label: `${paso.emoji} ${paso.label}`, done: stage >= i + 1 }));
            return (
              <div key={p.caso_id} className="card px-[26px] py-[22px] flex flex-col gap-[18px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="text-[15px] font-bold text-primary-dark">{p.folio || `#${p.id}`}</div>
                    <div className="w-px h-4 bg-border" />
                    <div className="text-sm font-semibold">{p.paciente_nombre || 'Sin paciente'}</div>
                    <div className="text-[13px] text-text-muted">{p.caso_descripcion || `Caso C-${p.caso_id}`}</div>
                  </div>
                  <div className="text-[12.5px] text-text-muted">
                    Entrega estimada: {p.fecha_entrega_est ? formatFecha(p.fecha_entrega_est) : 'Por definir'}
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
