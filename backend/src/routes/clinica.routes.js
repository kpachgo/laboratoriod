const { Router } = require('express');
const controller = require('../controllers/clinica.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validate');
const { idParam } = require('../schemas/common.schema');
const { createClinicaSchema, updateClinicaSchema } = require('../schemas/clinica.schema');

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'tecnico', 'gestor'), controller.listClinicas);
router.get('/:id', validateParams(idParam), controller.getClinica);
router.post('/', authorize('admin'), validateBody(createClinicaSchema), controller.createClinica);
router.put('/:id', authorize('admin'), validateParams(idParam), validateBody(updateClinicaSchema), controller.updateClinica);
router.delete('/:id', authorize('admin'), validateParams(idParam), controller.deleteClinica);

module.exports = router;
