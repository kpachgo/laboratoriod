import { useEffect, useRef, useState } from 'react';

function initials(nombre = '') {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

/**
 * Botón de avatar con menú desplegable de "Cerrar sesión".
 * placement="top" abre el menú hacia arriba (para el pie del sidebar),
 * placement="bottom" lo abre hacia abajo (para una topbar).
 */
export default function UserMenu({ nombre, subtitle, onLogout, placement = 'bottom', align = 'left' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 px-2 py-2.5 text-left w-full"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="w-[30px] h-[30px] rounded-full bg-primary-light text-primary-dark text-xs font-bold flex items-center justify-center flex-shrink-0">
          {initials(nombre)}
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[13px] font-semibold truncate">{nombre}</span>
          <span className="text-[11px] text-text-muted truncate">{subtitle}</span>
        </div>
      </button>

      {open && (
        <div
          className={`absolute z-20 w-44 bg-surface border border-border rounded-input shadow-lg py-1 ${
            placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold text-red-600 hover:bg-bg"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
