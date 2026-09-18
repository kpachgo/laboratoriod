const ApiError = require('../utils/ApiError');

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new ApiError(400, 'Datos de entrada inválidos', result.error.flatten()));
    }
    req.body = result.data;
    next();
  };
}

function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return next(new ApiError(400, 'Parámetros inválidos', result.error.flatten()));
    }
    req.params = result.data;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(new ApiError(400, 'Parámetros de consulta inválidos', result.error.flatten()));
    }
    req.query = result.data;
    next();
  };
}

module.exports = { validateBody, validateParams, validateQuery };
