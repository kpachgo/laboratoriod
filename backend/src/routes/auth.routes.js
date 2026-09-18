const { Router } = require('express');
const { login, me } = require('../controllers/auth.controller');
const { validateBody } = require('../middleware/validate');
const { loginSchema } = require('../schemas/auth.schema');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.get('/me', authenticate, me);

module.exports = router;
