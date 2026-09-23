import { FILES_BASE_URL } from '../utils/format';

/**
 * Galería con las fotos de todas las pruebas de un caso, o un aviso si no tiene ninguna.
 * imagenesPorPedido: { [pedidoId]: imagen[] }, como lo cargan las páginas de detalle.
 */
export default function FotosCaso({ pedidos, imagenesPorPedido }) {
  const fotos = pedidos.flatMap((p) => (imagenesPorPedido[p.id] || []).map((img) => ({ ...img, prueba: p.etapa })));

  return (
    <div>
      <span className="block text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1.5">
        Fotografías{fotos.length > 0 ? ` (${fotos.length})` : ''}
      </span>
      {fotos.length === 0 ? (
        <div className="flex items-center gap-2 text-[13px] text-text-muted bg-bg rounded-lg px-3 py-2.5">
          <span aria-hidden="true">📷</span>
          Este caso no tiene fotografías
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {fotos.map((img) => (
            <a
              key={img.id}
              href={`${FILES_BASE_URL}${img.ruta}`}
              target="_blank"
              rel="noreferrer"
              title={img.descripcion || img.prueba}
              className="block aspect-square"
            >
              <img
                src={`${FILES_BASE_URL}${img.ruta}`}
                alt={img.descripcion || img.prueba}
                className="w-full h-full rounded-lg object-cover border border-border"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
