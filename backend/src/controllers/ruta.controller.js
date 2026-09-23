const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { cambiarEtapaLogistica, SEGUIMIENTO_COLUMNS } = require('../utils/pedidoLogistica');

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
            c.paciente_nombre, cl.nombre AS clinica_nombre,
            ${SEGUIMIENTO_COLUMNS}
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

// Paradas de todas las rutas, sin importar su fecha. Un gestor solo ve las suyas.
// Con estado=pendiente sirve para que ninguna parada sin completar se pierda de vista.
const listParadas = asyncHandler(async (req, res) => {
  const { estado, gestorId } = req.query;
  const where = [];
  const params = [];

  if (estado) {
    where.push('rp.estado = ?');
    params.push(estado);
  }
  if (req.user.rol === 'gestor') {
    where.push('r.gestor_id = ?');
    params.push(req.user.id);
  } else if (gestorId) {
    where.push('r.gestor_id = ?');
    params.push(gestorId);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT rp.*, p.folio, p.caso_id, p.etapa, p.estado AS pedido_estado, p.etapa_logistica,
            c.paciente_nombre, cl.nombre AS clinica_nombre,
            r.fecha AS ruta_fecha, r.estado AS ruta_estado, r.gestor_id,
            g.nombre AS gestor_nombre, g.activo AS gestor_activo,
            ${SEGUIMIENTO_COLUMNS}
     FROM ruta_paradas rp
     JOIN rutas r ON r.id = rp.ruta_id
     JOIN usuarios g ON g.id = r.gestor_id
     JOIN pedidos p ON p.id = rp.pedido_id
     JOIN casos c ON c.id = p.caso_id
     JOIN clinicas cl ON cl.id = c.clinica_id
     ${whereSql}
     ORDER BY r.fecha ASC, rp.orden ASC, rp.id ASC`,
    params
  );
  res.json(rows);
});

// Mueve una parada pendiente a la ruta de otro gestor (o de otra fecha), por ejemplo cuando el
// gestor asignado se dio de baja o ya no puede atenderla. Si el gestor no tiene ruta ese día, se crea.
const reasignarParada = asyncHandler(async (req, res) => {
  const { gestorId, fecha } = req.body;

  const [paradaRows] = await pool.query('SELECT * FROM ruta_paradas WHERE id = ?', [req.params.id]);
  const parada = paradaRows[0];
  if (!parada) throw new ApiError(404, 'Parada no encontrada');
  if (parada.estado !== 'pendiente') throw new ApiError(400, 'Solo se puede reasignar una parada pendiente');

  const [gestorRows] = await pool.query(
    "SELECT id, nombre FROM usuarios WHERE id = ? AND rol = 'gestor' AND activo = TRUE",
    [gestorId]
  );
  const gestor = gestorRows[0];
  if (!gestor) throw new ApiError(400, 'El gestor indicado no existe o está inactivo');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rutaRows] = await connection.query(
      'SELECT id, estado FROM rutas WHERE gestor_id = ? AND fecha = ? ORDER BY id DESC LIMIT 1',
      [gestor.id, fecha]
    );
    let ruta = rutaRows[0];
    if (ruta?.estado === 'completada') {
      throw new ApiError(400, 'La ruta de ese gestor en esa fecha ya está completada; elige otra fecha');
    }
    if (!ruta) {
      const [result] = await connection.query('INSERT INTO rutas (gestor_id, fecha, nombre) VALUES (?, ?, ?)', [
        gestor.id,
        fecha,
        `Ruta de ${gestor.nombre}`,
      ]);
      ruta = { id: result.insertId };
    }

    if (ruta.id !== parada.ruta_id) {
      const [[{ total }]] = await connection.query('SELECT COUNT(*) AS total FROM ruta_paradas WHERE ruta_id = ?', [ruta.id]);
      const [moved] = await connection.query(
        "UPDATE ruta_paradas SET ruta_id = ?, orden = ? WHERE id = ? AND estado = 'pendiente'",
        [ruta.id, total, parada.id]
      );
      if (moved.affectedRows === 0) throw new ApiError(400, 'La parada ya se completó y no se puede reasignar');
    }

    await connection.commit();
    res.json({ message: 'Parada reasignada', rutaId: ruta.id });
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
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
  listParadas,
  reasignarParada,
  deleteParada,
};
