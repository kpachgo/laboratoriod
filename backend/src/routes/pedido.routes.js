const { Router } = require('express');
const pedidoController = require('../controllers/pedido.controller');
const imagenController = require('../controllers/imagen.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validate');
const { idParam } = require('../schemas/common.schema');
const { createPedidoSchema, updatePedidoSchema, pedidoQuerySchema } = require('../schemas/pedido.schema');
const { createImagenSchema } = require('../schemas/imagen.schema');
const { upload } = require('../middleware/upload');

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(pedidoQuerySchema), pedidoController.listPedidos);
router.get('/:id', validateParams(idParam), pedidoController.getPedido);

// Una clínica puede crear el primer pedido de su propio caso (validado en el controller);
// no puede editar ni eliminar pedidos existentes.
router.post(
  '/',
  authorize('admin', 'tecnico', 'gestor', 'clinica'),
  validateBody(createPedidoSchema),
  pedidoController.createPedido
);
router.put(
  '/:id',
  authorize('admin', 'tecnico', 'gestor'),
  validateParams(idParam),
  validateBody(updatePedidoSchema),
  pedidoController.updatePedido
);
router.delete('/:id', authorize('admin'), validateParams(idParam), pedidoController.deletePedido);

// Imágenes de un pedido (pruebas físicas fotografiadas). Una clínica puede adjuntar
// fotos al enviar su propio pedido (ownership validado en el controller).
router.get('/:pedidoId/imagenes', imagenController.listImagenesByPedido);
router.post(
  '/:pedidoId/imagenes',
  authorize('admin', 'tecnico', 'clinica'),
  upload.single('imagen'),
  validateBody(createImagenSchema),
  imagenController.uploadImagen
);

module.exports = router;
