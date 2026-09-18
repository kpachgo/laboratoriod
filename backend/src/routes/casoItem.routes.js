const { Router } = require('express');
const controller = require('../controllers/caso.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validate');
const { idParam } = require('../schemas/common.schema');
const { updateCasoItemSchema } = require('../schemas/caso.schema');

const router = Router();

router.use(authenticate, authorize('admin', 'tecnico', 'gestor'));

router.put('/:id', validateParams(idParam), validateBody(updateCasoItemSchema), controller.updateCasoItem);
router.delete('/:id', validateParams(idParam), controller.deleteCasoItem);

module.exports = router;
