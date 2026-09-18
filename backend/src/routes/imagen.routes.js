const { Router } = require('express');
const controller = require('../controllers/imagen.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateParams } = require('../middleware/validate');
const { idParam } = require('../schemas/common.schema');

const router = Router();

router.use(authenticate, authorize('admin', 'tecnico'));

router.delete('/:id', validateParams(idParam), controller.deleteImagen);

module.exports = router;
