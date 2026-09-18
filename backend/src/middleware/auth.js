const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/jwt');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Token no proporcionado'));
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.id,
      rol: payload.rol,
      clinicaId: payload.clinicaId ?? null,
      nombre: payload.nombre,
      usuario: payload.usuario,
    };
    next();
  } catch (err) {
    next(new ApiError(401, 'Token inválido o expirado'));
  }
}

function authorize(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'No autenticado'));
    }
    if (!rolesPermitidos.includes(req.user.rol)) {
      return next(new ApiError(403, 'No tiene permisos para esta acción'));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
