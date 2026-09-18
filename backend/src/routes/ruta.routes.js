const { Router } = require('express');
const controller = require('../controllers/ruta.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validate');
const { idParam } = require('../schemas/common.schema');
const {
  createRutaSchema,
  updateRutaSchema,
  createParadaSchema,
  updateParadaSchema,
} = require('../schemas/ruta.schema');

const router = Router();

router.use(authenticate, authorize('admin', 'gestor'));

router.get('/', controller.listRutas);
router.get('/:id', validateParams(idParam), controller.getRuta);
router.post('/', authorize('admin'), validateBody(createRutaSchema), controller.createRuta);
router.put('/:id', validateParams(idParam), validateBody(updateRutaSchema), controller.updateRuta);
router.delete('/:id', authorize('admin'), validateParams(idParam), controller.deleteRuta);

router.post('/:rutaId/paradas', validateBody(createParadaSchema), controller.addParada);

module.exports = router;
