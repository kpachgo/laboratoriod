const { Router } = require('express');
const controller = require('../controllers/usuario.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validate');
const { idParam } = require('../schemas/common.schema');
const { createUsuarioSchema, updateUsuarioSchema } = require('../schemas/usuario.schema');

const router = Router();

router.use(authenticate);

// Lectura: admin y tecnico (para asignar gestores en pedidos). Escritura: solo admin.
router.get('/', authorize('admin', 'tecnico'), controller.listUsuarios);
router.get('/:id', authorize('admin', 'tecnico'), validateParams(idParam), controller.getUsuario);
router.post('/', authorize('admin'), validateBody(createUsuarioSchema), controller.createUsuario);
router.put('/:id', authorize('admin'), validateParams(idParam), validateBody(updateUsuarioSchema), controller.updateUsuario);
router.delete('/:id', authorize('admin'), validateParams(idParam), controller.deleteUsuario);

module.exports = router;
