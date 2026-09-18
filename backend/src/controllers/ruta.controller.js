const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const listRutas = asyncHandler(async (req, res) => {
  const where = [];
  const params = [];

  if (req.user.rol === 'gestor') {
    where.push('gestor_id = ?');
    params.push(req.user.id);
  } else if (req.query.gestorId) {
    where.push('gestor_id = ?');
    params.push(req.query.gestorId);
  }
  if (req.query.fecha) {
    where.push('fecha = ?');
    params.push(req.query.fecha);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM rutas ${whereSql} ORDER BY fecha DESC, id DESC`, params);
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
    `SELECT rp.*, p.folio, p.etapa, p.estado AS pedido_estado
     FROM ruta_paradas rp
     JOIN pedidos p ON p.id = rp.pedido_id
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
