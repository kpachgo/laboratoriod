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

module.exports = { cambiarEtapaLogistica };
