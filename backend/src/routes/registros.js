const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/registrosController');

router.get('/', ctrl.listar);
router.get('/documento/:idDocumento', ctrl.porDocumento);
router.get('/:id', ctrl.obtener);

module.exports = router;
