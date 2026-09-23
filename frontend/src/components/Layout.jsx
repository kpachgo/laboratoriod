import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ToothIcon, PedidosIcon, TrabajosIcon, RutasIcon, ClinicasIcon, UsuariosIcon, ReportesIcon, MenuIcon, CloseIcon } from './icons';
import UserMenu from './UserMenu';

const NAV_ITEMS = [
  // El técnico trabaja desde "Trabajos" (su inicio); no necesita la lista general de pedidos.
  { to: '/', label: 'Pedidos', icon: PedidosIcon, roles: ['admin', 'gestor'] },
  { to: '/trabajos', label: 'Trabajos', icon: TrabajosIcon, roles: ['admin', 'tecnico'] },
  { to: '/rutas', label: 'Recogidas y entregas', icon: RutasIcon, roles: ['admin', 'gestor'] },
  { to: '/clinicas', label: 'Clínicas', icon: ClinicasIcon, roles: ['admin'] },
  { to: '/usuarios', label: 'Usuarios', icon: UsuariosIcon, roles: ['admin'] },
  { to: '/reportes', label: 'Reportes', icon: ReportesIcon, roles: ['admin', 'tecnico'] },
];

const ROLE_LABEL = {
  admin: 'Administrador',
  tecnico: 'Técnico',
  gestor: 'Gestor',
  clinica: 'Clínica',
};

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-[9px] bg-primary flex items-center justify-center flex-shrink-0">
        <ToothIcon size={16} />
      </div>
      <div className="font-display text-[15px] font-semibold">Lab Dental</div>
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user?.rol));
  // En pantallas pequeñas la barra lateral se abre como panel sobre el contenido.
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuAbierto) return;
    const cerrarConEscape = (e) => { if (e.key === 'Escape') setMenuAbierto(false); };
    document.addEventListener('keydown', cerrarConEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', cerrarConEscape);
      document.body.style.overflow = '';
    };
  }, [menuAbierto]);

  return (
    <div className="w-full min-h-screen flex flex-col md:flex-row bg-bg">
      <header className="md:hidden sticky top-0 z-30 h-14 flex-shrink-0 bg-surface border-b border-border flex items-center gap-3 px-4">
        <button
          onClick={() => setMenuAbierto(true)}
          className="w-9 h-9 -ml-1.5 rounded-lg flex items-center justify-center"
          aria-label="Abrir menú"
        >
          <MenuIcon />
        </button>
        <Logo />
      </header>

      {menuAbierto && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMenuAbierto(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] transition-transform duration-200 md:sticky md:top-0 md:h-screen md:z-auto md:w-[232px] md:translate-x-0 flex-shrink-0 bg-surface border-r border-border flex flex-col box-border p-4 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-2 pb-6 pt-1">
          <Logo />
          <button
            onClick={() => setMenuAbierto(false)}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center"
            aria-label="Cerrar menú"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-divider">
          <UserMenu
            nombre={user?.nombre}
            subtitle={ROLE_LABEL[user?.rol] || user?.rol}
            onLogout={logout}
            placement="top"
          />
        </div>
      </aside>

      <main className="flex-grow min-w-0 flex flex-col box-border p-4 md:p-7 md:px-8 gap-4 md:gap-5 overflow-hidden">{children}</main>
    </div>
  );
}
