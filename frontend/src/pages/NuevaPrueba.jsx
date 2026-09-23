import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { subirImagenes } from '../api/imagenes';
import Layout from '../components/Layout';
import PhotoPicker from '../components/PhotoPicker';
import { useCelebracion } from '../components/Celebracion';
import { BackIcon, InfoIcon } from '../components/icons';
import { todayInputDate } from '../utils/format';

const ETAPAS = ['Rodete', 'Bizcocho', 'Metal', 'Color', 'Entrega final'];

export default function NuevaPrueba() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { celebrar } = useCelebracion();
  const [caso, setCaso] = useState(null);
  const [gestores, setGestores] = useState([]);

  const [etapa, setEtapa] = useState('Rodete');
  const [etapaOtro, setEtapaOtro] = useState('');
  const [fechaEntrada, setFechaEntrada] = useState(todayInputDate());
  const [gestorId, setGestorId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fotos, setFotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/casos/${id}`).then(({ data }) => setCaso(data));
    api.get('/usuarios').then(({ data }) => setGestores(data.filter((u) => u.rol === 'gestor')));
  }, [id]);

  async function handleSubmit() {
    setError('');
    const etapaFinal = etapa === 'Otro' ? etapaOtro.trim() : etapa;
    if (!etapaFinal) {
      setError('Indica la etapa de la prueba.');
      return;
    }
    setSaving(true);
    try {
      const { data: pedido } = await api.post('/pedidos', {
        casoId: Number(id),
        etapa: etapaFinal,
        fechaEntrada,
        gestorId: gestorId ? Number(gestorId) : null,
        observaciones: observaciones || null,
      });

      if (fotos.length > 0) {
        await subirImagenes(pedido.id, fotos);
      }

      await celebrar({ emoji: '🦷', tono: 'primario', titulo: 'Prueba registrada', detalle: `${etapaFinal} · Caso C-${id}` });
      navigate(`/casos/${id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la prueba');
    } finally {
      setSaving(false);
    }
  }

  const primerItem = caso?.items?.[0];

  return (
    <Layout>
      <div className="min-h-[64px] py-3 md:py-0 flex-shrink-0 bg-surface border-b border-border -mx-4 -mt-4 md:-mx-8 md:-mt-7 px-4 md:px-7 flex flex-wrap items-center justify-between gap-3 box-border">
        <div className="flex items-center gap-3.5 min-w-0">
          <Link to={`/casos/${id}`} className="flex w-9 h-9 md:w-8 md:h-8 flex-shrink-0 rounded-lg items-center justify-center border border-border" aria-label="Volver">
            <BackIcon />
          </Link>
          <div className="min-w-0">
            <div className="font-display text-[17px] font-semibold">Nueva prueba</div>
            <div className="text-xs text-text-muted">
              Caso C-{id} {caso ? `· ${caso.paciente_nombre || ''} · ${primerItem?.tipoTrabajo || ''}` : ''}
            </div>
          </div>
        </div>
        <div className="flex gap-2.5 w-full sm:w-auto">
          <Link to={`/casos/${id}`} className="flex-1 sm:flex-none justify-center h-10 md:h-[38px] px-4 rounded-input border border-border flex items-center text-[13px] font-semibold text-text-secondary">
            Cancelar
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 sm:flex-none justify-center h-10 md:h-[38px] px-[18px] rounded-input bg-primary text-white flex items-center text-[13px] font-semibold disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar prueba'}
          </button>
        </div>
      </div>

      <div className="flex-grow flex justify-center pt-2 md:pt-6 overflow-hidden">
        <div className="w-full max-w-[640px] flex flex-col gap-4 md:gap-[18px] overflow-y-auto">
          <div className="bg-primary-light rounded-xl px-4 py-3 flex items-start sm:items-center gap-2.5">
            <span className="flex-shrink-0 mt-0.5 sm:mt-0"><InfoIcon /></span>
            <span className="text-[12.5px] text-primary-dark">
              Esta prueba se agrega al caso C-{id} — no repitas los datos de la clínica ni del trabajo, ya quedaron guardados.
            </span>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="card p-4 sm:p-[22px] flex flex-col gap-4">
            <div className="text-sm font-bold">Etapa</div>
            <div className="flex gap-2 flex-wrap">
              {ETAPAS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEtapa(e)}
                  className={`px-3.5 py-2 rounded-full text-[12.5px] font-semibold ${
                    etapa === e ? 'bg-text text-white' : 'border border-border text-text-secondary'
                  }`}
                >
                  {e}
                </button>
              ))}
              <button
                onClick={() => setEtapa('Otro')}
                className={`px-3.5 py-2 rounded-full text-[12.5px] font-semibold border border-dashed ${
                  etapa === 'Otro' ? 'bg-text text-white border-text' : 'text-text-muted border-dashed'
                }`}
              >
                Otro...
              </button>
            </div>
            {etapa === 'Otro' && (
              <input
                className="field-input"
                type="text"
                placeholder="Nombre de la etapa"
                value={etapaOtro}
                onChange={(e) => setEtapaOtro(e.target.value)}
              />
            )}
          </div>

          <div className="card p-4 sm:p-[22px] flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="field-label">Fecha</label>
                <input className="field-input" type="date" value={fechaEntrada} onChange={(e) => setFechaEntrada(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Gestor asignado</label>
                <select className="field-input" value={gestorId} onChange={(e) => setGestorId(e.target.value)}>
                  <option value="">Sin asignar</option>
                  {gestores.map((g) => (
                    <option key={g.id} value={g.id}>{g.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-[22px] flex flex-col gap-3.5">
            <div className="text-sm font-bold">Fotos de esta prueba</div>
            <PhotoPicker label="" files={fotos} onChange={setFotos} />
          </div>

          <div className="card p-4 sm:p-[22px] flex flex-col gap-2.5">
            <div className="text-sm font-bold">Observaciones de esta prueba</div>
            <textarea
              placeholder="ej. Doctor pidió ajustar contacto proximal..."
              className="w-full h-20 border border-border rounded-input p-2.5 text-[13px] font-sans box-border resize-none outline-none"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
