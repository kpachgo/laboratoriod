const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { cambiarEtapaLogistica } = require('../utils/pedidoLogistica');

const listRutas = asyncHandler(async (req, res) => {
  const where = [];
  const params = [];

  if (req.user.rol === 'gestor') {
    where.push('r.gestor_id = ?');
    params.push(req.user.id);
  } else if (req.query.gestorId) {
    where.push('r.gestor_id = ?');
    params.push(req.query.gestorId);
  }
  if (req.query.fecha) {
    where.push('r.fecha = ?');
    params.push(req.query.fecha);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT r.*, u.nombre AS gestor_nombre
     FROM rutas r
     JOIN usuarios u ON u.id = r.gestor_id
     ${whereSql}
     ORDER BY r.fecha DESC, r.id DESC`,
    params
  );
  res.json(rows);
});

const getRuta = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM rutas WHERE id = ?', [req.params.id]);
  const ruta = rows[0];
  if (!ruta) throw new ApiError(404, 'Ruta no encontrada');

  if (req.user.rol === 'gestor' && ruta.gestor_id !== req.user.id) {
    throw new ApiError(403, 'No tiene acceso a esta ruta');
  }

  const [paradas] = await pool.query(
    `SELECT rp.*, p.folio, p.caso_id, p.etapa, p.estado AS pedido_estado, p.etapa_logistica,
            c.paciente_nombre, cl.nombre AS clinica_nombre
     FROM ruta_paradas rp
     JOIN pedidos p ON p.id = rp.pedido_id
     JOIN casos c ON c.id = p.caso_id
     JOIN clinicas cl ON cl.id = c.clinica_id
     WHERE rp.ruta_id = ?
     ORDER BY rp.orden ASC, rp.id ASC`,
    [ruta.id]
  );

  res.json({ ...ruta, paradas });
});

const createRuta = asyncHandler(async (req, res) => {
  const { gestorId, fecha, nombre } = req.body;
  const [result] = await pool.query(
    'INSERT INTO rutas (gestor_id, fecha, nombre) VALUES (?, ?, ?)',
    [gestorId, fecha, nombre ?? null]
  );
  res.status(201).json({ id: result.insertId });
});

const updateRuta = asyncHandler(async (req, res) => {
  const [existingRows] = await pool.query('SELECT * FROM rutas WHERE id = ?', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) throw new ApiError(404, 'Ruta no encontrada');
  if (req.user.rol === 'gestor' && existing.gestor_id !== req.user.id) {
    throw new ApiError(403, 'No tiene acceso a esta ruta');
  }

  const { gestorId, fecha, nombre, estado } = req.body;
  await pool.query(
    'UPDATE rutas SET gestor_id = ?, fecha = ?, nombre = ?, estado = ? WHERE id = ?',
    [
      gestorId ?? existing.gestor_id,
      fecha ?? existing.fecha,
      nombre !== undefined ? nombre : existing.nombre,
      estado ?? existing.estado,
      req.params.id,
    ]
  );

  res.json({ message: 'Ruta actualizada' });
});

const deleteRuta = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM rutas WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Ruta no encontrada');
  res.status(204).send();
});

// ---- Paradas ----

const addParada = asyncHandler(async (req, res) => {
  const [rutaRows] = await pool.query('SELECT id FROM rutas WHERE id = ?', [req.params.rutaId]);
  if (!rutaRows[0]) throw new ApiError(404, 'Ruta no encontrada');

  const [pedidoRows] = await pool.query('SELECT id FROM pedidos WHERE id = ?', [req.body.pedidoId]);
  if (!pedidoRows[0]) throw new ApiError(400, 'El pedido indicado no existe');

  const { pedidoId, tipo, orden, horaEstimada } = req.body;
  const [result] = await pool.query(
    'INSERT INTO ruta_paradas (ruta_id, pedido_id, tipo, orden, hora_estimada) VALUES (?, ?, ?, ?, ?)',
    [req.params.rutaId, pedidoId, tipo, orden ?? 0, horaEstimada ?? null]
  );
  res.status(201).json({ id: result.insertId });
});

const updateParada = asyncHandler(async (req, res) => {
  const [existingRows] = await pool.query('SELECT * FROM ruta_paradas WHERE id = ?', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) throw new ApiError(404, 'Parada no encontrada');

  if (req.user.rol === 'gestor') {
    const [rutaRows] = await pool.query('SELECT gestor_id FROM rutas WHERE id = ?', [existing.ruta_id]);
    if (rutaRows[0]?.gestor_id !== req.user.id) throw new ApiError(403, 'No tiene acceso a esta parada');
  }

  const { tipo, orden, estado, horaEstimada } = req.body;
  const horaReal = estado === 'completada' && existing.estado !== 'completada' ? new Date() : existing.hora_real;

  await pool.query(
    'UPDATE ruta_paradas SET tipo = ?, orden = ?, estado = ?, hora_estimada = ?, hora_real = ? WHERE id = ?',
    [
      tipo ?? existing.tipo,
      orden !== undefined ? orden : existing.orden,
      estado ?? existing.estado,
      horaEstimada !== undefined ? horaEstimada : existing.hora_estimada,
      horaReal,
      req.params.id,
    ]
  );

  // Al completar la parada, el pedido avanza en su recorrido logístico:
  // recoger en la clínica -> "recibido" (en camino al laboratorio);
  // entregar en la clínica -> "entregado_en_clinica".
  if (estado === 'completada' && existing.estado !== 'completada') {
    const tipoFinal = tipo ?? existing.tipo;
    const [pedidoRows] = await pool.query('SELECT etapa_logistica FROM pedidos WHERE id = ?', [existing.pedido_id]);
    const etapaActual = pedidoRows[0]?.etapa_logistica;
    if (tipoFinal === 'recoger' && etapaActual === 'pendiente_entrega') {
      await cambiarEtapaLogistica(pool, existing.pedido_id, 'recibido', req.user.id);
    } else if (tipoFinal === 'entregar' && etapaActual === 'en_laboratorio') {
      await cambiarEtapaLogistica(pool, existing.pedido_id, 'entregado_en_clinica', req.user.id);
    }
  }

  res.json({ message: 'Parada actualizada' });
});

const deleteParada = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM ruta_paradas WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Parada no encontrada');
  res.status(204).send();
});

module.exports = {
  listRutas,
  getRuta,
  createRuta,
  updateRuta,
  deleteRuta,
  addParada,
  updateParada,
  deleteParada,
};
