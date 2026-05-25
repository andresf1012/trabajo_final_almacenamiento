const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/salasController');

// /disponibles debe ir antes de /:id para que Express no lo interprete como ID
router.get('/disponibles', ctrl.disponibles);
router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', ctrl.crear);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
