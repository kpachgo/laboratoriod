const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const listClinicas = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM clinicas ORDER BY nombre ASC');
  res.json(rows);
});

const getClinica = asyncHandler(async (req, res) => {
  if (req.user.rol === 'clinica' && Number(req.params.id) !== req.user.clinicaId) {
    throw new ApiError(403, 'No tiene acceso a esta clínica');
  }
  const [rows] = await pool.query('SELECT * FROM clinicas WHERE id = ?', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Clínica no encontrada');
  res.json(rows[0]);
});

const createClinica = asyncHandler(async (req, res) => {
  const { nombre, direccion, telefono, email } = req.body;
  const [result] = await pool.query(
    'INSERT INTO clinicas (nombre, direccion, telefono, email) VALUES (?, ?, ?, ?)',
    [nombre, direccion ?? null, telefono ?? null, email ?? null]
  );
  res.status(201).json({ id: result.insertId, nombre, direccion, telefono, email });
});

const updateClinica = asyncHandler(async (req, res) => {
  const [existingRows] = await pool.query('SELECT * FROM clinicas WHERE id = ?', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) throw new ApiError(404, 'Clínica no encontrada');

  const { nombre, direccion, telefono, email } = req.body;
  await pool.query(
    'UPDATE clinicas SET nombre = ?, direccion = ?, telefono = ?, email = ? WHERE id = ?',
    [
      nombre ?? existing.nombre,
      direccion !== undefined ? direccion : existing.direccion,
      telefono !== undefined ? telefono : existing.telefono,
      email !== undefined ? email : existing.email,
      req.params.id,
    ]
  );
  res.json({ message: 'Clínica actualizada' });
});

const deleteClinica = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM clinicas WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Clínica no encontrada');
  res.status(204).send();
});

module.exports = { listClinicas, getClinica, createClinica, updateClinica, deleteClinica };
