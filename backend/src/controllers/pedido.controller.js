const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const BASE_SELECT = `
  SELECT p.*, c.clinica_id AS caso_clinica_id, c.paciente_nombre, c.descripcion AS caso_descripcion,
         cl.nombre AS clinica_nombre, g.nombre AS gestor_nombre,
         (SELECT COUNT(*) FROM imagenes i WHERE i.pedido_id = p.id) AS fotos_count
  FROM pedidos p
  JOIN casos c ON c.id = p.caso_id
  JOIN clinicas cl ON cl.id = c.clinica_id
  LEFT JOIN usuarios g ON g.id = p.gestor_id
`;

const listPedidos = asyncHandler(async (req, res) => {
  const { page, limit, estado, etapa, casoId, clinicaId } = req.query;
  const where = [];
  const params = [];

  if (estado) {
    where.push('p.estado = ?');
    params.push(estado);
  }
  if (etapa) {
    where.push('p.etapa = ?');
    params.push(etapa);
  }
  if (casoId) {
    where.push('p.caso_id = ?');
    params.push(casoId);
  }
  if (req.user.rol === 'clinica') {
    where.push('c.clinica_id = ?');
    params.push(req.user.clinicaId);
  } else if (clinicaId) {
    where.push('c.clinica_id = ?');
    params.push(clinicaId);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `${BASE_SELECT} ${whereSql} ORDER BY p.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM pedidos p JOIN casos c ON c.id = p.caso_id JOIN clinicas cl ON cl.id = c.clinica_id ${whereSql}`,
    params
  );

  res.json({
    data: rows,
    pagination: { page, limit, total: countRows[0].total },
  });
});

const getPedido = asyncHandler(async (req, res) => {
  const where = ['p.id = ?'];
  const params = [req.params.id];
  if (req.user.rol === 'clinica') {
    where.push('c.clinica_id = ?');
    params.push(req.user.clinicaId);
  }

  const [rows] = await pool.query(`${BASE_SELECT} WHERE ${where.join(' AND ')}`, params);
  const pedido = rows[0];
  if (!pedido) throw new ApiError(404, 'Pedido no encontrado');

  const [imagenes] = await pool.query('SELECT * FROM imagenes WHERE pedido_id = ? ORDER BY id DESC', [pedido.id]);
  res.json({ ...pedido, imagenes });
});

const createPedido = asyncHandler(async (req, res) => {
  const { casoId, folio, etapa, fechaEntrada, fechaEntregaEst, gestorId, observaciones } = req.body;

  const [casoRows] = await pool.query('SELECT id, clinica_id FROM casos WHERE id = ?', [casoId]);
  if (!casoRows[0]) throw new ApiError(400, 'El caso indicado no existe');

  if (req.user.rol === 'clinica' && casoRows[0].clinica_id !== req.user.clinicaId) {
    throw new ApiError(403, 'No tiene acceso a este caso');
  }
  // La asignación de gestor es una decisión interna del laboratorio, no de la clínica.
  const gestorIdFinal = req.user.rol === 'clinica' ? null : gestorId ?? null;

  const [result] = await pool.query(
    `INSERT INTO pedidos (caso_id, folio, etapa, fecha_entrada, fecha_entrega_est, gestor_id, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [casoId, folio ?? null, etapa, fechaEntrada, fechaEntregaEst ?? null, gestorIdFinal, observaciones ?? null]
  );

  res.status(201).json({ id: result.insertId });
});

const updatePedido = asyncHandler(async (req, res) => {
  const [existingRows] = await pool.query('SELECT * FROM pedidos WHERE id = ?', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) throw new ApiError(404, 'Pedido no encontrado');

  const { folio, etapa, fechaEntrada, fechaEntregaEst, gestorId, estado, observaciones } = req.body;

  await pool.query(
    `UPDATE pedidos SET folio = ?, etapa = ?, fecha_entrada = ?, fecha_entrega_est = ?, gestor_id = ?, estado = ?, observaciones = ?
     WHERE id = ?`,
    [
      folio !== undefined ? folio : existing.folio,
      etapa ?? existing.etapa,
      fechaEntrada ?? existing.fecha_entrada,
      fechaEntregaEst !== undefined ? fechaEntregaEst : existing.fecha_entrega_est,
      gestorId !== undefined ? gestorId : existing.gestor_id,
      estado ?? existing.estado,
      observaciones !== undefined ? observaciones : existing.observaciones,
      req.params.id,
    ]
  );
  res.json({ message: 'Pedido actualizado' });
});

const deletePedido = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM pedidos WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Pedido no encontrado');
  res.status(204).send();
});

module.exports = { listPedidos, getPedido, createPedido, updatePedido, deletePedido };
