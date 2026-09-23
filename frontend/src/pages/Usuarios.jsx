import { useEffect, useState } from 'react';
import api from '../api/client';
import Layout from '../components/Layout';
import { PlusIcon } from '../components/icons';

function emptyForm() {
  return { nombre: '', usuario: '', password: '', rol: 'tecnico', clinicaId: '' };
}

const ROL_LABEL = { admin: 'Administrador', tecnico: 'Técnico', gestor: 'Gestor', clinica: 'Clínica' };

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [clinicas, setClinicas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get('/usuarios').then(({ data }) => setUsuarios(data));
  }

  useEffect(() => {
    load();
    api.get('/clinicas').then(({ data }) => setClinicas(data));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/usuarios', {
        ...form,
        clinicaId: form.rol === 'clinica' ? Number(form.clinicaId) : undefined,
      });
      setForm(emptyForm());
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar el usuario');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between gap-3">
        <div className="font-display text-[22px] font-semibold">Usuarios</div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 bg-primary text-white rounded-input px-4 h-10 text-[13px] font-semibold whitespace-nowrap"
        >
          <PlusIcon />
          Nuevo usuario
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <input className="field-input" placeholder="Nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <input className="field-input" type="email" placeholder="Correo electrónico" required value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} />
          <input className="field-input" placeholder="Contraseña" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className="field-input" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
            <option value="admin">Administrador</option>
            <option value="tecnico">Técnico</option>
            <option value="gestor">Gestor</option>
            <option value="clinica">Clínica</option>
          </select>
          {form.rol === 'clinica' && (
            <select className="field-input sm:col-span-2" required value={form.clinicaId} onChange={(e) => setForm({ ...form, clinicaId: e.target.value })}>
              <option value="">Selecciona la clínica...</option>
              {clinicas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          )}
          {error && <div className="sm:col-span-2 text-sm text-red-600">{error}</div>}
          <button disabled={saving} className="sm:col-span-2 h-11 sm:h-10 rounded-input bg-primary text-white text-sm font-semibold">
            {saving ? 'Guardando...' : 'Guardar usuario'}
          </button>
        </form>
      )}

      <div className="card overflow-hidden flex-grow overflow-y-auto">
        <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_80px] px-5 py-3 border-b border-divider text-[11.5px] font-bold text-text-muted uppercase tracking-wide">
          <div>Nombre</div><div>Usuario</div><div>Rol</div><div>Activo</div>
        </div>
        {usuarios.map((u) => (
          <div key={u.id} className="px-4 md:px-5 py-3.5 border-b border-[#F0F2F1] text-[13.5px]">
            <div className="md:hidden flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{u.nombre}</span>
                <span className="text-xs text-text-muted flex-shrink-0">{ROL_LABEL[u.rol]}{u.activo ? '' : ' · Inactivo'}</span>
              </div>
              <div className="text-text-secondary break-all">{u.usuario}</div>
            </div>

            <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_80px] items-center">
              <div className="font-semibold">{u.nombre}</div>
              <div className="text-text-secondary">{u.usuario}</div>
              <div>{ROL_LABEL[u.rol]}</div>
              <div className="text-text-muted text-xs">{u.activo ? 'Sí' : 'No'}</div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
