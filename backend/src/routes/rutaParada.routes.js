const { Router } = require('express');
const controller = require('../controllers/ruta.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validate');
const { idParam } = require('../schemas/common.schema');
const { updateParadaSchema, paradaQuerySchema, reasignarParadaSchema } = require('../schemas/ruta.schema');

const router = Router();

router.use(authenticate, authorize('admin', 'gestor'));

router.get('/', validateQuery(paradaQuerySchema), controller.listParadas);
router.put('/:id', validateParams(idParam), validateBody(updateParadaSchema), controller.updateParada);
router.post('/:id/reasignar', authorize('admin'), validateParams(idParam), validateBody(reasignarParadaSchema), controller.reasignarParada);
router.delete('/:id', authorize('admin'), validateParams(idParam), controller.deleteParada);

module.exports = router;
