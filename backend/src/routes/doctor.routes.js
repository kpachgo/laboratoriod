const { Router } = require('express');
const controller = require('../controllers/doctor.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validate');
const { idParam } = require('../schemas/common.schema');
const { createDoctorSchema, updateDoctorSchema } = require('../schemas/doctor.schema');

const router = Router();

router.use(authenticate);

router.get('/', controller.listDoctores);
router.get('/:id', validateParams(idParam), controller.getDoctor);
// Una clínica puede registrar sus propios doctores (el controller fuerza su propia clinicaId).
router.post('/', authorize('admin', 'clinica'), validateBody(createDoctorSchema), controller.createDoctor);
router.put('/:id', authorize('admin'), validateParams(idParam), validateBody(updateDoctorSchema), controller.updateDoctor);
router.delete('/:id', authorize('admin'), validateParams(idParam), controller.deleteDoctor);

module.exports = router;
