// Cambia la etapa logística de un pedido y deja constancia en pedido_logistica_historial.
async function cambiarEtapaLogistica(pool, pedidoId, nuevaEtapa, usuarioId) {
  const [rows] = await pool.query('SELECT etapa_logistica FROM pedidos WHERE id = ?', [pedidoId]);
  const etapaAnterior = rows[0]?.etapa_logistica ?? null;
  if (etapaAnterior === nuevaEtapa) return false;

  await pool.query('UPDATE pedidos SET etapa_logistica = ? WHERE id = ?', [nuevaEtapa, pedidoId]);
  await pool.query(
    'INSERT INTO pedido_logistica_historial (pedido_id, etapa_anterior, etapa_nueva, usuario_id) VALUES (?, ?, ?, ?)',
    [pedidoId, etapaAnterior, nuevaEtapa, usuarioId ?? null]
  );
  return true;
}

// Columnas para el seguimiento de un pedido (alias `p` en la consulta que lo incluya):
// - gestor_recogida_nombre: gestor que retiró el pedido en la clínica (parada "recoger" completada).
// - gestor_entrega_nombre: gestor asignado a llevarlo de vuelta a la clínica (parada "entregar").
// - entrega_en_curso: 1 mientras esa parada "entregar" siga pendiente, es decir, va en camino a la clínica.
const SEGUIMIENTO_COLUMNS = `
  (SELECT sg.nombre FROM ruta_paradas sp
     JOIN rutas sr ON sr.id = sp.ruta_id
     JOIN usuarios sg ON sg.id = sr.gestor_id
   WHERE sp.pedido_id = p.id AND sp.tipo = 'recoger' AND sp.estado = 'completada'
   ORDER BY sp.id DESC LIMIT 1) AS gestor_recogida_nombre,
  (SELECT sg.nombre FROM ruta_paradas sp
     JOIN rutas sr ON sr.id = sp.ruta_id
     JOIN usuarios sg ON sg.id = sr.gestor_id
   WHERE sp.pedido_id = p.id AND sp.tipo = 'entregar'
   ORDER BY sp.id DESC LIMIT 1) AS gestor_entrega_nombre,
  EXISTS (SELECT 1 FROM ruta_paradas sp
          WHERE sp.pedido_id = p.id AND sp.tipo = 'entregar' AND sp.estado = 'pendiente') AS entrega_en_curso
`;

module.exports = { cambiarEtapaLogistica, SEGUIMIENTO_COLUMNS };
