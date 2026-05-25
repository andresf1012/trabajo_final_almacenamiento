const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/usuariosController');

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', ctrl.crear);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.inactivar);

module.exports = router;
