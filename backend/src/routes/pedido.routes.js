const { Router } = require('express');
const pedidoController = require('../controllers/pedido.controller');
const imagenController = require('../controllers/imagen.controller');
const comentarioController = require('../controllers/comentario.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validate');
const { idParam } = require('../schemas/common.schema');
const { createPedidoSchema, updatePedidoSchema, pedidoQuerySchema } = require('../schemas/pedido.schema');
const { createImagenSchema } = require('../schemas/imagen.schema');
const { pedidoIdParam, comentarioParams, createComentarioSchema } = require('../schemas/comentario.schema');
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
// El laboratorio confirma que la pieza que traía el gestor ya llegó.
router.post(
  '/:id/recibir-laboratorio',
  authorize('admin', 'tecnico'),
  validateParams(idParam),
  pedidoController.recibirEnLaboratorio
);
// Control interno del trabajo del técnico: terminar o reabrir el trabajo de una prueba.
router.post('/:id/terminar', authorize('admin', 'tecnico'), validateParams(idParam), pedidoController.terminarTrabajo);
router.post('/:id/reabrir-trabajo', authorize('admin', 'tecnico'), validateParams(idParam), pedidoController.reabrirTrabajo);
router.delete('/:id', authorize('admin'), validateParams(idParam), pedidoController.deletePedido);

// Comentarios del laboratorio sobre una prueba: los escribe el técnico o el admin,
// y la clínica dueña del pedido puede leerlos (ownership validado en el controller).
router.get('/:pedidoId/comentarios', validateParams(pedidoIdParam), comentarioController.listComentarios);
router.post(
  '/:pedidoId/comentarios',
  authorize('admin', 'tecnico'),
  validateParams(pedidoIdParam),
  validateBody(createComentarioSchema),
  comentarioController.createComentario
);
router.delete(
  '/:pedidoId/comentarios/:comentarioId',
  authorize('admin', 'tecnico'),
  validateParams(comentarioParams),
  comentarioController.deleteComentario
);

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
