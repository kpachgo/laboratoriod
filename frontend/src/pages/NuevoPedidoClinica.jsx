import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { subirImagenes } from '../api/imagenes';
import { useAuth } from '../context/AuthContext';
import UserMenu from '../components/UserMenu';
import PhotoPicker from '../components/PhotoPicker';
import { ToothIcon, BackIcon } from '../components/icons';
import { todayInputDate } from '../utils/format';

export default function NuevoPedidoClinica() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [doctores, setDoctores] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [doctorNuevo, setDoctorNuevo] = useState('');
  const [usarDoctorNuevo, setUsarDoctorNuevo] = useState(false);

  const [pacienteNombre, setPacienteNombre] = useState('');
  const [tipoTrabajo, setTipoTrabajo] = useState('');
  const [material, setMaterial] = useState('');
  const [color, setColor] = useState('');
  const [piezasDentales, setPiezasDentales] = useState('');
  const [fechaEntregaEst, setFechaEntregaEst] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fotos, setFotos] = useState([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/doctores').then(({ data }) => {
      setDoctores(data);
      if (data.length === 0) setUsarDoctorNuevo(true);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!usarDoctorNuevo && !doctorId) {
      setError('Selecciona el doctor.');
      return;
    }
    if (usarDoctorNuevo && !doctorNuevo.trim()) {
      setError('Indica el nombre del doctor.');
      return;
    }
    if (!tipoTrabajo.trim()) {
      setError('Indica el tipo de trabajo.');
      return;
    }

    setSaving(true);
    try {
      let finalDoctorId = doctorId ? Number(doctorId) : null;
      if (usarDoctorNuevo) {
        const { data: doctor } = await api.post('/doctores', { nombre: doctorNuevo.trim() });
        finalDoctorId = doctor.id;
      }

      const { data: caso } = await api.post('/casos', {
        doctorId: finalDoctorId,
        pacienteNombre,
        descripcion: tipoTrabajo,
        items: [{ tipoTrabajo, material, color, piezasDentales }],
      });

      const { data: pedido } = await api.post('/pedidos', {
        casoId: caso.id,
        etapa: 'Recibido',
        fechaEntrada: todayInputDate(),
        fechaEntregaEst: fechaEntregaEst || null,
        observaciones: observaciones || null,
      });

      if (fotos.length > 0) {
        await subirImagenes(pedido.id, fotos);
      }

      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo enviar el pedido');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="h-16 flex-shrink-0 bg-surface border-b border-border flex items-center justify-between px-8 box-border">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/')}
            className="flex w-8 h-8 rounded-lg items-center justify-center border border-border"
          >
            <BackIcon />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-[30px] h-[30px] rounded-lg bg-primary flex items-center justify-center">
              <ToothIcon size={15} />
            </div>
            <div className="font-display text-[15px] font-semibold">Nuevo pedido</div>
          </div>
        </div>
        <UserMenu nombre={user?.nombre} subtitle="Clínica" onLogout={() => { logout(); navigate('/login'); }} align="right" />
      </div>

      <form onSubmit={handleSubmit} className="flex-grow flex justify-center p-8 overflow-y-auto">
        <div className="w-[560px] flex flex-col gap-4">
          <div>
            <div className="font-display text-[20px] font-semibold">Enviar trabajo al laboratorio</div>
            <div className="text-[13px] text-text-faint mt-0.5">Se creará un caso nuevo con esta primera prueba</div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="card p-5 flex flex-col gap-4">
            <div className="text-sm font-bold">Doctor</div>
            {!usarDoctorNuevo && doctores.length > 0 ? (
              <>
                <select className="field-input" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                  <option value="">Selecciona...</option>
                  {doctores.map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setUsarDoctorNuevo(true)} className="text-xs text-primary text-left font-semibold">
                  + Registrar un doctor nuevo
                </button>
              </>
            ) : (
              <>
                <input
                  className="field-input"
                  type="text"
                  placeholder="Nombre del doctor"
                  value={doctorNuevo}
                  onChange={(e) => setDoctorNuevo(e.target.value)}
                />
                {doctores.length > 0 && (
                  <button type="button" onClick={() => setUsarDoctorNuevo(false)} className="text-xs text-primary text-left font-semibold">
                    Usar un doctor ya registrado
                  </button>
                )}
              </>
            )}
          </div>

          <div className="card p-5 flex flex-col gap-4">
            <div className="text-sm font-bold">Datos del trabajo</div>
            <div>
              <label className="field-label">Paciente</label>
              <input className="field-input" type="text" placeholder="Nombre del paciente" value={pacienteNombre} onChange={(e) => setPacienteNombre(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="field-label">Tipo de trabajo</label>
                <input className="field-input" type="text" placeholder="Corona, puente, placa..." value={tipoTrabajo} onChange={(e) => setTipoTrabajo(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Piezas dentales</label>
                <input className="field-input" type="text" placeholder="16,17,18" value={piezasDentales} onChange={(e) => setPiezasDentales(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Material (si aplica)</label>
                <input className="field-input" type="text" placeholder="Zirconia, metal..." value={material} onChange={(e) => setMaterial(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Color</label>
                <input className="field-input" type="text" placeholder="VITA A2" value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="field-label">Fecha en que lo necesitas</label>
              <input className="field-input" type="date" value={fechaEntregaEst} onChange={(e) => setFechaEntregaEst(e.target.value)} />
            </div>
          </div>

          <div className="card p-5 flex flex-col gap-3.5">
            <div className="text-sm font-bold">Fotos (opcional)</div>
            <PhotoPicker label="" files={fotos} onChange={setFotos} />
          </div>

          <div className="card p-5 flex flex-col gap-2.5">
            <div className="text-sm font-bold">Observaciones</div>
            <textarea
              placeholder="Indicaciones adicionales para el laboratorio..."
              className="w-full h-24 border border-border rounded-input p-2.5 text-[13px] font-sans box-border resize-none outline-none"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          <button type="submit" disabled={saving} className="h-11 rounded-input bg-primary text-white text-sm font-semibold disabled:opacity-60">
            {saving ? 'Enviando...' : 'Enviar pedido al laboratorio'}
          </button>
        </div>
      </form>
    </div>
  );
}
