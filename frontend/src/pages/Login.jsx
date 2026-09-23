import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ToothIcon } from '../components/icons';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(usuario, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-bg px-4 py-8">
      <div className="w-full max-w-[420px] flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <ToothIcon size={28} />
          </div>
          <div className="font-display text-[22px] font-semibold tracking-tight">Laboratorio Dental</div>
          <div className="text-sm text-text-faint">Sistema de pedidos y órdenes de trabajo</div>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 sm:p-8 flex flex-col gap-5 shadow-sm">
          <div>
            <label htmlFor="usuario" className="field-label">Usuario</label>
            <input
              id="usuario"
              type="text"
              placeholder="ej. clinica.vidal@correo.com"
              className="field-input"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div>
            <label htmlFor="clave" className="field-label">Contraseña</label>
            <input
              id="clave"
              type="password"
              placeholder="••••••••"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="h-[46px] rounded-input bg-primary text-white text-[15px] font-semibold mt-1 disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 text-center text-xs text-text-muted">
          <span>Acceso para personal del laboratorio</span>
          <span className="w-[3px] h-[3px] rounded-full bg-dashed" />
          <span>y clínicas asociadas</span>
        </div>
      </div>
    </div>
  );
}
