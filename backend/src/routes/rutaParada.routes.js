const { Router } = require('express');
const controller = require('../controllers/ruta.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validate');
const { idParam } = require('../schemas/common.schema');
const { updateParadaSchema } = require('../schemas/ruta.schema');

const router = Router();

router.use(authenticate, authorize('admin', 'gestor'));

router.put('/:id', validateParams(idParam), validateBody(updateParadaSchema), controller.updateParada);
router.delete('/:id', authorize('admin'), validateParams(idParam), controller.deleteParada);

module.exports = router;
