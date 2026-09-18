const { Router } = require('express');
const controller = require('../controllers/caso.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validate');
const { idParam } = require('../schemas/common.schema');
const {
  createCasoSchema,
  updateCasoSchema,
  createCasoItemSchema,
  updateCasoItemSchema,
} = require('../schemas/caso.schema');

const router = Router();

router.use(authenticate);

// Lectura: admin, tecnico, gestor ven todo; clinica solo ve lo suyo (filtrado en el controller).
router.get('/', controller.listCasos);
router.get('/:id', validateParams(idParam), controller.getCaso);

// Escritura: personal del laboratorio crea para cualquier clínica; una clínica solo puede
// crear casos para sí misma (el controller fuerza su propia clinicaId).
router.post('/', authorize('admin', 'tecnico', 'gestor', 'clinica'), validateBody(createCasoSchema), controller.createCaso);
router.put(
  '/:id',
  authorize('admin', 'tecnico', 'gestor'),
  validateParams(idParam),
  validateBody(updateCasoSchema),
  controller.updateCaso
);
router.delete('/:id', authorize('admin'), validateParams(idParam), controller.deleteCaso);

router.post(
  '/:casoId/items',
  authorize('admin', 'tecnico', 'gestor'),
  validateBody(createCasoItemSchema),
  controller.addCasoItem
);

module.exports = router;
