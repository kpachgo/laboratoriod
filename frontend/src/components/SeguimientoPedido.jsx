const GREEN = '#2F8F5B';
const GREEN_LIGHT = '#E7F5EC';
const PRIMARY = '#0E7C86';
const PRIMARY_LIGHT = '#E3F1F0';
const PENDING = '#DCE2DF';
const PENDING_TEXT = '#9AA6A3';
const DONE_TEXT = '#1C2624';

const elGestor = (gestor) => (gestor ? `El gestor ${gestor}` : 'El gestor');

// `gestorDe` indica qué campo del pedido trae el nombre del gestor de ese paso;
// `detalle` puede ser una función para incluir ese nombre en el texto.
export const PASOS_SEGUIMIENTO = [
  { emoji: '🏥', label: 'Pendiente de enviar', detalle: 'Esperando que el gestor lo retire de la clínica' },
  {
    emoji: '🚚',
    label: 'Enviado con gestor',
    gestorDe: 'gestor_recogida_nombre',
    detalle: (gestor) => `${elGestor(gestor)} lo retiró de la clínica y va en camino al laboratorio, que debe confirmar su recepción`,
  },
  { emoji: '🔬', label: 'En laboratorio', detalle: 'Está en el laboratorio, trabajo en proceso' },
  {
    emoji: '🚐',
    label: 'Enviado a clínica',
    gestorDe: 'gestor_entrega_nombre',
    detalle: (gestor) => `${elGestor(gestor)} lo lleva de vuelta a la clínica`,
  },
  { emoji: '📦', label: 'Entregado en clínica', detalle: 'Entregado en la clínica' },
];

// Paso (1 a 5) en el que va el pedido, según su recorrido logístico. Cada prueba de un caso
// recorre los cinco pasos por separado; al crear una nueva prueba el proceso vuelve a empezar.
// Mientras esté en el laboratorio, pasa al paso 4 cuando tiene una entrega asignada a un gestor.
export function pasoActual({ etapa_logistica: etapa, entrega_en_curso: entregaEnCurso }) {
  if (etapa === 'entregado_en_clinica') return 5;
  if (etapa === 'en_laboratorio') return entregaEnCurso ? 4 : 3;
  if (etapa === 'recibido') return 2;
  return 1;
}

// Nombre del gestor que interviene en un paso (null si el paso no lo tiene o aún no se conoce).
export function gestorDelPaso(paso, pedido) {
  return paso.gestorDe ? pedido[paso.gestorDe] ?? null : null;
}

export default function SeguimientoPedido({ pedido }) {
  const paso = pasoActual(pedido);
  const actual = PASOS_SEGUIMIENTO[paso - 1];
  const gestorActual = gestorDelPaso(actual, pedido);
  const detalleActual = typeof actual.detalle === 'function' ? actual.detalle(gestorActual) : actual.detalle;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start">
        {PASOS_SEGUIMIENTO.map((p, i) => {
          const numero = i + 1;
          const hecho = numero <= paso;
          const esActual = numero === paso && paso < PASOS_SEGUIMIENTO.length;
          const ultimo = i === PASOS_SEGUIMIENTO.length - 1;
          const gestor = hecho ? gestorDelPaso(p, pedido) : null;

          return (
            <div key={p.label} className="flex items-start" style={{ flexGrow: ultimo ? 0 : 1 }}>
              <div className="flex flex-col items-center gap-1.5 w-[76px]">
                <div className="relative">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-[20px] border-2"
                    style={{
                      background: esActual ? PRIMARY_LIGHT : hecho ? GREEN_LIGHT : '#F5F6F3',
                      borderColor: esActual ? PRIMARY : hecho ? GREEN : PENDING,
                      boxShadow: esActual ? `0 0 0 4px ${PRIMARY_LIGHT}` : 'none',
                      opacity: hecho ? 1 : 0.55,
                      filter: hecho ? 'none' : 'grayscale(1)',
                    }}
                  >
                    {p.emoji}
                  </div>
                  {hecho && !esActual && (
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ background: GREEN }}
                    >
                      ✓
                    </div>
                  )}
                </div>
                <span
                  className="text-[11px] font-semibold text-center leading-tight"
                  style={{ color: hecho ? DONE_TEXT : PENDING_TEXT }}
                >
                  {p.label}
                </span>
                {gestor && (
                  <span className="text-[10.5px] text-center leading-tight text-text-muted line-clamp-2" title={gestor}>
                    {gestor}
                  </span>
                )}
              </div>
              {!ultimo && (
                <div
                  className="h-[3px] flex-grow mt-[20px] rounded-full min-w-[8px]"
                  style={{ background: numero < paso ? GREEN : PENDING }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="text-[12.5px] text-text-secondary bg-bg rounded-lg px-3 py-2">
        <span className="font-bold text-text">
          {actual.emoji} {actual.label}
        </span>
        {' — '}
        {detalleActual}
      </div>
    </div>
  );
}
