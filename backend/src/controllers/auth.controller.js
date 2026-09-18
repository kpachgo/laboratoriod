const bcrypt = require('bcrypt');
const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/jwt');

const login = asyncHandler(async (req, res) => {
  const { usuario, password } = req.body;

  const [rows] = await pool.query(
    'SELECT id, nombre, usuario, password_hash, rol, clinica_id, activo FROM usuarios WHERE usuario = ? LIMIT 1',
    [usuario]
  );

  const user = rows[0];
  if (!user || !user.activo) {
    throw new ApiError(401, 'Credenciales inválidas');
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    throw new ApiError(401, 'Credenciales inválidas');
  }

  const token = signToken({
    id: user.id,
    rol: user.rol,
    clinicaId: user.clinica_id,
    nombre: user.nombre,
    usuario: user.usuario,
  });

  res.json({
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      usuario: user.usuario,
      rol: user.rol,
      clinicaId: user.clinica_id,
    },
  });
});

const me = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, usuario, rol, clinica_id, activo FROM usuarios WHERE id = ? LIMIT 1',
    [req.user.id]
  );
  const user = rows[0];
  if (!user) {
    throw new ApiError(404, 'Usuario no encontrado');
  }
  res.json(user);
});

module.exports = { login, me };
