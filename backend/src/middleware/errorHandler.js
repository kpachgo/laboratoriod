const multer = require('multer');
const ApiError = require('../utils/ApiError');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Error al subir archivo: ${err.message}` });
  }

  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'El registro ya existe (valor duplicado)' });
  }

  if (err && err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: 'Referencia inválida: el registro relacionado no existe' });
  }

  if (err && err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: 'No se puede eliminar: el registro tiene datos relacionados' });
  }

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { notFoundHandler, errorHandler };
