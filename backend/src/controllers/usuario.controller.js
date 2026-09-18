const bcrypt = require('bcrypt');
const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const SALT_ROUNDS = 10;

const listUsuarios = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, usuario, rol, clinica_id AS clinicaId, activo, created_at AS createdAt FROM usuarios ORDER BY id DESC'
  );
  res.json(rows);
});

const getUsuario = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, usuario, rol, clinica_id AS clinicaId, activo, created_at AS createdAt FROM usuarios WHERE id = ?',
    [req.params.id]
  );
  if (!rows[0]) throw new ApiError(404, 'Usuario no encontrado');
  res.json(rows[0]);
});

const createUsuario = asyncHandler(async (req, res) => {
  const { nombre, usuario, rol, clinicaId, activo, password } = req.body;
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [result] = await pool.query(
    `INSERT INTO usuarios (nombre, usuario, password_hash, rol, clinica_id, activo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [nombre, usuario, passwordHash, rol, clinicaId ?? null, activo ?? true]
  );

  res.status(201).json({ id: result.insertId, nombre, usuario, rol, clinicaId: clinicaId ?? null, activo: activo ?? true });
});

const updateUsuario = asyncHandler(async (req, res) => {
  const { nombre, usuario, rol, clinicaId, activo, password } = req.body;

  const [existingRows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) throw new ApiError(404, 'Usuario no encontrado');

  const nextRol = rol ?? existing.rol;
  const nextClinicaId = clinicaId !== undefined ? clinicaId : existing.clinica_id;

  if (nextRol === 'clinica' && !nextClinicaId) {
    throw new ApiError(400, 'clinicaId es obligatorio cuando el rol es clinica');
  }
  if (nextRol !== 'clinica' && nextClinicaId) {
    throw new ApiError(400, 'clinicaId debe ser nulo si el rol no es clinica');
  }

  const passwordHash = password ? await bcrypt.hash(password, SALT_ROUNDS) : existing.password_hash;

  await pool.query(
    `UPDATE usuarios SET nombre = ?, usuario = ?, password_hash = ?, rol = ?, clinica_id = ?, activo = ?
     WHERE id = ?`,
    [
      nombre ?? existing.nombre,
      usuario ?? existing.usuario,
      passwordHash,
      nextRol,
      nextRol === 'clinica' ? nextClinicaId : null,
      activo !== undefined ? activo : existing.activo,
      req.params.id,
    ]
  );

  res.json({ message: 'Usuario actualizado' });
});

const deleteUsuario = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Usuario no encontrado');
  res.status(204).send();
});

module.exports = { listUsuarios, getUsuario, createUsuario, updateUsuario, deleteUsuario };
