const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { uploadDir } = require('../middleware/upload');

const listImagenesByPedido = asyncHandler(async (req, res) => {
  const [pedidoRows] = await pool.query('SELECT id FROM pedidos WHERE id = ?', [req.params.pedidoId]);
  if (!pedidoRows[0]) throw new ApiError(404, 'Pedido no encontrado');

  const [rows] = await pool.query('SELECT * FROM imagenes WHERE pedido_id = ? ORDER BY id DESC', [req.params.pedidoId]);
  res.json(rows);
});

const uploadImagen = asyncHandler(async (req, res) => {
  const [pedidoRows] = await pool.query(
    `SELECT p.id, c.clinica_id FROM pedidos p JOIN casos c ON c.id = p.caso_id WHERE p.id = ?`,
    [req.params.pedidoId]
  );
  if (!pedidoRows[0]) throw new ApiError(404, 'Pedido no encontrado');

  if (req.user.rol === 'clinica' && pedidoRows[0].clinica_id !== req.user.clinicaId) {
    throw new ApiError(403, 'No tiene acceso a este pedido');
  }

  if (!req.file) {
    throw new ApiError(400, 'No se ha enviado ningún archivo (campo "imagen")');
  }

  const rutaRelativa = `/uploads/${req.file.filename}`;
  const [result] = await pool.query(
    'INSERT INTO imagenes (pedido_id, ruta, descripcion) VALUES (?, ?, ?)',
    [req.params.pedidoId, rutaRelativa, req.body.descripcion ?? null]
  );

  res.status(201).json({ id: result.insertId, ruta: rutaRelativa, descripcion: req.body.descripcion ?? null });
});

const deleteImagen = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM imagenes WHERE id = ?', [req.params.id]);
  const imagen = rows[0];
  if (!imagen) throw new ApiError(404, 'Imagen no encontrada');

  await pool.query('DELETE FROM imagenes WHERE id = ?', [req.params.id]);

  const filePath = path.join(uploadDir, path.basename(imagen.ruta));
  fs.unlink(filePath, () => {});

  res.status(204).send();
});

module.exports = { listImagenesByPedido, uploadImagen, deleteImagen };
