import { useEffect, useState } from 'react';
import api from '../api/client';
import Layout from '../components/Layout';
import { PlusIcon } from '../components/icons';

function emptyForm() {
  return { nombre: '', direccion: '', telefono: '', email: '' };
}

export default function Clinicas() {
  const [clinicas, setClinicas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.get('/clinicas').then(({ data }) => setClinicas(data));
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/clinicas', form);
      setForm(emptyForm());
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la clínica');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between gap-3">
        <div className="font-display text-[22px] font-semibold">Clínicas</div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 bg-primary text-white rounded-input px-4 h-10 text-[13px] font-semibold whitespace-nowrap"
        >
          <PlusIcon />
          Nueva clínica
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <input className="field-input" placeholder="Nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <input className="field-input" placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          <input className="field-input" placeholder="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          <input className="field-input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          {error && <div className="sm:col-span-2 text-sm text-red-600">{error}</div>}
          <button disabled={saving} className="sm:col-span-2 h-11 sm:h-10 rounded-input bg-primary text-white text-sm font-semibold">
            {saving ? 'Guardando...' : 'Guardar clínica'}
          </button>
        </form>
      )}

      <div className="card overflow-hidden flex-grow overflow-y-auto">
        <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_1fr] px-5 py-3 border-b border-divider text-[11.5px] font-bold text-text-muted uppercase tracking-wide">
          <div>Nombre</div><div>Teléfono</div><div>Email</div><div>Dirección</div>
        </div>
        {clinicas.map((c) => (
          <div key={c.id} className="flex flex-col gap-0.5 md:grid grid-cols-[1fr_1fr_1fr_1fr] md:gap-0 px-4 md:px-5 py-3.5 border-b border-[#F0F2F1] text-[13.5px] md:items-center">
            <div className="font-semibold">{c.nombre}</div>
            <div className="text-text-secondary">{c.telefono || '—'}</div>
            <div className="text-text-secondary break-all">{c.email || '—'}</div>
            <div className="text-text-muted text-xs">{c.direccion || '—'}</div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
