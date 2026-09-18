const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

function mapCasoItemRow(row) {
  return {
    id: row.id,
    casoId: row.caso_id,
    tipoTrabajo: row.tipo_trabajo,
    material: row.material,
    piezasDentales: row.piezas_dentales,
    color: row.color,
    unidades: row.unidades,
    datosExtra: row.datos_extra,
    createdAt: row.created_at,
  };
}

// Los usuarios con rol 'clinica' solo pueden ver los casos de su propia clínica.
function applyClinicaScope(req, sql, params, clinicaColumn = 'clinica_id') {
  if (req.user.rol === 'clinica') {
    sql += sql.includes('WHERE') ? ` AND ${clinicaColumn} = ?` : ` WHERE ${clinicaColumn} = ?`;
    params.push(req.user.clinicaId);
  }
  return { sql, params };
}

const listCasos = asyncHandler(async (req, res) => {
  let sql = 'SELECT * FROM casos';
  let params = [];

  if (req.query.clinicaId && req.user.rol !== 'clinica') {
    sql += ' WHERE clinica_id = ?';
    params.push(req.query.clinicaId);
  }

  ({ sql, params } = applyClinicaScope(req, sql, params));
  sql += ' ORDER BY id DESC';

  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

const getCaso = asyncHandler(async (req, res) => {
  let sql = `
    SELECT c.*, cl.nombre AS clinica_nombre, d.nombre AS doctor_nombre
    FROM casos c
    JOIN clinicas cl ON cl.id = c.clinica_id
    JOIN doctores d ON d.id = c.doctor_id
    WHERE c.id = ?
  `;
  let params = [req.params.id];
  ({ sql, params } = applyClinicaScope(req, sql, params, 'c.clinica_id'));

  const [rows] = await pool.query(sql, params);
  const caso = rows[0];
  if (!caso) throw new ApiError(404, 'Caso no encontrado');

  const [items] = await pool.query('SELECT * FROM caso_items WHERE caso_id = ?', [caso.id]);
  res.json({ ...caso, items: items.map(mapCasoItemRow) });
});

const createCaso = asyncHandler(async (req, res) => {
  const { doctorId, pacienteNombre, descripcion, items } = req.body;

  // Una clínica solo puede crear casos para sí misma, sin importar lo que envíe en el body.
  const clinicaId = req.user.rol === 'clinica' ? req.user.clinicaId : req.body.clinicaId;
  if (!clinicaId) throw new ApiError(400, 'clinicaId es obligatorio');

  const [doctorRows] = await pool.query('SELECT id FROM doctores WHERE id = ? AND clinica_id = ?', [doctorId, clinicaId]);
  if (!doctorRows[0]) throw new ApiError(400, 'El doctor indicado no pertenece a esta clínica');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO casos (clinica_id, doctor_id, paciente_nombre, descripcion) VALUES (?, ?, ?, ?)',
      [clinicaId, doctorId, pacienteNombre ?? null, descripcion ?? null]
    );
    const casoId = result.insertId;

    for (const item of items) {
      await connection.query(
        `INSERT INTO caso_items (caso_id, tipo_trabajo, material, piezas_dentales, color, unidades, datos_extra)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          casoId,
          item.tipoTrabajo,
          item.material ?? null,
          item.piezasDentales ?? null,
          item.color ?? null,
          item.unidades ?? 1,
          item.datosExtra ? JSON.stringify(item.datosExtra) : null,
        ]
      );
    }

    await connection.commit();
    res.status(201).json({ id: casoId });
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
});

const updateCaso = asyncHandler(async (req, res) => {
  const [existingRows] = await pool.query('SELECT * FROM casos WHERE id = ?', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) throw new ApiError(404, 'Caso no encontrado');

  const { clinicaId, doctorId, pacienteNombre, descripcion } = req.body;
  await pool.query(
    'UPDATE casos SET clinica_id = ?, doctor_id = ?, paciente_nombre = ?, descripcion = ? WHERE id = ?',
    [
      clinicaId ?? existing.clinica_id,
      doctorId ?? existing.doctor_id,
      pacienteNombre !== undefined ? pacienteNombre : existing.paciente_nombre,
      descripcion !== undefined ? descripcion : existing.descripcion,
      req.params.id,
    ]
  );
  res.json({ message: 'Caso actualizado' });
});

const deleteCaso = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM casos WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Caso no encontrado');
  res.status(204).send();
});

// ---- Caso items ----

const addCasoItem = asyncHandler(async (req, res) => {
  const [casoRows] = await pool.query('SELECT id FROM casos WHERE id = ?', [req.params.casoId]);
  if (!casoRows[0]) throw new ApiError(404, 'Caso no encontrado');

  const { tipoTrabajo, material, piezasDentales, color, unidades, datosExtra } = req.body;
  const [result] = await pool.query(
    `INSERT INTO caso_items (caso_id, tipo_trabajo, material, piezas_dentales, color, unidades, datos_extra)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      req.params.casoId,
      tipoTrabajo,
      material ?? null,
      piezasDentales ?? null,
      color ?? null,
      unidades ?? 1,
      datosExtra ? JSON.stringify(datosExtra) : null,
    ]
  );
  res.status(201).json({ id: result.insertId });
});

const updateCasoItem = asyncHandler(async (req, res) => {
  const [existingRows] = await pool.query('SELECT * FROM caso_items WHERE id = ?', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) throw new ApiError(404, 'Item de caso no encontrado');

  const { tipoTrabajo, material, piezasDentales, color, unidades, datosExtra } = req.body;
  await pool.query(
    `UPDATE caso_items SET tipo_trabajo = ?, material = ?, piezas_dentales = ?, color = ?, unidades = ?, datos_extra = ?
     WHERE id = ?`,
    [
      tipoTrabajo ?? existing.tipo_trabajo,
      material !== undefined ? material : existing.material,
      piezasDentales !== undefined ? piezasDentales : existing.piezas_dentales,
      color !== undefined ? color : existing.color,
      unidades ?? existing.unidades,
      datosExtra !== undefined ? (datosExtra ? JSON.stringify(datosExtra) : null) : existing.datos_extra,
      req.params.id,
    ]
  );
  res.json({ message: 'Item de caso actualizado' });
});

const deleteCasoItem = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM caso_items WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Item de caso no encontrado');
  res.status(204).send();
});

module.exports = {
  listCasos,
  getCaso,
  createCaso,
  updateCaso,
  deleteCaso,
  addCasoItem,
  updateCasoItem,
  deleteCasoItem,
};
