import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { subirImagenes } from '../api/imagenes';
import { useAuth } from '../context/AuthContext';
import UserMenu from '../components/UserMenu';
import PhotoPicker from '../components/PhotoPicker';
import { useCelebracion } from '../components/Celebracion';
import { ToothIcon, BackIcon, InfoIcon } from '../components/icons';
import { formatFecha, todayInputDate } from '../utils/format';

const ORDINALES = ['Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta', 'Sexta', 'Séptima', 'Octava', 'Novena', 'Décima'];

function nombrePrueba(numero) {
  return ORDINALES[numero - 1] ? `${ORDINALES[numero - 1]} prueba` : `Prueba ${numero}`;
}

export default function NuevaPruebaClinica() {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { celebrar } = useCelebracion();

  const [caso, setCaso] = useState(null);
  const [totalPruebas, setTotalPruebas] = useState(0);
  const [loading, setLoading] = useState(true);

  const [fechaEntregaEst, setFechaEntregaEst] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fotos, setFotos] = useState([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/casos/${id}`),
      api.get('/pedidos', { params: { casoId: id, limit: 1 } }),
    ])
      .then(([casoRes, pedidosRes]) => {
        setCaso(casoRes.data);
        setTotalPruebas(pedidosRes.data.pagination.total);
      })
      .catch(() => setCaso(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data: pedido } = await api.post('/pedidos', {
        casoId: Number(id),
        etapa: nombrePrueba(totalPruebas + 1),
        fechaEntrada: todayInputDate(),
        fechaEntregaEst: fechaEntregaEst || null,
        observaciones: observaciones || null,
      });

      if (fotos.length > 0) {
        await subirImagenes(pedido.id, fotos);
      }

      await celebrar({
        emoji: '🦷',
        tono: 'primario',
        titulo: '¡Prueba enviada!',
        detalle: `${nombrePrueba(totalPruebas + 1)} de ${caso.paciente_nombre || 'este caso'}. El gestor pasará a recogerla`,
      });
      navigate('/', { state: { nuevoCasoId: Number(id) } });
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo enviar la prueba');
    } finally {
      setSaving(false);
    }
  }

  const items = caso?.items || [];

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
            <div className="font-display text-[15px] font-semibold truncate">Nueva prueba</div>
          </div>
        </div>
        <UserMenu nombre={user?.nombre} subtitle="Clínica" onLogout={() => { logout(); navigate('/login'); }} align="right" compact />
      </div>

      <div className="flex-grow flex justify-center p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-[560px] flex flex-col gap-4">
          {loading && <div className="text-sm text-text-muted">Cargando...</div>}
          {!loading && !caso && <div className="text-sm text-red-600">No se encontró el caso.</div>}

          {caso?.finalizado_at && (
            <div className="card p-5 flex flex-col gap-3">
              <div className="text-sm font-bold">Este trabajo ya está finalizado</div>
              <div className="text-[13px] text-text-secondary">
                Lo finalizaste el {formatFecha(caso.finalizado_at)}. Si necesitas enviar otra prueba al laboratorio,
                primero reábrelo desde su detalle.
              </div>
              <Link
                to={`/casos/${caso.id}`}
                className="self-start border border-primary text-primary rounded-input px-4 h-9 flex items-center text-[13px] font-semibold"
              >
                Ir al detalle
              </Link>
            </div>
          )}

          {caso && !caso.finalizado_at && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <div className="font-display text-[20px] font-semibold">Enviar otra prueba al laboratorio</div>
                <div className="text-[13px] text-text-faint mt-0.5">
                  Será la {nombrePrueba(totalPruebas + 1).toLowerCase()} de este caso
                </div>
              </div>

              <div className="bg-primary-light rounded-xl px-4 py-3 flex items-start sm:items-center gap-2.5">
                <span className="flex-shrink-0 mt-0.5 sm:mt-0"><InfoIcon /></span>
                <span className="text-[12.5px] text-primary-dark">
                  Esta prueba se agrega al caso C-{caso.id}. Los datos del doctor, paciente y trabajo ya están guardados.
                </span>
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              <div className="card p-5 flex flex-col gap-3">
                <div className="text-sm font-bold">Caso</div>
                <div className="grid grid-cols-2 gap-3.5 text-[13px]">
                  <div>
                    <div className="field-label">Paciente</div>
                    <div className="font-semibold">{caso.paciente_nombre || 'Sin paciente'}</div>
                  </div>
                  <div>
                    <div className="field-label">Doctor</div>
                    <div className="font-semibold">{caso.doctor_nombre}</div>
                  </div>
                  {items.map((item) => (
                    <div key={item.id} className="col-span-2">
                      <div className="field-label">Trabajo</div>
                      <div className="font-semibold">
                        {item.tipoTrabajo}
                        {item.piezasDentales ? ` — Pieza ${item.piezasDentales}` : ''}
                        {item.material ? ` · ${item.material}` : ''}
                        {item.color ? ` · ${item.color}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5 flex flex-col gap-4">
                <div className="text-sm font-bold">Datos de esta prueba</div>
                <div>
                  <label className="field-label">Fecha en que lo necesitas</label>
                  <input className="field-input" type="date" value={fechaEntregaEst} onChange={(e) => setFechaEntregaEst(e.target.value)} />
                </div>
              </div>

              <div className="card p-5 flex flex-col gap-3.5">
                <div className="text-sm font-bold">Fotos de esta prueba (opcional)</div>
                <PhotoPicker label="" files={fotos} onChange={setFotos} />
              </div>

              <div className="card p-5 flex flex-col gap-2.5">
                <div className="text-sm font-bold">Observaciones</div>
                <textarea
                  placeholder="ej. Ajustar contacto proximal, revisar color..."
                  className="w-full h-24 border border-border rounded-input p-2.5 text-[13px] font-sans box-border resize-none outline-none"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </div>

              <button type="submit" disabled={saving} className="h-11 rounded-input bg-primary text-white text-sm font-semibold disabled:opacity-60">
                {saving ? 'Enviando...' : 'Enviar prueba al laboratorio'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
