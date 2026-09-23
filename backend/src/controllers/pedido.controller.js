const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { cambiarEtapaLogistica, SEGUIMIENTO_COLUMNS } = require('../utils/pedidoLogistica');

const BASE_SELECT = `
  SELECT p.*, c.clinica_id AS caso_clinica_id, c.paciente_nombre, c.descripcion AS caso_descripcion,
         c.finalizado_at AS caso_finalizado_at,
         cl.nombre AS clinica_nombre, g.nombre AS gestor_nombre, t.nombre AS terminado_por_nombre,
         (SELECT COUNT(*) FROM imagenes i WHERE i.pedido_id = p.id) AS fotos_count,
         (SELECT COUNT(*) FROM pedido_comentarios pc WHERE pc.pedido_id = p.id) AS comentarios_count,
         (SELECT COUNT(*) FROM ruta_paradas rp WHERE rp.pedido_id = p.id AND rp.estado = 'pendiente') AS paradas_pendientes,
         EXISTS (SELECT 1 FROM ruta_paradas rp JOIN rutas r ON r.id = rp.ruta_id
                 WHERE rp.pedido_id = p.id AND rp.tipo = 'recoger' AND rp.estado = 'completada'
                   AND r.estado = 'completada') AS gestor_llego_laboratorio,
         ${SEGUIMIENTO_COLUMNS}
  FROM pedidos p
  JOIN casos c ON c.id = p.caso_id
  JOIN clinicas cl ON cl.id = c.clinica_id
  LEFT JOIN usuarios g ON g.id = p.gestor_id
  LEFT JOIN usuarios t ON t.id = p.terminado_por
`;

const listPedidos = asyncHandler(async (req, res) => {
  const { page, limit, estado, etapaLogistica, etapa, casoId, clinicaId } = req.query;
  const where = [];
  const params = [];

  if (estado) {
    where.push('p.estado = ?');
    params.push(estado);
  }
  if (etapaLogistica) {
    where.push('p.etapa_logistica = ?');
    params.push(etapaLogistica);
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

  // Un pedido creado por la clínica nace esperando que el gestor lo retire;
  // uno creado por el laboratorio (nueva prueba de un caso ya en curso) ya está en el laboratorio.
  const etapaLogistica = req.user.rol === 'clinica' ? 'pendiente_entrega' : 'en_laboratorio';

  const [result] = await pool.query(
    `INSERT INTO pedidos (caso_id, folio, etapa, fecha_entrada, fecha_entrega_est, gestor_id, etapa_logistica, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [casoId, folio ?? null, etapa, fechaEntrada, fechaEntregaEst ?? null, gestorIdFinal, etapaLogistica, observaciones ?? null]
  );

  // Una prueba nueva significa que el trabajo sigue en curso: si la clínica ya lo había finalizado, se reabre.
  await pool.query('UPDATE casos SET finalizado_at = NULL WHERE id = ? AND finalizado_at IS NOT NULL', [casoId]);

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

const recibirEnLaboratorio = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT etapa_logistica FROM pedidos WHERE id = ?', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Pedido no encontrado');
  if (rows[0].etapa_logistica !== 'recibido') {
    throw new ApiError(400, 'Solo se puede recibir un pedido que el gestor ya retiró de la clínica');
  }

  await cambiarEtapaLogistica(pool, req.params.id, 'en_laboratorio', req.user.id);
  res.json({ message: 'Pedido recibido en laboratorio' });
});

// El técnico da por terminado el trabajo de una prueba que está en el laboratorio
// (queda "Listo para entregar" al asignar rutas). Control interno del laboratorio.
const terminarTrabajo = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT estado, etapa_logistica FROM pedidos WHERE id = ?', [req.params.id]);
  const pedido = rows[0];
  if (!pedido) throw new ApiError(404, 'Pedido no encontrado');
  if (pedido.etapa_logistica !== 'en_laboratorio') {
    throw new ApiError(400, 'Solo se puede terminar un trabajo que está en el laboratorio');
  }
  if (pedido.estado !== 'en_proceso') throw new ApiError(400, 'Este trabajo ya está terminado');

  await pool.query(
    "UPDATE pedidos SET estado = 'finalizado', terminado_at = NOW(), terminado_por = ? WHERE id = ?",
    [req.user.id, req.params.id]
  );
  res.json({ message: 'Trabajo terminado' });
});

// Deshace "terminar" (p. ej. se marcó por error o hay que retocar la pieza) mientras siga en el laboratorio.
const reabrirTrabajo = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT estado, etapa_logistica FROM pedidos WHERE id = ?', [req.params.id]);
  const pedido = rows[0];
  if (!pedido) throw new ApiError(404, 'Pedido no encontrado');
  if (pedido.estado !== 'finalizado') throw new ApiError(400, 'Este trabajo no está terminado');
  if (pedido.etapa_logistica !== 'en_laboratorio') {
    throw new ApiError(400, 'La pieza ya salió del laboratorio; no se puede reabrir el trabajo');
  }

  await pool.query(
    "UPDATE pedidos SET estado = 'en_proceso', terminado_at = NULL, terminado_por = NULL WHERE id = ?",
    [req.params.id]
  );
  res.json({ message: 'Trabajo reabierto' });
});

const deletePedido = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM pedidos WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Pedido no encontrado');
  res.status(204).send();
});

module.exports = {
  listPedidos,
  getPedido,
  createPedido,
  updatePedido,
  recibirEnLaboratorio,
  terminarTrabajo,
  reabrirTrabajo,
  deletePedido,
};
