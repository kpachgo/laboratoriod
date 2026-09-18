const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const listDoctores = asyncHandler(async (req, res) => {
  const params = [];
  let sql = 'SELECT * FROM doctores';
  // Una clínica solo puede ver sus propios doctores, sin importar el query param recibido.
  const clinicaId = req.user.rol === 'clinica' ? req.user.clinicaId : req.query.clinicaId;
  if (clinicaId) {
    sql += ' WHERE clinica_id = ?';
    params.push(clinicaId);
  }
  sql += ' ORDER BY nombre ASC';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

const getDoctor = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM doctores WHERE id = ?', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Doctor no encontrado');
  res.json(rows[0]);
});

const createDoctor = asyncHandler(async (req, res) => {
  const { nombre, telefono, email } = req.body;
  const clinicaId = req.user.rol === 'clinica' ? req.user.clinicaId : req.body.clinicaId;
  if (!clinicaId) throw new ApiError(400, 'clinicaId es obligatorio');

  const [result] = await pool.query(
    'INSERT INTO doctores (clinica_id, nombre, telefono, email) VALUES (?, ?, ?, ?)',
    [clinicaId, nombre, telefono ?? null, email ?? null]
  );
  res.status(201).json({ id: result.insertId, clinicaId, nombre, telefono, email });
});

const updateDoctor = asyncHandler(async (req, res) => {
  const [existingRows] = await pool.query('SELECT * FROM doctores WHERE id = ?', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) throw new ApiError(404, 'Doctor no encontrado');

  const { clinicaId, nombre, telefono, email } = req.body;
  await pool.query(
    'UPDATE doctores SET clinica_id = ?, nombre = ?, telefono = ?, email = ? WHERE id = ?',
    [
      clinicaId ?? existing.clinica_id,
      nombre ?? existing.nombre,
      telefono !== undefined ? telefono : existing.telefono,
      email !== undefined ? email : existing.email,
      req.params.id,
    ]
  );
  res.json({ message: 'Doctor actualizado' });
});

const deleteDoctor = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM doctores WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Doctor no encontrado');
  res.status(204).send();
});

module.exports = { listDoctores, getDoctor, createDoctor, updateDoctor, deleteDoctor };
