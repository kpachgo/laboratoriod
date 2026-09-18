import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ToothIcon, PedidosIcon, RutasIcon, ClinicasIcon, UsuariosIcon, ReportesIcon } from './icons';
import UserMenu from './UserMenu';

const NAV_ITEMS = [
  { to: '/', label: 'Pedidos', icon: PedidosIcon, roles: ['admin', 'tecnico', 'gestor'] },
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

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user?.rol));

  return (
    <div className="w-full min-h-screen flex bg-bg">
      <aside className="w-[232px] flex-shrink-0 bg-surface border-r border-border flex flex-col box-border p-4">
        <div className="flex items-center gap-2.5 px-2 pb-6 pt-1">
          <div className="w-8 h-8 rounded-[9px] bg-primary flex items-center justify-center flex-shrink-0">
            <ToothIcon size={16} />
          </div>
          <div className="font-display text-[15px] font-semibold">Lab Dental</div>
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

      <main className="flex-grow flex flex-col box-border p-7 px-8 gap-5 overflow-hidden">{children}</main>
    </div>
  );
}
