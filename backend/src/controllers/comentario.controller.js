const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// Verifica que el pedido exista y que una clínica solo acceda a los suyos.
async function obtenerPedido(req) {
  const [rows] = await pool.query(
    'SELECT p.id, c.clinica_id FROM pedidos p JOIN casos c ON c.id = p.caso_id WHERE p.id = ?',
    [req.params.pedidoId]
  );
  if (!rows[0]) throw new ApiError(404, 'Pedido no encontrado');
  if (req.user.rol === 'clinica' && rows[0].clinica_id !== req.user.clinicaId) {
    throw new ApiError(403, 'No tiene acceso a este pedido');
  }
  return rows[0];
}

const COMENTARIO_SELECT = `
  SELECT pc.id, pc.pedido_id, pc.usuario_id, pc.texto, pc.created_at,
         u.nombre AS usuario_nombre, u.rol AS usuario_rol
  FROM pedido_comentarios pc
  JOIN usuarios u ON u.id = pc.usuario_id
`;

const listComentarios = asyncHandler(async (req, res) => {
  await obtenerPedido(req);
  const [rows] = await pool.query(`${COMENTARIO_SELECT} WHERE pc.pedido_id = ? ORDER BY pc.id ASC`, [req.params.pedidoId]);
  res.json(rows);
});

const createComentario = asyncHandler(async (req, res) => {
  await obtenerPedido(req);
  const [result] = await pool.query(
    'INSERT INTO pedido_comentarios (pedido_id, usuario_id, texto) VALUES (?, ?, ?)',
    [req.params.pedidoId, req.user.id, req.body.texto]
  );
  const [rows] = await pool.query(`${COMENTARIO_SELECT} WHERE pc.id = ?`, [result.insertId]);
  res.status(201).json(rows[0]);
});

// Solo el autor del comentario o un administrador pueden borrarlo.
const deleteComentario = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT usuario_id FROM pedido_comentarios WHERE id = ? AND pedido_id = ?', [
    req.params.comentarioId,
    req.params.pedidoId,
  ]);
  if (!rows[0]) throw new ApiError(404, 'Comentario no encontrado');
  if (req.user.rol !== 'admin' && rows[0].usuario_id !== req.user.id) {
    throw new ApiError(403, 'Solo puedes borrar tus propios comentarios');
  }

  await pool.query('DELETE FROM pedido_comentarios WHERE id = ?', [req.params.comentarioId]);
  res.status(204).send();
});

module.exports = { listComentarios, createComentario, deleteComentario };
