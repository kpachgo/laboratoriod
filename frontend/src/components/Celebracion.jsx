import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const TONOS = {
  primario: { color: '#0E7C86', fondo: '#E3F1F0' },
  verde: { color: '#2F8F5B', fondo: '#E7F5EC' },
  azul: { color: '#2E5FA3', fondo: '#E7EEF8' },
  morado: { color: '#6B3FA0', fondo: '#EFE7F6' },
};

const DURACION = 1700;
const DURACION_SALIDA = 200;
const DURACION_AVISO = 2600;
const PARTICULAS = [0, 45, 90, 135, 180, 225, 270, 315];

export const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const CelebracionContext = createContext(null);

/**
 * Animaciones de confirmación para las acciones importantes:
 * - celebrar(): tarjeta centrada con el ícono de la acción. Devuelve una promesa que se
 *   resuelve al cerrarse, para navegar después de que el usuario la vio.
 * - aviso(): mensaje breve abajo, para acciones que se repiten seguido (p. ej. asignar).
 */
export function CelebracionProvider({ children }) {
  const [actual, setActual] = useState(null);
  const [saliendo, setSaliendo] = useState(false);
  const [avisos, setAvisos] = useState([]);
  const actualRef = useRef(null);
  const idRef = useRef(0);

  const cerrar = useCallback((item) => {
    if (actualRef.current !== item) return;
    actualRef.current = null;
    item.resolve();
    setActual(null);
    setSaliendo(false);
  }, []);

  const celebrar = useCallback(
    ({ emoji, titulo, detalle, tono = 'primario' }) =>
      new Promise((resolve) => {
        actualRef.current?.resolve();
        idRef.current += 1;
        const item = { id: idRef.current, emoji, titulo, detalle, tono, resolve };
        actualRef.current = item;
        setSaliendo(false);
        setActual(item);
      }),
    []
  );

  const aviso = useCallback(({ emoji, texto }) => {
    idRef.current += 1;
    const id = idRef.current;
    setAvisos((prev) => [...prev, { id, emoji, texto }]);
    setTimeout(() => setAvisos((prev) => prev.filter((a) => a.id !== id)), DURACION_AVISO);
  }, []);

  useEffect(() => {
    if (!actual) return;
    const tSalida = setTimeout(() => setSaliendo(true), DURACION);
    const tCierre = setTimeout(() => cerrar(actual), DURACION + DURACION_SALIDA);
    return () => {
      clearTimeout(tSalida);
      clearTimeout(tCierre);
    };
  }, [actual, cerrar]);

  const valor = useMemo(() => ({ celebrar, aviso }), [celebrar, aviso]);
  const tono = TONOS[actual?.tono] || TONOS.primario;

  return (
    <CelebracionContext.Provider value={valor}>
      {children}

      {actual && (
        <div
          key={actual.id}
          className={`celebra-fondo fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-6 ${saliendo ? 'celebra-salida' : ''}`}
          onClick={() => cerrar(actual)}
          role="status"
          aria-live="polite"
        >
          <div className="celebra-tarjeta bg-surface rounded-2xl shadow-xl px-8 py-7 w-full max-w-[300px] flex flex-col items-center text-center gap-3">
            <div className="relative w-20 h-20 mb-1">
              <span className="celebra-onda absolute inset-0 rounded-full" style={{ background: tono.color }} />
              {PARTICULAS.map((angulo, i) => (
                <span
                  key={angulo}
                  className="celebra-particula absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
                  style={{ background: i % 2 ? tono.color : '#F2B84B', '--angulo': `${angulo}deg` }}
                />
              ))}
              <div
                className="celebra-circulo relative w-20 h-20 rounded-full flex items-center justify-center text-[36px]"
                style={{ background: tono.fondo }}
              >
                <span className="celebra-emoji inline-block">{actual.emoji}</span>
                <span
                  className="celebra-check absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-[3px] border-white"
                  style={{ background: tono.color }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path className="celebra-trazo" d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
              </div>
            </div>
            <div className="font-display text-[19px] font-semibold leading-tight">{actual.titulo}</div>
            {actual.detalle && <div className="text-[13px] text-text-secondary">{actual.detalle}</div>}
          </div>
        </div>
      )}

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-32px)] max-w-sm flex flex-col items-center gap-2 pointer-events-none">
        {avisos.map((a) => (
          <div
            key={a.id}
            role="status"
            className="celebra-aviso w-full bg-text text-white rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 text-[13px] font-semibold"
          >
            <span className="text-[18px]">{a.emoji}</span>
            <span className="flex-grow">{a.texto}</span>
            <span className="w-5 h-5 rounded-full bg-[#2F8F5B] flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
          </div>
        ))}
      </div>
    </CelebracionContext.Provider>
  );
}

export function useCelebracion() {
  return useContext(CelebracionContext);
}
