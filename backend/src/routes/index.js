const { Router } = require('express');

const router = Router();

router.use('/auth', require('./auth.routes'));
router.use('/usuarios', require('./usuario.routes'));
router.use('/clinicas', require('./clinica.routes'));
router.use('/doctores', require('./doctor.routes'));
router.use('/casos', require('./caso.routes'));
router.use('/caso-items', require('./casoItem.routes'));
router.use('/pedidos', require('./pedido.routes'));
router.use('/imagenes', require('./imagen.routes'));
router.use('/rutas', require('./ruta.routes'));
router.use('/ruta-paradas', require('./rutaParada.routes'));

module.exports = router;
