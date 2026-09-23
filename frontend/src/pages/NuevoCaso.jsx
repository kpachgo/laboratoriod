import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { subirImagenes } from '../api/imagenes';
import Layout from '../components/Layout';
import PhotoPicker from '../components/PhotoPicker';
import { useCelebracion } from '../components/Celebracion';
import { BackIcon, PlusIcon } from '../components/icons';
import { todayInputDate } from '../utils/format';

const ETAPAS = ['Rodete', 'Bizcocho', 'Metal', 'Color', 'Otro'];

function emptyItem() {
  return { tipoTrabajo: '', material: '', color: '', piezasDentales: '', unidades: 1, fotos: [] };
}

export default function NuevoCaso() {
  const navigate = useNavigate();
  const { celebrar } = useCelebracion();
  const [clinicas, setClinicas] = useState([]);
  const [doctores, setDoctores] = useState([]);
  const [gestores, setGestores] = useState([]);

  const [clinicaId, setClinicaId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [pacienteNombre, setPacienteNombre] = useState('');
  const [items, setItems] = useState([emptyItem()]);

  const [etapa, setEtapa] = useState('Rodete');
  const [fechaEntrada, setFechaEntrada] = useState(todayInputDate());
  const [fechaEntregaEst, setFechaEntregaEst] = useState('');
  const [gestorId, setGestorId] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/clinicas').then(({ data }) => setClinicas(data));
    api.get('/usuarios').then(({ data }) => setGestores(data.filter((u) => u.rol === 'gestor')));
  }, []);

  useEffect(() => {
    if (!clinicaId) {
      setDoctores([]);
      return;
    }
    api.get('/doctores', { params: { clinicaId } }).then(({ data }) => setDoctores(data));
  }, [clinicaId]);

  function updateItem(index, field, value) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setError('');
    if (!clinicaId || !doctorId) {
      setError('Selecciona la clínica y el doctor.');
      return;
    }
    setSaving(true);
    try {
      const { data: caso } = await api.post('/casos', {
        clinicaId: Number(clinicaId),
        doctorId: Number(doctorId),
        pacienteNombre,
        items: items.map((it) => ({
          tipoTrabajo: it.tipoTrabajo,
          material: it.material,
          color: it.color,
          piezasDentales: it.piezasDentales,
          unidades: Number(it.unidades) || 1,
        })),
      });

      const { data: pedido } = await api.post('/pedidos', {
        casoId: caso.id,
        etapa,
        fechaEntrada,
        fechaEntregaEst: fechaEntregaEst || null,
        gestorId: gestorId ? Number(gestorId) : null,
        observaciones: observaciones || null,
      });

      for (const [index, item] of items.entries()) {
        if (item.fotos.length === 0) continue;
        const etiqueta = `Ítem ${index + 1}${item.tipoTrabajo ? ` — ${item.tipoTrabajo}` : ''}`;
        await subirImagenes(pedido.id, item.fotos, etiqueta);
      }

      await celebrar({
        emoji: '🦷',
        tono: 'primario',
        titulo: 'Caso creado',
        detalle: `Caso C-${caso.id} con su primera prueba (${etapa})`,
      });
      navigate(`/casos/${caso.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el caso');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="min-h-[64px] py-3 md:py-0 flex-shrink-0 bg-surface border-b border-border -mx-4 -mt-4 md:-mx-8 md:-mt-7 px-4 md:px-7 flex flex-wrap items-center justify-between gap-3 box-border">
        <div className="flex items-center gap-3.5 min-w-0">
          <Link to="/" className="flex w-9 h-9 md:w-8 md:h-8 flex-shrink-0 rounded-lg items-center justify-center border border-border" aria-label="Volver">
            <BackIcon />
          </Link>
          <div className="min-w-0">
            <div className="font-display text-[17px] font-semibold">Nuevo caso</div>
            <div className="text-xs text-text-muted">Se crea el caso junto con su primera prueba</div>
          </div>
        </div>
        <div className="flex gap-2.5 w-full sm:w-auto">
          <Link to="/" className="flex-1 sm:flex-none justify-center h-10 md:h-[38px] px-4 rounded-input border border-border flex items-center text-[13px] font-semibold text-text-secondary">
            Cancelar
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 sm:flex-none justify-center h-10 md:h-[38px] px-[18px] rounded-input bg-primary text-white flex items-center text-[13px] font-semibold disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar caso'}
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex-grow flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-hidden pt-2">
        <div className="flex-grow min-w-0 flex flex-col gap-4 lg:gap-[18px] overflow-y-auto lg:pr-1">
          <div className="card p-4 sm:p-[22px] flex flex-col gap-4">
            <div className="text-sm font-bold">Datos generales</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="field-label">Clínica</label>
                <select className="field-input" value={clinicaId} onChange={(e) => { setClinicaId(e.target.value); setDoctorId(''); }}>
                  <option value="">Selecciona...</option>
                  {clinicas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Doctor</label>
                <select className="field-input" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} disabled={!clinicaId}>
                  <option value="">Selecciona...</option>
                  {doctores.map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Paciente</label>
                <input className="field-input" type="text" placeholder="Nombre del paciente" value={pacienteNombre} onChange={(e) => setPacienteNombre(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Fecha de entrada</label>
                <input className="field-input" type="date" value={fechaEntrada} onChange={(e) => setFechaEntrada(e.target.value)} />
              </div>
            </div>
          </div>

          {items.map((item, index) => (
            <div key={index} className="card p-4 sm:p-[22px] flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold min-w-0">Ítem {index + 1}{item.tipoTrabajo ? ` — ${item.tipoTrabajo}` : ''}</div>
                {items.length > 1 && (
                  <button onClick={() => removeItem(index)} className="text-xs text-text-muted py-1 flex-shrink-0">Quitar</button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="field-label">Tipo de trabajo</label>
                  <input className="field-input" type="text" placeholder="Corona, puente..." value={item.tipoTrabajo} onChange={(e) => updateItem(index, 'tipoTrabajo', e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Material</label>
                  <input className="field-input" type="text" placeholder="Zirconia..." value={item.material} onChange={(e) => updateItem(index, 'material', e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Color</label>
                  <input className="field-input" type="text" placeholder="VITA A2" value={item.color} onChange={(e) => updateItem(index, 'color', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="field-label">Piezas dentales</label>
                <input className="field-input" type="text" placeholder="16,17,18" value={item.piezasDentales} onChange={(e) => updateItem(index, 'piezasDentales', e.target.value)} />
              </div>
              <PhotoPicker
                label="Fotos del ítem"
                files={item.fotos}
                onChange={(fotos) => updateItem(index, 'fotos', fotos)}
              />
            </div>
          ))}

          <button onClick={addItem} className="flex items-center justify-center gap-2 border-[1.5px] border-dashed border-dashed rounded-xl p-3.5 text-text-secondary text-[13px] font-semibold">
            <PlusIcon stroke="#5C6A67" />
            Agregar otro ítem al caso
          </button>
        </div>

        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
          <div className="card p-4 sm:p-5 flex flex-col gap-3.5">
            <div className="text-sm font-bold">Primera prueba</div>
            <div>
              <label className="field-label">Etapa</label>
              <div className="flex gap-1.5 flex-wrap">
                {ETAPAS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEtapa(e)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                      etapa === e ? 'bg-text text-white' : 'border border-border text-text-secondary'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Fecha entrega estimada</label>
              <input className="field-input" type="date" value={fechaEntregaEst} onChange={(e) => setFechaEntregaEst(e.target.value)} />
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

          <div className="card p-4 sm:p-5 flex flex-col gap-2.5">
            <div className="text-sm font-bold">Observaciones</div>
            <textarea
              placeholder="Indicaciones adicionales del doctor..."
              className="w-full h-24 border border-border rounded-input p-2.5 text-[13px] font-sans box-border resize-none outline-none"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
